import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
  /** Compact variant for in-section placeholders. */
  compact?: boolean;
}

/** Dashed placeholder shown when a section has no data yet. */
export function EmptyState({ icon, title, message, action, compact = false }: EmptyStateProps) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: compact ? '32px 20px' : '64px 24px',
        color: 'var(--gray-500)',
        background: 'var(--gray-900)',
        borderRadius: 'var(--r-lg)',
        border: '1px dashed var(--gray-700)',
      }}
    >
      {icon && (
        <div
          style={{
            width: compact ? 48 : 60,
            height: compact ? 48 : 60,
            margin: '0 auto 16px',
            borderRadius: '50%',
            background: 'var(--indigo-500-10)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--indigo-400)',
          }}
        >
          {icon}
        </div>
      )}
      <p style={{ fontSize: compact ? 15 : 17, fontWeight: 600, color: 'var(--text-main)', marginBottom: message ? 6 : 0 }}>
        {title}
      </p>
      {message && <p style={{ fontSize: 14, maxWidth: 380, margin: '0 auto', lineHeight: 1.5 }}>{message}</p>}
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  );
}
