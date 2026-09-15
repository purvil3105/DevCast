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
    cases: Array<{ passed: boolean; actual?: any; expected?: any; error?: string }>;
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
    .map((c) => `Input: ${c.expected} → Expected: ${c.expected}, Got: ${c.actual || c.error || 'error'}`)
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

      // Use circuit breaker with static hint fallback
      const hint = await aiCircuitBreaker.call(
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

  aiWorker.on('failed', (job, err) => {
    console.error(`❌ AI evaluation failed for job ${job?.id}:`, err.message);
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
