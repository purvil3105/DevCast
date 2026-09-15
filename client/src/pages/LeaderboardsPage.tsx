import { useState, useEffect } from 'react';
import {
  Trophy, Medal, Clock, Users, Globe, ListVideo, Crown,
  Target, Flame, Award,
} from 'lucide-react';
import {
  listStreams, getLeaderboard, getGlobalLeaderboard, getMySubmissions,
  type StreamSummary, type GlobalRankRow, type MySubmissionsSummary,
} from '../lib/api';
import { deriveAchievements } from '../lib/achievements';
import { SectionHeading } from '../components/ui/SectionHeading';
import { Achievement } from '../components/ui/Achievement';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';

type Tab = 'global' | 'session';

/**
 * Medal metals for the top three. These are intentional literals (not app
 * status colors) — they read correctly on tinted tiles in both light and dark,
 * so they stay out of the token system by design.
 */
const MEDAL: Record<number, string> = { 1: '#fbbf24', 2: '#cbd5e1', 3: '#d69355' };

/**
 * LeaderboardsPage — viewer-facing standings. A community "Global" board plus a
 * per-session drill-down. Read-only: no instructor/admin controls.
 */
export function LeaderboardsPage() {
  const [tab, setTab] = useState<Tab>('global');

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '32px 48px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.025em' }}>
          Leaderboards
        </h1>
        <p style={{ color: 'var(--gray-400)', fontSize: 14, marginTop: 6 }}>
          See how you stack up — across the whole community or inside a single session.
        </p>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'inline-flex', gap: 4, padding: 4, background: 'var(--gray-900)', border: '1px solid var(--gray-800)', borderRadius: 'var(--r-xl)', marginBottom: 28 }}>
        <TabButton active={tab === 'global'} onClick={() => setTab('global')} icon={<Globe size={15} />}>Global</TabButton>
        <TabButton active={tab === 'session'} onClick={() => setTab('session')} icon={<ListVideo size={15} />}>By session</TabButton>
      </div>

      {tab === 'global' ? <GlobalBoard /> : <SessionBoard />}
    </div>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 'var(--r-lg)',
        fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none',
        background: active ? 'var(--grad-brand)' : 'transparent',
        color: active ? '#fff' : 'var(--gray-400)',
        boxShadow: active ? 'var(--glow-violet)' : 'none',
        transition: 'all 0.2s var(--ease-out)',
      }}
    >
      {icon}{children}
    </button>
  );
}

// ─── Shared avatar ───────────────────────────────────────
function Avatar({ name, highlight }: { name: string; highlight?: boolean }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: 'var(--r-sm)', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 700, letterSpacing: '0.03em',
      background: highlight ? 'var(--grad-brand)' : 'var(--gray-800)',
      color: highlight ? '#fff' : 'var(--gray-400)',
    }}>
      {name.substring(0, 2).toUpperCase()}
    </div>
  );
}

// ─── Rank marker (medal for top-3, else #n) ─────────────
function RankMarker({ rank }: { rank: number }) {
  if (rank <= 3) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32 }}>
        {rank === 1
          ? <Crown size={20} style={{ color: MEDAL[1] }} fill={MEDAL[1]} />
          : <Medal size={20} style={{ color: MEDAL[rank] }} />}
      </div>
    );
  }
  return <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-500)', width: 32, textAlign: 'center' }}>#{rank}</span>;
}

