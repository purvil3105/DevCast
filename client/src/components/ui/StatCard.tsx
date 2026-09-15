import type { ReactNode } from 'react';
import type { Tone } from './tones';
import { TONES } from './tones';

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  accent?: Tone;
  /** Small caption under the value, e.g. "best 100%". */
  hint?: string;
}

/** Compact metric tile for dashboard stat rows. */
export function StatCard({ label, value, icon, accent = 'violet', hint }: StatCardProps) {
  const tone = TONES[accent];
  return (
    <div
      style={{
        background: 'var(--gray-900)',
        border: '1px solid var(--gray-800)',
        borderRadius: 'var(--r-md)',
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--gray-400)',
            letterSpacing: '0.01em',
          }}
        >
          {label}
        </span>
        {icon && (
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: 'var(--r-sm)',
              background: tone.bg,
              color: tone.fg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {icon}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span
          className="mono"
          style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-main)', lineHeight: 1 }}
        >
          {value}
        </span>
        {hint && <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>{hint}</span>}
      </div>
    </div>
  );
}
