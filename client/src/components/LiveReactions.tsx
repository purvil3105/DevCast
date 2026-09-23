import { useState, useCallback, useRef } from 'react';
import { Sparkles } from 'lucide-react';

export interface ReactionParticle {
  id: string;
  emoji: string;
  x: number;
  size: number;
  duration: number;
  drift: number;
}

export const REACTION_EMOJIS = ['❤️', '🔥', '👏', '🚀', '💡', '🤯', '🎉', '⚡'];

interface FloatingReactionsOverlayProps {
  particles: ReactionParticle[];
}

/**
 * Floating reactions overlay that renders live emoji particles
 * rising up over the video player.
 */
export function FloatingReactionsOverlay({ particles }: FloatingReactionsOverlayProps) {
  return (
    <>
      <style>{`
        @keyframes devcastFloatUp {
          0% {
            opacity: 0;
            transform: translateY(10px) scale(0.6) rotate(0deg);
          }
          15% {
            opacity: 1;
            transform: translateY(-20px) scale(1.2) rotate(var(--drift-rot, 5deg));
          }
          75% {
            opacity: 0.9;
            transform: translateY(-160px) scale(1) translateX(var(--drift, 0px)) rotate(calc(var(--drift-rot, 5deg) * -1));
          }
          100% {
            opacity: 0;
            transform: translateY(-260px) scale(0.7) translateX(calc(var(--drift, 0px) * 1.5)) rotate(0deg);
          }
        }
      `}</style>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
          zIndex: 12,
        }}
      >
        {particles.map((particle) => (
          <span
            key={particle.id}
            style={{
              position: 'absolute',
              bottom: 24,
              left: `${particle.x}%`,
              fontSize: `${particle.size}px`,
              lineHeight: 1,
              userSelect: 'none',
              animation: `devcastFloatUp ${particle.duration}s cubic-bezier(0.2, 0.8, 0.2, 1) forwards`,
              ['--drift' as any]: `${particle.drift}px`,
              ['--drift-rot' as any]: `${particle.drift > 0 ? 12 : -12}deg`,
              willChange: 'transform, opacity',
              filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))',
            }}
          >
            {particle.emoji}
          </span>
        ))}
      </div>
    </>
  );
}

interface ReactionBarProps {
  onSendReaction: (emoji: string) => void;
  disabled?: boolean;
}

/**
 * Interactive Reaction Bar with quick-tap emojis for stream viewers.
 */
export function ReactionBar({ onSendReaction, disabled = false }: ReactionBarProps) {
  const [clickedEmoji, setClickedEmoji] = useState<string | null>(null);
  const lastSentRef = useRef<number>(0);

  const handleClick = useCallback(
    (emoji: string) => {
      if (disabled) return;

      const now = Date.now();
      // Throttle to max 8 reactions per second to prevent network flooding
      if (now - lastSentRef.current < 120) return;
      lastSentRef.current = now;

      setClickedEmoji(emoji);
      setTimeout(() => setClickedEmoji(null), 250);

      onSendReaction(emoji);
    },
    [disabled, onSendReaction]
  );

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        background: 'rgba(15, 17, 23, 0.85)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 24,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
        width: 'fit-content',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          paddingRight: 6,
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
          color: 'var(--indigo-400)',
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        <Sparkles size={12} />
        <span>React</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {REACTION_EMOJIS.map((emoji) => {
          const isClicked = clickedEmoji === emoji;
          return (
            <button
              key={emoji}
              type="button"
              onClick={() => handleClick(emoji)}
              disabled={disabled}
              title={`React with ${emoji}`}
              style={{
                background: isClicked ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isClicked ? 20 : 16,
                cursor: disabled ? 'not-allowed' : 'pointer',
                transform: isClicked ? 'scale(1.35) translateY(-3px)' : 'scale(1)',
                transition: 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
                opacity: disabled ? 0.4 : 1,
                padding: 0,
              }}
              onMouseEnter={(e) => {
                if (!disabled) {
                  e.currentTarget.style.transform = 'scale(1.25) translateY(-2px)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!disabled && clickedEmoji !== emoji) {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {emoji}
            </button>
          );
        })}
      </div>
    </div>
  );
}
