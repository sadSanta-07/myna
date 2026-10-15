// src/core/guardrail.ts
import chalk from "chalk";

const DANGEROUS_PATTERNS = [
  /rm\s+-r.*f\s+(\/|~)/i,
  /remove-item\s+.*-recurse\s+.*-force/i,
  /mkfs/i,
  /format\s+[a-z]:/i,
  /drop\s+table/i,
  /shutdown/i,
  /git\s+push\s+--force/i
];

export function isDangerousCommand(cmd: string): boolean {
  return DANGEROUS_PATTERNS.some(pattern => pattern.test(cmd));
}