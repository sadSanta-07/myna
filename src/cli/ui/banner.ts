import chalk from "chalk";
import figlet from "figlet";
import { theme, divider } from "./theme.js";

export function printBanner(): void {
  const logo = figlet.textSync("MYNA", {
    font: "ANSI Shadow",
    horizontalLayout: "default",
  });

  console.log();

  console.log(
    theme.brand(logo)
  );

  console.log(
    `  ${theme.text("Peer-to-peer terminal sharing")}`
  );

  console.log(
    `  ${theme.muted(`CLI v${"0.1.0"}`)}`
  );

  console.log();
  console.log(`  ${divider(44)}`);
  console.log(
    `  ${theme.success("●")} ${theme.text("Share your terminal. Stay in control.")}`
  );
  console.log(`  ${divider(44)}`);
  console.log();
}