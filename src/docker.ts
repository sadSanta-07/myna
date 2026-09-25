import Docker from "dockerode";
import * as fs from "fs";
import * as path from "path";
import * as tar from "tar-fs";

const docker = new Docker();

export async function listContainers() {
  const containers = await docker.listContainers({ all: true });
  return containers;
}

export async function buildImage(imageTag: string, dockerfileDir: string = process.cwd()): Promise<void> {
  const dockerfilePath = path.join(dockerfileDir, "Dockerfile");

  if (!fs.existsSync(dockerfilePath)) {
    throw new Error(`No Dockerfile found at ${dockerfilePath}`);
  }

  const tarStream = tar.pack(dockerfileDir);

  const stream = await docker.buildImage(tarStream, { t: imageTag });

  return new Promise((resolve, reject) => {
    docker.modem.followProgress(
      stream,
      (err, res) => (err ? reject(err) : resolve()),
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

export { docker };  