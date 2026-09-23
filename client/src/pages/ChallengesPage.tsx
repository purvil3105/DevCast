import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Code2, Clock, Zap, Search, CheckCircle2, CircleDot, Circle,
  Radio, X, Lightbulb, ListChecks, Trophy, Target, Gauge,
} from 'lucide-react';
import {
  listAllChallenges, getMySubmissions, listStreams,
  type MySubmission, type MySubmissionsSummary,
} from '../lib/api';
import { difficultyFromTests } from '../lib/difficulty';
import { formatLanguage, formatMs, relativeTime } from '../lib/format';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import type { Tone } from '../components/ui/tones';

interface Challenge {
  id: string;
  title: string;
  description: string;
  language: string;
  courseId: string;
  config: any;
  staticHints?: string[];
  createdAt: string;
}

type StatusKey = 'not-started' | 'attempted' | 'completed';
type StatusFilter = 'All' | 'Not started' | 'Attempted' | 'Completed';
type DiffFilter = 'All' | 'Easy' | 'Medium' | 'Hard';

interface LiveRef { streamId: string; sessionId: string; }

/** Viewer-facing challenge catalog: discover, track completion, and jump into a live attempt. */
export function ChallengesPage() {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [summary, setSummary] = useState<MySubmissionsSummary | null>(null);
  const [bestByChallenge, setBestByChallenge] = useState<Map<string, number>>(new Map());
  const [lastByChallenge, setLastByChallenge] = useState<Map<string, MySubmission>>(new Map());
  const [liveByChallenge, setLiveByChallenge] = useState<Map<string, LiveRef>>(new Map());
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterLang, setFilterLang] = useState('All');
  const [filterDiff, setFilterDiff] = useState<DiffFilter>('All');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('All');
  const [selected, setSelected] = useState<Challenge | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [challengeData, mine, liveStreams] = await Promise.all([
          listAllChallenges(),
          getMySubmissions().catch(() => ({ submissions: [] as MySubmission[], summary: null as any })),
          listStreams('LIVE').catch(() => []),
        ]);
        setChallenges(challengeData || []);
        setSummary(mine.summary || null);

        // Best + most-recent submission per challenge.
        const best = new Map<string, number>();
        const last = new Map<string, MySubmission>();
        for (const sub of mine.submissions || []) {
          const cid = sub.challenge.id;
          best.set(cid, Math.max(best.get(cid) ?? 0, sub.score));
          const prev = last.get(cid);
          if (!prev || sub.submittedAt > prev.submittedAt) last.set(cid, sub);
        }
        setBestByChallenge(best);
        setLastByChallenge(last);

        // Which challenges have an ACTIVE session in a LIVE stream right now.
        const liveMap = new Map<string, LiveRef>();
        for (const s of liveStreams) {
          for (const cs of s.challengeSessions || []) {
            if (cs.status === 'ACTIVE' && cs.challenge?.id && !liveMap.has(cs.challenge.id)) {
              liveMap.set(cs.challenge.id, { streamId: s.id, sessionId: cs.id });
            }
          }
        }
        setLiveByChallenge(liveMap);
      } catch (err) {
        console.error('Failed to load challenges:', err);
        setChallenges([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const statusOf = (id: string): StatusKey => {
    const best = bestByChallenge.get(id);
    if (best == null) return 'not-started';
    return best >= 100 ? 'completed' : 'attempted';
  };

  const languages = ['All', ...Array.from(new Set(challenges.map((c) => c.language)))];

  const filtered = challenges.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    const matchSearch = !q || c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
    const matchLang = filterLang === 'All' || c.language === filterLang;
    const matchDiff = filterDiff === 'All' || difficultyFromTests(c.config).label === filterDiff;
    const st = statusOf(c.id);
    const matchStatus =
      filterStatus === 'All' ? true :
      filterStatus === 'Completed' ? st === 'completed' :
      filterStatus === 'Attempted' ? st === 'attempted' :
      st === 'not-started';
    return matchSearch && matchLang && matchDiff && matchStatus;
  });

  // Live challenges float to the top of the catalog.
  const sorted = [...filtered].sort((a, b) => (liveByChallenge.has(b.id) ? 1 : 0) - (liveByChallenge.has(a.id) ? 1 : 0));

  const attemptedCount = challenges.filter((c) => statusOf(c.id) !== 'not-started').length;
  const completedCount = challenges.filter((c) => statusOf(c.id) === 'completed').length;
  const liveCount = liveByChallenge.size;

  const diffFilters: DiffFilter[] = ['All', 'Easy', 'Medium', 'Hard'];
  const statusFilters: StatusFilter[] = ['All', 'Not started', 'Attempted', 'Completed'];

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '32px 48px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.025em' }}>
          Challenges
        </h1>
        <p style={{ color: 'var(--gray-400)', fontSize: 14, marginTop: 6 }}>
          Practice problems from every course. Attempt them live during a session to land on the leaderboard.
        </p>
      </div>

      {/* Progress strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 1,
        background: 'var(--gray-800)', border: '1px solid var(--gray-800)', borderRadius: 'var(--r-md)',
        overflow: 'hidden', marginBottom: 28,
      }}>
        <ProgressStat icon={<ListChecks size={16} />} label="Attempted" value={`${attemptedCount}/${challenges.length}`} tone="violet" />
        <ProgressStat icon={<CheckCircle2 size={16} />} label="Completed" value={completedCount} tone="green" />
        <ProgressStat icon={<Gauge size={16} />} label="Avg score" value={`${summary?.avgScore ?? 0}%`} tone="cyan" />
        <ProgressStat icon={<Radio size={16} />} label="Live now" value={liveCount} tone={liveCount ? 'red' : 'neutral'} />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, background: 'var(--gray-900)',
          border: '1px solid var(--gray-800)', borderRadius: 'var(--r-xl)', padding: '9px 14px',
          flex: '1 1 260px', maxWidth: 360,
        }}>
          <Search size={16} style={{ color: 'var(--gray-500)', flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search challenges…"
            style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-main)', fontSize: 14, width: '100%' }}
          />
        </div>

        <FilterGroup options={languages} value={filterLang} onChange={setFilterLang} labelFor={(l) => (l === 'All' ? 'All' : formatLanguage(l))} />
        <FilterGroup options={diffFilters} value={filterDiff} onChange={(v) => setFilterDiff(v as DiffFilter)} />
      </div>

      {/* Status filter (own row for clarity) */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {statusFilters.map((s) => {
          const active = filterStatus === s;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 'var(--r-xl)',
                fontSize: 13, fontWeight: active ? 600 : 500,
                background: active ? 'var(--indigo-500-10)' : 'transparent',
                color: active ? 'var(--indigo-400)' : 'var(--gray-400)',
                border: `1px solid ${active ? 'var(--border-brand)' : 'var(--gray-800)'}`,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              {s === 'Completed' && <CheckCircle2 size={13} />}
              {s === 'Attempted' && <CircleDot size={13} />}
              {s === 'Not started' && <Circle size={13} />}
              {s}
            </button>
          );
        })}
      </div>

      {/* Cards */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="skeleton" style={{ height: 190, borderRadius: 'var(--r-lg)' }} />)}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={<Code2 size={28} />}
          title="No challenges found"
          message={
            challenges.length === 0
              ? 'Challenges appear here as instructors create them for their courses.'
              : 'Nothing matches your filters. Try widening your search.'
          }
          action={
            challenges.length > 0 ? (
              <button
                onClick={() => { setSearchQuery(''); setFilterLang('All'); setFilterDiff('All'); setFilterStatus('All'); }}
                style={{ padding: '8px 18px', borderRadius: 'var(--r-xl)', background: 'var(--indigo-500-10)', color: 'var(--indigo-400)', border: '1px solid var(--border-brand)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Clear filters
              </button>
            ) : undefined
          }
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {sorted.map((c) => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              status={statusOf(c.id)}
              best={bestByChallenge.get(c.id)}
              isLive={liveByChallenge.has(c.id)}
              onClick={() => setSelected(c)}
            />
          ))}
        </div>
      )}

      {selected && (
        <ChallengeModal
          challenge={selected}
          status={statusOf(selected.id)}
          best={bestByChallenge.get(selected.id)}
          last={lastByChallenge.get(selected.id) || null}
          live={liveByChallenge.get(selected.id) || null}
          onClose={() => setSelected(null)}
          onJoinLive={(streamId) => navigate(`/stream/${streamId}`)}
        />
      )}
    </div>
  );
}

