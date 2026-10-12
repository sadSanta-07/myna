#!/usr/bin/env node
import { Command } from "commander";
import figlet from "figlet";
import chalk from "chalk";
import { createLocalSession } from "../session.js";
import { createDockerSession } from "../docker.js";

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
  .action(async (options) => {
    let session;
    
    if (options.local) {
      console.log(chalk.yellow("[myna] Starting in --local mode. Host filesystem is exposed."));
      session = createLocalSession();
    } else {
      console.log(chalk.green("[myna] Starting secure Docker sandbox..."));
      session = await createDockerSession("ubuntu:22.04"); 
    }

    console.log("Session created. Ready to wire WebRTC.");
  });

program
  .command("join <code>")
  .description("Join a session from the terminal")
  .option("-r, --role <role>", "Requested role (view or control)", "view")
  .action(async (code, options) => {
    console.log(chalk.blue(`[myna] Joining room ${code} as ${options.role}...`));
  });

program.parse(process.argv);