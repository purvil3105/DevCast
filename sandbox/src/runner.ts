import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

interface TestCase {
  input: string;
  expected_output: string;
  description?: string;
}

interface RunResult {
  passed: boolean;
  actual?: any;
  expected?: any;
  error?: string;
  description?: string;
}

interface RunnerResult {
  results: RunResult[];
  stdout: string;
  stderr: string;
  executionTimeMs: number;
}

/**
 * Execute user code against test cases.
 *
 * MVP implementation: uses child_process.execSync with timeouts.
 * Production would use Docker containers (§7.2) or Firecracker microVMs (§7.3).
 *
 * Security is layered:
 *   Layer 1: preflight.ts (static analysis) — already done before this
 *   Layer 2: Process isolation via child_process (MVP)
 *   Layer 3: Execution timeout (hard kill)
 */
export function runCode(
  code: string,
  language: string,
  testCases: TestCase[],
  timeLimitMs: number = 5000
): RunnerResult {
  const startTime = Date.now();
  const results: RunResult[] = [];
  let stdout = '';
  let stderr = '';

  // Create temp directory for this execution
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devcast-sandbox-'));

  try {
    for (const tc of testCases) {
      try {
        let dockerArgs: string[] = [];
        const base = ['run', '--rm', '--network', 'none', '--memory', '256m', '--cpus', '1'];

        if (language === 'javascript') {
          const codeFile = path.join(tmpDir, 'solution.js');
          fs.writeFileSync(codeFile, code);
          const runnerCode = buildJSRunner(tc);
          const runnerFile = path.join(tmpDir, 'runner.js');
          fs.writeFileSync(runnerFile, runnerCode);

          const mountDir = tmpDir.replace(/\\/g, '/');
          dockerArgs = [...base, '-v', `${mountDir}:/app:ro`, 'node:20-alpine', 'node', '/app/runner.js'];
        } else if (language === 'python') {
          const codeFile = path.join(tmpDir, 'solution.py');
          fs.writeFileSync(codeFile, code);
          const runnerCode = buildPythonRunner(tc);
          const runnerFile = path.join(tmpDir, 'runner.py');
          fs.writeFileSync(runnerFile, runnerCode);

          const mountDir = tmpDir.replace(/\\/g, '/');
          dockerArgs = [...base, '-v', `${mountDir}:/app:ro`, 'python:3.11-alpine', 'python', '/app/runner.py'];
        } else if (language === 'cpp') {
          const codeFile = path.join(tmpDir, 'solution.cpp');
          fs.writeFileSync(codeFile, code);

          const mountDir = tmpDir.replace(/\\/g, '/');
          // Pass input through a container env var — as a single argv element it never
          // touches a host shell, and "$INPUT" is safely quoted inside the container.
          dockerArgs = [
            ...base,
            '-e', `INPUT=${tc.input}`,
            '-v', `${mountDir}:/app:rw`,
            'gcc:13',
            'bash', '-c',
            'g++ -O2 /app/solution.cpp -o /app/solution && /app/solution "$INPUT"',
          ];
        } else {
          throw new Error(`Language "${language}" is not supported.`);
        }

        const output = execFileSync('docker', dockerArgs, {
          timeout: Math.min(timeLimitMs, 15000), // Slightly longer timeout to account for docker startup overhead
          maxBuffer: 1024 * 50, // 50KB
          stdio: ['pipe', 'pipe', 'pipe'],
        }).toString().trim();

        // Parse the structured output
        let parsed: any;
        try {
          const maybeParsed = JSON.parse(output);
          if (maybeParsed && typeof maybeParsed === 'object' && ('result' in maybeParsed || 'error' in maybeParsed)) {
            parsed = maybeParsed;
          } else {
            parsed = { result: maybeParsed, stdout: '' };
          }
        } catch {
          parsed = { result: output, stdout: '' };
        }

        const expectedParsed = parseExpected(tc.expected_output);

        if (parsed.error) {
          results.push({
            passed: false,
            expected: expectedParsed,
            error: parsed.error,
            description: tc.description,
          });
        } else {
          // Compare as string to handle types loosely
          const actualStr = JSON.stringify(parsed.result);
          const expectedStr = JSON.stringify(expectedParsed);

          results.push({
            passed: actualStr === expectedStr || String(parsed.result).trim() === String(expectedParsed).trim(),
            actual: parsed.result,
            expected: expectedParsed,
            description: tc.description,
          });
        }

        if (parsed.stdout) stdout += parsed.stdout + '\n';
      } catch (err: any) {
        const errorMsg = err.stderr?.toString()?.substring(0, 200) || err.message?.substring(0, 200) || 'Unknown error';
        stderr += errorMsg + '\n';

        results.push({
          passed: false,
          expected: parseExpected(tc.expected_output),
          error: errorMsg.includes('TIMEOUT') || err.killed ? 'Execution timed out' : errorMsg,
          description: tc.description,
        });
      }
    }
  } finally {
    // Clean up temp files
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }

  return {
    results,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    executionTimeMs: Date.now() - startTime,
  };
}

