import { useEffect, useState } from 'react';
import { Trophy, ChevronRight } from 'lucide-react';
import { getLeaderboard } from '../lib/api';

interface LeaderboardEntry {
  rank: number;
  user: string;
  time: string;
  score: number;
  passed?: number;
  total?: number;
  isMe?: boolean;
}

interface LeaderboardProps {
  sessionId: string;
  onBack?: () => void;
}

/**
 * Leaderboard view — shows ranked submissions by test pass rate.
 * Score = 0–100% of tests passed.
 */
export function Leaderboard({ sessionId, onBack }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [challengeStatus, setChallengeStatus] = useState<'in_progress' | 'completed' | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchLeaderboard = async () => {
      try {
        const data = await getLeaderboard(sessionId);
        if (mounted) {
          setChallengeStatus(data.status);
          setEntries(data.leaderboard);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
        if (mounted) setLoading(false);
      }
    };

    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [sessionId]);

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--gray-950)',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        background: 'var(--gray-900)',
        borderBottom: '1px solid var(--gray-800)',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            padding: 8,
            background: 'rgba(234, 179, 8, 0.1)',
            borderRadius: 8,
            color: '#eab308',
            display: 'flex',
          }}>
            <Trophy size={18} />
          </div>
          <h2 style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: 16, margin: 0 }}>
            Live Leaderboard
          </h2>
          {loading && (
            <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>updating…</span>
          )}
        </div>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              fontSize: 13,
              color: 'var(--gray-400)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'color 0.2s',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-main)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--gray-400)'; }}
          >
            Back to Editor <ChevronRight size={14} />
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ padding: '20px 24px', maxWidth: 680, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <div style={{
          background: 'var(--gray-900)',
          border: '1px solid var(--gray-800)',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--gray-950)', borderBottom: '1px solid var(--gray-800)' }}>
                {[
                  { label: 'Rank', align: 'left' },
                  { label: 'Developer', align: 'left' },
                  { label: 'Tests', align: 'right' },
                  { label: 'Time', align: 'right' },
                  { label: 'Score', align: 'right' },
                ].map(({ label, align }) => (
                  <th key={label} style={{
                    padding: '10px 16px',
                    fontWeight: 500,
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--gray-500)',
                    textAlign: align as any,
                  }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{
                    textAlign: 'center',
                    padding: '40px 24px',
                    color: 'var(--gray-500)',
                  }}>
                    Loading…
                  </td>
                </tr>
              ) : challengeStatus === 'in_progress' ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px 24px' }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 14,
                      textAlign: 'center',
                    }}>
                      {/* Animated pulse rings */}
                      <div style={{ position: 'relative', width: 56, height: 56 }}>
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: '50%',
                          border: '2px solid rgba(99,102,241,0.4)',
                          animation: 'ping 1.2s cubic-bezier(0,0,0.2,1) infinite',
                        }} />
                        <div style={{
                          position: 'absolute',
                          inset: 8,
                          borderRadius: '50%',
                          border: '2px solid rgba(99,102,241,0.6)',
                          animation: 'ping 1.2s cubic-bezier(0,0,0.2,1) infinite 0.4s',
                        }} />
                        <div style={{
                          position: 'absolute',
                          inset: 16,
                          borderRadius: '50%',
                          background: 'var(--indigo-600)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 14,
                        }}>
                          ⏳
                        </div>
                      </div>
                      <div>
                        <p style={{
                          fontWeight: 600,
                          fontSize: 15,
                          color: 'var(--text-main)',
                          margin: '0 0 6px 0',
                        }}>
                          Challenge in Progress
                        </p>
                        <p style={{
                          fontSize: 13,
                          color: 'var(--gray-500)',
                          margin: 0,
                          maxWidth: 280,
                        }}>
                          Results will appear here once the timer ends.
                          Keep coding! 🚀
                        </p>
                      </div>
                      <div style={{
                        display: 'flex',
                        gap: 4,
                        alignItems: 'center',
                        fontSize: 12,
                        color: 'var(--indigo-400)',
                      }}>
                        <span style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: 'var(--indigo-500)',
                          animation: 'ping 1s ease-in-out infinite',
                          display: 'inline-block',
                        }} />
                        Live — checking for results…
                      </div>
                    </div>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{
                    textAlign: 'center',
                    padding: '40px 24px',
                    color: 'var(--gray-500)',
                    fontSize: 14,
                  }}>
                    No submissions yet — be the first! 🚀
                  </td>
                </tr>
              ) : (
                entries.map((entry, idx) => {
                  const score = Number(entry.score); // guard: coerce Prisma Decimal → number
                  const passed = entry.passed ?? null;
                  const total = entry.total ?? null;
                  const rankEmoji = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : null;

                  return (
                    <tr
                      key={entry.rank}
                      style={{
                        background: entry.isMe ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                        borderBottom: idx < entries.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        if (!entry.isMe) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = entry.isMe ? 'rgba(99, 102, 241, 0.1)' : 'transparent';
                      }}
                    >
                      {/* Rank */}
                      <td style={{ padding: '13px 16px', width: 60 }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          fontSize: rankEmoji ? 18 : 13,
                          color: entry.rank <= 3 ? '#eab308' : 'var(--gray-600)',
                        }}>
                          {rankEmoji ?? `#${entry.rank}`}
                        </span>
                      </td>

                      {/* Developer */}
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: entry.isMe ? 'var(--indigo-600)' : 'var(--gray-800)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: 700,
                            color: entry.isMe ? 'var(--text-main)' : 'var(--gray-400)',
                            flexShrink: 0,
                            letterSpacing: '0.05em',
                          }}>
                            {entry.user.substring(0, 2).toUpperCase()}
                          </div>
                          <span style={{
                            fontWeight: 500,
                            color: entry.isMe ? 'var(--indigo-300)' : 'var(--gray-200)',
                          }}>
                            {entry.user}
                          </span>
                          {entry.isMe && (
                            <span style={{
                              background: 'var(--indigo-600)',
                              color: 'var(--text-main)',
                              fontSize: 9,
                              textTransform: 'uppercase',
                              padding: '2px 5px',
                              borderRadius: 3,
                              fontWeight: 700,
                              letterSpacing: '0.05em',
                            }}>
                              You
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Tests passed */}
                      <td style={{
                        padding: '13px 16px',
                        textAlign: 'right',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 13,
                        color: score === 100
                          ? '#4ade80'
                          : score > 0
                            ? '#facc15'
                            : 'var(--gray-600)',
                      }}>
                        {passed !== null && total !== null ? `${passed}/${total}` : '—'}
                      </td>

                      {/* Time */}
                      <td style={{
                        padding: '13px 16px',
                        textAlign: 'right',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--gray-400)',
                        fontSize: 13,
                      }}>
                        {entry.time}
                      </td>

                      {/* Score badge */}
                      <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 9px',
                          borderRadius: 6,
                          fontWeight: 700,
                          fontSize: 13,
                          fontFamily: 'var(--font-mono)',
                          background: score === 100
                            ? 'rgba(74, 222, 128, 0.12)'
                            : score > 0
                              ? 'rgba(250, 204, 21, 0.1)'
                              : 'rgba(107, 114, 128, 0.1)',
                          color: score === 100
                            ? '#4ade80'
                            : score > 0
                              ? '#facc15'
                              : 'var(--gray-500)',
                          border: `1px solid ${
                            score === 100
                              ? 'rgba(74, 222, 128, 0.2)'
                              : score > 0
                                ? 'rgba(250, 204, 21, 0.15)'
                                : 'rgba(107, 114, 128, 0.15)'
                          }`,
                        }}>
                          {score}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