// ═══ GLOBAL BOARD ════════════════════════════════════════
function GlobalBoard() {
  const [rows, setRows] = useState<GlobalRankRow[]>([]);
  const [me, setMe] = useState<GlobalRankRow | null>(null);
  const [totalRanked, setTotalRanked] = useState(0);
  const [summary, setSummary] = useState<MySubmissionsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [global, mine] = await Promise.all([
          getGlobalLeaderboard(),
          getMySubmissions().catch(() => ({ submissions: [], summary: null as any })),
        ]);
        setRows(global.leaderboard || []);
        setMe(global.me || null);
        setTotalRanked(global.totalRanked || 0);
        setSummary(mine.summary || null);
      } catch (err) {
        console.error('Failed to load global leaderboard:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const achievements = deriveAchievements(summary);
  const earnedCount = achievements.filter((a) => a.earned).length;
  const meInList = me != null && rows.some((r) => r.userId === me.userId);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="skeleton" style={{ height: 96, borderRadius: 'var(--r-lg)' }} />
        <div className="skeleton" style={{ height: 320, borderRadius: 'var(--r-lg)' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
      {/* Your standing */}
      <YourStanding me={me} totalRanked={totalRanked} />

      {/* Ranking */}
      <div>
        <SectionHeading
          title="Community ranking"
          subtitle={totalRanked > 0 ? `${totalRanked} developer${totalRanked !== 1 ? 's' : ''} ranked by points earned in past challenges` : undefined}
          icon={<Trophy size={18} />}
        />
        {rows.length === 0 ? (
          <EmptyState
            icon={<Trophy size={28} />}
            title="No rankings yet"
            message="Rankings appear once challenges are completed in live sessions. Be the first to earn points."
          />
        ) : (
          <div style={{ background: 'var(--gray-900)', border: '1px solid var(--gray-800)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            <GlobalHeaderRow />
            {rows.map((r) => <GlobalRow key={r.userId} row={r} isMe={r.isMe} />)}
            {/* If the viewer is ranked but below the visible list, pin their row. */}
            {me && !meInList && (
              <>
                <div style={{ padding: '6px 20px', fontSize: 11, color: 'var(--gray-600)', textAlign: 'center', borderTop: '1px solid var(--gray-800)', letterSpacing: '0.04em' }}>
                  · · ·
                </div>
                <GlobalRow row={me} isMe />
              </>
            )}
          </div>
        )}
      </div>

      {/* Achievements */}
      <div>
        <SectionHeading
          title="Your achievements"
          subtitle="Badges you earn as you practice"
          icon={<Award size={18} />}
          action={<Badge tone="violet">{earnedCount}/{achievements.length} earned</Badge>}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {achievements.map((a) => (
            <Achievement key={a.key} title={a.title} description={a.description} earned={a.earned} icon={a.icon} />
          ))}
        </div>
      </div>
    </div>
  );
}

function YourStanding({ me, totalRanked }: { me: GlobalRankRow | null; totalRanked: number }) {
  if (!me) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 22px', background: 'var(--gray-900)', border: '1px dashed var(--gray-700)', borderRadius: 'var(--r-lg)' }}>
        <div style={{ width: 44, height: 44, borderRadius: 'var(--r-sm)', background: 'var(--indigo-500-10)', color: 'var(--indigo-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Target size={22} />
        </div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>You're not ranked yet</p>
          <p style={{ fontSize: 13, color: 'var(--gray-400)', margin: '3px 0 0' }}>
            Complete a challenge during a live session to earn points and claim your spot.
          </p>
        </div>
      </div>
    );
  }

  const pct = totalRanked > 0 ? Math.round((1 - (me.rank - 1) / totalRanked) * 100) : null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
      padding: '22px 26px', borderRadius: 'var(--r-lg)',
      background: 'var(--indigo-500-10)', border: '1px solid var(--border-brand)',
    }}>
      {/* Rank */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <RankMarker rank={me.rank} />
        <div>
          <div style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 600 }}>Your rank</div>
          <div className="mono" style={{ fontSize: 30, fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.05 }}>
            #{me.rank}
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--gray-500)', marginLeft: 6 }}>of {totalRanked}</span>
          </div>
          {pct != null && pct >= 50 && (
            <div style={{ fontSize: 12, color: 'var(--cyan)', marginTop: 4, fontWeight: 600 }}>Top {100 - pct === 0 ? 1 : 100 - pct}%</div>
          )}
        </div>
      </div>

      <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--border-brand)' }} />

      {/* Mini stats */}
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        <MiniStat icon={<Trophy size={15} />} label="Points" value={me.points} tone="var(--indigo-400)" />
        <MiniStat icon={<Target size={15} />} label="Solved" value={me.challengesCompleted} tone="var(--green-400)" />
        <MiniStat icon={<Flame size={15} />} label="Attempts" value={me.attempts} tone="var(--yellow-400)" />
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--gray-400)', fontWeight: 600 }}>
        <span style={{ color: tone, display: 'flex' }}>{icon}</span>{label}
      </div>
      <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-main)', marginTop: 4, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

