import { spawn } from "node:child_process";

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  durationMs: number;
}

/**
 * Runs a command and captures output, with a timeout. Used by execute_tests
 * to shell out to Playwright/pytest without shipping a dependency on either
 * one being importable as a library (CLI is more stable across versions).
 */
export function run(command: string, args: string[], opts: { cwd?: string; timeoutMs?: number } = {}): Promise<RunResult> {
  const start = Date.now();
  const timeoutMs = opts.timeoutMs ?? 120_000;

  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: opts.cwd, shell: process.platform === "win32" });
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout?.on("data", (d) => (stdout += d.toString()));
    child.stderr?.on("data", (d) => (stderr += d.toString()));

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        stdout,
        stderr,
        exitCode: code ?? -1,
        timedOut,
        durationMs: Date.now() - start
      });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      stderr += `\n${err.message}`;
      resolve({ stdout, stderr, exitCode: -1, timedOut, durationMs: Date.now() - start });
    });
  });
}
