import { useState, useEffect } from 'react';
import { Terminal, Play, Send, CheckCircle2, Clock } from 'lucide-react';
import { getRemainingSeconds } from '../hooks/useStreamState';
import type { ActiveChallenge } from '../hooks/useStreamState';

interface ChallengePanelProps {
  challenge: ActiveChallenge;
  serverTimeOffset: number;
  isRunning: boolean;
  isSubmitting: boolean;
  hasSubmitted: boolean;
  submitCount: number;
  virtualNow?: number;
  onRun: () => void;
  onSubmit: () => void;
}

/**
 * Challenge header bar: title, description, countdown timer, Run + Submit buttons.
 * - Run: executes code without saving (can run many times)
 * - Submit: saves as final submission (can re-submit any time while active)
 */
export function ChallengePanel({
  challenge,
  serverTimeOffset,
  isRunning,
  isSubmitting,
  hasSubmitted,
  submitCount,
  virtualNow,
  onRun,
  onSubmit,
}: ChallengePanelProps) {
  const [remaining, setRemaining] = useState(
    getRemainingSeconds(challenge.startedAt, challenge.durationSeconds, serverTimeOffset, virtualNow)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(
        getRemainingSeconds(challenge.startedAt, challenge.durationSeconds, serverTimeOffset, virtualNow)
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [challenge.startedAt, challenge.durationSeconds, serverTimeOffset, virtualNow]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isUrgent = remaining <= 30 && remaining > 0;
  const isExpired = remaining <= 0;

  const timerColor = isExpired
    ? '#f87171'
    : isUrgent
    ? '#fb923c'
    : remaining <= 60
    ? '#facc15'
    : 'var(--gray-300)';

  const timerBg = isExpired
    ? 'rgba(248,113,113,0.1)'
    : isUrgent
    ? 'rgba(251,146,60,0.1)'
    : 'var(--gray-800)';

  const timerBorder = isExpired
    ? 'rgba(248,113,113,0.3)'
    : isUrgent
    ? 'rgba(251,146,60,0.3)'
    : 'var(--gray-700)';

  const busy = isRunning || isSubmitting;

  return (
    <div style={{
      background: 'var(--gray-900)',
      borderBottom: '1px solid var(--gray-800)',
      padding: '10px 14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexShrink: 0,
    }}>
      {/* Left: Challenge info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div style={{
          padding: 8,
          background: 'rgba(99,102,241,0.1)',
          borderRadius: 8,
          color: 'var(--indigo-400)',
          display: 'flex',
          flexShrink: 0,
        }}>
          <Terminal size={16} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h2 style={{
            color: 'white',
            fontWeight: 600,
            fontSize: 13,
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {challenge.title}
          </h2>
          <p style={{
            color: 'var(--gray-500)',
            fontSize: 11,
            marginTop: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {challenge.description}
          </p>
        </div>
      </div>

      {/* Right: Timer + Run + Submit */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {/* Timer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          padding: '5px 10px',
          borderRadius: 6,
          border: `1px solid ${timerBorder}`,
          background: timerBg,
          color: timerColor,
          transition: 'all 0.3s',
          minWidth: 70,
          justifyContent: 'center',
        }}>
          <Clock size={12} />
          {isExpired ? "Time's up!" : formatTime(remaining)}
        </div>

        {/* Submit count badge */}
        {hasSubmitted && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            color: '#4ade80',
            background: 'rgba(74,222,128,0.08)',
            border: '1px solid rgba(74,222,128,0.2)',
            borderRadius: 6,
            padding: '4px 8px',
            fontWeight: 500,
          }}>
            <CheckCircle2 size={11} />
            {submitCount === 1 ? 'Submitted' : `Re-submitted ×${submitCount}`}
          </div>
        )}

        {/* ── Run Button ── */}
        <button
          onClick={onRun}
          disabled={busy || isExpired}
          title="Run code — test without saving"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            cursor: busy || isExpired ? 'not-allowed' : 'pointer',
            background: busy && isRunning ? 'var(--gray-800)' : 'rgba(34,197,94,0.1)',
            color: busy && isRunning ? 'var(--gray-500)' : '#4ade80',
            border: '1px solid rgba(34,197,94,0.25)',
            transition: 'all 0.2s',
            opacity: isExpired ? 0.4 : 1,
          }}
          onMouseEnter={(e) => {
            if (!busy && !isExpired) {
              e.currentTarget.style.background = 'rgba(34,197,94,0.18)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isRunning ? 'var(--gray-800)' : 'rgba(34,197,94,0.1)';
          }}
        >
          {isRunning ? (
            <>
              <span style={{
                width: 11, height: 11, borderRadius: '50%',
                border: '2px solid rgba(74,222,128,0.3)',
                borderTopColor: '#4ade80',
                display: 'inline-block',
                animation: 'spin 0.7s linear infinite',
              }} />
              Running…
            </>
          ) : (
            <>
              <Play size={12} fill="currentColor" />
              Run
            </>
          )}
        </button>

        {/* ── Submit Button ── */}
        <button
          onClick={onSubmit}
          disabled={busy || isExpired}
          title={isExpired ? 'Time is up' : hasSubmitted ? 'Re-submit with updated code' : 'Submit final answer'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: busy || isExpired ? 'not-allowed' : 'pointer',
            background: isExpired
              ? 'var(--gray-800)'
              : isSubmitting
              ? 'var(--indigo-800)'
              : 'var(--indigo-600)',
            color: isExpired || isSubmitting ? 'var(--gray-400)' : 'white',
            boxShadow: !busy && !isExpired ? '0 4px 12px rgba(99,102,241,0.25)' : 'none',
            border: 'none',
            transition: 'all 0.2s',
            opacity: isExpired ? 0.4 : 1,
          }}
        >
          {isSubmitting ? (
            <>
              <span style={{
                width: 11, height: 11, borderRadius: '50%',
                border: '2px solid rgba(165,180,252,0.3)',
                borderTopColor: 'var(--indigo-300)',
                display: 'inline-block',
                animation: 'spin 0.7s linear infinite',
              }} />
              Submitting…
            </>
          ) : (
            <>
              <Send size={12} />
              {hasSubmitted ? 'Re-submit' : 'Submit'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
