#!/usr/bin/env node
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

console.log(chalk.magentaBright(figlet.textSync("MYNA", { font: "chunky" })));

const program = new Command();

program
  .name("myna")
  .description("Peer-to-peer containerized terminal sharing")
  .version("0.1.0");

program
  .command("up")
  .description("Start a shared terminal session and generate a join link")
  .option("--local", "Run on the bare-metal host using node-pty instead of Docker")
  .option("-m, --mount <mode>", "Workspace mount mode: ro, rw, or none", "ro")
  .option("-i, --image <name>", "Specific Docker image to use")
  .option("-n, --network <mode>", "Container network mode: bridge or none", "bridge")
  .action(async (options) => {
    let session;

    if (options.local) {
      console.log(chalk.yellow("[myna] Starting in --local mode. Host filesystem is exposed."));
      session = createLocalSession();
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
          console.log(chalk.blue("[myna] Found Dockerfile. Building project environment..."));
          try {
            await buildImage(imageTag, process.cwd());

            const lockPath = path.join(process.cwd(), "myna.lock");
            if (fs.existsSync(lockPath)) {
              const lockFileContent = fs.readFileSync(lockPath, "utf-8");
              let expectedHash = "";

              try {
                const lockData = JSON.parse(lockFileContent);
                expectedHash = lockData.hash;
              } catch (e) {
                expectedHash = lockFileContent.trim();
              }

              const imageInfo = await docker.getImage(imageTag).inspect();
              const layers = imageInfo.RootFS.Layers;
              const rawHash = crypto.createHash("sha256").update(JSON.stringify(layers)).digest("hex");
              const actualHash = `sha256:${rawHash}`;

              if (actualHash === expectedHash) {
                console.log(chalk.green("✅ Environment verified against myna.lock (No drift)"));
              } else {
                console.log(chalk.yellow("\n⚠️ WARNING: Environment drift detected!"));
                console.log(chalk.yellow(`   Expected: ${expectedHash.slice(0, 19)}...`));
                console.log(chalk.yellow(`   Actual:   ${actualHash.slice(0, 19)}...`));
                console.log(chalk.yellow("   The container built successfully, but it differs from the lockfile.\n"));
              }
            } else {
              console.log(chalk.gray("[myna] No myna.lock found. Skipping reproducibility check."));
            }
          } catch (err) {
            console.error(chalk.red(`\n❌ Error: Docker build failed - ${(err as Error).message}`));
            process.exit(1);
          }
        } else {
          console.error(chalk.red("\n❌ Error: No Dockerfile found in current directory."));
          console.error(chalk.yellow("Tip: Create a Dockerfile, or use `-i ubuntu:22.04` (make sure to `docker pull` it first).\n"));
          process.exit(1);
        }
      }

      console.log(chalk.green(`[myna] Starting Docker sandbox (mount: ${options.mount}, net: ${options.network})...`));
      if (options.mount === "rw") {
        console.log(chalk.yellow("⚠️  WARNING: Container has read/write access to your host files."));
      }

      session = await createDockerSession(
        imageTag,
        options.mount as "ro" | "rw" | "none",
        options.network as "bridge" | "none"
      );
    }

    await runUp(session);
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

program.parse(process.argv);
