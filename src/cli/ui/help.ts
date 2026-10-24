
import { divider, theme } from "./theme.js";

export function printMynaHelp(): void {
  const width = Math.max(
    24,
    Math.min(56, (process.stdout.columns || 80) - 4),
  );

  console.log();
  console.log(
    `  ${theme.brand("◆")} ${theme.text.bold("MYNA")} ${theme.muted("/ COMMAND CENTER")}`,
  );
  console.log(`  ${divider(width)}`);
  console.log();
  console.log(`  ${theme.muted("HOST SHORTCUTS")}`);
  console.log();

  const shortcuts: [string, string][] = [
    ["H", "Open this help screen"],
    ["S", "Show session status"],
    ["T", "Show host resource statistics"],
    ["P", "List connected guests"],
    ["L", "Show local diagnostic summary"],
    ["C", "Approve the current guest with control access"],
    ["V", "Approve the current guest as view-only"],
    ["D", "Deny the current join request"],
    ["F", "Freeze / unfreeze guest input"],
    ["X", "Revoke all active guests"],
    ["Y / N", "Allow / block a pending guardrail request"],
  ];

  for (const [key, description] of shortcuts) {
    console.log(
      `  ${theme.accent.bold(key.padEnd(7))} ${theme.text(description)}`,
    );
  }

  console.log();
  console.log(`  ${theme.muted("HOW TO USE")}`);
  console.log(
    `  ${theme.text("Press Ctrl+] and release it, then press the shortcut.")}`,
  );
  console.log(
    `  ${theme.muted("These shortcuts are for the MYNA host process.")}`,
  );
  console.log();
  console.log(`  ${divider(width)}`);
  console.log();
}
