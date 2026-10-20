import { theme, divider } from "./theme.js";

export function printBanner(): void {
  console.log();

  console.log(
    `  ${theme.brand("◆")} ${theme.text.bold("MYNA")} ${theme.muted("· terminal collaboration")}`,
  );

  console.log(
    `  ${theme.muted("Share your real terminal. Stay in control.")}`,
  );

  console.log(`  ${divider(48)}`);
  console.log();
}