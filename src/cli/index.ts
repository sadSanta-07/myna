import { Command } from "commander";
import figlet from "figlet";
import chalk from "chalk";
import { createLocalSession } from "../core/session.js";
import { createDockerSession, docker, buildImage } from "../core/docker.js";
import { runUp } from "./commands/up.js";
import { runJoin } from "./commands/join.js";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { startServer } from "../core/server.js";
import { execSync } from "child_process";
import { createBwrapSession } from "../core/bwrap.js";
import { printBanner } from "./ui/banner.js";
import { pruneAuditLog, getAuditLogPath } from "../core/audit.js";

printBanner();

const program = new Command();

program
  .name("myna")
  .description("Peer-to-peer containerized terminal sharing")
  .version("0.1.0");

program
  .command("up")
  .description("Start a shared native terminal session and generate a join link")
  .option("-s, --sandbox [engine]", "Run in a sandbox (docker or bwrap)")
  .option("-m, --mount <mode>", "Workspace mount mode for sandbox (ro, rw, none)", "ro")
  .option("--no-replay", "Do not send terminal history to new guests")
  .option("-i, --image <name>", "Specific Docker image to use for sandbox")
  .option("-n, --network <mode>", "Container network mode for sandbox: bridge or none", "bridge")
  .option("--local", "Deprecated alias for native mode", false)
  .action(async (options) => {
    let session;
    const upOptions = { noReplay: options.noReplay };

    if (!options.sandbox) {
      console.log(chalk.green("[myna] Starting native P2P shell session..."));
      session = createLocalSession();
    } else {
      const engine = options.sandbox === true ? "docker" : options.sandbox.toLowerCase();

      if (options.mount === "rw") {
        console.warn(chalk.yellow("⚠️  WARNING: You are running the sandbox in READ-WRITE mode (-m rw)."));
        console.warn(chalk.yellow("   A guest could modify or delete files in your local project directory."));
        console.warn(chalk.yellow("   Use -m ro (Read-Only) if you do not want the guest modifying host files.\n"));
      }

      if (engine === "bwrap") {
        if (process.platform !== "linux") {
          console.error(chalk.red("❌ Error: bubblewrap (--sandbox bwrap) is only supported on Linux."));
          process.exit(1);
        }
        console.log(chalk.green(`[myna] Starting bubblewrap sandbox (mount: ${options.mount}, net: ${options.network})...`));
        session = await createBwrapSession(
          options.mount as "ro" | "rw" | "none",
          options.network as "bridge" | "none"
        );
      } else {
        try {
          await docker.ping();
        } catch (err) {
          console.error(chalk.red("\n❌ Error: Cannot connect to the Docker daemon."));
          process.exit(1);
        }

        let imageTag = options.image;

        if (!imageTag) {
          const hasDockerfile = fs.existsSync(path.join(process.cwd(), "Dockerfile"));
          if (hasDockerfile) {
            imageTag = "myna-workspace:latest";

            const hasLockFile = fs.existsSync(path.join(process.cwd(), "myna.lock"));
            if (hasLockFile) {
              console.log(chalk.blue("[myna] Found myna.lock. Verifying sandbox reproducibility..."));
              try {
                execSync("npx tsx tests/lock-test.ts verify", { stdio: "inherit" });
                console.log(chalk.green("[myna] Sandbox verified against lockfile."));
              } catch (err) {
                console.error(chalk.red("\n❌ Error: Sandbox lockfile verification failed (myna.lock)."));
                console.error(chalk.yellow("The Dockerfile or build context does not match the pinned lockfile."));
                process.exit(1);
              }
            } else {
              console.log(chalk.yellow("[myna] No myna.lock found. Skipping reproducibility check."));
            }
            console.log(chalk.blue("[myna] Found Dockerfile. Building project environment..."));
            try {
              await buildImage(imageTag, process.cwd());
            } catch (err) {
              console.error(chalk.red(`\n❌ Error: Docker build failed - ${(err as Error).message}`));
              process.exit(1);
            }
          } else {
            imageTag = "ubuntu:22.04";
            console.log(chalk.cyan("[myna] No Dockerfile found. Defaulting to sandbox image (ubuntu:22.04)..."));
          }
        }

        try {
          await docker.getImage(imageTag).inspect();
        } catch (e) {
          console.log(chalk.yellow(`[myna] Image '${imageTag}' not found locally. Pulling from Docker Hub...`));
          await new Promise<void>((resolve, reject) => {
            docker.pull(imageTag, (err: Error | null, stream: NodeJS.ReadableStream) => {
              if (err) return reject(err);
              docker.modem.followProgress(stream, (err) => {
                if (err) return reject(err);
                resolve();
              });
            });
          });
        }

        console.log(chalk.green(`[myna] Starting Docker sandbox (mount: ${options.mount}, net: ${options.network})...`));
        session = await createDockerSession(
          imageTag,
          options.mount as "ro" | "rw" | "none",
          options.network as "bridge" | "none"
        );
      }
    }

    await runUp(session, upOptions);
  });

program
  .command("join <code>")
  .description("Join a session from the terminal")
  .option("-r, --role <role>", "Requested role (view or control)", "view")
  .action(async (code, options) => {
    console.log(chalk.blue(`[myna] Joining room ${code} as ${options.role}...`));
    await runJoin(code, options.role); 
  });

program
  .command("serve")
  .description("Self-host the MYNA signaling server")
  .option("-p, --port <number>", "Port to listen on", "8080")
  .action((options) => {
    startServer(parseInt(options.port));
  });

program
  .command("audit")
  .description("Manage the session audit log")
  .option("--prune", "Remove entries older than 30 days")
  .action((options) => {
    if (options.prune) {
      const removed = pruneAuditLog();
      console.log(`[myna] Pruned ${removed} old entries from audit log.`);
    } else {
      console.log(`[myna] Audit log is located at: ${getAuditLogPath()}`);
      console.log(`[myna] Run 'myna audit --prune' to clear entries older than 30 days.`);
    }
  });

program.parse(process.argv);