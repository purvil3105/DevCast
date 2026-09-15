import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Radio, Clock, Video } from 'lucide-react';
import { listStreams, getStoredUser, type StreamSummary } from '../lib/api';
import { StreamCard } from '../components/StreamCard';
import { CreateStreamModal } from '../components/CreateStreamModal';
import { EmptyState } from '../components/ui/EmptyState';

type Category = 'All' | 'Live' | 'Upcoming' | 'Past';
const isUpcoming = (s: string) => s === 'SCHEDULED' || s === 'PENDING';

/**
 * Live Sessions — the discovery/browse surface for live, upcoming, and past
 * streams. (The dashboard is now role-specific and lives at "/".)
 */
export function LiveSessionsPage() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [streams, setStreams] = useState<StreamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await listStreams();
        setStreams(data || []);
      } catch (err) {
        console.error('Failed to load streams:', err);
        setStreams([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openStream = (id: string) => navigate(`/stream/${id}`);

  const liveCount = streams.filter((s) => s.status === 'LIVE').length;
  const upcomingCount = streams.filter((s) => isUpcoming(s.status)).length;
  const pastCount = streams.filter((s) => s.status === 'ENDED').length;

  const q = searchQuery.trim().toLowerCase();
  const filtered = streams.filter((s) => {
    const matchesCategory =
      activeCategory === 'All'
        ? true
        : activeCategory === 'Live'
          ? s.status === 'LIVE'
          : activeCategory === 'Upcoming'
            ? isUpcoming(s.status)
            : s.status === 'ENDED';
    const matchesQuery =
      !q ||
      s.title.toLowerCase().includes(q) ||
      s.instructor.toLowerCase().includes(q) ||
      s.course.toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });

  const statusRank = (s: string) => (s === 'LIVE' ? 0 : isUpcoming(s) ? 1 : 2);
  const sorted = [...filtered].sort((a, b) => statusRank(a.status) - statusRank(b.status));

  const categories: Array<{ key: Category; label: string; count: number; icon: React.ReactNode }> = [
    { key: 'All', label: 'All', count: streams.length, icon: null },
    { key: 'Live', label: 'Live', count: liveCount, icon: <Radio size={14} /> },
    { key: 'Upcoming', label: 'Upcoming', count: upcomingCount, icon: <Clock size={14} /> },
    { key: 'Past', label: 'Past', count: pastCount, icon: <Video size={14} /> },
  ];

  return (
    <div style={{ flex: 1, padding: '32px 48px', overflowY: 'auto' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.025em' }}>
            Live Sessions
          </h1>
          <p style={{ color: 'var(--gray-400)', fontSize: 14, marginTop: 6 }}>
            {liveCount > 0 ? (
              <><span style={{ color: 'var(--live)', fontWeight: 600 }}>{liveCount} live now</span> · <span className="mono">{upcomingCount}</span> upcoming · <span className="mono">{pastCount}</span> past</>
            ) : (
              <>Browse live, upcoming, and past coding sessions · <span className="mono">{upcomingCount}</span> upcoming · <span className="mono">{pastCount}</span> past</>
            )}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }} />
            <input
              type="text"
              placeholder="Search sessions, instructors…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'var(--gray-900)',
                border: '1px solid var(--gray-800)',
                borderRadius: 'var(--r-xl)',
                padding: '10px 16px 10px 42px',
                fontSize: 14,
                width: 280,
                maxWidth: '48vw',
                color: 'var(--text-main)',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--indigo-500)';
                e.target.style.boxShadow = '0 0 0 3px var(--indigo-500-20)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--gray-800)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          {user?.role === 'INSTRUCTOR' && (
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'linear-gradient(135deg, var(--indigo-500), var(--indigo-600))',
                color: '#fff',
                padding: '10px 20px',
                borderRadius: 'var(--r-xl)',
                fontSize: 14,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                boxShadow: 'var(--glow-violet)',
                whiteSpace: 'nowrap',
              }}
            >
              <Plus size={18} />
              Create Stream
            </button>
          )}
        </div>
      </header>

      {/* Filter tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28, borderBottom: '1px solid var(--gray-800)', paddingBottom: 16, flexWrap: 'wrap' }}>
        {categories.map(({ key, label, count, icon }) => {
          const active = activeCategory === key;
          const isLiveTab = key === 'Live' && count > 0;
          return (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '8px 16px',
                borderRadius: 'var(--r-xl)',
                fontSize: 14,
                fontWeight: active ? 600 : 500,
                background: active ? 'var(--indigo-500-20)' : 'transparent',
                color: active ? 'var(--indigo-400)' : 'var(--gray-400)',
                border: `1px solid ${active ? 'var(--border-brand)' : 'var(--gray-800)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s var(--ease-out)',
              }}
            >
              {isLiveTab ? <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--live)' }} className="animate-pulse" /> : icon}
              {label}
              {count > 0 && (
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '1px 7px',
                    borderRadius: 'var(--r-sm)',
                    background: active ? 'var(--indigo-500-20)' : 'var(--gray-800)',
                    color: active ? 'var(--indigo-400)' : 'var(--gray-400)',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ background: 'var(--gray-900)', border: '1px solid var(--gray-800)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
              <div className="skeleton" style={{ height: 176, borderRadius: 0 }} />
              <div style={{ padding: 20 }}>
                <div className="skeleton" style={{ height: 14, width: '55%', marginBottom: 12 }} />
                <div className="skeleton" style={{ height: 20, width: '90%', marginBottom: 14 }} />
                <div className="skeleton" style={{ height: 14, width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={activeCategory === 'Live' ? <Radio size={28} /> : <Video size={28} />}
          title={
            q
              ? 'No matches'
              : activeCategory === 'Live'
                ? "No one's live right now"
                : activeCategory === 'Upcoming'
                  ? 'Nothing scheduled yet'
                  : activeCategory === 'Past'
                    ? 'No past sessions'
                    : 'No sessions found'
          }
          message={
            q
              ? `Nothing matches “${searchQuery}”. Try a different search.`
              : user?.role === 'INSTRUCTOR' && activeCategory !== 'Past'
                ? 'Start a stream to go on air and run live challenges.'
                : 'New sessions will show up here as instructors go live.'
          }
          action={
            q ? (
              <button
                onClick={() => setSearchQuery('')}
                style={{ padding: '8px 18px', borderRadius: 'var(--r-xl)', background: 'var(--indigo-500-10)', color: 'var(--indigo-400)', border: '1px solid var(--border-brand)', fontSize: 13, fontWeight: 600 }}
              >
                Clear search
              </button>
            ) : undefined
          }
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
          {sorted.map((stream, idx) => (
            <div key={stream.id} style={{ animation: 'fadeInUp 0.5s var(--ease-out) both', animationDelay: `${Math.min(idx, 12) * 55}ms` }}>
              <StreamCard stream={stream} index={idx} onOpen={openStream} />
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateStreamModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(id) => {
            setShowCreateModal(false);
            navigate(`/stream/${id}`);
          }}
        />
      )}
    </div>
  );
}
