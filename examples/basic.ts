import { PackageManager } from "../src/index.js";

async function run() {
  const manager = new PackageManager();
  console.log("Fetching react metadata...");
  const manifest = await manager.resolvePackage("react");
  console.log("React version:", manifest.version);
}

run().catch(console.error);
