import { listContainers, buildImage } from "./docker.js";

async function main() {
  console.log("[docker] building image...");
  await buildImage("myna-test:latest");
  console.log("[docker] build complete");

  const containers = await listContainers();
  console.log(`[docker] found ${containers.length} container(s) (image not yet run, just built)`);
}

main().catch((err) => console.error("[docker] error:", err));