import { config } from '../config';

/**
 * Static analysis pre-filter (§7.4).
 * Fast-path rejection of obviously malicious code patterns.
 * NOT a security guarantee — Docker isolation is the real boundary.
 */
function preflightCheck(code: string, language: string): { valid: boolean; reason?: string } {
  const dangerPatterns: Record<string, RegExp[]> = {
    javascript: [
      /require\s*\(\s*['"]fs['"]/,
      /require\s*\(\s*['"]child_process['"]/,
      /process\.(exit|env|binding)/,
      /require\s*\(\s*['"]net['"]/,
      /require\s*\(\s*['"]http['"]/,
      /require\s*\(\s*['"]https['"]/,
    ],
    python: [
      /import\s+os/,
      /import\s+subprocess/,
      /__import__/,
      /import\s+socket/,
    ],
  };

  const patterns = dangerPatterns[language] || [];
  const violations = patterns.filter((p) => p.test(code));

  return violations.length > 0
    ? { valid: false, reason: 'Code contains disallowed patterns' }
    : { valid: true };
}

interface SandboxRequest {
  code: string;
  language: string;
  testCases: Array<{ input: string; expected_output: string; description?: string }>;
  timeLimitMs: number;
  memoryLimitMb: number;
}

interface SandboxResult {
  results: Array<{ passed: boolean; actual?: any; expected?: any; error?: string; description?: string }>;
  stdout?: string;
  stderr?: string;
  executionTimeMs: number;
  error?: string;
}

/**
 * Execute user code in the sandbox service.
 * Calls POST /execute on the sandbox service (separate process).
 */
export async function executeSandbox(request: SandboxRequest): Promise<SandboxResult> {
  // Pre-flight check
  const preflight = preflightCheck(request.code, request.language);
  if (!preflight.valid) {
    return {
      results: request.testCases.map((tc) => ({
        passed: false,
        expected: tc.expected_output,
        error: preflight.reason,
        description: tc.description,
      })),
      executionTimeMs: 0,
      error: preflight.reason,
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.sandboxTimeoutMs + 2000);

    const response = await fetch(`${config.sandboxUrl}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: request.code,
        language: request.language,
        testCases: request.testCases,
        timeLimitMs: request.timeLimitMs,
        memoryLimitMb: request.memoryLimitMb,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sandbox returned ${response.status}: ${errorText}`);
    }

    const result = (await response.json()) as SandboxResult;
    return result;
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      return {
        results: request.testCases.map((tc) => ({
          passed: false,
          expected: tc.expected_output,
          error: 'Execution timed out',
          description: tc.description,
        })),
        executionTimeMs: config.sandboxTimeoutMs,
        error: 'Execution timed out',
      };
    }
    throw err;
  }
}
