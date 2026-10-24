
import * as os from "node:os";
import { divider, theme } from "./theme.js";

export interface DiagnosticOptions {
  backend: string;
  signalingUrl: string;
}

export function printDiagnostics(
  options: DiagnosticOptions,
): void {
  const width = Math.max(
    24,
    Math.min(56, (process.stdout.columns || 80) - 4),
  );

  const checks: [string, string][] = [
    ["Node.js", process.version],
    ["Platform", `${os.platform()} ${os.arch()}`],
    ["Backend", options.backend],
    ["Signaling endpoint", options.signalingUrl],
    ["Runtime", "CLI active"],
  ];

  console.log();
  console.log(
    `  ${theme.brand("◆")} ${theme.text.bold("MYNA")} ${theme.muted("/ DIAGNOSTICS")}`,
  );
  console.log(`  ${divider(width)}`);
  console.log();

  for (const [label, value] of checks) {
    console.log(
      `  ${theme.muted(label.padEnd(19))} ${theme.text(value)}`,
    );
  }

  console.log();
  console.log(
    `  ${theme.warning("Connectivity is not tested by this local report.")}`,
  );
  console.log(
    `  ${theme.muted("Use --verbose when reproducing a connection failure.")}`,
  );
  console.log();
}
