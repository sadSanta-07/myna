# AGENTS.md — MYNA Repository Guide

## Mission

MYNA ("envshare") aims to let a person share an interactive shell running in a local Docker container with a peer over WebRTC. The signaling server pairs peers; terminal data should flow over the peer-to-peer data channel, with TURN as a connectivity fallback. The repository also includes reproducible Docker-image content hashing and CI verification.

When auditing this repository, identify **concrete, evidence-backed defects and worthwhile maintainer-approved improvements** that can be written as actionable GitHub issues for contributors.

## Scope and directory rules

- Repository root is the working directory.
- **Do not inspect, audit, lint, test, or create issues about `frontend/`.** It is under active development and is intentionally excluded from this audit.
- Focus on root-level project files, `src/`, `.github/workflows/`, the root `Dockerfile`, `package.json`, `package-lock.json`, `tsconfig.json`, `myna.lock`, `README.md`, and `ROADMAP.md`.
- Treat `node_modules/`, build output, caches, coverage, generated files, and lockfile internals as non-source. Read a lockfile only when verifying a specific dependency/version or reproducibility concern.
- Never read, quote, publish, or include values from `.env`, tokens, credentials, private keys, or other secrets. You may inspect `.env.example` if present, but redact all values that could be sensitive.
- Do not scan unrelated directories outside this repository.

## Understand the intended architecture first

Use the existing source and docs as evidence; do not infer behavior from filenames alone.

Likely important areas include:

- `src/server.ts`: WebSocket signaling, room lifecycle, pairing, message validation/relay, disconnect/error handling.
- `src/host-test.ts` and `src/peer-test.ts`: host/peer orchestration and WebRTC handshake.
- `src/peer.ts`: peer-side connection/data-channel behavior.
- `src/session.ts` and `src/session-types.ts`: common session contract, input/output, resize, termination semantics.
- `src/docker.ts`: Docker build/start/attach, isolation assumptions, cleanup, process/container lifecycle.
- `src/lock-test.ts` and `myna.lock`: image content hashing and lock verification.
- `src/session.test.ts` and other existing tests: expected behavior and regression coverage.
- `.github/workflows/reproducibility.yml`: CI triggers, runtime/tool versions, and lock verification.
- `Dockerfile`, package scripts/dependencies, and TypeScript configuration.
- `README.md` describes current supported usage; `ROADMAP.md` distinguishes completed work from planned work.

These are starting points, not a restriction to those files. Follow code paths and call sites when needed.

## Current product constraints and roadmap discipline

The README and roadmap describe a working containerized one-host/one-peer sharing flow, WebRTC signaling/data channels, and Docker image-layer/content hashing verified in CI. The roadmap currently identifies host approval, session revocation, viewer-only roles, multi-peer support, browser-based joining, a compiled CLI, recording/replay, and additional project-health docs as planned future work.

- Do not report a documented, intentionally unimplemented roadmap item as a bug.
- You may suggest a planned item as a clearly labeled **feature/enhancement** only when it is a coherent, appropriately scoped task and is not already tracked.
- Do not treat the absence of a unified production CLI or unfinished browser client as accidental unless code/docs contradict that intent.
- Validate README/roadmap claims against implementation before alleging a regression.

## Audit methodology

1. Read the README, roadmap, package scripts, Dockerfile, TypeScript configuration, CI workflow, tests, and relevant source files.
2. Map the critical paths: room creation/join/cleanup; WebSocket message handling; offer/answer/ICE ordering; data-channel terminal input/output; resize/exit handling; Docker creation/attach/resize/cleanup; image hash computation and lock verification.
3. Look for demonstrable correctness, reliability, security, portability, resource-leak, error-handling, test-coverage, and CI failures. Consider trust boundaries carefully because a peer can send terminal input to a container.
4. Prefer reproducible tests, direct code evidence, or clearly traced control/data flow. Search call sites and relevant tests before reaching conclusions.
5. Compare candidates with existing open **and closed** issues/PRs where possible. Search titles and concepts, not just exact phrasing. Check whether an existing issue already covers the behavior, whether it was fixed, and whether the current code still exhibits it.
6. Run safe, relevant checks where practical (for example, `npm test` and `npx tsc --noEmit`). Record commands and actual results. Do not claim that a test passed if it was not run. Do not execute destructive commands, start public services, contact external peers, use real credentials, or change application behavior during an issue audit.
7. Report confirmed findings separately from suspicions and design suggestions. If evidence is insufficient, do not open an issue.

