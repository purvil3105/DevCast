// Small formatting helpers shared across the viewer/instructor UI.

/** Human relative time: "in 2d", "3h ago", "12m ago". */
export function relativeTime(input: string | Date | null | undefined): string {
  if (!input) return '';
  const d = typeof input === 'string' ? new Date(input) : input;
  const diff = d.getTime() - Date.now();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60_000);
  const hours = Math.round(abs / 3_600_000);
  const days = Math.round(abs / 86_400_000);

  let val: string;
  if (mins < 1) val = 'just now';
  else if (mins < 60) val = `${mins}m`;
  else if (hours < 24) val = `${hours}h`;
  else val = `${days}d`;

  if (val === 'just now') return val;
  return diff >= 0 ? `in ${val}` : `${val} ago`;
}

/** Execution time: "42ms" or "1.20s". */
export function formatMs(ms: number | null | undefined): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/** Title-case a language slug for display: "javascript" → "JavaScript". */
export function formatLanguage(lang: string): string {
  const map: Record<string, string> = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    python: 'Python',
    java: 'Java',
    cpp: 'C++',
    c: 'C',
    go: 'Go',
    rust: 'Rust',
  };
  return map[lang?.toLowerCase()] ?? (lang ? lang[0].toUpperCase() + lang.slice(1) : lang);
}
