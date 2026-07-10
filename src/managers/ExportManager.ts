import path from "node:path";
import fs from "fs-extra";
import * as tar from "tar";
import { vaultPaths } from "../config/paths.js";
import { PackVaultDatabase } from "../db/database.js";
import { verifyTarball } from "../utils/integrity.js";
import { PackVaultError } from "../utils/errors.js";
import type { CachedPackage } from "../types/index.js";

/** Represents the ExportManager class. */
export class ExportManager {
  /**
     * Creates a new instance.
     * @param database - The database parameter.
     */
    constructor(private readonly database: PackVaultDatabase) {}

  /**
     * Executes export operation.
     * @param options - The options parameter.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.export();
     * ```
     */
    async export(options: {
    output: string;
    bundle?: string;
    packages?: string[];
  }): Promise<void> {
    let pkgs = this.database.listPackages();

    if (options.bundle) {
      const bundle = this.database.listBundles().find((b) => b.name === options.bundle);
      if (!bundle) throw new PackVaultError("export", `Unknown bundle "${options.bundle}".`, "Run packvault bundle list.");
      pkgs = pkgs.filter((p) => bundle.packages.includes(p.name));
    }

    if (options.packages?.length) {
      const names = new Set(options.packages);
      pkgs = pkgs.filter((p) => names.has(p.name));
    }

    const manifest = {
      version: "1",
      createdAt: new Date().toISOString(),
      packages: [] as Array<{ name: string; version: string; shasum?: string; integrity?: string; size: number }>
    };

    const tmpDir = path.join(vaultPaths.exports, `.export-${Date.now()}`);
    await fs.ensureDir(tmpDir);

    for (const pkg of pkgs) {
      const dest = path.join(tmpDir, "cache", pkg.cachePath.replace(vaultPaths.cache, "").replace(/^\//, ""));
      await fs.ensureDir(path.dirname(dest));
      if (await fs.pathExists(pkg.cachePath)) {
        await fs.copy(pkg.cachePath, dest);
        manifest.packages.push({
          name: pkg.name,
          version: pkg.version,
          shasum: pkg.shasum,
          integrity: pkg.integrity,
          size: pkg.size
        });
      }
    }

    await fs.copy(path.join(vaultPaths.database, "packvault.sqlite"), path.join(tmpDir, "packvault.sqlite"));
    await fs.writeJson(path.join(tmpDir, "manifest.json"), manifest, { spaces: 2 });

    await tar.c({ gzip: true, file: options.output, cwd: tmpDir }, ["."]);
    await fs.remove(tmpDir);
    await this.database.addLog("export", options.output, "cli");
    console.log(`Exported ${pkgs.length} packages to ${options.output}`);
  }

  /**
     * Executes import operation.
     * @param archivePath - The archivePath parameter.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.import();
     * ```
     */
    async import(archivePath: string): Promise<void> {
    const tmpDir = path.join(vaultPaths.exports, `.import-${Date.now()}`);
    await fs.ensureDir(tmpDir);
    await tar.x({ file: archivePath, cwd: tmpDir });

    const manifest = await fs.readJson(path.join(tmpDir, "manifest.json")) as {
      packages: Array<{ name: string; version: string; shasum?: string; integrity?: string; size: number }>;
    };

    let imported = 0;
    for (const entry of manifest.packages) {
      const safeName = entry.name.replace("/", "__");
      const srcPath = path.join(tmpDir, "cache", safeName, entry.version, `${safeName}-${entry.version}.tgz`);
      if (!(await fs.pathExists(srcPath))) continue;

      const valid = await verifyTarball(srcPath, entry.integrity, entry.shasum);
      if (!valid) {
        throw new PackVaultError("import", `Integrity check failed for ${entry.name}@${entry.version}.`, "Archive may be corrupt.");
      }

      const destPath = path.join(vaultPaths.cache, safeName, entry.version, `${safeName}-${entry.version}.tgz`);
      await fs.ensureDir(path.dirname(destPath));
      await fs.copy(srcPath, destPath);

      const pkg: CachedPackage = {
        name: entry.name,
        version: entry.version,
        size: entry.size,
        cachePath: destPath,
        createdAt: new Date().toISOString(),
        dependencies: {},
        shasum: entry.shasum,
        integrity: entry.integrity
      };
      await this.database.upsertPackage(pkg);
      imported++;
    }

    await fs.remove(tmpDir);
    await this.database.addLog("import", `${archivePath} (${imported} packages)`, "cli");
    console.log(`Imported ${imported} packages from ${archivePath}`);
  }
}
