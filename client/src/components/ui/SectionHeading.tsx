import type { ReactNode } from 'react';

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  /** Right-aligned control (e.g. a "See all" link or button). */
  action?: ReactNode;
}

/** A consistent left-aligned section header used across the dashboards. */
export function SectionHeading({ title, subtitle, icon, action }: SectionHeadingProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {icon && <span style={{ color: 'var(--indigo-400)', display: 'flex' }}>{icon}</span>}
        <div>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--text-main)',
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p style={{ fontSize: 13, color: 'var(--gray-400)', margin: '3px 0 0' }}>{subtitle}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}
