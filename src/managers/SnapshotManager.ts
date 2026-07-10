import path from "node:path";
import fs from "fs-extra";
import * as tar from "tar";
import { vaultPaths } from "../config/paths.js";
import { PackVaultDatabase } from "../db/database.js";
import { parseLockfile } from "../utils/lockfile.js";
import { verifyTarball } from "../utils/integrity.js";
import type { PackageManager } from "./PackageManager.js";

/** Represents the SnapshotManager class. */
export class SnapshotManager {
  /**
     * Creates a new instance.
     * @param database - The database parameter.
     * @param packages - The packages parameter.
     */
    constructor(
    private readonly database: PackVaultDatabase,
    private readonly packages: PackageManager
  ) {}

  /**
     * Executes create operation.
     * @param projectPath - The projectPath parameter.
     * @param output - The output parameter.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.create();
     * ```
     */
    async create(projectPath: string, output: string): Promise<void> {
    const resolved = path.resolve(projectPath);
    const entries = await parseLockfile(path.join(resolved, detectLockfileName(resolved)));
    const tmpDir = path.join(vaultPaths.exports, `.snapshot-${Date.now()}`);
    await fs.ensureDir(tmpDir);

    const manifest = {
      packvaultVersion: "0.2.0",
      nodeVersion: process.version,
      createdAt: new Date().toISOString(),
      packages: [] as Array<{ name: string; version: string; shasum?: string; integrity?: string }>
    };

    let totalSize = 0;
    for (const entry of entries) {
      const cached = this.database.findPackage(entry.name, entry.version);
      if (!cached || !(await fs.pathExists(cached.cachePath))) continue;

      const dest = path.join(tmpDir, "packages", `${entry.name.replace("/", "__")}-${entry.version}.tgz`);
      await fs.copy(cached.cachePath, dest);
      manifest.packages.push({ name: entry.name, version: entry.version, shasum: cached.shasum, integrity: cached.integrity });
      totalSize += cached.size;
    }

    if (await fs.pathExists(path.join(resolved, "package.json"))) {
      await fs.copy(resolved, path.join(tmpDir, "project"), { filter: (src) => !src.includes("node_modules") });
    }

    await fs.writeJson(path.join(tmpDir, "manifest.json"), manifest, { spaces: 2 });
    await tar.c({ gzip: false, file: output, cwd: tmpDir }, ["."]);
    await fs.remove(tmpDir);

    console.log(`Snapshot created: ${output} (${manifest.packages.length} packages, ${formatSize(totalSize)})`);
  }

  /**
     * Executes restore operation.
     * @param archivePath - The archivePath parameter.
     * @param targetDir - The targetDir parameter.
     * @returns The restore result.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.restore();
     * ```
     */
    async restore(archivePath: string, targetDir?: string): Promise<string> {
    const tmpDir = path.join(vaultPaths.exports, `.restore-${Date.now()}`);
    await fs.ensureDir(tmpDir);
    await tar.x({ file: archivePath, cwd: tmpDir });

    const manifest = await fs.readJson(path.join(tmpDir, "manifest.json")) as {
      packages: Array<{ name: string; version: string; shasum?: string; integrity?: string }>;
    };

    for (const entry of manifest.packages) {
      const src = path.join(tmpDir, "packages", `${entry.name.replace("/", "__")}-${entry.version}.tgz`);
      if (!(await fs.pathExists(src))) continue;

      const valid = await verifyTarball(src, entry.integrity, entry.shasum);
      if (!valid) throw new Error(`Integrity check failed for ${entry.name}@${entry.version}`);

      const safeName = entry.name.replace("/", "__");
      const dest = path.join(vaultPaths.cache, safeName, entry.version, `${safeName}-${entry.version}.tgz`);
      await fs.ensureDir(path.dirname(dest));
      await fs.copy(src, dest);

      const stat = await fs.stat(dest);
      await this.database.upsertPackage({
        name: entry.name,
        version: entry.version,
        size: stat.size,
        cachePath: dest,
        createdAt: new Date().toISOString(),
        dependencies: {},
        shasum: entry.shasum,
        integrity: entry.integrity
      });
    }

    const outDir = targetDir ?? path.join(process.cwd(), `restored-${Date.now()}`);
    const projectSrc = path.join(tmpDir, "project");
    if (await fs.pathExists(projectSrc)) {
      await fs.copy(projectSrc, outDir);
      await this.packages.installFromPackageJson(outDir);
    }

    await fs.remove(tmpDir);
    console.log(`Restored to ${outDir}`);
    return outDir;
  }
}

function detectLockfileName(dir: string): string {
  for (const name of ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"]) {
    if (fs.existsSync(path.join(dir, name))) return name;
  }
  throw new Error("No lockfile found in project.");
}

function formatSize(bytes: number): string {
  return bytes < 1048576 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1048576).toFixed(0)} MB`;
}
