import { describe, it, expect, beforeEach } from "vitest";
import { CacheManager } from "../src/managers/CacheManager.js";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";

describe("CacheManager", () => {
  let cachePath: string;

  beforeEach(async () => {
    cachePath = path.join(os.tmpdir(), "packvault-test-cache-" + Date.now());
    await fs.ensureDir(cachePath);
  });

  it("should be instantiable", () => {
    const manager = new CacheManager();
    expect(manager).toBeInstanceOf(CacheManager);
  });
});
