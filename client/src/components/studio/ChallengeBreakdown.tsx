import { Terminal, CheckCircle2, XCircle, Clock, Percent } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { formatLanguage, formatMs } from '../../lib/format';

export interface ChallengeStatItem {
  sessionId: string;
  challengeId: string;
  title: string;
  description: string;
  language: string;
  startedAt: string | null;
  endedAt: string | null;
  status: string;
  durationSeconds: number;
  submissionCount: number;
  passedCount: number;
  solveRate: number;
  avgExecutionTimeMs: number | null;
}

interface ChallengeBreakdownProps {
  challenges: ChallengeStatItem[];
}

export function ChallengeBreakdown({ challenges }: ChallengeBreakdownProps) {
  if (challenges.length === 0) {
    return (
      <div
        style={{
          background: 'var(--gray-900)',
          border: '1px solid var(--gray-800)',
          borderRadius: 'var(--r-md)',
          padding: '36px 24px',
          textAlign: 'center',
          color: 'var(--gray-400)',
        }}
      >
        <Terminal size={32} color="var(--gray-600)" style={{ margin: '0 auto 10px' }} />
        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>
          No challenges fired in this session
        </h4>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--gray-500)' }}>
          During live sessions, challenges you launch from the broadcast console will record submissions and pass rates here.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {challenges.map((c, index) => {
        const failedCount = Math.max(0, c.submissionCount - c.passedCount);
        const hasPassed = c.passedCount > 0;

        return (
          <div
            key={c.sessionId}
            style={{
              background: 'var(--gray-900)',
              border: '1px solid var(--gray-800)',
              borderRadius: 'var(--r-md)',
              padding: '20px 24px',
              transition: 'border-color 0.2s ease, transform 0.2s var(--ease-out)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-brand)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--gray-800)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {/* Header row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
                marginBottom: 16,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--indigo-400)',
                      background: 'var(--indigo-500-10)',
                      border: '1px solid var(--border-brand)',
                      padding: '2px 8px',
                      borderRadius: 'var(--r-sm)',
                    }}
                  >
                    Challenge #{index + 1}
                  </span>
                  <Badge tone="neutral" size="sm">
                    {formatLanguage(c.language)}
                  </Badge>
                  {c.durationSeconds > 0 && (
                    <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                      Timer: {c.durationSeconds}s
                    </span>
                  )}
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 17,
                    fontWeight: 700,
                    color: 'var(--text-main)',
                  }}
                >
                  {c.title}
                </h3>
                {c.description && (
                  <p
                    style={{
                      margin: '6px 0 0',
                      fontSize: 13,
                      color: 'var(--gray-400)',
                      maxWidth: 600,
                      lineHeight: 1.5,
                    }}
                    className="truncate"
                  >
                    {c.description}
                  </p>
                )}
              </div>

              {/* Solve rate pill */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: 'var(--r-sm)',
                  background: hasPassed ? 'var(--green-500-10)' : 'var(--gray-800)',
                  border: `1px solid ${hasPassed ? 'var(--green-500-30)' : 'var(--gray-700)'}`,
                }}
              >
                <Percent size={15} color={hasPassed ? 'var(--green-400)' : 'var(--gray-400)'} />
                <span
                  className="mono"
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: hasPassed ? 'var(--green-400)' : 'var(--gray-300)',
                  }}
                >
                  {c.solveRate}%
                </span>
                <span style={{ fontSize: 12, color: 'var(--gray-500)', fontWeight: 600 }}>
                  solve rate
                </span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: 12,
                paddingTop: 16,
                borderTop: '1px solid var(--gray-800)',
              }}
            >
              {/* Total Submissions */}
              <div style={{ background: 'var(--gray-850)', padding: '10px 14px', borderRadius: 'var(--r-sm)' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', display: 'block' }}>
                  SUBMISSIONS
                </span>
                <span className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-main)' }}>
                  {c.submissionCount}
                </span>
              </div>

              {/* Passed */}
              <div style={{ background: 'var(--gray-850)', padding: '10px 14px', borderRadius: 'var(--r-sm)' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--green-400)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={12} /> PASSED
                </span>
                <span className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--green-400)' }}>
                  {c.passedCount}
                </span>
              </div>

              {/* Failed / Needs Work */}
              <div style={{ background: 'var(--gray-850)', padding: '10px 14px', borderRadius: 'var(--r-sm)' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--red-400)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <XCircle size={12} /> FAILED
                </span>
                <span className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--gray-300)' }}>
                  {failedCount}
                </span>
              </div>

              {/* Avg Execution Time */}
              <div style={{ background: 'var(--gray-850)', padding: '10px 14px', borderRadius: 'var(--r-sm)' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} /> AVG RUN TIME
                </span>
                <span className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-main)' }}>
                  {formatMs(c.avgExecutionTimeMs)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
