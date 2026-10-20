import chalk from "chalk";

export const theme = {
  brand: chalk.hex("#BDF76A"),
  accent: chalk.hex("#D5F994"),
  success: chalk.hex("#A8E875"),
  warning: chalk.hex("#F1C66D"),
  error: chalk.hex("#FF7979"),
  muted: chalk.hex("#858D82"),
  text: chalk.hex("#E8EBE3"),
  border: chalk.hex("#384034"),
  surface: chalk.hex("#151914"),
};

export function divider(width = 48): string {
  const columns = process.stdout.columns || 80;
  const safeWidth = Math.max(20, Math.min(width, columns - 4));

  return theme.border("─".repeat(safeWidth));
}