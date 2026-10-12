import Docker from "dockerode";
import * as fs from "fs";
import * as path from "path";
import * as tar from "tar-fs";
import { Session } from "./session-types.js";

const docker = new Docker();

export async function listContainers() {
  const containers = await docker.listContainers({ all: true });
  return containers;
}

export async function buildImage(
  imageTag: string,
  dockerfileDir: string = process.cwd()
): Promise<void> {
  const dockerfilePath = path.join(dockerfileDir, "Dockerfile");

  if (!fs.existsSync(dockerfilePath)) {
    throw new Error(`No Dockerfile found at ${dockerfilePath}`);
  }

  const tarStream = tar.pack(dockerfileDir, {
    ignore: (name) => {
      return name.includes("node_modules") || name.includes(".git") || name.includes("dist");
    }
  });

  const stream = await docker.buildImage(tarStream as unknown as NodeJS.ReadableStream, {
    t: imageTag,
  } as Docker.ImageBuildOptions);

  return new Promise((resolve, reject) => {
    docker.modem.followProgress(
      stream,
      (err) => (err ? reject(err) : resolve()),
      (event) => {
        if (event.stream) process.stdout.write(event.stream);
      }
    );
  });
}

export async function startContainer(
  imageTag: string,
  mountMode: "ro" | "rw" | "none" = "ro",
  networkMode: "bridge" | "none" = "bridge"
): Promise<Docker.Container> {

  const binds = [];
  if (mountMode !== "none") {
    binds.push(`${process.cwd()}:/workspace:${mountMode}`);
  }

  const container = await docker.createContainer({
    Image: imageTag,
    Cmd: ["/bin/bash"],
    Tty: true,
    OpenStdin: true,
    StdinOnce: false,
    WorkingDir: mountMode !== "none" ? "/workspace" : "/",
    HostConfig: {
      Binds: binds,
      NetworkMode: networkMode,
      Memory: 512 * 1024 * 1024,
      MemorySwap: 512 * 1024 * 1024,
      Nanocpus: 1000000000,
      PidsLimit: 256,
      SecurityOpt: ["no-new-privileges"],
      CapDrop: ["ALL"],
    } as any
  });

  await container.start();
  return container;
}

export async function attachToContainer(container: Docker.Container): Promise<NodeJS.ReadWriteStream> {
  return new Promise((resolve, reject) => {
    (container.modem as any).dial({
      path: `/containers/${container.id}/attach?stream=1&stdin=1&stdout=1&stderr=1`,
      method: "POST",
      isStream: true,
      hijack: true,
      options: {},
      statusCodes: {
        200: true,
        101: true,
        400: "bad parameter",
        404: "no such container",
        500: "server error"
      }
    }, (err: any, stream: NodeJS.ReadWriteStream) => {
      if (err) return reject(err);
      resolve(stream);
    });
  });
}

export async function createDockerSession(
  imageTag: string,
  mountMode: "ro" | "rw" | "none" = "ro",
  networkMode: "bridge" | "none" = "bridge"
): Promise<Session> {
  const container = await startContainer(imageTag, mountMode, networkMode);
  const stream = await attachToContainer(container);

  const dataCallbacks: ((data: string) => void)[] = [];
  const exitCallbacks: ((info: { exitCode: number }) => void)[] = [];

  stream.on("data", (chunk: Buffer) => {
    const text = chunk.toString("utf8");
    for (const cb of dataCallbacks) cb(text);
  });

  stream.on("end", async () => {
    let exitCode = 0;
    try {
      const info = await container.wait();
      exitCode = info.StatusCode ?? 0;
    } catch {
      // container already gone
    }
    for (const cb of exitCallbacks) cb({ exitCode });
  });

  return {
    onData: (callback) => dataCallbacks.push(callback),
    write: (data) => stream.write(data),
    resize: (cols, rows) => container.resize({ h: rows, w: cols }).catch(() => { }),
    kill: async () => {
      try {
        await container.remove({ force: true });
      } catch {
        //ignore
      }
    },
    onExit: (callback) => exitCallbacks.push(callback),
  };
}

export async function getImageHash(imageTag: string): Promise<string> {
  const image = docker.getImage(imageTag);
  const info = await image.inspect();

  if (!info.RootFS?.Layers) {
    throw new Error(`Could not read RootFS.Layers for image ${imageTag} — unexpected image inspect result`);
  }

  return info.RootFS.Layers.join(",");
}

export async function verifyImageHash(imageTag: string, expectedHash: string): Promise<boolean> {
  const actualHash = await getImageHash(imageTag);
  if (actualHash !== expectedHash) {
    console.warn(`[docker] WARNING: build hash mismatch.`);
    console.warn(`  expected: ${expectedHash}`);
    console.warn(`  actual:   ${actualHash}`);
    return false;
  }
  console.log(`[docker] build hash verified: ${actualHash}`);
  return true;
}

export async function writeLockFile(imageTag: string, lockPath: string = "myna.lock") {
  const hash = await getImageHash(imageTag);
  fs.writeFileSync(lockPath, JSON.stringify({ imageTag, hash, lockedAt: new Date().toISOString() }, null, 2));
}

export async function verifyAgainstLockFile(imageTag: string, lockPath: string = "myna.lock"): Promise<boolean> {
  if (!fs.existsSync(lockPath)) {
    console.warn(`[docker] no lock file found at ${lockPath} — skipping verification`);
    return true;
  }
  const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  return verifyImageHash(imageTag, lock.hash);
}

export { docker };