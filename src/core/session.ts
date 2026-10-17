import * as pty from "node-pty";
import { Session } from "./types.js";

export function createLocalSession(shellOverride?: string): Session {
  const isWin = process.platform === "win32";
  const shell = shellOverride || (isWin ? "powershell.exe" : process.env.SHELL || "bash");

  const ptyProcess = pty.spawn(shell, [], {
    name: "xterm-color",
    cols: 80,
    rows: 24,
    cwd: process.cwd(),
    env: process.env as { [key: string]: string },
    useConpty: false,
  });

  return {
    backend: "native",
    write: (data: string) => ptyProcess.write(data),
    resize: (cols: number, rows: number) => ptyProcess.resize(cols, rows),
    onData: (cb: (data: string) => void) => ptyProcess.onData(cb),
    onExit: (cb: (code: number) => void) => ptyProcess.onExit(({ exitCode }) => cb(exitCode)),
    kill: () => ptyProcess.kill(),
  };
}