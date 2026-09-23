import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Radio, CalendarClock, Code2, Trophy, Target,
  TrendingUp, CheckCircle2, Gauge, ArrowRight, Sparkles, History, Terminal,
} from 'lucide-react';
import {
  listStreams, getMySubmissions, listAllChallenges, getStoredUser,
  type StreamSummary, type MySubmissionsSummary,
} from '../../lib/api';
import { deriveAchievements } from '../../lib/achievements';
import { formatLanguage } from '../../lib/format';
import { StreamCard } from '../StreamCard';
import { SectionHeading } from '../ui/SectionHeading';
import { StatCard } from '../ui/StatCard';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { Achievement } from '../ui/Achievement';

interface Challenge {
  id: string;
  title: string;
  description: string;
  language: string;
  config: any;
}

const isUpcoming = (s: string) => s === 'SCHEDULED' || s === 'PENDING';

/** Learner-focused dashboard: what to join now, personal progress, and next steps. */
export function ViewerDashboard() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [streams, setStreams] = useState<StreamSummary[]>([]);
  const [summary, setSummary] = useState<MySubmissionsSummary | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [attemptedIds, setAttemptedIds] = useState<Set<string>>(new Set());
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [streamData, mine, allChallenges] = await Promise.all([
          listStreams(),
          getMySubmissions().catch(() => ({ submissions: [], summary: null as any })),
          listAllChallenges().catch(() => []),
        ]);
        setStreams(streamData || []);
        setSummary(mine.summary || null);
        setChallenges(allChallenges || []);

        const completed = new Set<string>();
        const attempted = new Set<string>();
        for (const sub of mine.submissions || []) {
          attempted.add(sub.challenge.id);
          if (sub.score >= 100) completed.add(sub.challenge.id);
        }
        setCompletedIds(completed);
        setAttemptedIds(attempted);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openStream = (id: string) => navigate(`/stream/${id}`);

  const live = streams.filter((s) => s.status === 'LIVE');
  const upcoming = streams
    .filter((s) => isUpcoming(s.status))
    .sort((a, b) => (a.startedAt || '').localeCompare(b.startedAt || ''));
  const replays = streams
    .filter((s) => s.status === 'ENDED')
    .sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || ''))
    .slice(0, 3);

  const practicedLangs = summary?.languages ?? [];
  const recommended = challenges
    .filter((c) => !completedIds.has(c.id))
    .sort((a, b) => {
      // Prefer languages the viewer has practiced, then un-attempted ones.
      const aLang = practicedLangs.includes(a.language) ? 0 : 1;
      const bLang = practicedLangs.includes(b.language) ? 0 : 1;
      if (aLang !== bLang) return aLang - bLang;
      const aTried = attemptedIds.has(a.id) ? 1 : 0;
      const bTried = attemptedIds.has(b.id) ? 1 : 0;
      return aTried - bTried;
    })
    .slice(0, 3);

  const achievements = deriveAchievements(summary);
  const earnedCount = achievements.filter((a) => a.earned).length;
  const hasProgress = (summary?.totalAttempts ?? 0) > 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = (user?.displayName || 'there').split(' ')[0];

  const quickActions = [
    { icon: <Radio size={18} />, label: 'Browse live sessions', desc: 'Find something to join', to: '/live' },
    { icon: <Terminal size={18} />, label: 'Practice challenges', desc: 'Sharpen your skills', to: '/challenges' },
    { icon: <Trophy size={18} />, label: 'Leaderboard', desc: 'See where you rank', to: '/leaderboards' },
  ];

  if (loading) return <DashboardSkeleton />;

  return (
    <div style={{ flex: 1, padding: '32px 48px', overflowY: 'auto' }}>
      {/* Greeting */}
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.025em' }}>
          {greeting}, {firstName}
        </h1>
        <p style={{ color: 'var(--gray-400)', fontSize: 14, marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {live.length > 0 ? (
            <>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--live)', fontWeight: 600 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--live)' }} className="animate-pulse" />
                {live.length} live now
              </span>
              {upcoming.length > 0 && <span>· <span className="mono">{upcoming.length}</span> coming up</span>}
            </>
          ) : upcoming.length > 0 ? (
            <>Nothing live right now · <span className="mono">{upcoming.length}</span> session{upcoming.length === 1 ? '' : 's'} coming up</>
          ) : (
            <>No live sessions right now — practice a challenge while you wait.</>
          )}
        </p>
      </header>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 36 }}>
        {quickActions.map((a) => (
          <button
            key={a.to}
            onClick={() => navigate(a.to)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
              background: 'var(--gray-900)', border: '1px solid var(--gray-800)',
              borderRadius: 'var(--r-md)', padding: 16, cursor: 'pointer',
              transition: 'border-color 0.2s, transform 0.2s var(--ease-out)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-brand)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--gray-800)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <span style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 'var(--r-sm)', background: 'var(--indigo-500-10)', color: 'var(--indigo-500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {a.icon}
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>{a.label}</span>
              <span style={{ display: 'block', fontSize: 12.5, color: 'var(--gray-500)', marginTop: 2 }}>{a.desc}</span>
            </span>
            <ArrowRight size={16} style={{ marginLeft: 'auto', color: 'var(--gray-600)', flexShrink: 0 }} />
          </button>
        ))}
      </div>

      {/* Live now / Up next */}
      <section style={{ marginBottom: 40 }}>
        {live.length > 0 ? (
          <>
            <SectionHeading
              title="Live now"
              subtitle="Jump into a session in progress"
              icon={<Radio size={18} />}
              action={<SeeAll onClick={() => navigate('/live')} />}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
              {live.slice(0, 3).map((s, i) => <StreamCard key={s.id} stream={s} index={i} onOpen={openStream} />)}
            </div>
          </>
        ) : upcoming.length > 0 ? (
          <>
            <SectionHeading
              title="Up next"
              subtitle="Scheduled sessions to look forward to"
              icon={<CalendarClock size={18} />}
              action={<SeeAll onClick={() => navigate('/live')} />}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
              {upcoming.slice(0, 3).map((s, i) => <StreamCard key={s.id} stream={s} index={i} onOpen={openStream} />)}
            </div>
          </>
        ) : (
          <>
            <SectionHeading title="Live now" icon={<Radio size={18} />} />
            <EmptyState
              icon={<Radio size={26} />}
              title="No sessions live yet"
              message="New sessions show up here as instructors go on air. In the meantime, practice a challenge."
              action={
                <button
                  onClick={() => navigate('/challenges')}
                  className="btn-primary"
                  style={{ fontSize: 13, padding: '9px 18px' }}
                >
                  Practice challenges
                </button>
              }
            />
          </>
        )}
      </section>

      {/* Your progress */}
      <section style={{ marginBottom: 40 }}>
        <SectionHeading
          title="Your progress"
          subtitle={hasProgress ? 'Across every challenge you’ve attempted' : 'Your stats will fill in as you submit solutions'}
          icon={<TrendingUp size={18} />}
          action={<SeeAll label="History" onClick={() => navigate('/leaderboards')} />}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <StatCard label="Challenges attempted" value={summary?.distinctChallenges ?? 0} icon={<Terminal size={16} />} accent="violet" hint={`${summary?.totalAttempts ?? 0} submissions`} />
          <StatCard label="Completed" value={summary?.challengesCompleted ?? 0} icon={<CheckCircle2 size={16} />} accent="green" hint="all tests passing" />
          <StatCard label="Average score" value={`${summary?.avgScore ?? 0}%`} icon={<Gauge size={16} />} accent="cyan" hint={`best ${summary?.bestScore ?? 0}%`} />
          <StatCard label="Pass rate" value={`${summary?.passRate ?? 0}%`} icon={<Target size={16} />} accent="yellow" hint="tests passed" />
        </div>
      </section>

      {/* Achievements */}
      <section style={{ marginBottom: 40 }}>
        <SectionHeading
          title="Achievements"
          subtitle="Milestones you unlock as you practice"
          icon={<Sparkles size={18} />}
          action={<Badge tone="violet" icon={<Trophy size={12} />}>{earnedCount}/{achievements.length} earned</Badge>}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {achievements.map((a) => (
            <Achievement key={a.key} title={a.title} description={a.description} earned={a.earned} icon={a.icon} />
          ))}
        </div>
      </section>

      {/* Practice next */}
      {recommended.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <SectionHeading
            title="Practice next"
            subtitle={practicedLangs.length ? `Based on languages you’ve used: ${practicedLangs.map(formatLanguage).join(', ')}` : 'A few challenges to get you started'}
            icon={<Code2 size={18} />}
            action={<SeeAll label="All challenges" onClick={() => navigate('/challenges')} />}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {recommended.map((c) => {
              const tests = c.config?.test_cases?.length || 0;
              const tone = tests <= 2 ? 'green' : tests <= 4 ? 'yellow' : 'red';
              const diff = tests <= 2 ? 'Easy' : tests <= 4 ? 'Medium' : 'Hard';
              return (
                <button
                  key={c.id}
                  onClick={() => navigate('/challenges')}
                  style={{
                    textAlign: 'left', background: 'var(--gray-900)', border: '1px solid var(--gray-800)',
                    borderRadius: 'var(--r-md)', padding: 18, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10,
                    transition: 'border-color 0.2s, transform 0.2s var(--ease-out)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-brand)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--gray-800)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Badge tone={tone} size="sm">{diff}</Badge>
                    <Badge tone="neutral" size="sm">{formatLanguage(c.language)}</Badge>
                    {attemptedIds.has(c.id) && <Badge tone="violet" size="sm">In progress</Badge>}
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.35 }}>{c.title}</span>
                  <span style={{ fontSize: 13, color: 'var(--gray-500)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {c.description}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Jump back in (replays) */}
      {replays.length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <SectionHeading
            title="Jump back in"
            subtitle="Recent sessions you can rewatch"
            icon={<History size={18} />}
            action={<SeeAll label="All replays" onClick={() => navigate('/live')} />}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
            {replays.map((s, i) => <StreamCard key={s.id} stream={s} index={i} onOpen={openStream} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function SeeAll({ label = 'See all', onClick }: { label?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: 'var(--indigo-400)', background: 'transparent', border: 'none', cursor: 'pointer' }}
    >
      {label} <ArrowRight size={14} />
    </button>
  );
}

function DashboardSkeleton() {
  return (
    <div style={{ flex: 1, padding: '32px 48px', overflowY: 'auto' }}>
      <div className="skeleton" style={{ height: 32, width: 280, marginBottom: 10 }} />
      <div className="skeleton" style={{ height: 16, width: 200, marginBottom: 32 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 36 }}>
        {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 96, borderRadius: 'var(--r-md)' }} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
        {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 300, borderRadius: 'var(--r-lg)' }} />)}
      </div>
    </div>
  );
}
