import { CacheManager } from "../src/index.js";

async function cachePackages() {
  const cache = new CacheManager();
  await cache.syncPackages(["vite", "typescript"]);
  
  const pkgPath = await cache.getPackagePath("vite", "latest");
  console.log("Vite is cached at:", pkgPath);
}

cachePackages().catch(console.error);
