import type { ReactNode } from 'react';
import type { Tone } from '../ui/tones';
import { TONES } from '../ui/tones';

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  accent?: Tone;
  hint?: string;
  trend?: string;
}

export function StatCard({ label, value, icon, accent = 'violet', hint, trend }: StatCardProps) {
  const tone = TONES[accent] || TONES.violet;

  return (
    <div
      style={{
        background: 'var(--gray-900)',
        border: '1px solid var(--gray-800)',
        borderRadius: 'var(--r-md)',
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s var(--ease-out), border-color 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = tone.border;
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'var(--gray-800)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--gray-400)',
            letterSpacing: '0.01em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
        {icon && (
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--r-sm)',
              background: tone.bg,
              color: tone.fg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: `1px solid ${tone.border}`,
            }}
          >
            {icon}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <span
          className="mono"
          style={{
            fontSize: 30,
            fontWeight: 800,
            color: 'var(--text-main)',
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {value}
        </span>
        {hint && (
          <span style={{ fontSize: 13, color: 'var(--gray-500)', fontWeight: 500 }}>
            {hint}
          </span>
        )}
        {trend && (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 12,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 'var(--r-sm)',
              background: tone.bg,
              color: tone.fg,
            }}
          >
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
