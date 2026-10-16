import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export function getAuditLogPath(): string {
  const baseDir = process.platform === "win32"
    ? process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local")
    : path.join(os.homedir(), ".local", "state");

  const mynaDir = path.join(baseDir, "myna");
  
  if (!fs.existsSync(mynaDir)) {
    fs.mkdirSync(mynaDir, { recursive: true, mode: 0o700 });
  }

  return path.join(mynaDir, "audit.log");
}

export function logGuestInput(peerId: string, input: string) {
  const logFile = getAuditLogPath();
  const timestamp = new Date().toISOString();
  const safeInput = JSON.stringify(input);
  const entry = `[${timestamp}] Guest ${peerId.slice(0, 4)}: ${safeInput}\n`;
  
  fs.appendFileSync(logFile, entry, { mode: 0o600 });
}

export function pruneAuditLog(): number {
  const logFile = getAuditLogPath();
  if (!fs.existsSync(logFile)) return 0;

  const lines = fs.readFileSync(logFile, "utf8").split("\n");
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  
  const keptLines = lines.filter(line => {
    if (!line.trim()) return false;
    const match = line.match(/^\[(.*?)\]/);
    if (match) {
      const logDate = new Date(match[1]).getTime();
      return logDate > thirtyDaysAgo;
    }
    return false;
  });

  fs.writeFileSync(logFile, keptLines.length > 0 ? keptLines.join("\n") + "\n" : "", { mode: 0o600 });
  return lines.length - keptLines.length;
}