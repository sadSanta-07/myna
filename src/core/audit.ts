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