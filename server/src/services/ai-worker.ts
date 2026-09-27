import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import { redis } from '../lib/redis';
import { prisma } from '../lib/prisma';
import { publishToUser } from '../lib/socket';

// ─── Types ───────────────────────────────────────────────

interface AIJobData {
  submissionId: string;
  userId: string;
  streamId: string;
  challengeSessionId: string;
  code: string;
  language: string;
  challenge: {
    description: string;
    testCases: Array<{ input: string; expected_output: string }>;
    staticHints: string[] | null;
  };
  testResults: {
    passed: number;
    total: number;
    cases: Array<{ input?: any; passed: boolean; actual?: any; expected?: any; error?: string }>;
    error?: string;
  };
}

interface AIHint {
  text: string;
  qualityScore: number;
}

// ─── Circuit Breaker (§8.4) ─────────────────────────────

class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold = 3,
    private readonly cooldownMs = 30_000
  ) {}

  async call<T>(fn: () => Promise<T>, fallback: () => T): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.cooldownMs) {
        this.state = 'half-open';
      } else {
        console.warn('🔴 Circuit breaker OPEN — using fallback hint');
        return fallback();
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      console.warn(`🟡 Circuit breaker failure ${this.failures}/${this.threshold}:`, (err as Error).message);
      return fallback();
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'open';
      console.error('🔴 Circuit breaker OPENED — AI API experiencing failures');
    }
  }
}

const aiCircuitBreaker = new CircuitBreaker(3, 30_000);

// ─── Gemini AI Client ───────────────────────────────────

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    if (!config.geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }
    genAI = new GoogleGenerativeAI(config.geminiApiKey);
  }
  return genAI;
}

/**
 * Evaluate code with Gemini AI (§8.3 prompt design).
 */
async function evaluateWithAI(
  code: string,
  challenge: AIJobData['challenge'],
  testResults: AIJobData['testResults'],
  language: string
): Promise<AIHint> {
  const passRate = `${testResults.passed}/${testResults.total}`;
  const failedCases = testResults.cases
    .filter((c) => !c.passed)
    .slice(0, 2) // max 2 failing cases to keep prompt small
    .map((c) => `Input: ${c.input ?? 'N/A'} → Expected: ${c.expected}, Got: ${c.actual || c.error || 'error'}`)
    .join('\n');

  const prompt = `
Challenge: ${challenge.description}

Student Code (${language}):
\`\`\`${language}
${code}
\`\`\`

Test Results: ${passRate} tests passed.
${failedCases ? `Failing cases:\n${failedCases}` : 'All tests passed!'}
${testResults.error ? `Runtime error: ${testResults.error}` : ''}

Provide two things in a structured JSON format:
{
  "hint": "A single, concise hint (2-3 sentences max) guiding the student without revealing the solution...",
  "score": 0.9 // A number from 0.0 to 1.0 indicating code quality and correctness. If they pass all tests, give 1.0. If they fail some, give partial credit based on how close their logic is.
}
  `.trim();

  const model = getGenAI().getGenerativeModel({
    model: config.geminiModel,
    systemInstruction: `You are a programming tutor for live coding challenges. 
Focus on the specific error, not general advice. 
You must output ONLY valid JSON.`,
    generationConfig: {
      maxOutputTokens: 200,
      temperature: 0.7,
      responseMimeType: 'application/json',
    },
  });

  const result = await model.generateContent(prompt);
  let text = 'Try reviewing your logic carefully.';
  let score = 0;
  
  try {
    let rawText = result.response.text().trim();
    if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```[a-z]*\n/i, '').replace(/\n?```$/i, '');
    }
    const parsed = JSON.parse(rawText);
    text = parsed.hint || text;
    // Normalize to the 0.0–1.0 range the DB column (Decimal(3,2)) can store.
    // Tolerate models that return a 0–100 scale despite the prompt.
    let raw = typeof parsed.score === 'number' ? parsed.score : Number(parsed.score) || 0;
    if (raw > 1) raw = raw / 100;
    score = Math.max(0, Math.min(1, raw));
  } catch (err) {
    console.error('Failed to parse AI JSON:', err);
  }

  return { text: sanitizeAIOutput(text), qualityScore: score };
}

/**
 * Sanitize AI output (§10.2, §10.3).
 */
function sanitizeAIOutput(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim().substring(0, 500);
}

