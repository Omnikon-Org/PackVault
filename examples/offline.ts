import { PackageManager } from "../src/index.js";

async function runOffline() {
  const manager = new PackageManager();
  
  try {
    // Attempting to install from cache without hitting the registry
    console.log("Installing cached react package offline...");
    const pkg = await manager.installOffline("react", "^18.0.0");
    console.log("Offline installation successful!", pkg);
  } catch (err) {
    console.error("Failed to install offline:", err);
  }
}

runOffline();