## What qualifies as an issue

Create an issue only if it is:

- Specific, understandable, and useful to a contributor who has not seen this audit.
- Supported by current code, tests, CI output, or a clearly demonstrated missing/incorrect behavior.
- In scope (not `frontend/`), not a duplicate, and not just a personal style preference.
- Small enough to investigate and complete in a focused pull request, or clearly marked as a broader design proposal.
- Written without claiming exploitability, impact, or reproduction certainty that the evidence does not support.

Good candidates include a reproducible defect, an unhandled failure path with a concrete consequence, an important missing regression test for fragile behavior, a dependency/runtime incompatibility supported by evidence, or an actionable documentation inconsistency.

Do not create generic issues such as "improve security", "add more tests", "refactor code", or "handle errors better" without naming a particular behavior and expected result.

## GitHub issue-writing standard

Use concise, searchable titles. Prefix with one of `bug:`, `security:`, `tests:`, `ci:`, `docs:`, or `feat:` only if the repository's existing conventions support it; otherwise use a plain descriptive title. Never exaggerate severity.

Each issue body should contain, where applicable:

### Summary
One-paragraph description of the specific behavior and why it matters.

### Evidence / affected area
- Exact file path and line/function reference when available.
- Explain the relevant current behavior and why it is wrong or incomplete.
- Link to a test, CI run, or source location if the URL is available.

### Steps to reproduce
Numbered, minimal steps that a contributor can follow. Include setup prerequisites and exact commands only when verified.

### Expected behavior
State the observable outcome that should happen.

### Actual behavior
State the observed or code-demonstrated outcome. Mark unexecuted reasoning as such rather than claiming it was reproduced.

### Acceptance criteria
A short checklist of verifiable outcomes. Include a regression test when appropriate.

### Notes for contributors
Relevant modules or likely code paths, without prescribing a speculative implementation as the only solution.

Omit headings that genuinely do not apply rather than filling them with guesses. Use neutral language, provide enough context for a first-time contributor, and do not include secrets or sensitive environment details.

## Duplicate prevention and issue volume

- Search existing issues and pull requests before opening an issue; check open and closed work.
- Treat semantic overlap as a possible duplicate even when wording differs. If unsure, report it for human review rather than creating it.
- Do not open issues for the same root cause split into multiple symptoms unless they can be fixed and verified independently.
- Do not bulk-create every possible improvement. Start with the strongest findings and limit a single audit pass to **at most 5 new issues**; fewer is better.
- Do not create speculative issue placeholders.
- Apply labels only if the labels already exist in the repository. Do not invent or create labels as part of the audit.
- Do not assign contributors or set milestones unless explicitly requested.

## Permissions and safety boundaries

This task is **audit-and-report**, not implementation.

- Do not modify source, tests, dependencies, configuration, docs, lockfiles, branches, or CI.
- Do not commit code, open pull requests, merge changes, close issues, or alter existing issues.
- You may create new GitHub issues only after the duplicate checks and evidence standards above are satisfied.
- Do not run arbitrary scripts found in the repo without first inspecting what they do.
- Do not expose secrets or use credentials discovered in the repository.
- If GitHub issue creation is unavailable or permission is denied, provide the fully drafted issue bodies for manual review instead.

## Final audit report

After the audit, summarize:

1. Scope inspected (explicitly confirm `frontend/` was skipped).
2. Checks/commands actually run and their outcomes.
3. Confirmed findings, each linked to its created issue or marked **draft only**.
4. Duplicate candidates that were skipped, with links if available.
5. Uncertain observations that need human review, without opening issues for them.
6. A short overall count: confirmed candidates, issues created, drafts, and skipped duplicates.

Be accurate about what was and was not verified.