// ─── Progress strip cell ─────────────────────────────────
function ProgressStat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: React.ReactNode; tone: Tone }) {
  const color = tone === 'green' ? 'var(--green-400)' : tone === 'cyan' ? 'var(--cyan)' : tone === 'red' ? 'var(--red-400)' : tone === 'neutral' ? 'var(--gray-400)' : 'var(--indigo-400)';
  return (
    <div style={{ background: 'var(--gray-900)', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ color, display: 'flex' }}>{icon}</span>
      <div>
        <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-main)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}

// ─── Filter pill group ───────────────────────────────────
function FilterGroup({ options, value, onChange, labelFor }: {
  options: string[]; value: string; onChange: (v: string) => void; labelFor?: (v: string) => string;
}) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              padding: '7px 14px', borderRadius: 'var(--r-xl)', fontSize: 13, fontWeight: active ? 600 : 500,
              cursor: 'pointer',
              background: active ? 'var(--indigo-500-10)' : 'var(--gray-900)',
              color: active ? 'var(--indigo-400)' : 'var(--gray-400)',
              border: `1px solid ${active ? 'var(--border-brand)' : 'var(--gray-800)'}`,
              transition: 'all 0.2s',
            }}
          >
            {labelFor ? labelFor(opt) : opt}
          </button>
        );
      })}
    </div>
  );
}

