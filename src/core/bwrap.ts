// src/core/bwrap.ts
import * as pty from "node-pty";
import { spawnSync } from "child_process";
import { Session } from "./types.js";
import chalk from "chalk";

export async function createBwrapSession(
  mountMode: "ro" | "rw" | "none" = "ro",
  networkMode: "bridge" | "none" = "none"
): Promise<Session> {
  const check = spawnSync("bwrap", ["--version"]);
  if (check.error || check.status !== 0) {
    console.error(chalk.red("\n❌ Error: bubblewrap (bwrap) is not installed on this system."));
    console.error(chalk.yellow("Install it via your package manager (e.g., 'sudo apt install bubblewrap' or 'sudo pacman -S bubblewrap').\n"));
    process.exit(1);
  }

  const args = [
    "--die-with-parent",
    "--unshare-pid",
    "--unshare-ipc",
    "--unshare-uts",
    "--unshare-cgroup",
  ];

  if (networkMode === "none") {
    args.push("--unshare-net");
  }

  args.push(
    "--ro-bind", "/usr", "/usr",
    "--ro-bind-try", "/lib", "/lib",
    "--ro-bind-try", "/lib64", "/lib64",
    "--ro-bind-try", "/bin", "/bin",
    "--ro-bind-try", "/sbin", "/sbin",
    "--ro-bind-try", "/etc", "/etc",
    "--dev", "/dev",
    "--proc", "/proc",
    "--tmpfs", "/tmp",
    "--tmpfs", "/home", 
    "--tmpfs", "/root"
  );

  if (mountMode === "ro") {
    args.push("--ro-bind", process.cwd(), "/workspace", "--chdir", "/workspace");
  } else if (mountMode === "rw") {
    args.push("--bind", process.cwd(), "/workspace", "--chdir", "/workspace");
  } else {
    args.push("--chdir", "/");
  }

  args.push("/bin/bash");

  const ptyProcess = pty.spawn("bwrap", args, {
    name: "xterm-256color",
    cols: process.stdout.columns || 80,
    rows: process.stdout.rows || 24,
    cwd: process.cwd(),
    env: { TERM: "xterm-256color", PATH: "/usr/bin:/bin:/usr/sbin:/sbin" }
  });

  const dataCallbacks: ((data: string) => void)[] = [];
  const exitCallbacks: ((code: number) => void)[] = [];

  ptyProcess.onData((data) => {
    for (const cb of dataCallbacks) cb(data);
  });

  ptyProcess.onExit((status) => {
    for (const cb of exitCallbacks) cb(status.exitCode);
  });

  return {
    backend: "bwrap",
    write: (data: string) => ptyProcess.write(data),
    resize: (cols: number, rows: number) => ptyProcess.resize(cols, rows),
    onData: (cb: (data: string) => void) => dataCallbacks.push(cb),
    onExit: (cb: (code: number) => void) => exitCallbacks.push(cb),
    kill: () => ptyProcess.kill(),
  };
}