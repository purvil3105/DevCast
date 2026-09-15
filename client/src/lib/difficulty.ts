import type { Tone } from '../components/ui/tones';

/**
 * Difficulty is inferred from the number of test cases — the same heuristic the
 * app has always used, centralized so cards, dashboards, and the modal agree.
 */
export function difficultyFromTests(config: any): { label: 'Easy' | 'Medium' | 'Hard'; tone: Tone } {
  const n = config?.test_cases?.length || 0;
  if (n <= 2) return { label: 'Easy', tone: 'green' };
  if (n <= 4) return { label: 'Medium', tone: 'yellow' };
  return { label: 'Hard', tone: 'red' };
}
