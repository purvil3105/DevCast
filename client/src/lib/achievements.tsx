import type { ReactNode } from 'react';
import { Footprints, CheckCircle2, Target, Flame, Languages, Zap } from 'lucide-react';
import type { MySubmissionsSummary } from './api';

export interface DerivedAchievement {
  key: string;
  title: string;
  description: string;
  earned: boolean;
  icon: ReactNode;
}

/**
 * Achievements are derived client-side from a viewer's submission summary — no
 * separate model. Each one maps to a plainly-explainable rule so the badges are
 * honest, not decorative.
 */
export function deriveAchievements(summary: MySubmissionsSummary | null): DerivedAchievement[] {
  const s = summary ?? {
    totalAttempts: 0,
    distinctChallenges: 0,
    challengesCompleted: 0,
    avgScore: 0,
    bestScore: 0,
    passRate: 0,
    perfectCount: 0,
    languages: [],
    fastestMs: null,
  };

  return [
    {
      key: 'first-steps',
      title: 'First Steps',
      description: 'Submit your first solution.',
      earned: s.totalAttempts >= 1,
      icon: <Footprints size={20} />,
    },
    {
      key: 'problem-solver',
      title: 'Problem Solver',
      description: 'Fully complete a challenge (all tests passing).',
      earned: s.challengesCompleted >= 1,
      icon: <CheckCircle2 size={20} />,
    },
    {
      key: 'sharpshooter',
      title: 'Sharpshooter',
      description: 'Score a perfect 100% on any submission.',
      earned: s.perfectCount >= 1,
      icon: <Target size={20} />,
    },
    {
      key: 'persistent',
      title: 'Persistent',
      description: 'Make 5 or more submissions.',
      earned: s.totalAttempts >= 5,
      icon: <Flame size={20} />,
    },
    {
      key: 'polyglot',
      title: 'Polyglot',
      description: 'Solve challenges in 2+ languages.',
      earned: s.languages.length >= 2,
      icon: <Languages size={20} />,
    },
    {
      key: 'speed-demon',
      title: 'Speed Demon',
      description: 'Run a solution in under 100 ms.',
      earned: s.fastestMs != null && s.fastestMs < 100,
      icon: <Zap size={20} />,
    },
  ];
}
