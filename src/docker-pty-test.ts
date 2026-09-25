import { buildImage, startContainer, attachToContainer } from "./docker.js";

async function main() {
    console.log("[docker] building image...");
    await buildImage("myna-test:latest");

    console.log("[docker] starting container...");
    const container = await startContainer("myna-test:latest");

    console.log("[docker] attaching...");
    const stream = await attachToContainer(container);

    stream.on("data", (chunk: Buffer) => {
        process.stdout.write(chunk);
    });

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    process.stdin.on("data", (data: string) => {
        stream.write(data);
    });
    stream.write("\n");

    stream.on("end", async () => {
        console.log("[docker] container stream ended");
        process.stdin.setRawMode(false);
        try {
            await container.remove({ force: true });
        } catch {
            // ignore
        }
        process.exit(0);
    });

    process.on("SIGINT", async () => {
        process.stdin.setRawMode(false);
        await container.stop();
        await container.remove();
        process.exit(0);
    });
}

main().catch((err) => console.error("[docker] error:", err));