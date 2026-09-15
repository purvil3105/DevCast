import {
  PrismaClient,
  Role,
  StreamStatus,
  ChallengeSessionStatus,
  SubmissionStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

// DATABASE_URL lives in the repo-root .env (same file config.ts loads). Load it
// explicitly so `tsx prisma/seed.ts` works regardless of cwd.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

// ─── Small helpers ───────────────────────────────────────
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const daysAhead = (n: number) => new Date(Date.now() + n * 86_400_000);
const minsAgo = (n: number) => new Date(Date.now() - n * 60_000);
const newStreamKey = () => crypto.randomBytes(32).toString('hex');
const thumb = (seed: string) => `https://picsum.photos/seed/${seed}/1280/720`;

/** Generate N placeholder test cases — count drives the difficulty heuristic. */
function makeTests(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    input: `case_${i + 1}`,
    expected_output: `expected_${i + 1}`,
    description: `Test case ${i + 1}`,
  }));
}

async function main() {
  console.log('🌱 Reseeding DevCast database...\n');

  // ─── 1. Clear existing data (FK-safe order: children first) ───
  await prisma.leaderboardEntry.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.streamEvent.deleteMany();
  await prisma.challengeSession.deleteMany();
  await prisma.challenge.deleteMany();
  await prisma.stream.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();
  console.log('  ✓ Cleared existing data');

  // ─── 2. Users (1 instructor + 6 viewers) ───────────────
  const pw = await bcrypt.hash('password123', 10);
  const mkUser = (email: string, displayName: string, role: Role) =>
    prisma.user.create({ data: { email, password: pw, displayName, role } });

  const instructor = await mkUser('instructor@devcast.io', 'Sarah Drasner', Role.INSTRUCTOR);
  const alex = await mkUser('viewer@devcast.io', 'Alex Hamilton', Role.VIEWER);
  const maya = await mkUser('maya@devcast.io', 'Maya Chen', Role.VIEWER);
  const jordan = await mkUser('jordan@devcast.io', 'Jordan Reyes', Role.VIEWER);
  const priya = await mkUser('priya@devcast.io', 'Priya Nair', Role.VIEWER);
  const diego = await mkUser('diego@devcast.io', 'Diego Santos', Role.VIEWER);
  const lena = await mkUser('lena@devcast.io', 'Lena Okafor', Role.VIEWER);
  console.log('  ✓ Users (1 instructor + 6 viewers)');

  // ─── 3. Courses ─────────────────────────────────────────
  const reactCourse = await prisma.course.create({
    data: {
      instructorId: instructor.id,
      title: 'Advanced React Patterns & Performance',
      slug: 'advanced-react-patterns',
    },
  });
  const dsaCourse = await prisma.course.create({
    data: {
      instructorId: instructor.id,
      title: 'Data Structures & Algorithms in Python',
      slug: 'dsa-python',
    },
  });
  const tsCourse = await prisma.course.create({
    data: {
      instructorId: instructor.id,
      title: 'TypeScript for Production',
      slug: 'typescript-production',
    },
  });
  console.log('  ✓ Courses (3)');

  // ─── 4. Challenges (varied language + difficulty) ───────
  const debounce = await prisma.challenge.create({
    data: {
      courseId: reactCourse.id,
      title: 'Implement a Debounce Function',
      description:
        'Write a function that delays invoking a callback until after `wait` milliseconds have elapsed since the last time it was invoked. It should behave correctly under rapid, repeated calls.',
      language: 'javascript',
      starterCode: `function debounce(func, wait) {\n  // Your code here\n}\n\nmodule.exports = debounce;`,
      config: { test_cases: makeTests(3), time_limit_ms: 5000, memory_limit_mb: 128 },
      staticHints: [
        'Think about what clearTimeout and setTimeout do together.',
        'Store the timeout id somewhere that persists between calls.',
        'The returned function should reset the timer on every call.',
      ],
    },
  });
  const lru = await prisma.challenge.create({
    data: {
      courseId: reactCourse.id,
      title: 'LRU Cache',
      description:
        'Design a Least Recently Used (LRU) cache supporting get and put in O(1) time. When capacity is exceeded, evict the least recently used key.',
      language: 'javascript',
      starterCode: `class LRUCache {\n  constructor(capacity) {\n    // Your code here\n  }\n  get(key) {}\n  put(key, value) {}\n}\n\nmodule.exports = LRUCache;`,
      config: { test_cases: makeTests(6), time_limit_ms: 5000, memory_limit_mb: 128 },
      staticHints: [
        'A Map preserves insertion order in JavaScript.',
        'On access, delete and re-insert to mark a key as recently used.',
        'Evict the first key of the Map when over capacity.',
      ],
    },
  });
  const twoSum = await prisma.challenge.create({
    data: {
      courseId: dsaCourse.id,
      title: 'Two Sum',
      description:
        'Given an array of integers and a target, return the indices of the two numbers that add up to the target. Aim for a single pass.',
      language: 'python',
      starterCode: `def two_sum(nums, target):\n    # Your code here\n    pass`,
      config: { test_cases: makeTests(3), time_limit_ms: 5000, memory_limit_mb: 128 },
      staticHints: [
        'A hash map trades space for time.',
        'For each number, check if target - number was already seen.',
        'Store value → index as you iterate.',
      ],
    },
  });
  const levelOrder = await prisma.challenge.create({
    data: {
      courseId: dsaCourse.id,
      title: 'Binary Tree Level Order Traversal',
      description:
        'Return the level-order traversal of a binary tree as a list of levels (breadth-first).',
      language: 'python',
      starterCode: `def level_order(root):\n    # Your code here\n    pass`,
      config: { test_cases: makeTests(5), time_limit_ms: 5000, memory_limit_mb: 128 },
      staticHints: [
        'A queue processes nodes breadth-first.',
        'Track how many nodes belong to the current level.',
        'Collect each level into its own list.',
      ],
    },
  });
  const mergeK = await prisma.challenge.create({
    data: {
      courseId: dsaCourse.id,
      title: 'Merge K Sorted Lists',
      description:
        'Merge k sorted linked lists into a single sorted list. Aim for better than the naive concatenate-and-sort approach.',
      language: 'python',
      starterCode: `def merge_k_lists(lists):\n    # Your code here\n    pass`,
      config: { test_cases: makeTests(6), time_limit_ms: 5000, memory_limit_mb: 128 },
      staticHints: [
        'A min-heap keeps the smallest current head available.',
        'Push the head of each list, pop the smallest, advance that list.',
        'Alternatively, merge lists pairwise.',
      ],
    },
  });
  const flattenTyped = await prisma.challenge.create({
    data: {
      courseId: tsCourse.id,
      title: 'Typed Array Flatten',
      description:
        'Write a generic function that flattens a nested array to a single level. Do not use Array.prototype.flat().',
      language: 'typescript',
      starterCode: `function flatten<T>(arr: unknown[]): T[] {\n  // Your code here\n}\n\nexport default flatten;`,
      config: { test_cases: makeTests(4), time_limit_ms: 5000, memory_limit_mb: 128 },
      staticHints: [
        'Recursion handles arbitrary nesting.',
        'Array.isArray narrows unknown to an array.',
        'Concat or spread combines the recursive results.',
      ],
    },
  });
  const genericDebounce = await prisma.challenge.create({
    data: {
      courseId: tsCourse.id,
      title: 'Debounce with Generics',
      description:
        'Implement a type-safe debounce that preserves the argument types of the wrapped function.',
      language: 'typescript',
      starterCode: `function debounce<A extends unknown[]>(fn: (...args: A) => void, wait: number) {\n  // Your code here\n}\n\nexport default debounce;`,
      config: { test_cases: makeTests(3), time_limit_ms: 5000, memory_limit_mb: 128 },
      staticHints: [
        'A rest parameter A extends unknown[] captures the arg tuple.',
        'Keep the timer id in a closure.',
        'Reset the timer on every invocation.',
      ],
    },
  });
  console.log('  ✓ Challenges (7 across 3 languages)');

  // ─── 5. Streams (2 LIVE, 3 SCHEDULED, 3 ENDED) ──────────
  const reactLive = await prisma.stream.create({
    data: {
      courseId: reactCourse.id,
      title: 'React Patterns — Live Deep Dive',
      streamKey: newStreamKey(),
      status: StreamStatus.LIVE,
      startedAt: minsAgo(42),
      thumbnailUrl: thumb('devcast-react-live'),
    },
  });
  const dsaLive = await prisma.stream.create({
    data: {
      courseId: dsaCourse.id,
      title: 'DSA Warmup: Arrays & Hashing',
      streamKey: newStreamKey(),
      status: StreamStatus.LIVE,
      startedAt: minsAgo(15),
      thumbnailUrl: thumb('devcast-dsa-live'),
    },
  });

  const reactSched = await prisma.stream.create({
    data: {
      courseId: reactCourse.id,
      title: 'Suspense & Concurrent Rendering',
      streamKey: newStreamKey(),
      status: StreamStatus.SCHEDULED,
      startedAt: daysAhead(2),
      thumbnailUrl: thumb('devcast-react-suspense'),
    },
  });
  const dsaSched = await prisma.stream.create({
    data: {
      courseId: dsaCourse.id,
      title: 'Graphs 101: BFS & DFS',
      streamKey: newStreamKey(),
      status: StreamStatus.SCHEDULED,
      startedAt: daysAhead(4),
      thumbnailUrl: thumb('devcast-graphs'),
    },
  });
  const tsSched = await prisma.stream.create({
    data: {
      courseId: tsCourse.id,
      title: 'Type-Level Programming',
      streamKey: newStreamKey(),
      status: StreamStatus.SCHEDULED,
      startedAt: daysAhead(6),
      thumbnailUrl: thumb('devcast-ts-typelevel'),
    },
  });

  const reactEnded = await prisma.stream.create({
    data: {
      courseId: reactCourse.id,
      title: 'React Performance Profiling',
      streamKey: newStreamKey(),
      status: StreamStatus.ENDED,
      startedAt: daysAgo(6),
      endedAt: new Date(daysAgo(6).getTime() + 2 * 3_600_000),
      thumbnailUrl: thumb('devcast-react-perf'),
    },
  });
  const dsaEnded = await prisma.stream.create({
    data: {
      courseId: dsaCourse.id,
      title: 'Trees & Traversals Recap',
      streamKey: newStreamKey(),
      status: StreamStatus.ENDED,
      startedAt: daysAgo(3),
      endedAt: new Date(daysAgo(3).getTime() + 2 * 3_600_000),
      thumbnailUrl: thumb('devcast-trees'),
    },
  });
  const tsEnded = await prisma.stream.create({
    data: {
      courseId: tsCourse.id,
      title: 'TypeScript Generics Masterclass',
      streamKey: newStreamKey(),
      status: StreamStatus.ENDED,
      startedAt: daysAgo(9),
      endedAt: new Date(daysAgo(9).getTime() + 2 * 3_600_000),
      thumbnailUrl: thumb('devcast-ts-generics'),
    },
  });
  console.log('  ✓ Streams (2 live, 3 scheduled, 3 ended)');

  // ─── 6. Challenge sessions ──────────────────────────────
  // CLOSED sessions carry the graded submissions that feed leaderboards
  // and viewer progress. Each set on an ended stream (or earlier in a live one).
  const mkClosed = (streamId: string, challengeId: string, endedAt: Date) =>
    prisma.challengeSession.create({
      data: {
        streamId,
        challengeId,
        status: ChallengeSessionStatus.CLOSED,
        startedAt: new Date(endedAt.getTime() - 6 * 60_000),
        endedAt,
        durationSeconds: 300,
      },
    });

  const s1 = await mkClosed(reactEnded.id, debounce.id, new Date(daysAgo(6).getTime() + 3_600_000));
  const s2 = await mkClosed(dsaEnded.id, twoSum.id, new Date(daysAgo(3).getTime() + 3_000_000));
  const s3 = await mkClosed(dsaEnded.id, levelOrder.id, new Date(daysAgo(3).getTime() + 5_400_000));
  const s4 = await mkClosed(tsEnded.id, flattenTyped.id, new Date(daysAgo(9).getTime() + 3_600_000));
  const s5 = await mkClosed(reactLive.id, lru.id, minsAgo(30)); // ran earlier in the live stream

  // ACTIVE sessions on the live streams → "Join live" targets (no submissions yet).
  await prisma.challengeSession.create({
    data: {
      streamId: dsaLive.id,
      challengeId: mergeK.id,
      status: ChallengeSessionStatus.ACTIVE,
      startedAt: minsAgo(5),
      durationSeconds: 300,
    },
  });
  await prisma.challengeSession.create({
    data: {
      streamId: reactLive.id,
      challengeId: genericDebounce.id,
      status: ChallengeSessionStatus.ACTIVE,
      startedAt: minsAgo(3),
      durationSeconds: 300,
    },
  });
  console.log('  ✓ Challenge sessions (5 closed, 2 active)');

  // ─── 7. Submissions (varied results; Alex is well-represented) ───
  type Sess = { id: string; endedAt: Date | null };
  type Chal = { language: string };
  const sub = (
    session: Sess,
    user: { id: string; displayName: string },
    challenge: Chal,
    passed: number,
    total: number,
    execMs: number
  ) =>
    prisma.submission.create({
      data: {
        challengeSessionId: session.id,
        userId: user.id,
        code: `// ${user.displayName}'s solution\n`,
        language: challenge.language,
        testResults: { passed, total, cases: [] },
        executionTimeMs: execMs,
        status: SubmissionStatus.EXECUTED,
        submittedAt: session.endedAt ?? new Date(),
      },
    });

  // S1 — Debounce (3 tests)
  await sub(s1, maya, debounce, 3, 3, 45);
  await sub(s1, alex, debounce, 3, 3, 62);
  await sub(s1, jordan, debounce, 2, 3, 80);
  await sub(s1, priya, debounce, 3, 3, 51);
  await sub(s1, diego, debounce, 1, 3, 120);

  // S2 — Two Sum (3 tests)
  await sub(s2, alex, twoSum, 3, 3, 30);
  await sub(s2, maya, twoSum, 3, 3, 28);
  await sub(s2, lena, twoSum, 2, 3, 55);
  await sub(s2, jordan, twoSum, 3, 3, 40);
  await sub(s2, diego, twoSum, 3, 3, 90);

  // S3 — Binary Tree Level Order (5 tests)
  await sub(s3, alex, levelOrder, 4, 5, 110);
  await sub(s3, maya, levelOrder, 5, 5, 95);
  await sub(s3, priya, levelOrder, 5, 5, 130);
  await sub(s3, jordan, levelOrder, 3, 5, 150);
  await sub(s3, lena, levelOrder, 5, 5, 88);

  // S4 — Typed Array Flatten (4 tests)
  await sub(s4, alex, flattenTyped, 4, 4, 70);
  await sub(s4, diego, flattenTyped, 3, 4, 100);
  await sub(s4, maya, flattenTyped, 4, 4, 60);
  await sub(s4, priya, flattenTyped, 2, 4, 140);

  // S5 — LRU Cache (6 tests)
  await sub(s5, maya, lru, 6, 6, 210);
  await sub(s5, alex, lru, 5, 6, 260);
  await sub(s5, jordan, lru, 6, 6, 240);
  await sub(s5, lena, lru, 4, 6, 300);
  console.log('  ✓ Submissions (23 across 5 closed sessions)');

  console.log('\n✅ Seed complete!\n');
  console.log('Login credentials (all password: password123):');
  console.log('  Instructor: instructor@devcast.io');
  console.log('  Viewer:     viewer@devcast.io   (Alex — rich progress + rank #2)');
  console.log('  Other viewers: maya@, jordan@, priya@, diego@, lena@ devcast.io');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
