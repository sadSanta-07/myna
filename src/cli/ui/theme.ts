import chalk from "chalk";

export const theme = {
  brand: chalk.hex("#66C7FF"),
  accent: chalk.hex("#BD83F5"),
  success: chalk.hex("#A6E86A"),
  warning: chalk.hex("#F4C76A"),
  error: chalk.hex("#FF7777"),
  muted: chalk.hex("#858D9A"),
  text: chalk.hex("#E7EAF0"),
  border: chalk.hex("#424B59"),
};

export function divider(width = 44): string {
  return theme.border("─".repeat(Math.max(12, width)));
}