const GLOBAL_COLS = '56px 1fr 90px 90px 100px';

function GlobalHeaderRow() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: GLOBAL_COLS, padding: '13px 20px', borderBottom: '1px solid var(--gray-800)', fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      <span>Rank</span>
      <span>Developer</span>
      <span style={{ textAlign: 'center' }}>Solved</span>
      <span style={{ textAlign: 'center' }}>Attempts</span>
      <span style={{ textAlign: 'right' }}>Points</span>
    </div>
  );
}

function GlobalRow({ row, isMe }: { row: GlobalRankRow; isMe: boolean }) {
  return (
    <div
      style={{
        display: 'grid', gridTemplateColumns: GLOBAL_COLS, padding: '12px 20px', alignItems: 'center',
        borderBottom: '1px solid var(--gray-800)',
        background: isMe ? 'var(--indigo-500-10)' : 'transparent',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => { if (!isMe) e.currentTarget.style.background = 'var(--hover-bg)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = isMe ? 'var(--indigo-500-10)' : 'transparent'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}><RankMarker rank={row.rank} /></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <Avatar name={row.user} highlight={isMe} />
        <span className="truncate" style={{ fontSize: 14, fontWeight: isMe ? 600 : 500, color: isMe ? 'var(--indigo-400)' : 'var(--text-main)' }}>
          {row.user}
        </span>
        {isMe && <Badge tone="violet" size="sm">You</Badge>}
      </div>
      <div className="mono" style={{ textAlign: 'center', fontSize: 14, color: 'var(--green-400)', fontWeight: 600 }}>{row.challengesCompleted}</div>
      <div className="mono" style={{ textAlign: 'center', fontSize: 13, color: 'var(--gray-400)' }}>{row.attempts}</div>
      <div className="mono" style={{ textAlign: 'right', fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>{row.points}</div>
    </div>
  );
}

// ═══ SESSION BOARD ═══════════════════════════════════════
interface SessionEntry {
  rank: number; user: string; time: string; score: number;
  passed: number; total: number; isMe: boolean;
}

function SessionBoard() {
  const [streams, setStreams] = useState<StreamSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [entries, setEntries] = useState<SessionEntry[]>([]);
  const [boardStatus, setBoardStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingBoard, setLoadingBoard] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setStreams((await listStreams()) || []);
      } catch (err) {
        console.error('Failed to load streams:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Only streams that actually ran a challenge are worth listing here.
  const withSessions = streams.filter((s) => (s.challengeSessions || []).length > 0);

  const loadBoard = async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setLoadingBoard(true);
    try {
      const data = await getLeaderboard(sessionId);
      setEntries(data.leaderboard || []);
      setBoardStatus(data.status);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      setEntries([]);
    } finally {
      setLoadingBoard(false);
    }
  };

  if (loading) {
    return <div className="skeleton" style={{ height: 400, borderRadius: 'var(--r-lg)' }} />;
  }

  if (withSessions.length === 0) {
    return (
      <EmptyState
        icon={<Trophy size={28} />}
        title="No session leaderboards yet"
        message="Leaderboards appear here after a challenge runs in a live session."
      />
    );
  }

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      {/* Sessions list */}
      <div style={{ width: 300, flexShrink: 0, background: 'var(--gray-900)', border: '1px solid var(--gray-800)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--gray-800)', fontSize: 13, fontWeight: 600, color: 'var(--gray-300)' }}>
          Sessions
        </div>
        <div style={{ maxHeight: 540, overflow: 'auto' }}>
          {withSessions.map((stream) => (
            <div key={stream.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 18px', fontSize: 12.5, fontWeight: 600, color: 'var(--gray-400)', background: 'var(--gray-950)', borderBottom: '1px solid var(--gray-800)' }}>
                <span className="truncate" style={{ flex: 1 }}>{stream.title}</span>
                {stream.status === 'LIVE'
                  ? <Badge tone="red" size="sm">LIVE</Badge>
                  : <Badge tone="neutral" size="sm">{stream.status === 'ENDED' ? 'Past' : 'Soon'}</Badge>}
              </div>
              {(stream.challengeSessions || []).map((session) => {
                const active = selectedSessionId === session.id;
                return (
                  <button
                    key={session.id}
                    onClick={() => loadBoard(session.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                      padding: '10px 18px 10px 28px', fontSize: 13, textAlign: 'left', cursor: 'pointer',
                      color: active ? 'var(--indigo-400)' : 'var(--gray-400)',
                      background: active ? 'var(--indigo-500-10)' : 'transparent',
                      borderBottom: '1px solid var(--gray-800)', borderLeft: `2px solid ${active ? 'var(--indigo-500)' : 'transparent'}`,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--hover-bg)'; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span className="truncate">{session.challenge?.title || 'Challenge'}</span>
                    <span style={{ fontSize: 11, flexShrink: 0, color: session.status === 'ACTIVE' ? 'var(--green-400)' : 'var(--gray-600)' }}>
                      {session.status === 'ACTIVE' ? '● Live' : 'Closed'}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Board */}
      <div style={{ flex: '1 1 420px', minWidth: 0, background: 'var(--gray-900)', border: '1px solid var(--gray-800)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
        {!selectedSessionId ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--gray-500)', fontSize: 14 }}>
            <ListVideo size={32} style={{ opacity: 0.4, marginBottom: 12 }} />
            <p style={{ margin: 0 }}>Select a session to view its leaderboard.</p>
          </div>
        ) : loadingBoard ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--gray-500)' }}>Loading leaderboard…</div>
        ) : boardStatus === 'in_progress' ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--gray-500)' }}>
            <Clock size={32} style={{ opacity: 0.4, marginBottom: 12 }} />
            <p style={{ fontWeight: 600, color: 'var(--text-main)', margin: '0 0 4px' }}>Challenge in progress</p>
            <p style={{ fontSize: 13, margin: 0 }}>Results are revealed when the challenge ends.</p>
          </div>
        ) : entries.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--gray-500)' }}>
            <Users size={32} style={{ opacity: 0.4, marginBottom: 12 }} />
            <p style={{ fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>No submissions yet</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr 90px 90px 90px', padding: '13px 20px', borderBottom: '1px solid var(--gray-800)', fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span>Rank</span><span>Developer</span>
              <span style={{ textAlign: 'center' }}>Tests</span>
              <span style={{ textAlign: 'right' }}>Time</span>
              <span style={{ textAlign: 'right' }}>Score</span>
            </div>
            {entries.map((e) => <SessionRow key={e.rank} entry={e} />)}
          </>
        )}
      </div>
    </div>
  );
}

function SessionRow({ entry }: { entry: SessionEntry }) {
  const score = Number(entry.score);
  const scoreTone = score >= 100 ? 'green' : score > 0 ? 'yellow' : 'neutral';
  return (
    <div
      style={{
        display: 'grid', gridTemplateColumns: '56px 1fr 90px 90px 90px', padding: '12px 20px', alignItems: 'center',
        borderBottom: '1px solid var(--gray-800)',
        background: entry.isMe ? 'var(--indigo-500-10)' : 'transparent',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => { if (!entry.isMe) e.currentTarget.style.background = 'var(--hover-bg)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = entry.isMe ? 'var(--indigo-500-10)' : 'transparent'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}><RankMarker rank={entry.rank} /></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <Avatar name={entry.user} highlight={entry.isMe} />
        <span className="truncate" style={{ fontSize: 14, fontWeight: entry.isMe ? 600 : 500, color: entry.isMe ? 'var(--indigo-400)' : 'var(--text-main)' }}>
          {entry.user}
        </span>
        {entry.isMe && <Badge tone="violet" size="sm">You</Badge>}
      </div>
      <div className="mono" style={{ textAlign: 'center', fontSize: 13, color: 'var(--gray-400)' }}>
        {entry.passed}/{entry.total}
      </div>
      <div className="mono" style={{ textAlign: 'right', fontSize: 13, color: 'var(--gray-500)' }}>{entry.time}</div>
      <div style={{ textAlign: 'right' }}>
        <Badge tone={scoreTone as any} size="sm">{score}%</Badge>
      </div>
    </div>
  );
}
