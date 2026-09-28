import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Radio, CalendarClock, Plus, Video, Users, ArrowRight,
  Clock, PlayCircle, Presentation, History, Layers, Clapperboard,
} from 'lucide-react';
import { listStreams, getStoredUser, type StreamSummary } from '../../lib/api';
import { relativeTime } from '../../lib/format';
import { CreateStreamModal } from '../CreateStreamModal';
import { StreamCard } from '../StreamCard';
import { SectionHeading } from '../ui/SectionHeading';
import { StatCard } from '../ui/StatCard';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';

const isUpcoming = (s: string) => s === 'SCHEDULED' || s === 'PENDING';

/** Teaching-focused dashboard: your sessions, at-a-glance reach, and go-live actions. */
export function InstructorDashboard() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [streams, setStreams] = useState<StreamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await listStreams();
        setStreams(data || []);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openStream = (id: string) => navigate(`/stream/${id}`);

  // Only the instructor's own sessions.
  const mine = streams.filter((s) => s.instructorId === user?.id);
  const myLive = mine.filter((s) => s.status === 'LIVE');
  const myScheduled = mine
    .filter((s) => isUpcoming(s.status))
    .sort((a, b) => (a.startedAt || '').localeCompare(b.startedAt || ''));
  const myEnded = mine
    .filter((s) => s.status === 'ENDED')
    .sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || ''))
    .slice(0, 3);
  const totalLiveViewers = myLive.reduce((sum, s) => sum + (s.viewerCount || 0), 0);

  const activeSessions = [...myLive, ...myScheduled];

  const firstName = (user?.displayName || 'there').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const quickActions = [
    { icon: <Plus size={18} />, label: 'Create stream', desc: 'Set up a new broadcast session', onClick: () => setShowCreateModal(true), primary: true },
    { icon: <Clapperboard size={18} />, label: 'Creator Studio', desc: 'Channel analytics & live telemetry', onClick: () => navigate('/studio'), primary: false },
    { icon: <History size={18} />, label: 'Stream History', desc: 'Past broadcasts & challenge stats', onClick: () => navigate('/studio/streams'), primary: false },
  ];

  if (loading) return <InstructorSkeleton />;

  return (
    <div style={{ flex: 1, padding: '32px 48px', overflowY: 'auto' }}>
      {/* Greeting */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.025em' }}>
            {greeting}, {firstName}
          </h1>
          <p style={{ color: 'var(--gray-400)', fontSize: 14, marginTop: 6 }}>
            {myLive.length > 0 ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--live)', fontWeight: 600 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--live)' }} className="animate-pulse" />
                You’re live · {totalLiveViewers.toLocaleString()} watching
              </span>
            ) : myScheduled.length > 0 ? (
              <><span className="mono">{myScheduled.length}</span> session{myScheduled.length === 1 ? '' : 's'} scheduled · nothing live right now</>
            ) : (
              <>Ready when you are — create a stream to go on air.</>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-create-stream"
        >
          <Plus size={18} /> Create Stream
        </button>
      </header>

      {/* Overview */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <StatCard label="Your streams" value={mine.length} icon={<Layers size={17} />} accent="violet" hint="all time" />
          <StatCard label="Live now" value={myLive.length} icon={<Radio size={17} />} accent={myLive.length ? 'red' : 'neutral'} hint={myLive.length ? 'on air' : 'idle'} />
          <StatCard label="Scheduled" value={myScheduled.length} icon={<CalendarClock size={17} />} accent="yellow" hint="upcoming" />
          <StatCard label="Watching now" value={totalLiveViewers.toLocaleString()} icon={<Users size={17} />} accent="cyan" hint="across live sessions" />
        </div>
      </section>

      {/* Quick actions */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {quickActions.map((a) => (
            <button
              key={a.label}
              onClick={a.onClick}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
                background: a.primary ? 'var(--indigo-500-10)' : 'var(--gray-900)',
                border: `1px solid ${a.primary ? 'var(--border-brand)' : 'var(--gray-800)'}`,
                borderRadius: 'var(--r-md)', padding: 16, cursor: 'pointer',
                transition: 'border-color 0.2s, transform 0.2s var(--ease-out)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-brand)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = a.primary ? 'var(--border-brand)' : 'var(--gray-800)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <span style={{
                width: 40, height: 40, flexShrink: 0, borderRadius: 'var(--r-sm)',
                background: a.primary ? 'linear-gradient(135deg, var(--indigo-500), var(--indigo-600))' : 'var(--indigo-500-10)',
                color: a.primary ? '#ffffff' : 'var(--indigo-500)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: a.primary ? 'var(--glow-violet)' : 'none',
              }}>
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
      </section>

      {/* Your sessions (live + scheduled) */}
      <section style={{ marginBottom: 40 }}>
        <SectionHeading
          title="Your sessions"
          subtitle="Live and upcoming — open the studio to manage them"
          icon={<Presentation size={18} />}
        />
        {activeSessions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activeSessions.map((s) => (
              <SessionRow key={s.id} stream={s} onOpen={openStream} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Video size={26} />}
            title="No active sessions"
            message="Create a stream to schedule a session or go live right away."
            action={
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-create-stream"
                style={{ fontSize: 13, padding: '9px 18px' }}
              >
                <Plus size={16} /> Create your first stream
              </button>
            }
          />
        )}
      </section>

      {/* Recent sessions you ran */}
      {myEnded.length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <SectionHeading
            title="Recent sessions"
            subtitle="Sessions you’ve wrapped up"
            icon={<History size={18} />}
            action={
              <button onClick={() => navigate('/studio/streams')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: 'var(--indigo-400)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                Studio archives <ArrowRight size={14} />
              </button>
            }
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
            {myEnded.map((s, i) => <StreamCard key={s.id} stream={s} index={i} onOpen={openStream} />)}
          </div>
        </section>
      )}

      {showCreateModal && (
        <CreateStreamModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(id) => { setShowCreateModal(false); navigate(`/stream/${id}`); }}
        />
      )}
    </div>
  );
}

/** Compact management row for the instructor's own live/scheduled sessions. */
function SessionRow({ stream, onOpen }: { stream: StreamSummary; onOpen: (id: string) => void }) {
  const isLive = stream.status === 'LIVE';
  return (
    <div
      onClick={() => onOpen(stream.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: 14,
        background: 'var(--gray-900)', border: `1px solid ${isLive ? 'var(--red-500-30)' : 'var(--gray-800)'}`,
        borderRadius: 'var(--r-md)', cursor: 'pointer', transition: 'border-color 0.2s, transform 0.15s var(--ease-out)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.borderColor = isLive ? 'var(--red-500)' : 'var(--border-brand)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = isLive ? 'var(--red-500-30)' : 'var(--gray-800)'; }}
    >
      {/* Thumbnail */}
      <div style={{ width: 96, height: 56, flexShrink: 0, borderRadius: 'var(--r-sm)', overflow: 'hidden', position: 'relative', background: 'var(--gray-800)' }}>
        {stream.thumbnailUrl ? (
          <img src={stream.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(140deg, var(--indigo-800), var(--gray-900))' }} />
        )}
      </div>

      {/* Info */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          {isLive ? (
            <Badge tone="red" solid size="sm" icon={<span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} className="animate-pulse" />}>LIVE</Badge>
          ) : (
            <Badge tone="yellow" size="sm" icon={<Clock size={11} />}>Scheduled</Badge>
          )}
          <span style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>{stream.course}</span>
        </div>
        <p className="truncate" style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>{stream.title}</p>
        <p style={{ fontSize: 12.5, color: 'var(--gray-500)', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
          {isLive ? (
            <><Users size={12} /> {stream.viewerCount.toLocaleString()} watching</>
          ) : stream.startedAt ? (
            <><CalendarClock size={12} /> Starts {relativeTime(stream.startedAt)}</>
          ) : (
            <>Not scheduled yet</>
          )}
        </p>
      </div>

      {/* Action */}
      <span
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, flexShrink: 0,
          padding: '9px 16px', borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 600,
          background: isLive ? 'linear-gradient(135deg, var(--indigo-500), var(--indigo-600))' : 'var(--indigo-500-10)',
          color: isLive ? '#ffffff' : 'var(--indigo-500)',
          border: isLive ? 'none' : '1px solid var(--border-brand)',
          boxShadow: isLive ? 'var(--glow-violet)' : 'none',
        }}
      >
        {isLive ? <><Radio size={14} /> Open studio</> : <><PlayCircle size={14} /> Open</>}
      </span>
    </div>
  );
}

function InstructorSkeleton() {
  return (
    <div style={{ flex: 1, padding: '32px 48px', overflowY: 'auto' }}>
      <div className="skeleton" style={{ height: 32, width: 280, marginBottom: 10 }} />
      <div className="skeleton" style={{ height: 16, width: 220, marginBottom: 32 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 36 }}>
        {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 96, borderRadius: 'var(--r-md)' }} />)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 84, borderRadius: 'var(--r-md)' }} />)}
      </div>
    </div>
  );
}
