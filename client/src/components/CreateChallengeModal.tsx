import { useState } from 'react';
import { X, Code2, Plus, Trash2, Sparkles, Loader2 } from 'lucide-react';
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
    starterCode: `module.exports = function reverseString(str) {\n  // Your code here\n  return str.split('').reverse().join('');\n};`,
    testCases: [
      { id: 'tc-1', input: '"hello"', expectedOutput: '"olleh"', description: 'Single word' },
      { id: 'tc-2', input: '"DevCast"', expectedOutput: '"tsaCveD"', description: 'Mixed casing' },
      { id: 'tc-3', input: '"12345"', expectedOutput: '"54321"', description: 'Numeric string' },
    ],
  },
  python: {
    starterCode: `def reverse_string(s):\n    # Your code here\n    return s[::-1]`,
    testCases: [
      { id: 'tc-1', input: '"hello"', expectedOutput: '"olleh"', description: 'Single word' },
      { id: 'tc-2', input: '"DevCast"', expectedOutput: '"tsaCveD"', description: 'Mixed casing' },
      { id: 'tc-3', input: '"12345"', expectedOutput: '"54321"', description: 'Numeric string' },
    ],
  },
  cpp: {
    starterCode: `#include <iostream>\n#include <string>\n#include <algorithm>\n\nusing namespace std;\n\nint main(int argc, char* argv[]) {\n    if (argc < 2) return 0;\n    string s = argv[1];\n    // Your code here\n    reverse(s.begin(), s.end());\n    cout << s;\n    return 0;\n}`,
    testCases: [
      { id: 'tc-1', input: 'hello', expectedOutput: 'olleh', description: 'Single word' },
      { id: 'tc-2', input: 'DevCast', expectedOutput: 'tsaCveD', description: 'Mixed casing' },
      { id: 'tc-3', input: '12345', expectedOutput: '54321', description: 'Numeric string' },
    ],
  },
};

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

  const handleLanguageChange = (newLanguage: 'javascript' | 'python' | 'cpp') => {
    setLanguage(newLanguage);
    const template = DEFAULT_TEMPLATES[newLanguage];
    if (template) {
      setStarterCode(template.starterCode);
      setTestCaseList(template.testCases);
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
      const generated = await generateTestCases(title, description, language);
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
      setError('AI generation unavailable. Using default templates.');
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
      setError('All test cases must specify both an Input and an Expected Output.');
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
        maxWidth: 620,
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: 28,
        boxShadow: '0 24px 50px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
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
          {/* Title & AI Generate Button */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-300)' }}>Title</label>
              <button
                type="button"
                onClick={handleGenerateWithAI}
                disabled={isGeneratingAI}
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
                {isGeneratingAI ? 'Generating...' : 'Auto-generate test cases'}
              </button>
            </div>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Reverse a String, Two Sum, Palindrome Check"
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
              placeholder="Describe the input, expected behavior, and constraints..."
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
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--gray-300)', marginBottom: 6 }}>
              Starter Code
            </label>
            <textarea
              value={starterCode}
              onChange={e => setStarterCode(e.target.value)}
              rows={4}
              style={{
                width: '100%',
                background: 'var(--gray-950)',
                border: '1px solid var(--gray-800)',
                padding: '10px 14px',
                borderRadius: 8,
                color: 'var(--text-main)',
                fontSize: 13,
                fontFamily: 'var(--font-mono)',
                resize: 'vertical',
                boxSizing: 'border-box',
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
                  Viewer code will be executed in a secure Docker sandbox and checked against these inputs and outputs.
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {testCaseList.map((testCase, index) => (
                <div
                  key={testCase.id}
                  style={{
                    background: 'var(--gray-950)',
                    border: '1px solid var(--gray-800)',
                    borderRadius: 8,
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: 'var(--gray-500)', marginBottom: 4 }}>
                        Input
                      </label>
                      <input
                        type="text"
                        value={testCase.input}
                        onChange={e => handleUpdateTestCase(testCase.id, 'input', e.target.value)}
                        placeholder='e.g. "hello"'
                        style={{
                          width: '100%',
                          background: 'var(--gray-900)',
                          border: '1px solid var(--gray-800)',
                          padding: '6px 10px',
                          borderRadius: 6,
                          color: 'var(--text-main)',
                          fontSize: 12.5,
                          fontFamily: 'var(--font-mono)',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: 'var(--gray-500)', marginBottom: 4 }}>
                        Expected Output
                      </label>
                      <input
                        type="text"
                        value={testCase.expectedOutput}
                        onChange={e => handleUpdateTestCase(testCase.id, 'expectedOutput', e.target.value)}
                        placeholder='e.g. "olleh"'
                        style={{
                          width: '100%',
                          background: 'var(--gray-900)',
                          border: '1px solid var(--gray-800)',
                          padding: '6px 10px',
                          borderRadius: 6,
                          color: 'var(--green-400)',
                          fontSize: 12.5,
                          fontFamily: 'var(--font-mono)',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--gray-500)', marginBottom: 4 }}>
                      Description
                    </label>
                    <input
                      type="text"
                      value={testCase.description}
                      onChange={e => handleUpdateTestCase(testCase.id, 'description', e.target.value)}
                      placeholder="e.g. Reversing standard alphabetic string"
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
