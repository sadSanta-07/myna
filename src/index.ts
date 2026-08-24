import * as pty from "node-pty";
import figlet from "figlet";
import chalk from "chalk";

const shell = process.platform === "win32" ? "powershell.exe" : process.env.SHELL || "bash";

console.log(chalk.magentaBright(figlet.textSync("MYNA", { font: "chunky" })));

const ptyProcess = pty.spawn(shell, [], {
  name: "xterm-color",
  cols: process.stdout.columns || 80,
  rows: process.stdout.rows || 24,
  cwd: process.cwd(),
  env: process.env as { [key: string]: string },
});

ptyProcess.onData((data: string) => {
  process.stdout.write(data);
});

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding("utf8");

process.stdin.on("data", (data: string) => {
  ptyProcess.write(data);
});

ptyProcess.onExit(({ exitCode }) => {
  process.stdin.setRawMode(false);
  console.log(chalk.yellow(`\n[myna] shell exited with code ${exitCode}`));
  process.exit(exitCode);
});