/**
 * Validate AI hint doesn't leak solutions (§10.3).
 */
function validateAIHint(hint: string, challenge: AIJobData['challenge']): boolean {
  if (hint.length > 500) return false;
  if (hint.includes('```')) return false;
  // Check that hint doesn't directly leak expected output values
  const sensitiveValues = challenge.testCases.map((tc) => String(tc.expected_output));
  if (sensitiveValues.some((v) => v.length > 3 && hint.includes(v))) return false;
  return true;
}

/**
 * Get a static hint from the challenge's pre-authored hints.
 */
function getStaticHint(challenge: AIJobData['challenge']): AIHint {
  const hints = challenge.staticHints || ['Try reviewing your logic carefully.'];
  const randomHint = hints[Math.floor(Math.random() * hints.length)];
  return { text: randomHint, qualityScore: 0.5 };
}

// ─── BullMQ Queue & Worker (§8.2) ───────────────────────

let aiQueue: Queue | null = null;
let aiWorker: Worker | null = null;

/**
 * Initialize the AI evaluation queue and worker.
 * In MVP, the worker runs in the same process (Phase 1 trade-off).
 */
export function initAIWorker(): void {
  // BullMQ requires maxRetriesPerRequest: null
  const queueConnection = new Redis(config.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    family: 4,
    tls: config.redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
  });

  const workerConnection = new Redis(config.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    family: 4,
    tls: config.redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
  });

  aiQueue = new Queue('ai-evaluation', {
    connection: queueConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  });

  aiWorker = new Worker(
    'ai-evaluation',
    async (job: Job<AIJobData>) => {
      const { submissionId, code, challenge, testResults, language } = job.data;
      console.log(`🤖 AI evaluating submission ${submissionId.substring(0, 8)}...`);

      let hint: AIHint;
      try {
        hint = await aiCircuitBreaker.call(
          async () => {
            const aiHint = await evaluateWithAI(code, challenge, testResults, language);

            // Validate hint doesn't leak solutions
            if (!validateAIHint(aiHint.text, challenge)) {
              console.warn('⚠️  AI hint failed validation — using static fallback');
              return getStaticHint(challenge);
            }

            return aiHint;
          },
          () => getStaticHint(challenge)
        );
      } catch (workerErr: any) {
        console.warn('⚠️ AI evaluation caught error, falling back to static hint:', workerErr.message);
        hint = getStaticHint(challenge);
      }

      // Persist result to DB
      await prisma.submission.update({
        where: { id: submissionId },
        data: {
          aiHint: hint.text,
          aiScore: hint.qualityScore,
          aiEvaluatedAt: new Date(),
          status: 'AI_EVALUATED',
        },
      });

      // Push hint_ready to the submitting viewer only (not the whole room).
      await publishToUser(job.data.userId, 'hint_ready', {
        submissionId,
        hint: hint.text,
        userId: job.data.userId,
      });

      console.log(`✅ AI hint delivered for submission ${submissionId.substring(0, 8)}`);
    },
    {
      connection: workerConnection,
      concurrency: 2, // MVP: 2 concurrent AI evaluations
    }
  );

  aiWorker.on('failed', async (job, err) => {
    console.error(`❌ AI evaluation failed for job ${job?.id}:`, err.message);
    if (job?.data?.userId && job?.data?.submissionId) {
      try {
        const fallbackHint = 'Review your algorithm logic, variable types, and edge case bounds carefully.';
        await prisma.submission.update({
          where: { id: job.data.submissionId },
          data: {
            aiHint: fallbackHint,
            aiScore: 0.5,
            aiEvaluatedAt: new Date(),
            status: 'AI_EVALUATED',
          },
        });
        await publishToUser(job.data.userId, 'hint_ready', {
          submissionId: job.data.submissionId,
          hint: fallbackHint,
          userId: job.data.userId,
        });
      } catch {
        // Ignore fallback db errors
      }
    }
  });

  aiWorker.on('completed', (job) => {
    console.log(`✅ AI job ${job.id} completed`);
  });

  console.log('✓ AI Worker initialized (BullMQ)');
}

/**
 * Enqueue a submission for AI evaluation.
 */
export async function enqueueAIEvaluation(data: AIJobData): Promise<string> {
  if (!aiQueue) {
    throw new Error('AI queue not initialized');
  }

  const job = await aiQueue.add('evaluate', data, {
    priority: 1,
  });

  console.log(`📋 AI job enqueued: ${job.id} for submission ${data.submissionId.substring(0, 8)}`);
  return job.id!;
}

