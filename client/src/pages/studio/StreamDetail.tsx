import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, Code2, Terminal, Percent,
  Radio, Calendar, Clock, ExternalLink
} from 'lucide-react';
import { getStudioStreamDetail } from '../../lib/api';
import type { StudioStreamDetailResponse } from '../../lib/api';
import { StatCard } from '../../components/studio/StatCard';
import { ChallengeBreakdown } from '../../components/studio/ChallengeBreakdown';
import { Badge } from '../../components/ui/Badge';
import { SectionHeading } from '../../components/ui/SectionHeading';
import { relativeTime } from '../../lib/format';

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

function formatDate(iso: string | null): string {
  if (!iso) return 'Not scheduled';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function StreamDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<StudioStreamDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await getStudioStreamDetail(id);
      setData(res);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load stream detail:', err);
      setError(err?.response?.data?.error || 'Failed to load stream details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: '32px 40px' }}>
        <div className="skeleton" style={{ height: 36, width: 140, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 160, borderRadius: 'var(--r-lg)', marginBottom: 32 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 36 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--r-md)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '48px 40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--red-400)', fontSize: 15, marginBottom: 16 }}>{error || 'Stream not found'}</p>
        <button
          onClick={() => navigate('/studio/streams')}
          style={{
            padding: '8px 18px',
            borderRadius: 'var(--r-sm)',
            background: 'var(--gray-800)',
            color: 'var(--text-main)',
            border: '1px solid var(--gray-700)',
            cursor: 'pointer',
          }}
        >
          Back to Stream History
        </button>
      </div>
    );
  }

  const { stream, stats, challenges } = data;
  const isLive = stream.status === 'LIVE';

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Back navigation */}
      <button
        onClick={() => navigate('/studio/streams')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'transparent',
          border: 'none',
          color: 'var(--gray-400)',
          fontSize: 13.5,
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: 20,
          padding: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-main)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--gray-400)'; }}
      >
        <ArrowLeft size={16} /> Back to Stream History
      </button>

      {/* Stream Header Banner */}
      <div
        style={{
          background: 'var(--gray-900)',
          border: '1px solid var(--gray-800)',
          borderRadius: 'var(--r-lg)',
          padding: '24px 28px',
          marginBottom: 32,
          display: 'flex',
          gap: 24,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {/* Thumbnail */}
        <div
          style={{
            width: 140,
            height: 84,
            borderRadius: 'var(--r-md)',
            overflow: 'hidden',
            background: 'var(--gray-800)',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          {stream.thumbnailUrl ? (
            <img src={stream.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
              <Radio size={24} />
            </div>
          )}
        </div>

        {/* Title and metadata */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            {isLive ? (
              <Badge tone="red" solid size="sm" icon={<span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} className="animate-pulse" />}>
                LIVE
              </Badge>
            ) : stream.status === 'SCHEDULED' ? (
              <Badge tone="yellow" size="sm">Scheduled</Badge>
            ) : (
              <Badge tone="neutral" size="sm">Ended</Badge>
            )}

            <span style={{ fontSize: 13, color: 'var(--indigo-400)', fontWeight: 600 }}>
              {stream.course?.title}
            </span>
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 800,
              color: 'var(--text-main)',
              letterSpacing: '-0.02em',
            }}
          >
            {stream.title}
          </h1>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              marginTop: 10,
              fontSize: 13,
              color: 'var(--gray-400)',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={14} color="var(--gray-500)" />
              {formatDate(stream.startedAt)}
            </span>
            {stream.startedAt && (
              <span style={{ color: 'var(--gray-500)' }}>
                ({relativeTime(stream.startedAt)})
              </span>
            )}
            {stream.durationSeconds != null && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} color="var(--cyan)" />
                Duration: <strong style={{ color: 'var(--text-main)' }}>{formatDuration(stream.durationSeconds)}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Action button */}
        <div style={{ flexShrink: 0 }}>
          <button
            onClick={() => navigate(`/stream/${stream.id}`)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 'var(--r-sm)',
              fontSize: 13,
              fontWeight: 600,
              background: isLive ? 'linear-gradient(135deg, var(--indigo-500), var(--indigo-600))' : 'var(--gray-800)',
              color: isLive ? '#ffffff' : 'var(--text-main)',
              border: `1px solid ${isLive ? 'transparent' : 'var(--gray-700)'}`,
              cursor: 'pointer',
              boxShadow: isLive ? 'var(--glow-violet)' : 'none',
            }}
          >
            <ExternalLink size={15} /> Open Broadcast Console
          </button>
        </div>
      </div>

      {/* Four Stat Cards */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <StatCard
            label="Peak Concurrent Viewers"
            value={stats.peakViewers.toLocaleString()}
            icon={<Users size={18} />}
            accent="cyan"
            hint="highest room count"
          />
          <StatCard
            label="Total Submissions"
            value={stats.totalSubmissions.toLocaleString()}
            icon={<Code2 size={18} />}
            accent="green"
            hint="solutions tested"
          />
          <StatCard
            label="Challenges Launched"
            value={stats.challengesFired.toLocaleString()}
            icon={<Terminal size={18} />}
            accent="violet"
            hint="live coding prompts"
          />
          <StatCard
            label="Avg Solve Rate"
            value={`${stats.avgSolveRate}%`}
            icon={<Percent size={18} />}
            accent="yellow"
            hint="passed / total submissions"
          />
        </div>
      </section>

      {/* Per-Challenge Breakdown */}
      <section style={{ marginBottom: 40 }}>
        <SectionHeading
          title="Challenge Performance Breakdown"
          subtitle="Detailed pass rates and execution telemetry per challenge run in this session"
          icon={<Terminal size={18} />}
        />
        <ChallengeBreakdown challenges={challenges} />
      </section>
    </div>
  );
}
