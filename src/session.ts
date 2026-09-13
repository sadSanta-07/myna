import * as pty from "node-pty";

export function createSession(shellOveride?: string): pty.IPty {
    const shell = shellOveride || (process.platform == "win32" ?
        "powershell.exe" : process.env.SHELL || "bash");
    return pty.spawn(shell, [], {
        name: "xterm-color",
        cols: 80,
        rows: 24,
        cwd: process.cwd(),
        env: process.env as { [key: string]: string },
        useConpty: false,
    });
}