// ─── Status pill ─────────────────────────────────────────
function StatusPill({ status, best, size = 'md' }: { status: StatusKey; best?: number; size?: 'sm' | 'md' }) {
  if (status === 'completed') return <Badge tone="green" size={size} icon={<CheckCircle2 size={size === 'sm' ? 11 : 12} />}>Completed</Badge>;
  if (status === 'attempted') return <Badge tone="violet" size={size} icon={<CircleDot size={size === 'sm' ? 11 : 12} />}>{best != null ? `In progress · ${best}%` : 'In progress'}</Badge>;
  return <Badge tone="neutral" size={size} icon={<Circle size={size === 'sm' ? 11 : 12} />}>Not started</Badge>;
}

// ─── Challenge card ──────────────────────────────────────
function ChallengeCard({ challenge, status, best, isLive, onClick }: {
  challenge: Challenge; status: StatusKey; best?: number; isLive: boolean; onClick: () => void;
}) {
  const diff = difficultyFromTests(challenge.config);
  const testCount = challenge.config?.test_cases?.length || 0;
  const timeLimit = challenge.config?.time_limit_ms ? `${challenge.config.time_limit_ms / 1000}s` : '5s';

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--gray-900)', border: `1px solid ${isLive ? 'var(--red-500-30)' : 'var(--gray-800)'}`,
        borderRadius: 'var(--r-lg)', padding: 20, cursor: 'pointer', display: 'flex', flexDirection: 'column',
        transition: 'border-color 0.2s, transform 0.2s var(--ease-out), box-shadow 0.2s', position: 'relative',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = isLive ? 'var(--red-500)' : 'var(--border-brand)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = isLive ? 'var(--red-500-30)' : 'var(--gray-800)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Top badges */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Badge tone={diff.tone} size="sm">{diff.label}</Badge>
          <Badge tone="neutral" size="sm">{formatLanguage(challenge.language)}</Badge>
        </div>
        {isLive && (
          <span className="live-badge" style={{ flexShrink: 0 }}><span className="dot" />LIVE</span>
        )}
      </div>

      {/* Title */}
      <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-main)', margin: '0 0 8px', lineHeight: 1.35 }}>
        {challenge.title}
      </h3>

      {/* Description */}
      <p style={{
        fontSize: 13, color: 'var(--gray-400)', lineHeight: 1.5, margin: '0 0 16px',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {challenge.description}
      </p>

      {/* Footer */}
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--gray-500)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Zap size={13} />{testCount} test{testCount !== 1 ? 's' : ''}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={13} />{timeLimit}</span>
        </div>
        <StatusPill status={status} best={best} size="sm" />
      </div>
    </div>
  );
}