/**
 * Graceful shutdown.
 */
export async function closeAIWorker(): Promise<void> {
  if (aiWorker) await aiWorker.close();
  if (aiQueue) await aiQueue.close();
}

/**
 * Robust JSON parser that handles LLM outputs with unescaped newlines or control characters in code strings.
 */
function cleanAndParseJSON(raw: string): any {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\n/i, '').replace(/\n?```$/i, '').trim();
  }

  // First attempt: Standard JSON parse
  try {
    return JSON.parse(cleaned);
  } catch (firstErr) {
    // Second attempt: Sanitize raw unescaped newlines and tabs inside quoted strings
    try {
      const sanitized = cleaned.replace(/"((?:[^"\\]|\\.)*)"/gs, (match) => {
        return match.replace(/\r?\n/g, '\\n').replace(/\t/g, '\\t');
      });
      return JSON.parse(sanitized);
    } catch {
      // Third attempt: Regex extract starterCode and testCases
      try {
        const testCasesMatch = cleaned.match(/"testCases"\s*:\s*(\[[\s\S]*?\])\s*}/s);
        const starterCodeMatch = cleaned.match(/"starterCode"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
        if (testCasesMatch) {
          const testCases = JSON.parse(testCasesMatch[1]);
          const starterCode = starterCodeMatch ? JSON.parse(`"${starterCodeMatch[1]}"`) : '';
          return { starterCode, testCases };
        }
      } catch {}
      throw firstErr;
    }
  }
}

/**
 * Automatically generate starter code skeleton and sample test cases using Gemini AI
 * based on challenge title, description, target language, and optional instructor sample test case.
 */
export async function generateChallengeTestCases(
  title: string,
  description: string,
  language: string,
  sampleTestCase?: { input?: string; output?: string }
): Promise<{
  starterCode: string;
  testCases: Array<{ input: string; expected_output: string; description: string }>;
}> {
  if (!config.geminiApiKey) {
    return generateFallbackChallengeData(title, language, sampleTestCase);
  }

  // Only consider sampleTestCase if it has real content AND isn't the generic placeholder
  const isDefaultPlaceholder =
    (sampleTestCase?.input?.trim() === 'hello' && sampleTestCase?.output?.trim() === 'olleh') ||
    (sampleTestCase?.input?.trim() === '' && sampleTestCase?.output?.trim() === 'olleh');

  const hasSample = Boolean(
    sampleTestCase &&
    (sampleTestCase.input?.trim() || sampleTestCase.output?.trim()) &&
    !isDefaultPlaceholder
  );

  const prompt = `
You are an expert competitive programming problem setter and curriculum designer.
Analyze the following challenge requirements and generate:
1. High-quality SKELETON starter code in the requested programming language: "${language}".
2. 3 to 5 realistic, robust test cases that cover standard cases, edge cases, and boundary constraints.

Problem Title: "${title}"
Problem Description & Constraints: "${description || 'Implement the algorithm as described in the title.'}"
Target Language: "${language}"
${hasSample ? `Instructor Sample Reference Test Case:
Sample Input:
${sampleTestCase?.input ?? ''}
Sample Expected Output:
${sampleTestCase?.output ?? ''}
(CRITICAL: All generated test cases MUST follow this EXACT input/output formatting and data types! The first test case MUST be this sample.)` : ''}

CRITICAL REQUIREMENT FOR STARTER CODE:
- The starter code MUST be an incomplete skeleton for students to solve!
- DO NOT provide the complete working solution!
- The function body MUST be left unfinished with a comment: "// TODO: Write your algorithm here" and return a dummy value (e.g., return -1, return {}, return 0, return false).
- Provide the complete standard I/O driver (cin >> ... / cout << ... in C++, sys.stdin in Python, readline/fs in JS) so the student only focuses on implementing the algorithm logic inside the function!

Execution & Driver Format:
DevCast uses standard Competitive Programming I/O (reads from standard input 'stdin' and writes results to standard output 'stdout').
- For C++ (GCC 13):
  Write clean C++ code with necessary headers (#include <iostream>, <vector>, <string>, <algorithm>, etc.).
  Provide the helper function signature with "// TODO: Write your algorithm here", and an int main() driver that reads input from cin, calls the function, and prints the result to cout.
- For Python (3.11):
  Write clean Python code with a helper function solve(...) containing "# TODO: Write your algorithm here", and standard I/O driver using sys.stdin.read().split() or input() inside if __name__ == '__main__':.
- For JavaScript (Node 20):
  Write clean Node.js code with a helper function solve(...) and standard I/O reading from stdin via fs.readFileSync(0, 'utf-8').trim() and logging output with console.log(...).

Test Cases Requirements:
- Generate 3 to 5 test cases matching the problem's expected inputs and outputs.
- Case 1: Standard / typical case.
- Case 2: Boundary case (minimum/maximum limits, empty or single element, zeros, negative numbers).
- Case 3: Edge case or special constraint (duplicates, sorted vs unsorted, extreme values).
- Case 4 & 5 (optional): Additional thorough verification cases.
- "input": Raw string fed into stdin. If multiple numbers or lines are needed, separate them with spaces or newlines. Do NOT add escaped quotes unless string values literally contain quotes.
- "expected_output": Exact expected stdout result string (trailing newline ignored).
- "description": Short descriptive label (e.g. "Typical input", "Single element array", "No matching index (-1)").

CRITICAL: Return ONLY a valid JSON object matching this schema with NO extra markdown outside the JSON:
{
  "starterCode": "starter skeleton code string",
  "testCases": [
    {
      "input": "...",
      "expected_output": "...",
      "description": "..."
    }
  ]
}
`.trim();

  // Try candidate models in order of preference to avoid 503 / high demand spikes
  const candidateModels = [
    config.geminiModel,
    'gemini-2.5-flash',
    'gemini-2.0-flash',
  ];

  for (const modelName of candidateModels) {
    try {
      const model = getGenAI().getGenerativeModel({
        model: modelName,
        generationConfig: {
          maxOutputTokens: 3500,
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      });

      const generatePromise = model.generateContent(prompt);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Gemini API call timed out on ${modelName}`)), 12000)
      );

      const result = await Promise.race([generatePromise, timeoutPromise]);
      const rawText = result.response.text();
      const parsed = cleanAndParseJSON(rawText);

      if (parsed && Array.isArray(parsed.testCases) && parsed.testCases.length > 0) {
        return {
          starterCode: parsed.starterCode || getStarterTemplate(language),
          testCases: parsed.testCases.map((tc: any, index: number) => ({
            input: String(tc.input ?? '').trim(),
            expected_output: String(tc.expected_output ?? '').trim(),
            description: String(tc.description ?? `Test case ${index + 1}`),
          })),
        };
      }
    } catch (modelError: any) {
      console.warn(`Model ${modelName} attempt failed: ${modelError.message}`);
    }
  }

  return generateFallbackChallengeData(title, language, sampleTestCase);
}

