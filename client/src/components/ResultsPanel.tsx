
import { CheckCircle2, XCircle, Sparkles, Trophy, Loader2 } from 'lucide-react';
import type { MySubmission } from '../hooks/useStreamState';

interface ResultsPanelProps {
  submission: MySubmission | null;
  onViewLeaderboard?: () => void;
}

/**
 * Results panel: test case results + AI hint slide-in.
 * Matches the prototype's Workspace bottom panel.
 */
export function ResultsPanel({ submission, onViewLeaderboard }: ResultsPanelProps) {
  if (!submission) {
    return (
      <div style={{
        height: 200,
        background: 'var(--gray-900)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          borderBottom: '1px solid var(--gray-800)',
          background: 'rgba(10, 11, 15, 0.5)',
        }}>
          <h3 style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--gray-400)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            margin: 0,
          }}>
            Console & Results
          </h3>
        </div>
        <div style={{
          padding: 16,
          fontSize: 14,
          fontFamily: 'var(--font-mono)',
          color: 'var(--gray-500)',
        }}>
          &gt; Ready. Awaiting submission...
        </div>
      </div>
    );
  }

  const testResults = submission.testResults;
  const hasHint = !!submission.aiHint;
  const isWaitingForHint = submission.status !== 'ai_evaluated' && !submission.aiHint;

  return (
    <div style={{
      height: 240,
      background: 'var(--gray-900)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        borderBottom: '1px solid var(--gray-800)',
        background: 'rgba(10, 11, 15, 0.5)',
      }}>
        <h3 style={{
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--gray-400)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          margin: 0,
        }}>
          Console & Results
        </h3>
        {onViewLeaderboard && (
          <button
            onClick={onViewLeaderboard}
            style={{
              fontSize: 12,
              color: 'var(--indigo-400)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontWeight: 500,
              background: 'var(--indigo-500-10)',
              padding: '4px 8px',
              borderRadius: 4,
              transition: 'all 0.2s',
            }}
          >
            <Trophy size={12} />
            View Leaderboard
          </button>
        )}
      </div>

      {/* Content area */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
      }}>
        {/* Test Results */}
        <div style={{
          flex: hasHint || isWaitingForHint ? '0 0 50%' : '1 1 100%',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          overflowY: 'auto',
          borderRight: (hasHint || isWaitingForHint) ? '1px solid var(--gray-800)' : 'none',
          transition: 'flex 0.5s var(--ease-out)',
        }}>
          {testResults && testResults.cases?.map((tc, i) => (
            <div key={i}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: tc.passed ? 'var(--green-400)' : 'var(--red-400)',
                opacity: tc.passed ? 0.6 : 1,
              }}>
                {tc.passed ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                <span>Test Case {i + 1}: {tc.passed ? 'Passed' : 'Failed'}</span>
              </div>
              {!tc.passed && (tc.expected || tc.error) && (
                <div style={{
                  marginLeft: 24,
                  marginTop: 4,
                  fontSize: 12,
                  color: 'var(--gray-400)',
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: 8,
                  borderRadius: 4,
                  border: '1px solid rgba(30, 32, 40, 0.5)',
                }}>
                  {tc.error ? (
                    <span>Error: {tc.error}</span>
                  ) : (
                    <>
                      Expected: {JSON.stringify(tc.expected)}<br />
                      Received: {JSON.stringify(tc.actual)}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}

          {testResults && (
            <div style={{
              marginTop: 8,
              padding: '8px 12px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              background: testResults.passed === testResults.total
                ? 'rgba(34, 197, 94, 0.1)'
                : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${testResults.passed === testResults.total
                ? 'rgba(34, 197, 94, 0.2)'
                : 'rgba(239, 68, 68, 0.2)'}`,
              color: testResults.passed === testResults.total
                ? 'var(--green-400)'
                : 'var(--red-400)',
            }}>
              {testResults.passed}/{testResults.total} tests passed
            </div>
          )}
        </div>

        {/* AI Hint Panel */}
        {(hasHint || isWaitingForHint) && (
          <div style={{
            flex: '0 0 50%',
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(49, 46, 129, 0.08)',
            animation: 'slideInRight 0.5s var(--ease-out)',
          }}>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: 'var(--indigo-400)',
                marginBottom: 12,
              }}>
                <Sparkles size={16} className={isWaitingForHint ? 'animate-pulse' : ''} />
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  AI Assistant
                </span>
              </div>

              {isWaitingForHint ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 12,
                  background: 'rgba(49, 46, 129, 0.15)',
                  borderRadius: 8,
                  border: '1px solid var(--indigo-500-20)',
                  fontSize: 13,
                  color: 'var(--gray-400)',
                }}>
                  <Loader2 size={16} className="animate-spin" style={{ color: 'var(--indigo-400)' }} />
                  Analyzing your code...
                </div>
              ) : (
                <p style={{
                  fontSize: 13,
                  color: 'var(--gray-300)',
                  lineHeight: 1.6,
                  background: 'rgba(49, 46, 129, 0.15)',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid var(--indigo-500-20)',
                  boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.1)',
                  margin: 0,
                }}>
                  {submission.aiHint}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