// ─── Details modal ───────────────────────────────────────
function ChallengeModal({ challenge, status, best, last, live, onClose, onJoinLive }: {
  challenge: Challenge; status: StatusKey; best?: number; last: MySubmission | null;
  live: LiveRef | null; onClose: () => void; onJoinLive: (streamId: string) => void;
}) {
  const [showHints, setShowHints] = useState(false);
  const diff = difficultyFromTests(challenge.config);
  const testCount = challenge.config?.test_cases?.length || 0;
  const timeLimit = challenge.config?.time_limit_ms ? `${challenge.config.time_limit_ms / 1000}s` : '5s';
  const hints = challenge.staticHints ?? [];

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(6,6,14,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-fade-in-scale"
        style={{ background: 'var(--gray-900)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-lg)', width: 560, maxWidth: '100%', maxHeight: '88vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}
      >
        {/* Header */}
        <div style={{ padding: '22px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Badge tone={diff.tone} size="sm">{diff.label}</Badge>
            <Badge tone="neutral" size="sm">{formatLanguage(challenge.language)}</Badge>
            <StatusPill status={status} best={best} size="sm" />
            {live && <span className="live-badge"><span className="dot" />LIVE</span>}
          </div>
          <button aria-label="Close" onClick={onClose} style={{ color: 'var(--gray-500)', display: 'flex', padding: 4, borderRadius: 'var(--r-sm)', flexShrink: 0 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '16px 24px 24px' }}>
          <h2 style={{ fontSize: 21, fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px', letterSpacing: '-0.01em' }}>
            {challenge.title}
          </h2>
          <div style={{ display: 'flex', gap: 16, fontSize: 12.5, color: 'var(--gray-500)', marginBottom: 18 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Zap size={13} />{testCount} test{testCount !== 1 ? 's' : ''}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={13} />{timeLimit} time limit</span>
          </div>

          {/* Description */}
          <p style={{ fontSize: 14, color: 'var(--gray-300)', lineHeight: 1.65, margin: '0 0 20px', whiteSpace: 'pre-wrap' }}>
            {challenge.description}
          </p>

          {/* Hints */}
          {hints.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <button
                onClick={() => setShowHints((v) => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--yellow-400)', background: 'var(--yellow-500-10)', border: '1px solid var(--yellow-500-30)', borderRadius: 'var(--r-sm)', padding: '8px 12px', cursor: 'pointer', width: '100%', justifyContent: 'space-between' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Lightbulb size={15} />{showHints ? 'Hide hints' : `Show hints (${hints.length})`}</span>
              </button>
              {showHints && (
                <ol style={{ margin: '12px 0 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {hints.map((h, i) => (
                    <li key={i} style={{ fontSize: 13.5, color: 'var(--gray-300)', lineHeight: 1.55 }}>{h}</li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {/* Your last result */}
          {last && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-400)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Target size={13} /> Your last attempt
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', background: 'var(--gray-950)', border: '1px solid var(--gray-800)', borderRadius: 'var(--r-sm)', padding: 14 }}>
                <ResultChip label="Score" value={`${last.score}%`} tone={last.score >= 100 ? 'green' : last.score > 0 ? 'yellow' : 'red'} />
                <ResultChip label="Tests" value={`${last.passed}/${last.total}`} tone="cyan" />
                <ResultChip label="Runtime" value={formatMs(last.executionTimeMs)} tone="violet" />
                <ResultChip label="When" value={relativeTime(last.submittedAt)} tone="neutral" />
              </div>
            </div>
          )}

          {/* CTA */}
          {live ? (
            <button
              onClick={() => onJoinLive(live.streamId)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 20px', background: 'linear-gradient(135deg, var(--indigo-500), var(--indigo-600))', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: 'var(--glow-violet)' }}
            >
              <Radio size={16} /> Join live session
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--gray-950)', border: '1px dashed var(--gray-700)', borderRadius: 'var(--r-sm)', fontSize: 13, color: 'var(--gray-400)' }}>
              <Trophy size={15} style={{ color: 'var(--indigo-400)', flexShrink: 0 }} />
              Attempts are scored live. Join this challenge during a session to land on the leaderboard.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultChip({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  const color = tone === 'green' ? 'var(--green-400)' : tone === 'cyan' ? 'var(--cyan)' : tone === 'red' ? 'var(--red-400)' : tone === 'yellow' ? 'var(--yellow-400)' : tone === 'neutral' ? 'var(--gray-300)' : 'var(--indigo-400)';
  return (
    <div style={{ minWidth: 72 }}>
      <div className="mono" style={{ fontSize: 17, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 5 }}>{label}</div>
    </div>
  );
}
