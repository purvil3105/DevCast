import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, Users, MessageSquare, CheckCircle2, Clock, ArrowRight, Plus } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';

interface ActiveStreamInfo {
  id: string;
  title: string;
  status: string;
  startedAt: string | null;
  thumbnailUrl: string | null;
  course: { id: string; title: string };
  viewerCount: number;
  durationSeconds: number | null;
}

interface LiveMonitorPanelProps {
  activeStream: ActiveStreamInfo | null;
  onCreateStream?: () => void;
}

export function LiveMonitorPanel({ activeStream, onCreateStream }: LiveMonitorPanelProps) {
  const navigate = useNavigate();

  const [viewerCount, setViewerCount] = useState(activeStream?.viewerCount || 0);
  const [chatCount, setChatCount] = useState(0);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Sync initial viewerCount when activeStream changes
  useEffect(() => {
    if (activeStream) {
      setViewerCount(activeStream.viewerCount || 0);
    }
  }, [activeStream]);

  // Live timer tick
  useEffect(() => {
    if (!activeStream?.startedAt) return;
    const startMs = new Date(activeStream.startedAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((now - startMs) / 1000));
      setElapsedSeconds(diffSec);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeStream?.startedAt]);

  // Socket event listener
  const handleSocketEvent = useMemo(() => {
    return (event: any) => {
      if (!event) return;

      switch (event.type) {
        case 'viewer_count_update':
          if (typeof event.payload?.count === 'number') {
            setViewerCount(event.payload.count);
          }
          break;
        case 'session_snapshot':
          if (typeof event.payload?.viewerCount === 'number') {
            setViewerCount(event.payload.viewerCount);
          }
          break;
        case 'chat_message':
          setChatCount((c) => c + 1);
          break;
        case 'submission_ack':
        case 'leaderboard_update':
          setSubmissionCount((c) => c + 1);
          break;
        default:
          break;
      }
    };
  }, []);

  useSocket({
    streamId: activeStream?.id || '',
    enabled: !!activeStream?.id,
    onEvent: handleSocketEvent,
  });

  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!activeStream) {
    return (
      <div
        style={{
          background: 'var(--gray-900)',
          border: '1px dashed var(--gray-800)',
          borderRadius: 'var(--r-md)',
          padding: '24px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
          flexWrap: 'wrap',
          marginBottom: 32,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--r-sm)',
              background: 'var(--hover-bg)',
              border: '1px solid var(--gray-800)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--gray-400)',
              flexShrink: 0,
            }}
          >
            <Radio size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>
              Broadcast Standby
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--gray-500)' }}>
              No stream is live right now. When you start streaming, real-time viewer, chat, and challenge counters appear here automatically.
            </p>
          </div>
        </div>

        {onCreateStream && (
          <button
            onClick={onCreateStream}
            className="btn-create-stream"
            style={{ fontSize: 13, padding: '8px 16px' }}
          >
            <Plus size={16} /> Go Live Now
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'linear-gradient(145deg, rgba(239, 68, 68, 0.04) 0%, var(--gray-900) 100%)',
        border: '1px solid var(--red-500-30)',
        borderRadius: 'var(--r-lg)',
        padding: '24px 28px',
        marginBottom: 32,
        boxShadow: '0 4px 24px rgba(239, 68, 68, 0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Banner Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--gray-800)',
          paddingBottom: 20,
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: '999px',
              background: 'var(--red-500-20)',
              border: '1px solid var(--red-500-30)',
              color: 'var(--red-400)',
              fontSize: 12.5,
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--red-500)',
              }}
              className="animate-pulse"
            />
            LIVE MONITOR
          </span>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 800,
                color: 'var(--text-main)',
                letterSpacing: '-0.01em',
              }}
            >
              {activeStream.title}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--gray-400)' }}>
              Course: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{activeStream.course?.title}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate(`/stream/${activeStream.id}`)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 18px',
            borderRadius: 'var(--r-sm)',
            fontSize: 13,
            fontWeight: 600,
            background: 'linear-gradient(135deg, var(--indigo-500), var(--indigo-600))',
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
            boxShadow: 'var(--glow-violet)',
            transition: 'transform 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <Radio size={15} /> Open Broadcast Console <ArrowRight size={14} />
        </button>
      </div>

      {/* Real-time Telemetry Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 16,
        }}
      >
        {/* Viewers */}
        <div
          style={{
            background: 'var(--gray-850)',
            border: '1px solid var(--gray-800)',
            borderRadius: 'var(--r-md)',
            padding: '14px 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-400)' }}>CURRENT VIEWERS</span>
            <Users size={16} color="var(--red-400)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span className="mono" style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-main)' }}>
              {viewerCount.toLocaleString()}
            </span>
            <span style={{ fontSize: 12, color: 'var(--red-400)', fontWeight: 600 }}>live</span>
          </div>
        </div>

        {/* Duration */}
        <div
          style={{
            background: 'var(--gray-850)',
            border: '1px solid var(--gray-800)',
            borderRadius: 'var(--r-md)',
            padding: '14px 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-400)' }}>STREAM DURATION</span>
            <Clock size={16} color="var(--cyan)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span className="mono" style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-main)' }}>
              {formatTimer(elapsedSeconds)}
            </span>
          </div>
        </div>

        {/* Chat Messages */}
        <div
          style={{
            background: 'var(--gray-850)',
            border: '1px solid var(--gray-800)',
            borderRadius: 'var(--r-md)',
            padding: '14px 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-400)' }}>CHAT ACTIVITY</span>
            <MessageSquare size={16} color="var(--indigo-400)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span className="mono" style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-main)' }}>
              {chatCount.toLocaleString()}
            </span>
            <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>messages</span>
          </div>
        </div>

        {/* Submissions */}
        <div
          style={{
            background: 'var(--gray-850)',
            border: '1px solid var(--gray-800)',
            borderRadius: 'var(--r-md)',
            padding: '14px 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-400)' }}>CODE SUBMISSIONS</span>
            <CheckCircle2 size={16} color="var(--green-400)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span className="mono" style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-main)' }}>
              {submissionCount.toLocaleString()}
            </span>
            <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>received</span>
          </div>
        </div>
      </div>
    </div>
  );
}
