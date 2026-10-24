
import chalk from "chalk";

export const theme = {
  brand: chalk.hex("#BDF76A"),
  accent: chalk.hex("#72E6C1"),
  success: chalk.hex("#A8E875"),
  warning: chalk.hex("#F1C66D"),
  error: chalk.hex("#FF7979"),
  muted: chalk.hex("#858D82"),
  text: chalk.hex("#E8EBE3"),
  border: chalk.hex("#384034"),
  surface: chalk.hex("#151914"),
  blue: chalk.hex("#8AB4F8"),
};

export function terminalWidth(min = 24, max = 72): number {
  const columns = process.stdout.columns || 80;
  return Math.max(min, Math.min(max, columns - 4));
}

export function divider(width = 48): string {
  const safeWidth = Math.max(
    12,
    Math.min(width, (process.stdout.columns || 80) - 4),
  );

  return theme.border("─".repeat(safeWidth));
}

export function progressBar(
  value: number,
  width = 20,
  filled = "█",
  empty = "░",
): string {
  const safeValue = Number.isFinite(value)
    ? Math.max(0, Math.min(100, value))
    : 0;

  const safeWidth = Math.max(1, Math.floor(width));
  const filledCount = Math.round((safeValue / 100) * safeWidth);

  return (
    theme.accent(filled.repeat(filledCount)) +
    theme.border(empty.repeat(safeWidth - filledCount))
  );
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "unavailable";
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }

  return `${value.toFixed(1)} ${units[unit]}`;
}

export function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(
    0,
    Math.floor(Number.isFinite(seconds) ? seconds : 0),
  );

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}