/**
 * Build a JavaScript test runner that imports the user's solution
 * and executes it with the test case input.
 */
function buildJSRunner(tc: TestCase): string {
  return `
const capturedLogs = [];
const origLog = console.log;
console.log = (...args) => capturedLogs.push(args.join(' '));

try {
  // Container path is statically mounted at /app
  const solution = require('/app/solution.js');
  const fn = typeof solution === 'function' ? solution : solution.default || solution;
  
  if (typeof fn !== 'function') {
    process.stdout.write(JSON.stringify({ 
      result: null, 
      error: 'Module does not export a function',
      stdout: capturedLogs.join('\\n')
    }));
    process.exit(0);
  }

  // Parse the input and call the function
  const args = ${JSON.stringify(tc.input)};
  let inputArgs;
  try {
    // Try to parse as JSON array of arguments
    inputArgs = JSON.parse('[' + args + ']');
  } catch {
    // If not parseable, pass as single string argument
    inputArgs = [args];
  }

  const result = fn(...inputArgs);
  
  // Handle promises
  if (result && typeof result.then === 'function') {
    result.then(r => {
      process.stdout.write(JSON.stringify({ 
        result: r, 
        stdout: capturedLogs.join('\\n') 
      }));
    }).catch(e => {
      process.stdout.write(JSON.stringify({ 
        result: null, 
        error: e.message,
        stdout: capturedLogs.join('\\n')
      }));
    });
  } else {
    process.stdout.write(JSON.stringify({ 
      result, 
      stdout: capturedLogs.join('\\n') 
    }));
  }
} catch (e) {
  process.stdout.write(JSON.stringify({ 
    result: null, 
    error: e.message,
    stdout: capturedLogs.join('\\n')
  }));
}
`;
}

/**
 * Build a Python test runner that imports the user's solution
 * and executes it with the test case input.
 */
function buildPythonRunner(tc: TestCase): string {
  // We use json to parse input and format output.
  // We capture stdout to include it in the final JSON.
  return `
import sys
import json
import io
from contextlib import redirect_stdout
import importlib.util

captured_logs = io.StringIO()
result = None
error_msg = None

try:
    with redirect_stdout(captured_logs):
        # Dynamically import the user's solution
        spec = importlib.util.spec_from_file_location("solution", "/app/solution.py")
        solution = importlib.util.module_from_spec(spec)
        sys.modules["solution"] = solution
        spec.loader.exec_module(solution)
        
        # Find the first callable that is not a builtin
        fn = None
        for name in dir(solution):
            if not name.startswith("__"):
                val = getattr(solution, name)
                if callable(val):
                    fn = val
                    break
        
        if not fn:
            raise Exception("No function found in solution.py")
            
        args_raw = ${JSON.stringify(tc.input)}
        
        try:
            input_args = json.loads('[' + args_raw + ']')
        except:
            input_args = [args_raw]
            
        result = fn(*input_args)
except Exception as e:
    error_msg = str(e)

output = {
    "result": result,
    "stdout": captured_logs.getvalue().strip()
}
if error_msg:
    output["error"] = error_msg

print(json.dumps(output))
`;
}

/**
 * Parse expected output from test case definition.
 */
function parseExpected(expected: string): any {
  try {
    return JSON.parse(expected);
  } catch {
    return expected;
  }
}
