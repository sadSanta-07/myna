import { theme, divider } from "./theme.js";

interface SessionPanelOptions {
  roomCode: string;
  shareLink: string;
}

export function printSessionPanel({
  roomCode,
  shareLink,
}: SessionPanelOptions): void {
  console.log();
  console.log(`  ${divider(48)}`);
  console.log(`  ${theme.success("✓")} ${theme.text("SESSION READY")}`);
  console.log();
  console.log(`  ${theme.muted("ROOM CODE")}`);
  console.log(`  ${theme.brand(roomCode)}`);
  console.log();
  console.log(`  ${theme.muted("SHARE LINK")}`);
  console.log(`  ${theme.text(shareLink)}`);
  console.log();
  console.log(`  ${divider(48)}`);
  console.log();
}