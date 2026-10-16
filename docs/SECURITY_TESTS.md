# MYNA security verification

This is the evidence file for the verification sprint in `ROADMAP.md`. Each check has steps, an expected result, and a place to record what actually happened. A check that fails is a finding to fix, not a failure of the sprint.

**Gate A** (native mode usable by people other than you) needs checks 1 to 9, 12 and 16 to pass, and the Phase 6 gaps on abuse limits and TURN credentials closed.

## Running the automated checks

The scripts live in `tests/security/`. They talk to the signaling server only. Run them against `wrangler dev` or a deployment you own, never against someone else's.

```
# terminal 1
npx wrangler dev                                  # serves http://127.0.0.1:8787

# terminal 2
npx tsx tests/security/worker-attacks.ts          # checks 2, S1, S2, 5, 4, 3 (in that order)
npx tsx tests/security/e2e-flow.ts                # check 18
```

Notes:
- Checks 4 and 3 trip the server's rate limits on purpose. They run last. Wait a minute before re-running other checks.
- Check 5 needs a real running host: `HOST_CODE=<code from myna up> npx tsx tests/security/worker-attacks.ts 5` (PowerShell: `$env:HOST_CODE="<code>"; npx tsx ...`).
- A non-local target needs `ALLOW_REMOTE=1` (PowerShell: `$env:ALLOW_REMOTE="1"`) and `SIGNAL_HTTP` / `SIGNAL_WS`.
- `tests/security/protocol.ts` is the only file that knows route and message names. **The per-room host handshake in it is an assumption** (`{type:"create-room", code}`). If every check reports ERROR in setup, adjust that file first.
- `tests/security/selftest/mock-worker.ts` is a stand-in server with `MODE=secure` and `MODE=vulnerable`. It exists to prove the scripts can tell the two apart. It is not your Worker.

## Checks

| # | Check | How | Automated |
| --- | --- | --- | --- |
| 1 | Typing while a join is pending | manual | no |
| 2 | Pending guest cannot approve itself | script | yes |
| 3 | TURN credentials short-lived; room creation rate-limited | script + dashboard | yes |
| 4 | Wrong room codes rejected cheaply and rate-limited | script + dashboard | yes |
| 5 | Malformed SDP/ICE from a view guest | script + live host | semi |
| 6 | Guest resize ignored in native mode | manual | no |
| 7 | Freeze drops input and replays nothing | manual | no |
| 8 | View guest input dropped | manual | no |
| 9 | Guardrail behavior matrix | manual | no |
| 10 | Hook bypass attempts | manual | no |
| 11 | Input Gate IPC is private | manual | no |
| 12 | Ctrl+C and terminal restore | manual | no |
| 13 | Docker sandbox limits | manual | no |
| 14 | bubblewrap sandbox limits | manual (Linux) | no |
| 15 | Browser guest behavior | manual | no |
| 16 | Audit log hygiene | manual | no |
| 17 | `--no-replay` | manual | no |
| 18 | Full flow through the Worker | script | yes |
| 19 | Leader key does not steal shell keys | manual | no |
| S1 | Role-state guards (extra) | script | yes |
| S2 | Deny and revoke close the socket (extra) | script | yes |

Update the key names below if your leader key changed.

### 1. Typing while a join is pending
1. Run `myna up`. From another terminal run `myna join <code>` (or open the link) so a request is pending.
2. Immediately type `cd /tmp` (PowerShell: `cd $env:TEMP`) in the host terminal.
3. **Expected:** the text reaches the shell and runs. The request stays pending. Nothing is approved until you use the deliberate approval keys.

### 2, 3, 4, 5, S1, S2, 18
Run the scripts above.
- **3 also needs the TURN dashboard.** Confirm the credentials expire. A static username and password handed to any room creator can be harvested.
- **4 also needs the Cloudflare dashboard.** Compare the Durable Object count before and after the run. Wrong codes must not create objects.
- **5:** the script asks you to approve its guest as `view`, sends seven malformed messages and one non-JSON frame, then asks whether the host is still alive. The host must survive and drop only that guest.

### 6. Guest resize ignored in native mode
1. Join as a `control` guest in the browser. Temporarily expose the terminal channel in `public/index.js` (for example `window.__dc = dc`).
2. In the guest's console run `__dc.send(JSON.stringify({type:"resize",cols:20,rows:5}))`.
3. **Expected:** the host's terminal size and layout do not change.

### 7. Freeze drops input and replays nothing
1. Join as `control`. Freeze (leader, then `F`).
2. As the guest, type `touch /tmp/frozen-test` and Enter (PowerShell: `New-Item $env:TEMP\frozen-test`).
3. Unfreeze. Wait 5 seconds.
4. **Expected:** the file was never created, and nothing appears in the shell after unfreezing.

### 8. View guest input dropped
1. Join as `view`. Using the same console trick as check 6, send `{"type":"input","data":"touch /tmp/view-test\n"}`.
2. **Expected:** nothing runs and nothing is echoed.

