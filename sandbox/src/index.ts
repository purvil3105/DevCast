import express from 'express';
import { preflightCheck } from './preflight';
import { runCode } from './runner';

const app = express();
const PORT = parseInt(process.env.SANDBOX_PORT || '4000', 10);

app.use(express.json({ limit: '1mb' }));

/**
 * POST /execute
 * Execute user code against test cases.
 * Request:  { code, language, testCases, timeLimitMs, memoryLimitMb }
 * Response: { results, stdout, stderr, executionTimeMs, error? }
 *
 * This endpoint is internal-only (§7.2 — not exposed to public internet).
 */
app.post('/execute', (req, res) => {
  const { code, language, testCases, timeLimitMs = 5000, memoryLimitMb = 128 } = req.body;

  if (!code || !language || !testCases) {
    res.status(400).json({ error: 'code, language, and testCases are required' });
    return;
  }

  // Layer 1: Static analysis pre-filter
  const preflight = preflightCheck(code, language);
  if (!preflight.valid) {
    console.log(`🚫 Preflight rejected: ${preflight.reason}`);
    res.json({
      results: testCases.map((tc: any) => ({
        passed: false,
        expected: tc.expected_output,
        error: preflight.reason,
        description: tc.description,
      })),
      stdout: '',
      stderr: preflight.reason,
      executionTimeMs: 0,
      error: preflight.reason,
    });
    return;
  }

  try {
    // Layer 2+3: Execute with process isolation and timeout
    const result = runCode(code, language, testCases, timeLimitMs);

    console.log(
      `⚡ Executed: lang=${language} ` +
      `results=${result.results.filter((r) => r.passed).length}/${result.results.length} ` +
      `time=${result.executionTimeMs}ms`
    );

    res.json(result);
  } catch (err) {
    console.error('❌ Sandbox execution error:', err);
    res.status(500).json({
      results: testCases.map((tc: any) => ({
        passed: false,
        expected: tc.expected_output,
        error: 'Internal sandbox error',
        description: tc.description,
      })),
      stdout: '',
      stderr: (err as Error).message,
      executionTimeMs: 0,
      error: 'Internal sandbox error',
    });
  }
});

/**
 * Health check
 */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'sandbox', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║        🏗️  DevCast Sandbox Service            ║
╠══════════════════════════════════════════════╣
║  HTTP: http://localhost:${PORT}                 ║
║  Mode: Process isolation (MVP)              ║
╚══════════════════════════════════════════════╝
  `);
});
