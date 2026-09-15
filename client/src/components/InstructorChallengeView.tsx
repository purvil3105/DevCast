import { useEffect, useState, useCallback } from 'react';
import { Timer, ChevronRight, Trophy, StopCircle, Code2, Eye } from 'lucide-react';
import { Leaderboard } from './Leaderboard';
import { CodeEditor } from './CodeEditor';
import { revealSolution } from '../lib/api';

interface TestCase {
  input: string;
  expected_output: string;
  description?: string;
}

interface Challenge {
  id: string;
  sessionId: string;
  title: string;
  description: string;
  language: string;
  starterCode: string;
  startedAt: number;      // UTC ms
  durationSeconds: number;
  testCases?: TestCase[];
}

interface InstructorChallengeViewProps {
  streamId: string;
  challenge: Challenge;
  serverTimeOffset: number;
  onEndChallenge: () => void;
  isEndingChallenge: boolean;
}

/**
 * Instructor view during an active challenge.
 * Shows: countdown timer + challenge info + live leaderboard + Solution Editor.
 */
export function InstructorChallengeView({
  streamId,
  challenge,
  serverTimeOffset,
  onEndChallenge,
  isEndingChallenge,
}: InstructorChallengeViewProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'details' | 'solution'>('leaderboard');
  
  // Solution Editor State
  const [solutionCode, setSolutionCode] = useState(challenge.starterCode || '');
  const [isRevealing, setIsRevealing] = useState(false);
  const [hasRevealed, setHasRevealed] = useState(false);

  // ─── Countdown ────────────────────────────────────────────────
  const tick = useCallback(() => {
    const now = Date.now() + serverTimeOffset;
    const end = challenge.startedAt + challenge.durationSeconds * 1000;
    const diff = Math.max(0, Math.floor((end - now) / 1000));
    setSecondsLeft(diff);
    setIsExpired(diff === 0);
  }, [challenge.startedAt, challenge.durationSeconds, serverTimeOffset]);

  useEffect(() => {
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);

  const handleRevealSolution = async () => {
    if (!solutionCode.trim()) return;
    
    // If it was already revealed, we want to "Hide" it.
    // For now, if we hide, we just send an empty code to un-reveal.
    setIsRevealing(true);
    try {
      if (hasRevealed) {
        await revealSolution(streamId, '');
        setHasRevealed(false);
      } else {
        await revealSolution(streamId, solutionCode);
        setHasRevealed(true);
      }
    } catch (err) {
      console.error('Failed to reveal/hide solution:', err);
      alert('Failed to reveal/hide solution');
    } finally {
      setIsRevealing(false);
    }
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  const timerColor = isExpired
    ? 'var(--red-400)'
    : secondsLeft <= 30
    ? 'var(--yellow-400)'
    : secondsLeft <= 60
    ? 'var(--yellow-400)'
    : 'var(--green-400)';

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
      background: 'var(--gray-950)',
    }}>
      {/* ─── Top Bar ─────────────────────────────────────────── */}
      <div style={{
        background: 'var(--gray-900)',
        borderBottom: '1px solid var(--gray-800)',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        {/* Challenge title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            padding: '3px 8px',
            background: 'var(--indigo-500-10)',
            border: '1px solid var(--indigo-500-30)',
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--indigo-400)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            Live Challenge
          </span>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-main)' }}>
            {challenge.title}
          </h2>
        </div>

        {/* Timer + End button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Countdown */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--gray-800)',
            border: `1px solid var(--gray-700)`,
            borderRadius: 8,
            padding: '6px 12px',
          }}>
            <Timer size={14} style={{ color: timerColor }} />
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: 16,
              color: timerColor,
              letterSpacing: '0.05em',
            }}>
              {isExpired ? 'TIME\'S UP' : `${pad(minutes)}:${pad(seconds)}`}
            </span>
          </div>

          {/* End Challenge */}
          <button
            onClick={onEndChallenge}
            disabled={isEndingChallenge}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              background: isEndingChallenge ? 'var(--gray-800)' : 'var(--red-500-10)',
              border: `1px solid ${isEndingChallenge ? 'var(--gray-700)' : 'var(--red-500-30)'}`,
              borderRadius: 8,
              color: isEndingChallenge ? 'var(--gray-500)' : 'var(--red-400)',
              fontSize: 13,
              fontWeight: 600,
              cursor: isEndingChallenge ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <StopCircle size={14} />
            {isEndingChallenge ? 'Ending...' : 'End Challenge'}
          </button>
        </div>
      </div>

      {/* ─── Tab Nav ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--gray-800)',
        background: 'var(--gray-900)',
        flexShrink: 0,
      }}>
        {(['leaderboard', 'details', 'solution'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? 'var(--text-main)' : 'var(--gray-500)',
              borderBottom: activeTab === tab ? '2px solid var(--indigo-500)' : '2px solid transparent',
              background: 'transparent',
              cursor: 'pointer',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {tab === 'leaderboard' && <Trophy size={14} />}
            {tab === 'details' && <ChevronRight size={14} />}
            {tab === 'solution' && <Code2 size={14} />}
            {tab === 'leaderboard' ? 'Live Leaderboard' : tab === 'details' ? 'Challenge Details' : 'Solution Editor'}
          </button>
        ))}
      </div>

      {/* ─── Content ─────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'leaderboard' ? (
          <Leaderboard sessionId={challenge.sessionId} />
        ) : activeTab === 'solution' ? (
          /* Solution Editor panel */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: '16px 24px', background: 'var(--gray-900)', borderBottom: '1px solid var(--gray-800)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
               <div>
                 <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>Reference Solution</h3>
                 <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--gray-500)' }}>Write or paste the correct solution here. You can reveal it to viewers at any time.</p>
               </div>
               <button
                 onClick={handleRevealSolution}
                 disabled={isRevealing || !solutionCode.trim()}
                 style={{
                   display: 'flex', alignItems: 'center', gap: 6,
                   padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                   background: hasRevealed ? 'var(--gray-800)' : 'var(--indigo-600)',
                   color: hasRevealed ? 'var(--gray-400)' : 'white',
                   cursor: (isRevealing || !solutionCode.trim()) ? 'not-allowed' : 'pointer',
                   opacity: (isRevealing || !solutionCode.trim()) ? 0.6 : 1,
                   border: hasRevealed ? '1px solid var(--gray-700)' : 'none',
                 }}
               >
                 <Eye size={16} />
                 {isRevealing ? 'Revealing...' : hasRevealed ? 'Hide Solution' : 'Reveal Solution to Viewers'}
               </button>
            </div>
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <CodeEditor
                 code={solutionCode}
                 onChange={setSolutionCode}
                 language={challenge.language}
              />
            </div>
          </div>
        ) : (
          /* Challenge details panel */
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <section style={{ marginBottom: 28 }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray-500)' }}>
                Description
              </h3>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: 'var(--gray-300)', background: 'var(--gray-900)', padding: '14px 16px', borderRadius: 8, border: '1px solid var(--gray-800)' }}>
                {challenge.description}
              </p>
            </section>
            <section style={{ marginBottom: 28 }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray-500)' }}>
                Language
              </h3>
              <span style={{ display: 'inline-block', padding: '4px 10px', background: 'var(--indigo-500-10)', border: '1px solid var(--indigo-500-30)', borderRadius: 6, fontSize: 13, fontWeight: 600, color: 'var(--indigo-400)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                {challenge.language}
              </span>
            </section>
            {challenge.testCases && challenge.testCases.length > 0 && (
              <section>
                <h3 style={{ margin: '0 0 12px 0', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray-500)' }}>
                  Test Cases ({challenge.testCases.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {challenge.testCases.map((tc, i) => (
                    <div key={i} style={{ background: 'var(--gray-900)', border: '1px solid var(--gray-800)', borderRadius: 8, padding: 14 }}>
                      <div style={{ fontSize: 11, color: 'var(--gray-500)', marginBottom: 8, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Case {i + 1}{tc.description ? ` — ${tc.description}` : ''}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--gray-600)', marginBottom: 4 }}>Input</div>
                          <code style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--gray-300)', background: 'var(--gray-950)', padding: '6px 8px', borderRadius: 4, wordBreak: 'break-all' }}>
                            {tc.input}
                          </code>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--gray-600)', marginBottom: 4 }}>Expected</div>
                          <code style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--green-400)', background: 'rgba(74,222,128,0.05)', padding: '6px 8px', borderRadius: 4, wordBreak: 'break-all' }}>
                            {tc.expected_output}
                          </code>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {challenge.starterCode && (
              <section style={{ marginTop: 28 }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray-500)' }}>
                  Starter Code
                </h3>
                <pre style={{ margin: 0, padding: '14px 16px', background: 'var(--gray-900)', border: '1px solid var(--gray-800)', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--gray-300)', overflowX: 'auto', lineHeight: 1.6 }}>
                  {challenge.starterCode}
                </pre>
              </section>
            )}
          </div>
        )}
      </div>

      {/* ─── Time's Up Banner ────────────────────────────────── */}
      {isExpired && (
        <div style={{
          flexShrink: 0,
          padding: '14px 20px',
          background: 'var(--indigo-500-10)',
          borderTop: '1px solid var(--indigo-500-30)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 14, color: 'var(--indigo-400)', fontWeight: 500 }}>
            🏁 Time's up! End the challenge to finalize the leaderboard.
          </span>
          <button
            onClick={onEndChallenge}
            disabled={isEndingChallenge}
            style={{
              padding: '8px 16px',
              background: 'var(--indigo-600)',
              color: 'white',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: isEndingChallenge ? 'not-allowed' : 'pointer',
              opacity: isEndingChallenge ? 0.6 : 1,
              border: 'none',
            }}
          >
            {isEndingChallenge ? 'Ending...' : 'End Challenge & Show Results'}
          </button>
        </div>
      )}
    </div>
  );
}
