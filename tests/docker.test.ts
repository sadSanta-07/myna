import { test } from "node:test";
import assert from "node:assert";
import { listContainers, buildImage } from "../src/core/docker.js";

test("builds image and lists containers", async () => {
  console.log("[docker] building image...");
  await buildImage("myna-test:latest");
  console.log("[docker] build complete");

  const containers = await listContainers();
  console.log(`[docker] found ${containers.length} container(s) (image not yet run, just built)`);
  assert.ok(Array.isArray(containers));

  setTimeout(() => process.exit(0), 100);
});