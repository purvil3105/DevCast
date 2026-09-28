import { useNavigate } from 'react-router-dom';
import { Radio, Clock, Users, Code2, ChevronLeft, ChevronRight, BarChart3, Calendar } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { relativeTime } from '../../lib/format';

export interface StreamRowItem {
  id: string;
  title: string;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED';
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  peakViewers: number;
  thumbnailUrl: string | null;
  course: { id: string; title: string };
  challengeCount: number;
  submissionCount: number;
}

interface StreamTableProps {
  streams: StreamRowItem[];
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (newPage: number) => void;
  loading?: boolean;
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

function formatDate(iso: string | null): string {
  if (!iso) return 'Not scheduled';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function StreamTable({
  streams,
  page,
  totalPages,
  total,
  onPageChange,
  loading = false,
}: StreamTableProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton" style={{ height: 68, borderRadius: 'var(--r-md)' }} />
        ))}
      </div>
    );
  }

  if (streams.length === 0) {
    return (
      <div
        style={{
          background: 'var(--gray-900)',
          border: '1px solid var(--gray-800)',
          borderRadius: 'var(--r-md)',
          padding: '48px 24px',
          textAlign: 'center',
          color: 'var(--gray-400)',
        }}
      >
        <BarChart3 size={36} color="var(--gray-600)" style={{ margin: '0 auto 12px' }} />
        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>
          No stream records found
        </h4>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--gray-500)' }}>
          Streams and their broadcast telemetry will be recorded here automatically.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--gray-900)',
        border: '1px solid var(--gray-800)',
        borderRadius: 'var(--r-md)',
        overflow: 'hidden',
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: 13.5,
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--gray-800)',
                background: 'var(--gray-850)',
                color: 'var(--gray-400)',
                fontWeight: 600,
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <th style={{ padding: '14px 18px' }}>Session / Title</th>
              <th style={{ padding: '14px 18px' }}>Status</th>
              <th style={{ padding: '14px 18px' }}>Date</th>
              <th style={{ padding: '14px 18px' }}>Duration</th>
              <th style={{ padding: '14px 18px' }}>Peak Viewers</th>
              <th style={{ padding: '14px 18px' }}>Submissions</th>
              <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {streams.map((s) => {
              const isLive = s.status === 'LIVE';
              return (
                <tr
                  key={s.id}
                  style={{
                    borderBottom: '1px solid var(--gray-800)',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--hover-bg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {/* Thumbnail & Title */}
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div
                        style={{
                          width: 64,
                          height: 38,
                          borderRadius: 'var(--r-sm)',
                          overflow: 'hidden',
                          background: 'var(--gray-800)',
                          flexShrink: 0,
                          position: 'relative',
                        }}
                      >
                        {s.thumbnailUrl ? (
                          <img
                            src={s.thumbnailUrl}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
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
                      <div style={{ minWidth: 0, maxWidth: 280 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            color: 'var(--text-main)',
                            fontSize: 14,
                          }}
                          className="truncate"
                          title={s.title}
                        >
                          {s.title}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>
                          {s.course?.title}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td style={{ padding: '14px 18px' }}>
                    {isLive ? (
                      <Badge
                        tone="red"
                        solid
                        size="sm"
                        icon={
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: '#fff',
                            }}
                            className="animate-pulse"
                          />
                        }
                      >
                        LIVE
                      </Badge>
                    ) : s.status === 'SCHEDULED' ? (
                      <Badge tone="yellow" size="sm" icon={<Clock size={11} />}>
                        Scheduled
                      </Badge>
                    ) : (
                      <Badge tone="neutral" size="sm">
                        Ended
                      </Badge>
                    )}
                  </td>

                  {/* Date */}
                  <td style={{ padding: '14px 18px', color: 'var(--gray-400)', fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calendar size={13} color="var(--gray-500)" />
                      <span>{formatDate(s.startedAt)}</span>
                    </div>
                    {s.startedAt && (
                      <div style={{ fontSize: 11.5, color: 'var(--gray-500)', marginTop: 2 }}>
                        {relativeTime(s.startedAt)}
                      </div>
                    )}
                  </td>

                  {/* Duration */}
                  <td style={{ padding: '14px 18px', color: 'var(--gray-300)' }}>
                    <span className="mono" style={{ fontSize: 13 }}>
                      {formatDuration(s.durationSeconds)}
                    </span>
                  </td>

                  {/* Peak Viewers */}
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users size={14} color="var(--cyan)" />
                      <span className="mono" style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {s.peakViewers.toLocaleString()}
                      </span>
                    </div>
                  </td>

                  {/* Submissions */}
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Code2 size={14} color="var(--green-400)" />
                      <span className="mono" style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {s.submissionCount.toLocaleString()}
                      </span>
                      {s.challengeCount > 0 && (
                        <span style={{ fontSize: 11.5, color: 'var(--gray-500)' }}>
                          ({s.challengeCount} ch)
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <button
                      onClick={() => navigate(`/studio/streams/${s.id}`)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 'var(--r-sm)',
                        fontSize: 12.5,
                        fontWeight: 600,
                        background: 'var(--indigo-500-10)',
                        border: '1px solid var(--border-brand)',
                        color: 'var(--indigo-400)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--indigo-500)';
                        e.currentTarget.style.color = '#ffffff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--indigo-500-10)';
                        e.currentTarget.style.color = 'var(--indigo-400)';
                      }}
                    >
                      View Stats
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderTop: '1px solid var(--gray-800)',
            background: 'var(--gray-850)',
            fontSize: 13,
            color: 'var(--gray-400)',
          }}
        >
          <span>
            Showing page <strong style={{ color: 'var(--text-main)' }}>{page}</strong> of{' '}
            <strong style={{ color: 'var(--text-main)' }}>{totalPages}</strong> ({total} total streams)
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 12px',
                borderRadius: 'var(--r-sm)',
                border: '1px solid var(--gray-800)',
                background: 'var(--gray-900)',
                color: page <= 1 ? 'var(--gray-600)' : 'var(--text-main)',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                fontSize: 12.5,
                fontWeight: 500,
              }}
            >
              <ChevronLeft size={14} /> Previous
            </button>

            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 12px',
                borderRadius: 'var(--r-sm)',
                border: '1px solid var(--gray-800)',
                background: 'var(--gray-900)',
                color: page >= totalPages ? 'var(--gray-600)' : 'var(--text-main)',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                fontSize: 12.5,
                fontWeight: 500,
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
