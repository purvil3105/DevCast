// Shared tone → token mapping so Badge / StatCard / Achievement stay consistent
// and route every status color through the theme-aware CSS variables (no raw
// hex in components — keeps light theme correct).

export type Tone = 'violet' | 'cyan' | 'green' | 'yellow' | 'red' | 'neutral';

export const TONES: Record<Tone, { fg: string; bg: string; border: string }> = {
  violet:  { fg: 'var(--indigo-400)', bg: 'var(--indigo-500-10)', border: 'var(--border-brand)' },
  cyan:    { fg: 'var(--cyan)',       bg: 'var(--cyan-10)',       border: 'var(--cyan-20)' },
  green:   { fg: 'var(--green-400)',  bg: 'var(--green-500-10)',  border: 'var(--green-500-30)' },
  yellow:  { fg: 'var(--yellow-400)', bg: 'var(--yellow-500-10)', border: 'var(--yellow-500-30)' },
  red:     { fg: 'var(--red-400)',    bg: 'var(--red-500-10)',    border: 'var(--red-500-30)' },
  neutral: { fg: 'var(--gray-400)',   bg: 'var(--hover-bg)',      border: 'var(--gray-800)' },
};
