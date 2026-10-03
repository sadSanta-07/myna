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

  const tarStream = tar.pack(dockerfileDir);

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

export async function startContainer(imageTag: string): Promise<Docker.Container> {
  const container = await docker.createContainer({
    Image: imageTag,
    Cmd: ["/bin/bash"],
    Tty: true,
    OpenStdin: true,
    StdinOnce: false,
  });

  await container.start();
  return container;
}

export async function attachToContainer(container: Docker.Container) {
  const stream = await container.attach({
    stream: true,
    stdin: true,
    stdout: true,
    stderr: true,
    hijack: true, // raw bi i/0
  });

  return stream;
}

export async function createDockerSession(imageTag: string): Promise<Session> {
  const container = await startContainer(imageTag);
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

  stream.write("\n");

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
  // RootFS.Layers reflects actual filesystem content, not build-time metadata
  // (timestamps, provenance, SBOM attestations) that the top-level image ID includes
  return info.RootFS.Layers.join(",");
}

export { docker };