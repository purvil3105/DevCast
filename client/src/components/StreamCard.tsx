import { useState } from 'react';
import { Play, Users, Clock, Video } from 'lucide-react';
import type { StreamSummary } from '../lib/api';
import { relativeTime } from '../lib/format';

interface StreamCardProps {
  stream: StreamSummary;
  index?: number;
  onOpen: (id: string) => void;
}

const isUpcoming = (s: string) => s === 'SCHEDULED' || s === 'PENDING';

/**
 * Discovery card for a stream. Renders the real thumbnail when the stream has
 * one, otherwise a deterministic gradient so older/un-thumbnailed streams still
 * look intentional. Presentation/hover lives in `.stream-card` (index.css).
 */
export function StreamCard({ stream, index = 0, onOpen }: StreamCardProps) {
  const isLive = stream.status === 'LIVE';
  const isEnded = stream.status === 'ENDED';
  const cardClass = `stream-card${isLive ? ' is-live' : ''}${isEnded ? ' is-ended' : ''}`;
  const [imgError, setImgError] = useState(false);

  // Deterministic gradient fallback (varies by position for visual rhythm).
  const h1 = 250 + (index % 5) * 12;
  const h2 = 188 + (index % 4) * 16;

  const timeLabel = isLive
    ? null
    : isUpcoming(stream.status)
      ? stream.startedAt
        ? `Starts ${relativeTime(stream.startedAt)}`
        : 'Scheduled'
      : stream.startedAt
        ? `Streamed ${relativeTime(stream.startedAt)}`
        : 'Ended';

  return (
    <div className={cardClass} onClick={() => onOpen(stream.id)} style={{ height: '100%' }}>
      {/* Thumbnail */}
      <div style={{ height: 176, position: 'relative', overflow: 'hidden' }}>
        {stream.thumbnailUrl && !imgError ? (
          <img
            className="thumb-zoom"
            src={stream.thumbnailUrl}
            alt=""
            onError={() => setImgError(true)}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: isEnded ? 'saturate(0.7)' : 'none',
            }}
          />
        ) : (
          <div
            className="thumb-zoom"
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(140deg, hsl(${h1}, 55%, 22%) 0%, hsl(${h2}, 52%, 15%) 100%)`,
              filter: isEnded ? 'saturate(0.5)' : 'none',
            }}
          />
        )}
        {/* soft top-left sheen + bottom scrim for legibility */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 15% 0%, rgba(255,255,255,0.10), transparent 55%)', zIndex: 1 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent 55%)', zIndex: 1 }} />

        {/* Status badge (top-left) */}
        <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 2 }}>
          {isLive ? (
            <span className="live-badge"><span className="dot" />LIVE</span>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(10,10,20,0.55)',
                backdropFilter: 'blur(6px)',
                color: isEnded ? '#cbd2de' : '#fbbf24',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.03em',
                padding: '4px 10px',
                borderRadius: 'var(--r-sm)',
                textTransform: 'uppercase',
                border: `1px solid ${isEnded ? 'rgba(255,255,255,0.14)' : 'rgba(245,158,11,0.4)'}`,
              }}
            >
              {isEnded ? <Video size={11} /> : <Clock size={11} />}
              {isUpcoming(stream.status) ? 'Scheduled' : 'Ended'}
            </span>
          )}
        </div>

        {/* Live viewer count (bottom-right) */}
        {isLive && (
          <div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 2 }}>
            <span
              className="mono"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(10,10,20,0.6)',
                backdropFilter: 'blur(6px)',
                color: 'var(--cyan-light)',
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 9px',
                borderRadius: 'var(--r-sm)',
                border: '1px solid var(--cyan-20)',
              }}
            >
              <Users size={12} />
              {stream.viewerCount.toLocaleString()} watching
            </span>
          </div>
        )}

        {/* Play overlay (revealed on hover via CSS) */}
        <div
          className="play-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
            background: 'rgba(8,8,16,0.28)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--indigo-500), var(--indigo-600))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: 'var(--glow-violet)',
            }}
          >
            <Play size={24} fill="currentColor" style={{ marginLeft: 3 }} />
          </div>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--indigo-400)',
              background: 'var(--indigo-500-10)',
              padding: '3px 9px',
              borderRadius: 'var(--r-sm)',
            }}
          >
            {stream.course}
          </span>
        </div>
        <h3
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--text-main)',
            margin: '0 0 6px 0',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.4,
          }}
        >
          {stream.title}
        </h3>
        <div
          style={{
            marginTop: 'auto',
            paddingTop: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--indigo-500), var(--indigo-600))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {stream.instructor.substring(0, 2).toUpperCase()}
            </div>
            <span className="truncate" style={{ fontSize: 13, color: 'var(--gray-400)', fontWeight: 500 }}>
              {stream.instructor}
            </span>
          </div>
          {timeLabel && (
            <span style={{ fontSize: 12, color: 'var(--gray-500)', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {timeLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
