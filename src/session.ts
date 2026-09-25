import * as pty from "node-pty";
import { Session } from "./session-types.js";

export function createLocalSession(shellOverride?: string): Session {
  const shell = shellOverride || (process.platform === "win32" ? "powershell.exe" : process.env.SHELL || "bash");

  const ptyProcess = pty.spawn(shell, [], {
    name: "xterm-color",
    cols: 80,
    rows: 24,
    cwd: process.cwd(),
    env: process.env as { [key: string]: string },
    useConpty: false,
  });

  return {
    onData: (callback) => ptyProcess.onData(callback),
    write: (data) => ptyProcess.write(data),
    resize: (cols, rows) => ptyProcess.resize(cols, rows),
    kill: () => ptyProcess.kill(),
    onExit: (callback) => ptyProcess.onExit(({ exitCode }) => callback({ exitCode })),
  };
}