function getStarterTemplate(language: string): string {
  if (language === 'javascript') {
    return `const fs = require('fs');

function solve() {
  const input = fs.readFileSync(0, 'utf-8').trim();
  if (!input) return;

  // TODO: Write your algorithm here
  console.log(input);
}

solve();`;
  }
  if (language === 'python') {
    return `import sys

def solve():
    input_data = sys.stdin.read().split()
    if not input_data:
        return

    # TODO: Write your algorithm here
    pass

if __name__ == '__main__':
    solve()`;
  }
  return `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>

using namespace std;

// TODO: Write your algorithm here
void solve() {
    // Read from standard input (cin) and print to standard output (cout)
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    solve();
    return 0;
}`;
}

function generateFallbackChallengeData(
  title: string,
  language: string,
  sampleTestCase?: { input?: string; output?: string }
) {
  const lower = (title + ' ' + (sampleTestCase?.input || '')).toLowerCase();
  const isTwoSum = lower.includes('two sum') || lower.includes('pair sum');
  const isPalindrome = lower.includes('palindrome');
  const isReverse = lower.includes('reverse');
  const isMaxSubarray = lower.includes('max subarray') || lower.includes('maximum subarray') || lower.includes('kadane');
  const isArrayOrIndex = lower.includes('array') || lower.includes('index') || lower.includes('digit') || lower.includes('sum') || lower.includes('nums');

  if (isTwoSum) {
    let starterCode = '';
    if (language === 'javascript') {
      starterCode = `const fs = require('fs');

// Return indices [i, j] of the two numbers that add up to target
function twoSum(nums, target) {
  // TODO: Write your algorithm here
  return [];
}

function main() {
  const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
  if (tokens.length < 2) return;
  const n = parseInt(tokens[0], 10);
  const target = parseInt(tokens[1], 10);
  const nums = tokens.slice(2, 2 + n).map(Number);

  const res = twoSum(nums, target);
  if (res.length >= 2) {
    console.log(\`\${res[0]} \${res[1]}\`);
  }
}

main();`;
    } else if (language === 'python') {
      starterCode = `import sys

def two_sum(nums, target):
    # TODO: Write your algorithm here
    # Return [i, j]
    return []

def main():
    tokens = sys.stdin.read().split()
    if not tokens:
        return
    n = int(tokens[0])
    target = int(tokens[1])
    nums = [int(x) for x in tokens[2:2 + n]]

    ans = two_sum(nums, target)
    if len(ans) >= 2:
        print(f"{ans[0]} {ans[1]}")

if __name__ == '__main__':
    main()`;
    } else {
      starterCode = `#include <iostream>
#include <vector>

using namespace std;

// Returns 0-based indices of two numbers that sum to target
vector<int> twoSum(const vector<int>& nums, int target) {
    // TODO: Write your algorithm here
    return {};
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int n, target;
    if (!(cin >> n >> target)) return 0;

    vector<int> nums(n);
    for (int i = 0; i < n; i++) {
        cin >> nums[i];
    }

    vector<int> result = twoSum(nums, target);
    if (result.size() >= 2) {
        cout << result[0] << " " << result[1] << "\\n";
    }
    return 0;
}`;
    }
    return {
      starterCode,
      testCases: [
        { input: '4 9\\n2 7 11 15', expected_output: '0 1', description: 'Standard case: target sum found in first two elements' },
        { input: '3 6\\n3 2 4', expected_output: '1 2', description: 'Target sum elements in middle and end' },
        { input: '2 6\\n3 3', expected_output: '0 1', description: 'Duplicate numbers adding to target' },
        { input: '4 0\\n-3 4 3 90', expected_output: '0 2', description: 'Negative and positive numbers summing to zero' },
      ],
    };
  }

  if (isPalindrome) {
    let starterCode = '';
    if (language === 'javascript') {
      starterCode = `const fs = require('fs');

function isPalindrome(s) {
  // TODO: Return true if s is a palindrome, false otherwise
  return false;
}

function main() {
  const input = fs.readFileSync(0, 'utf-8').trim();
  if (!input) return;
  console.log(isPalindrome(input) ? 'true' : 'false');
}

main();`;
    } else if (language === 'python') {
      starterCode = `import sys

def is_palindrome(s: str) -> bool:
    # TODO: Return True if s is a palindrome, False otherwise
    return False

def main():
    s = sys.stdin.read().strip()
    if s:
        print("true" if is_palindrome(s) else "false")

if __name__ == '__main__':
    main()`;
    } else {
      starterCode = `#include <iostream>
#include <string>

using namespace std;

bool isPalindrome(const string& s) {
    // TODO: Return true if s is a palindrome, false otherwise
    return false;
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    string s;
    if (cin >> s) {
        cout << (isPalindrome(s) ? "true" : "false") << "\\n";
    }
    return 0;
}`;
    }
    return {
      starterCode,
      testCases: [
        { input: 'racecar', expected_output: 'true', description: 'Odd-length palindrome' },
        { input: 'noon', expected_output: 'true', description: 'Even-length palindrome' },
        { input: 'devcast', expected_output: 'false', description: 'Non-palindrome word' },
        { input: 'a', expected_output: 'true', description: 'Single character boundary case' },
      ],
    };
  }

  if (isReverse) {
    let starterCode = '';
    if (language === 'javascript') {
      starterCode = `const fs = require('fs');

function reverseString(s) {
  // TODO: Reverse the string and return it
  return s;
}

function main() {
  const s = fs.readFileSync(0, 'utf-8').trim();
  if (!s) return;
  console.log(reverseString(s));
}

main();`;
    } else if (language === 'python') {
      starterCode = `import sys

def reverse_string(s: str) -> str:
    # TODO: Reverse the string and return it
    return s

def main():
    s = sys.stdin.read().strip()
    if s:
        print(reverse_string(s))

if __name__ == '__main__':
    main()`;
    } else {
      starterCode = `#include <iostream>
#include <string>

using namespace std;

string reverseString(string s) {
    // TODO: Reverse the string and return it
    return s;
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    string s;
    if (cin >> s) {
        cout << reverseString(s) << "\\n";
    }
    return 0;
}`;
    }
    return {
      starterCode,
      testCases: [
        { input: 'hello', expected_output: 'olleh', description: 'Single word' },
        { input: 'DevCast', expected_output: 'tsaCveD', description: 'Mixed case word' },
        { input: '12345', expected_output: '54321', description: 'Numeric string' },
        { input: 'a', expected_output: 'a', description: 'Single character' },
      ],
    };
  }

  if (isMaxSubarray) {
    let starterCode = '';
    if (language === 'javascript') {
      starterCode = `const fs = require('fs');

function maxSubArray(nums) {
  // TODO: Write your algorithm here
  return 0;
}

function main() {
  const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
  if (tokens.length === 0 || tokens[0] === '') return;
  const n = parseInt(tokens[0], 10);
  const nums = tokens.slice(1, 1 + n).map(Number);
  console.log(maxSubArray(nums));
}

main();`;
    } else if (language === 'python') {
      starterCode = `import sys

def max_subarray(nums):
    # TODO: Write your algorithm here
    return 0

def main():
    tokens = sys.stdin.read().split()
    if not tokens:
        return
    n = int(tokens[0])
    nums = [int(x) for x in tokens[1:1 + n]]
    print(max_subarray(nums))

if __name__ == '__main__':
    main()`;
    } else {
      starterCode = `#include <iostream>
#include <vector>

using namespace std;

long long maxSubArray(const vector<int>& nums) {
    // TODO: Write your algorithm here
    return 0;
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int n;
    if (!(cin >> n)) return 0;
    vector<int> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];

    cout << maxSubArray(nums) << "\\n";
    return 0;
}`;
    }
    return {
      starterCode,
      testCases: [
        { input: '9\\n-2 1 -3 4 -1 2 1 -5 4', expected_output: '6', description: 'Standard Kadane test case' },
        { input: '1\\n1', expected_output: '1', description: 'Single element array' },
        { input: '5\\n5 4 -1 7 8', expected_output: '23', description: 'All positive with one negative' },
        { input: '4\\n-4 -3 -2 -1', expected_output: '-1', description: 'All negative numbers' },
      ],
    };
  }

  // Dynamic Array / Index / Number fallback
  if (isArrayOrIndex) {
    let starterCode = '';
    if (language === 'javascript') {
      starterCode = `const fs = require('fs');

function solve(nums) {
  // TODO: Implement your solution here
  return -1;
}

function main() {
  const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
  if (!tokens || tokens.length === 0 || tokens[0] === '') return;
  const n = parseInt(tokens[0], 10);
  const nums = tokens.slice(1, 1 + n).map(Number);
  console.log(solve(nums));
}

main();`;
    } else if (language === 'python') {
      starterCode = `import sys

def solve(nums):
    # TODO: Implement your solution here
    return -1

def main():
    tokens = sys.stdin.read().split()
    if not tokens:
        return
    n = int(tokens[0])
    nums = [int(x) for x in tokens[1:1 + n]]
    print(solve(nums))

if __name__ == '__main__':
    main()`;
    } else {
      starterCode = `#include <iostream>
#include <vector>

using namespace std;

// TODO: Implement your algorithm here
int solve(const vector<int>& nums) {
    return -1;
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int n;
    if (!(cin >> n)) return 0;

    vector<int> nums(n);
    for (int i = 0; i < n; i++) {
        cin >> nums[i];
    }

    cout << solve(nums) << "\\n";
    return 0;
}`;
    }

    return {
      starterCode,
      testCases: [
        { input: '3\\n1 10 11', expected_output: '1', description: 'Standard sample array case' },
        { input: '4\\n0 5 10 15', expected_output: '0', description: 'Match at first index' },
        { input: '3\\n9 9 9', expected_output: '-1', description: 'No matching element' },
      ],
    };
  }

  // Generic competitive programming fallback
  return {
    starterCode: getStarterTemplate(language),
    testCases: [
      { input: '5', expected_output: '5', description: 'Sample verification case 1' },
      { input: '10', expected_output: '10', description: 'Sample verification case 2' },
      { input: '0', expected_output: '0', description: 'Zero / boundary case 3' },
    ],
  };
}
