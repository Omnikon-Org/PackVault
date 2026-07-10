import { describe, it, expect } from "vitest";
import { RegistryManager } from "../src/managers/RegistryManager.js";

describe("RegistryManager", () => {
  it("should be instantiable", () => {
    const manager = new RegistryManager();
    expect(manager).toBeInstanceOf(RegistryManager);
  });
  
  it("should fetch metadata for a package", async () => {
    const manager = new RegistryManager();
    const isOnline = await manager.isOnline();
    
    // Only run if network is available
    if (isOnline) {
      const meta = await manager.getPackageMetadata("is-odd");
      expect(meta.name).toBe("is-odd");
      expect(meta.versions).toBeDefined();
    }
  });
});
