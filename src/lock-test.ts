import { writeLockFile, verifyAgainstLockFile } from "./docker.js";

async function main() {
  const mode = process.argv[2];

  if (mode === "write") {
    await writeLockFile("myna-test:latest");
    console.log("[lock] myna.lock written");
  } else if (mode === "verify") {
    const ok = await verifyAgainstLockFile("myna-test:latest");
    if (!ok) {
      console.error("[lock] verification FAILED");
      process.exit(1);
    }
    console.log("[lock] verification passed");
  } else {
    console.error("usage: tsx src/lock-test.ts <write|verify>");
    process.exit(1);
  }
}

main();