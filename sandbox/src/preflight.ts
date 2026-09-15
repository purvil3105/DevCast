/**
 * Static analysis pre-filter (§7.4).
 * Rejects obviously malicious code patterns BEFORE execution.
 * This is a fast path — not a security guarantee.
 */

const DANGER_PATTERNS: Record<string, RegExp[]> = {
  javascript: [
    /require\s*\(\s*['"]fs['"]/,
    /require\s*\(\s*['"]child_process['"]/,
    /process\.(exit|env|binding)/,
    /require\s*\(\s*['"]net['"]/,
    /require\s*\(\s*['"]http['"]/,
    /require\s*\(\s*['"]https['"]/,
    /require\s*\(\s*['"]dgram['"]/,
    /require\s*\(\s*['"]cluster['"]/,
    /require\s*\(\s*['"]worker_threads['"]/,
    /eval\s*\(/,
    /Function\s*\(/,
  ],
  python: [
    /import\s+os/,
    /import\s+subprocess/,
    /__import__/,
    /import\s+socket/,
    /import\s+shutil/,
    /exec\s*\(/,
    /eval\s*\(/,
  ],
  cpp: [
    /#include\s*<\s*stdlib\.h\s*>/,
    /#include\s*<\s*cstdlib\s*>/,
    /#include\s*<\s*sys\/types\.h\s*>/,
    /#include\s*<\s*sys\/socket\.h\s*>/,
    /#include\s*<\s*unistd\.h\s*>/,
    /system\s*\(/,
    /popen\s*\(/,
    /exec\s*\(/,
    /fork\s*\(/,
  ],
};

export interface PreflightResult {
  valid: boolean;
  reason?: string;
}

export function preflightCheck(code: string, language: string): PreflightResult {
  const patterns = DANGER_PATTERNS[language] || [];
  const violations = patterns.filter((p) => p.test(code));

  if (violations.length > 0) {
    return {
      valid: false,
      reason: 'Code contains disallowed patterns (file system, network, or process access)',
    };
  }

  // Check code size
  if (code.length > 50000) {
    return { valid: false, reason: 'Code exceeds maximum allowed size (50KB)' };
  }

  return { valid: true };
}
