import type { ReactNode } from 'react';
import type { Tone } from './tones';
import { TONES } from './tones';

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  size?: 'sm' | 'md';
  /** Solid fill instead of tinted (for high-emphasis pills). */
  solid?: boolean;
}

/** Small status/label pill. */
export function Badge({ children, tone = 'neutral', icon, size = 'md', solid = false }: BadgeProps) {
  const t = TONES[tone];
  const pad = size === 'sm' ? '2px 8px' : '4px 10px';
  const fontSize = size === 'sm' ? 11 : 12;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: pad,
        borderRadius: 'var(--r-sm)',
        fontSize,
        fontWeight: 600,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        color: solid ? '#fff' : t.fg,
        background: solid ? t.fg : t.bg,
        border: `1px solid ${solid ? 'transparent' : t.border}`,
      }}
    >
      {icon && <span style={{ display: 'flex' }}>{icon}</span>}
      {children}
    </span>
  );
}
