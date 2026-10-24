
import { divider, formatDuration, theme } from "./theme.js";

export interface StatusOptions {
  roomCode: string;
  backend: string;
  peerIds: string[];
  startedAt: number;
}

export function printStatus(options: StatusOptions): void {
  const width = Math.max(
    24,
    Math.min(56, (process.stdout.columns || 80) - 4),
  );

  console.log();
  console.log(
    `  ${theme.brand("◆")} ${theme.text.bold("MYNA")} ${theme.muted("/ SESSION STATUS")}`,
  );
  console.log(`  ${divider(width)}`);
  console.log();

  const rows: [string, string][] = [
    ["State", "Running"],
    ["Backend", options.backend],
    ["Room", options.roomCode],
    ["Connected guests", String(options.peerIds.length)],
    ["Uptime", formatDuration((Date.now() - options.startedAt) / 1000)],
  ];

  for (const [label, value] of rows) {
    console.log(
      `  ${theme.muted(label.padEnd(19))} ${theme.text(value)}`,
    );
  }

  console.log();
  console.log(`  ${divider(width)}`);
  console.log();
}

export function printPeers(peerIds: string[]): void {
  console.log();
  console.log(
    `  ${theme.brand("◆")} ${theme.text.bold("MYNA")} ${theme.muted("/ CONNECTED GUESTS")}`,
  );
  console.log();

  if (peerIds.length === 0) {
    console.log(`  ${theme.muted("No connected guests.")}`);
  } else {
    for (const [index, peerId] of peerIds.entries()) {
      console.log(
        `  ${theme.accent(String(index + 1).padStart(2, "0"))}  ${theme.text(peerId)}`,
      );
    }
  }

  console.log();
}
