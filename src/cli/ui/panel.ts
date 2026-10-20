import { theme } from "./theme.js";

export interface SessionPanelOptions {
  roomCode: string;
  shareLink: string;
}

function getWidth(): number {
  const columns = process.stdout.columns || 80;
  return Math.max(30, Math.min(72, columns - 4));
}

function wrapText(value: string, maxWidth: number): string[] {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (word.length > maxWidth) {
      if (current) {
        lines.push(current);
        current = "";
      }

      for (let i = 0; i < word.length; i += maxWidth) {
        lines.push(word.slice(i, i + maxWidth));
      }

      continue;
    }

    const next = current ? `${current} ${word}` : word;

    if (next.length > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length ? lines : [""];
}

function drawBorder(
  left: string,
  fill: string,
  right: string,
  width: number,
): string {
  return theme.border(left + fill.repeat(Math.max(1, width - 2)) + right);
}

function drawRow(
  value: string,
  width: number,
  color: (text: string) => string = theme.text,
): void {
  const innerWidth = width - 4;
  const lines = wrapText(value, innerWidth);

  for (const line of lines) {
    const padding = " ".repeat(Math.max(0, innerWidth - line.length));

    console.log(
      `${theme.border("│")} ${color(line)}${padding} ${theme.border("│")}`,
    );
  }
}

function blankRow(width: number): void {
  drawRow("", width);
}

function sectionLabel(label: string, width: number): void {
  blankRow(width);
  drawRow(label.toUpperCase(), width, theme.muted);
}

function sectionValue(
  value: string,
  width: number,
  color: (text: string) => string = theme.text,
): void {
  drawRow(`  ${value}`, width, color);
}

export function printSessionPanel(
  options: SessionPanelOptions,
): void {
  const width = getWidth();

  console.log();

  console.log(
    drawBorder("╭", "─", "╮", width),
  );

  drawRow(
    `◆  MYNA  /  ${"SESSION READY"}`,
    width,
    theme.success.bold,
  );

  console.log(drawBorder("├", "─", "┤", width));

  drawRow(
    "●  Waiting for teammates to request access",
    width,
    theme.success,
  );

  sectionLabel("Room code", width);
  sectionValue(options.roomCode, width, theme.accent.bold);

  sectionLabel("Share link", width);
  sectionValue(options.shareLink, width, theme.text);

  sectionLabel("Join from another terminal", width);
  sectionValue(`myna join ${options.roomCode}`, width, theme.accent);

  console.log(drawBorder("├", "─", "┤", width));

  drawRow("HOST CONTROLS", width, theme.muted.bold);

  drawRow(
    "Ctrl+] then C   Approve with control access",
    width,
  );

  drawRow(
    "Ctrl+] then V   Approve as view-only",
    width,
  );

  drawRow(
    "Ctrl+] then D   Deny the join request",
    width,
  );

  drawRow(
    "Ctrl+] then F   Freeze / unfreeze guest input",
    width,
  );

  drawRow(
    "Ctrl+] then X   Revoke all active guests",
    width,
  );

  drawRow(
    "Ctrl+] then Y/N Allow / block a guardrail prompt",
    width,
  );

  console.log(drawBorder("╰", "─", "╯", width));
  console.log();

  console.log(
    `  ${theme.muted("Your shell stays yours.")} ${theme.text("MYNA runs quietly alongside it.")}`,
  );

  console.log();
}

export function printJoinRequest(
  peerId: string,
  requestedRole: string,
): void {
  console.log();

  console.log(
    `  ${theme.warning.bold("JOIN REQUEST")} ${theme.muted("·")} ${theme.text(`Peer ${peerId.slice(0, 4)}`)}`,
  );

  console.log(
    `  ${theme.muted("Requested access:")} ${theme.text(requestedRole)}`,
  );

  console.log(
    `  ${theme.muted("Ctrl+] then")} ${theme.accent.bold("C")} ${theme.muted("Control")}  ${theme.border("·")}  ${theme.accent.bold("V")} ${theme.muted("View-only")}  ${theme.border("·")}  ${theme.accent.bold("D")} ${theme.muted("Deny")}`,
  );

  console.log();
}

export function printGuardrailPrompt(command: string): void {
  console.log();

  console.log(
    `  ${theme.warning.bold("GUARDRAIL")} ${theme.muted("· Guest command needs your decision")}`,
  );

  console.log(
    `  ${theme.border("│")} ${theme.text(command)}`,
  );

  console.log(
    `  ${theme.muted("Ctrl+] then")} ${theme.success.bold("Y")} ${theme.muted("Allow")}  ${theme.border("·")}  ${theme.error.bold("N")} ${theme.muted("Block")}`,
  );

  console.log();
}

export function printNotice(
  message: string,
  kind: "info" | "success" | "warning" | "error" = "info",
): void {
  const marker = {
    info: theme.brand("◆"),
    success: theme.success("✓"),
    warning: theme.warning("!"),
    error: theme.error("×"),
  }[kind];

  const color = {
    info: theme.text,
    success: theme.success,
    warning: theme.warning,
    error: theme.error,
  }[kind];

  console.log(`\n  ${marker} ${color(message)}\n`);
}