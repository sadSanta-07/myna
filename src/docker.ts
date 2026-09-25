import Docker from "dockerode";

const docker = new Docker();

export async function listcontainer(){
    const containers = await docker.listContainers({all : true});
    return containers
}

export{docker}