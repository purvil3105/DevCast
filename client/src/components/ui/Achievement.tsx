import type { ReactNode } from 'react';
import { Check, Lock } from 'lucide-react';

interface AchievementProps {
  title: string;
  description: string;
  earned: boolean;
  icon: ReactNode;
}

/** A single earned/locked badge tile for the achievements showcase. */
export function Achievement({ title, description, earned, icon }: AchievementProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        padding: 14,
        borderRadius: 'var(--r-md)',
        background: earned ? 'var(--indigo-500-10)' : 'var(--gray-900)',
        border: `1px solid ${earned ? 'var(--border-brand)' : 'var(--gray-800)'}`,
        opacity: earned ? 1 : 0.65,
        transition: 'opacity 0.2s var(--ease-out)',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: 42,
          height: 42,
          borderRadius: 'var(--r-sm)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: earned ? 'var(--grad-brand)' : 'var(--gray-800)',
          color: earned ? '#fff' : 'var(--gray-500)',
          boxShadow: earned ? 'var(--glow-violet)' : 'none',
        }}
      >
        {icon}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            bottom: -5,
            right: -5,
            width: 18,
            height: 18,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: earned ? 'var(--green-500)' : 'var(--gray-700)',
            color: '#fff',
            border: '2px solid var(--gray-900)',
          }}
        >
          {earned ? <Check size={10} strokeWidth={3} /> : <Lock size={9} />}
        </span>
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>{title}</p>
        <p style={{ fontSize: 12.5, color: 'var(--gray-400)', margin: '2px 0 0', lineHeight: 1.45 }}>
          {description}
        </p>
      </div>
    </div>
  );
}
