import { getImageHash } from "./docker.js";

async function main() {
  const hash = await getImageHash("myna-test:latest");
  console.log("[hash] image ID:", hash);
}

main();