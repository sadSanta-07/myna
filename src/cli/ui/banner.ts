
import chalk from "chalk";
import { divider } from "./theme.js";

const violet = chalk.hex("#C7A5E8");
const white = chalk.hex("#F5F5F0");
const muted = chalk.hex("#858D82");
const border = chalk.hex("#384034");

const LOGO = [
  "███╗   ███╗██╗   ██╗███╗   ██╗ █████╗",
  "████╗ ████║╚██╗ ██╔╝████╗  ██║██╔══██╗",
  "██╔████╔██║ ╚████╔╝ ██╔██╗ ██║███████║",
  "██║╚██╔╝██║  ╚██╔╝  ██║╚██╗██║██╔══██║",
  "██║ ╚═╝ ██║   ██║   ██║ ╚████║██║  ██║",
  "╚═╝     ╚═╝   ╚═╝   ╚═╝  ╚═══╝╚═╝  ╚═╝",
];

export async function printBanner(): Promise<void> {
  const columns = process.stdout.columns || 80;
  const compact = columns < 54;

  console.log();

  if (compact) {
    console.log(`  ${violet.bold("MYNA")}`);
  } else {
    for (const line of LOGO) {
      console.log(`  ${violet(line)}`);
    }
  }

  console.log();
  console.log(
    `  ${violet("◆")} ${white.bold("TERMINAL COLLABORATION")} ${muted("· v1.1.1")}`,
  );
  console.log(`  ${muted("Share your terminal. Stay in control.")}`);
  console.log(
    `  ${violet("●")} ${muted("Peer-to-peer")}   ` +
      `${violet("●")} ${muted("Access control")}   ` +
      `${violet("●")} ${muted("Guardrails")}`,
  );

  console.log();
  console.log(
    `  ${violet("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}`,
  );
  console.log();
}