### 9. Guardrail behavior matrix
Run in a throwaway directory, with a harmless target created first (`mkdir ~/myna-guard-test`, PowerShell: `mkdir $HOME\myna-guard-test`). Record one line per row.

| Case | Expected |
| --- | --- |
| Guest types `rm -rf ~/myna-guard-test` (PowerShell: `Remove-Item -Recurse -Force $HOME\myna-guard-test`) | Host prompt. Allow or block works. |
| Host types the same command | **No prompt.** |
| Guest recalls an old dangerous line with Up, then Enter | Host prompt. |
| Guest types `ls` | No prompt. |
| Guest runs `rm -rf node_modules` in a temp project | Passes without a prompt (per the design). |
| Prompt left unanswered | Denied after the timeout. |
| Both a join request and a guardrail prompt pending | The keys answer the right one, and each prompt shows what it is. |

### 10. Hook bypass attempts
As a `control` guest, try each and record whether the host was warned:
`pwsh -NoProfile` or `powershell -NoProfile`, `bash --norc`, `exec zsh -f`, `Remove-PSReadLineKeyHandler -Chord Enter`, `trap - DEBUG`, starting `fish` or `cmd`.
**Expected today:** these bypass the hook. **Expected after the heartbeat work:** the host is warned within a few prompts. Either way, write the result in the docs.

### 11. Input Gate IPC is private
After moving from HTTP to a pipe or socket:
1. Confirm nothing is listening on a TCP port for it: `netstat -ano | findstr 41234` (Windows), `ss -ltnp | grep 41234` (Linux).
2. From a second process that was not given the session token, try to connect. **Expected:** refused.
3. Start two `myna up` sessions at once. **Expected:** both work, and each hook reaches its own session.
4. On Unix, check the socket's directory mode (`ls -ld`) is `0700`.

### 12. Ctrl+C and terminal restore
1. Run `sleep 30` (PowerShell: `Start-Sleep 30`) and press Ctrl+C. **Expected:** the command stops and Myna keeps running.
2. In another terminal send SIGTERM to the `myna up` process. **Expected:** it exits and the host terminal is usable (typing echoes, no raw-mode garbage). On Windows, SIGTERM is not delivered the same way, so also close the terminal tab and check for leftover `node` and shell processes.
3. Trigger an uncaught error if you have a debug switch. **Expected:** same restore.

### 13. Docker sandbox limits
```
docker inspect <container> --format '{{json .HostConfig}}'
docker inspect <container> --format '{{.Config.User}}'
```
- **Expected:** `CapDrop` contains `ALL`, `SecurityOpt` contains `no-new-privileges`, `PidsLimit`, `Memory` and `NanoCpus` set, `Privileged` false, no Docker socket mount, and a deliberate `NetworkMode`. Record whether the user is non-root.
- Inside the sandbox, run a fork bomb (`:(){ :|:& };:`). **Expected:** the host stays responsive.
- Try to read a host path (`ls /mnt/c` or `ls /Users`). **Expected:** not visible unless you mounted it.
- Exit normally, press Ctrl+C, and kill the process. **Expected:** `docker ps -a` shows no leftover container in each case.

### 14. bubblewrap sandbox limits (Linux)
Record the distribution and kernel. Inside `myna up --sandbox bwrap` as a guest:
- `ls ~/.ssh` → fails.
- `curl -m 5 https://example.com` → fails (network unshared).
- `touch /usr/x` → fails (read-only).
- `echo ok > /tmp/x` → works.
- `ps -o pid,sid,tty -p $$` → the controlling terminal is the session PTY, not your real terminal (bubblewrap's `--new-session` guards against keystroke injection).
- On a newer Ubuntu release, confirm bubblewrap works at all (unprivileged user namespaces can be restricted).

### 15. Browser guest
- Run `printf '\033]52;c;SGVsbG8=\a'` in the shared shell. **Expected:** the guest's clipboard is untouched.
- A `view` guest types. **Expected:** blocked.
- Revoke the guest. **Expected:** a visible message.
- Resize the host window. **Expected:** the guest snaps to the host's size.

### 16. Audit log hygiene
1. Find the log. **Expected:** in the user state directory, not the project.
2. Check permissions (`ls -l`, or `icacls` on Windows). **Expected:** owner only.
3. Type `echo HOSTONLY123` as the host, then search the log. **Expected:** not present.
4. Run the prune command. **Expected:** old entries are removed.

### 17. `--no-replay`
Run `myna up --no-replay`, type `echo before-join`, then join a guest. **Expected:** the guest does not see `before-join`. Then repeat without the flag and record what the default shows.

### 19. Leader key does not steal shell keys
After your leader change, in bash/zsh, vim, tmux and less: confirm the keys you rely on still work (Ctrl+A for beginning-of-line, if you kept it), that a literal press can be sent, and that the leader is configurable.

## Results log

Copy this table, one row per run.

| Date | Commit | Check | Result | Evidence (log, screenshot, link) | Follow-up |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |
