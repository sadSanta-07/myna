import { compose } from "node:stream";
import { listcontainer } from "./docker.js";

async function main() {
    try {
        const containers = await listcontainer();
        console.log(`[docker] connected - found ${containers.length} container(s)`);
        for (const c of containers) {
            console.log(` - ${c.Names.join(",")} (${c.Image}) [${c.State}]`);

        }
    } catch (err) {
        console.error("[docker] connection failed: ", err);
    }
}

main();