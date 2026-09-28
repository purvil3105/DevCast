import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Layers, Users, Eye, CheckCircle2, Radio,
  ArrowRight, Plus, History, Video, Clock
} from 'lucide-react';
import { getStudioOverview } from '../../lib/api';
import type { StudioOverviewData } from '../../lib/api';
import { StatCard } from '../../components/studio/StatCard';
import { LiveMonitorPanel } from '../../components/studio/LiveMonitorPanel';
import { SectionHeading } from '../../components/ui/SectionHeading';
import { Badge } from '../../components/ui/Badge';
import { relativeTime } from '../../lib/format';

interface StudioContextType {
  openCreateStreamModal: () => void;
}

function formatDuration(sec: number | null | undefined): string {
  if (sec == null || isNaN(sec)) return '—';
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
  }
  return `${mins}m ${s.toString().padStart(2, '0')}s`;
}

export function StudioOverview() {
  const navigate = useNavigate();
  const outletCtx = useOutletContext<StudioContextType>();
  const [data, setData] = useState<StudioOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await getStudioOverview();
      setData(res);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load studio overview:', err);
      setError(err?.response?.data?.error || 'Failed to load studio metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '32px 40px' }}>
        <div className="skeleton" style={{ height: 140, borderRadius: 'var(--r-lg)', marginBottom: 32 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 36 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 110, borderRadius: 'var(--r-md)' }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: 260, borderRadius: 'var(--r-md)' }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '48px 40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--red-400)', fontSize: 15, marginBottom: 16 }}>{error || 'Unable to load studio overview'}</p>
        <button
          onClick={fetchOverview}
          style={{
            padding: '8px 18px',
            borderRadius: 'var(--r-sm)',
            background: 'var(--gray-800)',
            color: 'var(--text-main)',
            border: '1px solid var(--gray-700)',
            cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 40px' }}>
      {/* 2.2 Live Monitor Panel (real-time or standby) */}
      <LiveMonitorPanel
        activeStream={data.activeStream}
        onCreateStream={outletCtx?.openCreateStreamModal}
      />

      {/* 2.1 Channel Overview Stats Cards */}
      <section style={{ marginBottom: 40 }}>
        <SectionHeading
          title="All-Time Channel Reach"
          subtitle="Aggregated analytics across your broadcasts and challenges"
          icon={<Layers size={18} />}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
          <StatCard
            label="Total Streams"
            value={data.totalStreams.toLocaleString()}
            icon={<Video size={18} />}
            accent="violet"
            hint="broadcast sessions"
          />
          <StatCard
            label="Total Views"
            value={data.totalViews.toLocaleString()}
            icon={<Eye size={18} />}
            accent="cyan"
            hint="cumulative peak reach"
          />
          <StatCard
            label="Avg Viewers / Stream"
            value={data.avgViewers.toLocaleString()}
            icon={<Users size={18} />}
            accent="green"
            hint="average concurrents"
          />
          <StatCard
            label="Submissions Received"
            value={data.totalSubmissions.toLocaleString()}
            icon={<CheckCircle2 size={18} />}
            accent="yellow"
            hint="learner solutions"
          />
        </div>
      </section>

      {/* Recent Sessions list */}
      <section style={{ marginBottom: 32 }}>
        <SectionHeading
          title="Recent Sessions"
          subtitle="Your latest 5 broadcast sessions with learner submissions"
          icon={<History size={18} />}
          action={
            <button
              onClick={() => navigate('/studio/streams')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--indigo-400)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              All streams table <ArrowRight size={14} />
            </button>
          }
        />

        {data.recentSessions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.recentSessions.map((s) => {
              const isLive = s.status === 'LIVE';
              return (
                <div
                  key={s.id}
                  onClick={() => navigate(`/studio/streams/${s.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: 16,
                    background: 'var(--gray-900)',
                    border: `1px solid ${isLive ? 'var(--red-500-30)' : 'var(--gray-800)'}`,
                    borderRadius: 'var(--r-md)',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, transform 0.15s var(--ease-out)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.borderColor = isLive ? 'var(--red-500)' : 'var(--border-brand)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = isLive ? 'var(--red-500-30)' : 'var(--gray-800)';
                  }}
                >
                  {/* Thumbnail */}
                  <div
                    style={{
                      width: 80,
                      height: 48,
                      borderRadius: 'var(--r-sm)',
                      overflow: 'hidden',
                      position: 'relative',
                      background: 'var(--gray-800)',
                      flexShrink: 0,
                    }}
                  >
                    {s.thumbnailUrl ? (
                      <img src={s.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          background: 'linear-gradient(135deg, var(--indigo-800), var(--gray-900))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--indigo-400)',
                        }}
                      >
                        <Radio size={14} />
                      </div>
                    )}
                  </div>

                  {/* Title & Info */}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      {isLive ? (
                        <Badge tone="red" solid size="sm" icon={<span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} className="animate-pulse" />}>
                          LIVE
                        </Badge>
                      ) : s.status === 'SCHEDULED' ? (
                        <Badge tone="yellow" size="sm">Scheduled</Badge>
                      ) : (
                        <Badge tone="neutral" size="sm">Ended</Badge>
                      )}
                      <span style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>{s.courseTitle}</span>
                    </div>

                    <p className="truncate" style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                      {s.title}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4, fontSize: 12.5, color: 'var(--gray-500)' }}>
                      {s.startedAt && <span>Started {relativeTime(s.startedAt)}</span>}
                      {s.durationSeconds != null && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} /> {formatDuration(s.durationSeconds)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats Pill */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 600 }}>PEAK VIEWERS</div>
                      <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>
                        {s.peakViewers.toLocaleString()}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 600 }}>SUBMISSIONS</div>
                      <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--green-400)' }}>
                        {s.submissionCount.toLocaleString()}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/studio/streams/${s.id}`);
                      }}
                      style={{
                        padding: '7px 14px',
                        borderRadius: 'var(--r-sm)',
                        fontSize: 12.5,
                        fontWeight: 600,
                        background: 'var(--indigo-500-10)',
                        border: '1px solid var(--border-brand)',
                        color: 'var(--indigo-400)',
                        cursor: 'pointer',
                      }}
                    >
                      View Stats
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              background: 'var(--gray-900)',
              border: '1px solid var(--gray-800)',
              borderRadius: 'var(--r-md)',
              padding: '36px 24px',
              textAlign: 'center',
              color: 'var(--gray-400)',
            }}
          >
            <Video size={32} color="var(--gray-600)" style={{ margin: '0 auto 10px' }} />
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>No streams created yet</h4>
            <p style={{ margin: '6px 0 16px', fontSize: 13, color: 'var(--gray-500)' }}>
              Create your first stream session to broadcast live and engage learners with challenges.
            </p>
            <button
              onClick={outletCtx?.openCreateStreamModal}
              className="btn-create-stream"
              style={{ fontSize: 13 }}
            >
              <Plus size={16} /> Create Stream
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
