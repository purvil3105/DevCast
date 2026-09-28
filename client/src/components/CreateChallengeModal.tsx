import { useState } from 'react';
import { X, Code2, Plus, Trash2, Sparkles, Loader2, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { createChallenge, generateTestCases } from '../lib/api';

interface CreateChallengeModalProps {
  courseId: string;
  onClose: () => void;
  onCreated: (challenge: any) => void;
}

interface TestCaseItem {
  id: string;
  input: string;
  expectedOutput: string;
  description: string;
}

const DEFAULT_TEMPLATES: Record<string, { starterCode: string; testCases: TestCaseItem[] }> = {
  javascript: {
    starterCode: `const fs = require('fs');

function solve() {
  const input = fs.readFileSync(0, 'utf-8').trim();
  if (!input) return;

  // TODO: Implement your solution here
  console.log(input);
}

solve();`,
    testCases: [
      { id: 'tc-1', input: '', expectedOutput: '', description: 'Test case 1' },
    ],
  },
  python: {
    starterCode: `import sys

def solve():
    s = sys.stdin.read().strip()
    if not s:
        return

    # TODO: Implement your solution here
    print(s)

if __name__ == '__main__':
    solve()`,
    testCases: [
      { id: 'tc-1', input: '', expectedOutput: '', description: 'Test case 1' },
    ],
  },
  cpp: {
    starterCode: `#include <iostream>
#include <vector>
#include <string>

using namespace std;

// TODO: Implement your algorithm here
void solve() {
    // Read from standard input (cin) and print to standard output (cout)
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    solve();
    return 0;
}`,
    testCases: [
      { id: 'tc-1', input: '', expectedOutput: '', description: 'Test case 1' },
    ],
  },
};

const TOPIC_PRESETS = [
  {
    id: 'two-sum',
    label: 'Two Sum',
    title: 'Two Sum',
    description: 'Given an array of integers nums and an integer target, return 0-based indices of the two numbers such that they add up to target. Output the indices separated by a space.',
    cases: [
      { input: '4 9\n2 7 11 15', expectedOutput: '0 1', description: 'Standard case: target sum found in first two elements' },
      { input: '3 6\n3 2 4', expectedOutput: '1 2', description: 'Target sum elements in middle and end' },
      { input: '2 6\n3 3', expectedOutput: '0 1', description: 'Duplicate numbers adding to target' },
      { input: '4 0\n-3 4 3 90', expectedOutput: '0 2', description: 'Negative and positive numbers summing to zero' },
    ],
    starterCodes: {
      javascript: `const fs = require('fs');

// Return 0-based indices [i, j] of the two numbers that add up to target
function twoSum(nums, target) {
  // TODO: Implement your algorithm here
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

main();`,
      python: `import sys

def two_sum(nums, target):
    # TODO: Implement your algorithm here
    # Return a list of two indices [i, j]
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
    main()`,
      cpp: `#include <iostream>
#include <vector>

using namespace std;

// Returns 0-based indices of two numbers that sum to target
vector<int> twoSum(const vector<int>& nums, int target) {
    // TODO: Implement your algorithm here
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
}`,
    },
  },
  {
    id: 'max-subarray',
    label: 'Max Subarray',
    title: 'Maximum Subarray (Kadane)',
    description: 'Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and print its sum.',
    cases: [
      { input: '9\n-2 1 -3 4 -1 2 1 -5 4', expectedOutput: '6', description: 'Standard Kadane test case' },
      { input: '1\n1', expectedOutput: '1', description: 'Single element array' },
      { input: '5\n5 4 -1 7 8', expectedOutput: '23', description: 'All positive with one negative' },
      { input: '4\n-4 -3 -2 -1', expectedOutput: '-1', description: 'All negative numbers' },
    ],
    starterCodes: {
      javascript: `const fs = require('fs');

function maxSubArray(nums) {
  // TODO: Implement your algorithm here
  return 0;
}

function main() {
  const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
  if (tokens.length === 0 || tokens[0] === '') return;
  const n = parseInt(tokens[0], 10);
  const nums = tokens.slice(1, 1 + n).map(Number);
  console.log(maxSubArray(nums));
}

main();`,
      python: `import sys

def max_subarray(nums):
    # TODO: Implement your algorithm here
    return 0

def main():
    tokens = sys.stdin.read().split()
    if not tokens:
        return
    n = int(tokens[0])
    nums = [int(x) for x in tokens[1:1 + n]]
    print(max_subarray(nums))

if __name__ == '__main__':
    main()`,
      cpp: `#include <iostream>
#include <vector>

using namespace std;

long long maxSubArray(const vector<int>& nums) {
    // TODO: Implement your algorithm here
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
}`,
    },
  },
  {
    id: 'palindrome',
    label: 'Palindrome Check',
    title: 'Palindrome String Check',
    description: 'Determine if a given string is a palindrome. Print "true" if it reads the same backwards, and "false" otherwise.',
    cases: [
      { input: 'racecar', expectedOutput: 'true', description: 'Odd-length palindrome' },
      { input: 'noon', expectedOutput: 'true', description: 'Even-length palindrome' },
      { input: 'devcast', expectedOutput: 'false', description: 'Non-palindrome word' },
      { input: 'a', expectedOutput: 'true', description: 'Single character boundary case' },
    ],
    starterCodes: {
      javascript: `const fs = require('fs');

function isPalindrome(s) {
  // TODO: Return true if s is a palindrome, false otherwise
  return false;
}

function main() {
  const input = fs.readFileSync(0, 'utf-8').trim();
  if (!input) return;
  console.log(isPalindrome(input) ? 'true' : 'false');
}

main();`,
      python: `import sys

def is_palindrome(s: str) -> bool:
    # TODO: Return True if s is a palindrome, False otherwise
    return False

def main():
    s = sys.stdin.read().strip()
    if s:
        print("true" if is_palindrome(s) else "false")

if __name__ == '__main__':
    main()`,
      cpp: `#include <iostream>
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
}`,
    },
  },
  {
    id: 'reverse-string',
    label: 'Reverse String',
    title: 'Reverse a String',
    description: 'Write a program that takes a string input from standard input and prints the string reversed.',
    cases: [
      { input: 'hello', expectedOutput: 'olleh', description: 'Single word' },
      { input: 'DevCast', expectedOutput: 'tsaCveD', description: 'Mixed casing' },
      { input: '12345', expectedOutput: '54321', description: 'Numeric string' },
      { input: 'a', expectedOutput: 'a', description: 'Single character' },
    ],
    starterCodes: {
      javascript: `const fs = require('fs');

function reverseString(s) {
  // TODO: Reverse the string and return it
  return '';
}

function main() {
  const s = fs.readFileSync(0, 'utf-8').trim();
  if (!s) return;
  console.log(reverseString(s));
}

main();`,
      python: `import sys

def reverse_string(s: str) -> str:
    # TODO: Reverse the string and return it
    return ''

def main():
    s = sys.stdin.read().strip()
    if s:
        print(reverse_string(s))

if __name__ == '__main__':
    main()`,
      cpp: `#include <iostream>
#include <string>

using namespace std;

string reverseString(string s) {
    // TODO: Reverse the string and return it
    return "";
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    string s;
    if (cin >> s) {
        cout << reverseString(s) << "\\n";
    }
    return 0;
}`,
    },
  },
];

export function CreateChallengeModal({ courseId, onClose, onCreated }: CreateChallengeModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState<'javascript' | 'python' | 'cpp'>('javascript');
  const [durationSeconds, setDurationSeconds] = useState(120);
  const [starterCode, setStarterCode] = useState(DEFAULT_TEMPLATES.javascript.starterCode);
  const [testCaseList, setTestCaseList] = useState<TestCaseItem[]>(DEFAULT_TEMPLATES.javascript.testCases);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [error, setError] = useState('');

  // Optional guidance sample for AI
  const [showSampleGuidance, setShowSampleGuidance] = useState(false);
  const [guideSampleInput, setGuideSampleInput] = useState('');
  const [guideSampleOutput, setGuideSampleOutput] = useState('');

  const handleLanguageChange = (newLanguage: 'javascript' | 'python' | 'cpp') => {
    setLanguage(newLanguage);

    const matchedPreset = TOPIC_PRESETS.find(p => p.title.toLowerCase() === title.trim().toLowerCase());
    if (matchedPreset && matchedPreset.starterCodes[newLanguage]) {
      setStarterCode(matchedPreset.starterCodes[newLanguage]);
      return;
    }

    const template = DEFAULT_TEMPLATES[newLanguage];
    if (template) {
      setStarterCode(template.starterCode);
    }
  };

  const handleApplyPreset = (preset: typeof TOPIC_PRESETS[0]) => {
    setTitle(preset.title);
    setDescription(preset.description);
    setTestCaseList(
      preset.cases.map((c, i) => ({
        id: `tc-preset-${Date.now()}-${i}`,
        input: c.input,
        expectedOutput: c.expectedOutput,
        description: c.description,
      }))
    );
    if (preset.starterCodes && preset.starterCodes[language]) {
      setStarterCode(preset.starterCodes[language]);
    }
  };

  const handleAddTestCase = () => {
    const newId = `tc-${Date.now()}`;
    setTestCaseList(prev => [
      ...prev,
      { id: newId, input: '', expectedOutput: '', description: `Test case ${prev.length + 1}` },
    ]);
  };

  const handleRemoveTestCase = (id: string) => {
    if (testCaseList.length <= 1) {
      setError('A challenge must have at least one test case.');
      return;
    }
    setTestCaseList(prev => prev.filter(tc => tc.id !== id));
  };

  const handleUpdateTestCase = (id: string, field: keyof TestCaseItem, value: string) => {
    setTestCaseList(prev =>
      prev.map(tc => (tc.id === id ? { ...tc, [field]: value } : tc))
    );
  };

  const handleGenerateWithAI = async () => {
    if (!title.trim()) {
      setError('Please enter a challenge title first to auto-generate test cases.');
      return;
    }

    setIsGeneratingAI(true);
    setError('');

    try {
      // Only send sample if explicitly filled in the guidance section
      const sampleInput = guideSampleInput.trim() ? guideSampleInput.trim() : undefined;
      const sampleOutput = guideSampleOutput.trim() ? guideSampleOutput.trim() : undefined;

      const generated = await generateTestCases(
        title,
        description,
        language,
        sampleInput,
        sampleOutput
      );

      if (generated.starterCode) {
        setStarterCode(generated.starterCode);
      }
      if (Array.isArray(generated.testCases) && generated.testCases.length > 0) {
        setTestCaseList(
          generated.testCases.map((tc, index) => ({
            id: `tc-${Date.now()}-${index}`,
            input: tc.input,
            expectedOutput: tc.expected_output,
            description: tc.description || `Case ${index + 1}`,
          }))
        );
      }
    } catch (err: any) {
      setError('AI generation unavailable. Using smart default templates.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }

    if (testCaseList.length === 0) {
      setError('Please add at least one test case.');
      return;
    }

    // Verify all test cases have input and expected output
    const hasEmptyField = testCaseList.some(tc => !tc.input.trim() || !tc.expectedOutput.trim());
    if (hasEmptyField) {
      setError('All test cases must specify both Standard Input and Expected Output.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const formattedTestCases = testCaseList.map(tc => ({
        input: tc.input.trim(),
        expected_output: tc.expectedOutput.trim(),
        description: tc.description.trim() || 'Verification case',
      }));

      const challenge = await createChallenge({
        courseId,
        title: title.trim(),
        description: description.trim(),
        language,
        starterCode: starterCode.trim(),
        config: {
          test_cases: formattedTestCases,
          time_limit_ms: 5000,
          memory_limit_mb: 128,
          durationSeconds,
        },
        staticHints: [
          'Verify your edge cases and check parameter bounds.',
          'Consider the time and space complexity of your approach.',
        ],
      });
      onCreated(challenge);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create challenge.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: 20,
    }}>
      <div style={{
        background: 'var(--gray-900)',
        border: '1px solid var(--gray-800)',
        borderRadius: 14,
        width: '100%',
        maxWidth: 720,
        maxHeight: '92vh',
        overflowY: 'auto',
        padding: 28,
        boxShadow: '0 24px 50px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--indigo-500-10)',
              color: 'var(--indigo-500)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Code2 size={18} />
            </span>
            Create Custom Challenge
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--gray-400)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '10px 14px',
            borderRadius: 8,
            fontSize: 13.5,
            marginBottom: 18,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Quick Problem Presets */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--gray-800)',
            borderRadius: 8,
            padding: '10px 12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Layers size={13} style={{ color: 'var(--indigo-400)' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-300)' }}>
                Quick Presets (Starter template skeletons & test cases)
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {TOPIC_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: title === preset.title ? 'var(--indigo-500-20)' : 'var(--gray-800)',
                    border: `1px solid ${title === preset.title ? 'var(--indigo-500)' : 'var(--gray-700)'}`,
                    color: title === preset.title ? 'var(--indigo-300)' : 'var(--gray-300)',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title & AI Generate Button */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-300)' }}>Title</label>
              <button
                type="button"
                onClick={handleGenerateWithAI}
                disabled={isGeneratingAI}
                title="AI analyzes your Title and Description to generate starter skeleton code and full edge test cases"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'var(--indigo-500-10)',
                  border: '1px solid var(--border-brand)',
                  color: 'var(--indigo-400)',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: isGeneratingAI ? 'not-allowed' : 'pointer',
                  transition: 'all 160ms ease',
                }}
              >
                {isGeneratingAI ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                {isGeneratingAI ? 'Analyzing & Generating...' : 'Auto-generate test cases'}
              </button>
            </div>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Smallest index with digit sum equal to index, Two Sum, Kadane"
              style={{
                width: '100%',
                background: 'var(--gray-950)',
                border: '1px solid var(--gray-800)',
                padding: '10px 14px',
                borderRadius: 8,
                color: 'var(--text-main)',
                fontSize: 14,
                boxSizing: 'border-box',
              }}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--gray-300)', marginBottom: 6 }}>
              Description & Constraints
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the input format, output format, and problem constraints..."
              rows={3}
              style={{
                width: '100%',
                background: 'var(--gray-950)',
                border: '1px solid var(--gray-800)',
                padding: '10px 14px',
                borderRadius: 8,
                color: 'var(--text-main)',
                fontSize: 13.5,
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
              required
            />
          </div>

          {/* Optional Sample Guidance for AI */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed var(--gray-800)',
            borderRadius: 8,
            padding: '10px 14px',
          }}>
            <button
              type="button"
              onClick={() => setShowSampleGuidance(!showSampleGuidance)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--indigo-400)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: 0,
              }}
            >
              {showSampleGuidance ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              <span>Have a specific sample test case in mind? (Optional: guide AI with 1 example)</span>
            </button>

            {showSampleGuidance && (
              <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--gray-400)', marginBottom: 4 }}>
                    Sample Input (e.g., 3\n1 10 11)
                  </label>
                  <textarea
                    rows={2}
                    value={guideSampleInput}
                    onChange={e => setGuideSampleInput(e.target.value)}
                    placeholder="Enter sample stdin input..."
                    style={{
                      width: '100%',
                      background: 'var(--gray-900)',
                      border: '1px solid var(--gray-800)',
                      padding: '6px 10px',
                      borderRadius: 6,
                      color: 'var(--text-main)',
                      fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--gray-400)', marginBottom: 4 }}>
                    Sample Expected Output (e.g., 1)
                  </label>
                  <textarea
                    rows={2}
                    value={guideSampleOutput}
                    onChange={e => setGuideSampleOutput(e.target.value)}
                    placeholder="Enter expected stdout result..."
                    style={{
                      width: '100%',
                      background: 'var(--gray-900)',
                      border: '1px solid var(--gray-800)',
                      padding: '6px 10px',
                      borderRadius: 6,
                      color: 'var(--green-400)',
                      fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Language & Duration */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--gray-300)', marginBottom: 6 }}>
                Language
              </label>
              <select
                value={language}
                onChange={e => handleLanguageChange(e.target.value as any)}
                style={{
                  width: '100%',
                  background: 'var(--gray-950)',
                  border: '1px solid var(--gray-800)',
                  padding: '10px 12px',
                  borderRadius: 8,
                  color: 'var(--text-main)',
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              >
                <option value="javascript">JavaScript (Node 20)</option>
                <option value="python">Python (3.11)</option>
                <option value="cpp">C++ (GCC 13)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--gray-300)', marginBottom: 6 }}>
                Duration (Seconds)
              </label>
              <input
                type="number"
                value={durationSeconds}
                onChange={e => setDurationSeconds(Number(e.target.value))}
                min={30}
                max={3600}
                style={{
                  width: '100%',
                  background: 'var(--gray-950)',
                  border: '1px solid var(--gray-800)',
                  padding: '10px 12px',
                  borderRadius: 8,
                  color: 'var(--text-main)',
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Starter Code */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-300)' }}>
                Starter Code (Skeleton for Students)
              </label>
              <span style={{ fontSize: 11, color: 'var(--gray-500)' }}>
                Compiles once & executes test cases in milliseconds
              </span>
            </div>
            <textarea
              value={starterCode}
              onChange={e => setStarterCode(e.target.value)}
              rows={6}
              style={{
                width: '100%',
                background: 'var(--gray-950)',
                border: '1px solid var(--gray-800)',
                padding: '10px 14px',
                borderRadius: 8,
                color: 'var(--text-main)',
                fontSize: 12.5,
                fontFamily: 'var(--font-mono)',
                resize: 'vertical',
                boxSizing: 'border-box',
                lineHeight: 1.45,
              }}
            />
          </div>

          {/* Test Cases Editor */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-300)' }}>
                  Test Cases & Verification ({testCaseList.length})
                </span>
                <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--gray-500)' }}>
                  Inputs are piped into standard input (stdin). Outputs are captured from stdout and checked.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddTestCase}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '5px 10px',
                  borderRadius: 6,
                  background: 'var(--gray-800)',
                  border: '1px solid var(--gray-700)',
                  color: 'var(--gray-300)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Plus size={13} /> Add Case
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {testCaseList.map((testCase, index) => (
                <div
                  key={testCase.id}
                  style={{
                    background: 'var(--gray-950)',
                    border: '1px solid var(--gray-800)',
                    borderRadius: 8,
                    padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--indigo-400)', fontFamily: 'var(--font-mono)' }}>
                      Case #{index + 1}
                    </span>
                    {testCaseList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTestCase(testCase.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--red-400)',
                          cursor: 'pointer',
                          padding: 2,
                        }}
                        title="Delete test case"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {/* Multi-line Standard Input & Output */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-400)' }}>
                          Standard Input (stdin)
                        </label>
                        <span style={{ fontSize: 10, color: 'var(--gray-500)' }}>Multi-line supported</span>
                      </div>
                      <textarea
                        rows={3}
                        value={testCase.input}
                        onChange={e => handleUpdateTestCase(testCase.id, 'input', e.target.value)}
                        placeholder="e.g.&#10;4 9&#10;2 7 11 15"
                        style={{
                          width: '100%',
                          background: 'var(--gray-900)',
                          border: '1px solid var(--gray-800)',
                          padding: '8px 10px',
                          borderRadius: 6,
                          color: 'var(--text-main)',
                          fontSize: 12,
                          fontFamily: 'var(--font-mono)',
                          resize: 'vertical',
                          boxSizing: 'border-box',
                          lineHeight: 1.4,
                        }}
                      />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--green-400)' }}>
                          Expected Output (stdout)
                        </label>
                        <span style={{ fontSize: 10, color: 'var(--gray-500)' }}>Exact match</span>
                      </div>
                      <textarea
                        rows={3}
                        value={testCase.expectedOutput}
                        onChange={e => handleUpdateTestCase(testCase.id, 'expectedOutput', e.target.value)}
                        placeholder="e.g.&#10;0 1"
                        style={{
                          width: '100%',
                          background: 'var(--gray-900)',
                          border: '1px solid var(--gray-800)',
                          padding: '8px 10px',
                          borderRadius: 6,
                          color: 'var(--green-400)',
                          fontSize: 12,
                          fontFamily: 'var(--font-mono)',
                          resize: 'vertical',
                          boxSizing: 'border-box',
                          lineHeight: 1.4,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--gray-500)', marginBottom: 4 }}>
                      Case Description / Boundary Focus
                    </label>
                    <input
                      type="text"
                      value={testCase.description}
                      onChange={e => handleUpdateTestCase(testCase.id, 'description', e.target.value)}
                      placeholder="e.g. Standard case, Negative numbers, Empty array, Duplicates"
                      style={{
                        width: '100%',
                        background: 'var(--gray-900)',
                        border: '1px solid var(--gray-800)',
                        padding: '6px 10px',
                        borderRadius: 6,
                        color: 'var(--gray-300)',
                        fontSize: 12,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10, paddingTop: 14, borderTop: '1px solid var(--gray-800)' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 18px',
                background: 'transparent',
                border: '1px solid var(--gray-700)',
                color: 'var(--gray-300)',
                borderRadius: 8,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-create-stream"
              style={{
                padding: '9px 22px',
                fontSize: 14,
                fontWeight: 600,
                opacity: isSubmitting ? 0.7 : 1,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? 'Creating...' : 'Create Challenge'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
