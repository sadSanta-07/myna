import { test } from "node:test";
import assert from "node:assert";
import { createSession } from "./session.js";

test("spwans a shell process with a valid pid", () => {
    const session = createSession();
    assert.ok(session.pid > 0);
    session.kill();
});

test("write to pty a recieve output back", async () => {
    const session = createSession();
    const output: string[] = [];
    session.onData((data) => output.push(data));

    const isWin = process.platform === "win32";
    await new Promise((resolve) => setTimeout(resolve, 1000));
    session.write(isWin ? "echo hello\r" : "echo hello\n");

    await new Promise((resolve) => setTimeout(resolve, 500));

    assert.ok(output.join("").includes("hello"));
    session.kill();
});

test("resize does not throw on a live session", () => {
    const session = createSession();
    assert.doesNotThrow(() => session.resize(100, 40));
    session.kill();
});

test("kill terminates the process and fires onExit", async () => {
    const session = createSession();
    const exited = new Promise<void>((resolve) => {
        session.onExit(() => resolve());
    });
    session.kill();
    await exited; // will hang the test (and eventually time out) if onExit never fires
});
