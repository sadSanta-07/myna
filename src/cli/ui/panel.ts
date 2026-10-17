import { theme, divider } from "./theme.js";

export interface SessionPanelOptions {
  roomCode: string;
  shareLink: string;
}

export function printSessionPanel(options: SessionPanelOptions) {
  console.log(`
  ────────────────────────────────────────────────
  ✓ SESSION READY

  JOIN COMMAND
  myna join ${options.roomCode}

  SHARE LINK
  ${options.shareLink}

  ────────────────────────────────────────────────
  `);
}