import { useState } from 'react';
import { X, Code2 } from 'lucide-react';
import { createChallenge } from '../lib/api';

interface CreateChallengeModalProps {
  courseId: string;
  onClose: () => void;
  onCreated: (challenge: any) => void;
}

export function CreateChallengeModal({ courseId, onClose, onCreated }: CreateChallengeModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [durationSeconds, setDurationSeconds] = useState(120);
  const [starterCode, setStarterCode] = useState('module.exports = function mySolution() {\n  // Your code here\n};');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      setError('Title and description are required.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const challenge = await createChallenge({
        courseId,
        title,
        description,
        language,
        starterCode,
        config: {
          test_cases: [
            {
              input: '1, 2',
              expected_output: '3',
              description: 'Default test case'
            }
          ],
          time_limit_ms: 5000,
          memory_limit_mb: 128,
          durationSeconds,
        },
        staticHints: ['Consider looking at the problem from a different angle.'],
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
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
    }}>
      <div style={{
        background: 'var(--gray-900)',
        border: '1px solid var(--gray-800)',
        borderRadius: 12,
        width: '100%',
        maxWidth: 500,
        padding: 24,
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--gray-100)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Code2 size={20} color="var(--indigo-400)" />
            Create Custom Challenge
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--gray-400)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--red-400)', padding: '10px 12px', borderRadius: 8, fontSize: 14, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--gray-400)', marginBottom: 6 }}>Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Reverse a String"
              style={{ width: '100%', background: 'var(--gray-900)', border: '1px solid var(--gray-800)', padding: '10px 12px', borderRadius: 8, color: 'var(--text-main)', fontSize: 14 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--gray-400)', marginBottom: 6 }}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Explain the problem here..."
              rows={3}
              style={{ width: '100%', background: 'var(--gray-900)', border: '1px solid var(--gray-800)', padding: '10px 12px', borderRadius: 8, color: 'var(--text-main)', fontSize: 14, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--gray-400)', marginBottom: 6 }}>Language</label>
              <select
                value={language}
                onChange={e => {
                  setLanguage(e.target.value);
                  if (e.target.value === 'javascript') setStarterCode('module.exports = function mySolution() {\n  // Your code here\n};');
                  if (e.target.value === 'python') setStarterCode('def my_solution(*args):\n    # Your code here\n    pass');
                  if (e.target.value === 'cpp') setStarterCode('#include <iostream>\n#include <string>\n\nusing namespace std;\n\nint main(int argc, char* argv[]) {\n    // Your code here\n    // Parse argv[1] and print the result\n    return 0;\n}');
                }}
                style={{ width: '100%', background: 'var(--gray-900)', border: '1px solid var(--gray-800)', padding: '10px 12px', borderRadius: 8, color: 'var(--text-main)', fontSize: 14 }}
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="cpp">C++</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--gray-400)', marginBottom: 6 }}>Duration (Seconds)</label>
              <input
                type="number"
                value={durationSeconds}
                onChange={e => setDurationSeconds(Number(e.target.value))}
                min={30}
                max={3600}
                style={{ width: '100%', background: 'var(--gray-900)', border: '1px solid var(--gray-800)', padding: '10px 12px', borderRadius: 8, color: 'var(--text-main)', fontSize: 14 }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--gray-400)', marginBottom: 6 }}>Starter Code</label>
            <textarea
              value={starterCode}
              onChange={e => setStarterCode(e.target.value)}
              rows={4}
              style={{ width: '100%', background: 'var(--gray-900)', border: '1px solid var(--gray-800)', padding: '10px 12px', borderRadius: 8, color: 'var(--text-main)', fontSize: 14, fontFamily: 'var(--font-mono)', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--gray-700)', color: 'var(--gray-300)', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: '8px 18px', background: 'linear-gradient(135deg, var(--indigo-500), var(--indigo-600))', border: 'none', color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1, boxShadow: 'var(--glow-violet)' }}
            >
              {isSubmitting ? 'Creating...' : 'Create Challenge'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
