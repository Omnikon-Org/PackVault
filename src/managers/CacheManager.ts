import path from "node:path";
import fs from "fs-extra";
import { pipeline } from "node:stream/promises";
import { packageCachePath } from "../config/paths.js";
import { verifyTarball, extractShasum } from "../utils/integrity.js";
import { PackVaultError } from "../utils/errors.js";
import type { CachedPackage, NpmVersionMetadata } from "../types/index.js";

/** Represents the CacheManager class. */
export class CacheManager {
  /**
     * Executes writeTarball operation.
     * @param metadata - The metadata parameter.
     * @param stream - The stream parameter.
     * @returns The writeTarball result.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.writeTarball();
     * ```
     */
    async writeTarball(metadata: NpmVersionMetadata, stream: NodeJS.ReadableStream): Promise<CachedPackage> {
    const cachePath = packageCachePath(metadata.name, metadata.version);
    const tmpPath = `${cachePath}.tmp`;
    await fs.ensureDir(path.dirname(cachePath));

    try {
      await pipeline(stream, fs.createWriteStream(tmpPath));
      const integrity = metadata.dist.integrity;
      const shasum = extractShasum(integrity, metadata.dist.shasum);

      const valid = await verifyTarball(tmpPath, integrity, shasum);
      if (!valid) {
        await fs.remove(tmpPath);
        throw new PackVaultError(
          "sync",
          `Integrity check failed for ${metadata.name}@${metadata.version}.`,
          "The download may be corrupt — try syncing again."
        );
      }

      await fs.move(tmpPath, cachePath, { overwrite: true });
      const stat = await fs.stat(cachePath);

      return {
        name: metadata.name,
        version: metadata.version,
        size: stat.size,
        cachePath,
        createdAt: new Date().toISOString(),
        dependencies: metadata.dependencies ?? {},
        distTarball: metadata.dist.tarball,
        integrity,
        shasum
      };
    } catch (error) {
      if (await fs.pathExists(tmpPath)) await fs.remove(tmpPath);
      throw error;
    }
  }

  /**
     * Executes verifyCached operation.
     * @param pkg - The pkg parameter.
     * @returns The verifyCached result.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.verifyCached();
     * ```
     */
    async verifyCached(pkg: CachedPackage): Promise<boolean> {
    if (!(await fs.pathExists(pkg.cachePath))) return false;
    return verifyTarball(pkg.cachePath, pkg.integrity, pkg.shasum);
  }

  /**
     * Executes hasTarball operation.
     * @param pkg - The pkg parameter.
     * @returns The hasTarball result.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.hasTarball();
     * ```
     */
    async hasTarball(pkg: CachedPackage): Promise<boolean> {
    return fs.pathExists(pkg.cachePath);
  }

  /**
     * Executes importTarball operation.
     * @param pkg - The pkg parameter.
     * @param stream - The stream parameter.
     * @returns The importTarball result.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.importTarball();
     * ```
     */
    async importTarball(pkg: CachedPackage, stream: NodeJS.ReadableStream): Promise<CachedPackage> {
    return this.writeTarball(
      {
        name: pkg.name,
        version: pkg.version,
        dist: { tarball: pkg.distTarball ?? "", integrity: pkg.integrity, shasum: pkg.shasum },
        dependencies: pkg.dependencies
      },
      stream
    );
  }

  /**
     * Executes storageUsage operation.
     * @param rootPath - The rootPath parameter.
     * @returns The storageUsage result.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.storageUsage();
     * ```
     */
    async storageUsage(rootPath: string): Promise<number> {
    if (!(await fs.pathExists(rootPath))) return 0;

    let total = 0;
    const entries = await fs.readdir(rootPath);
    for (const entry of entries) {
      const fullPath = path.join(rootPath, entry);
      const stat = await fs.stat(fullPath);
      total += stat.isDirectory() ? await this.storageUsage(fullPath) : stat.size;
    }
    return total;
  }

  /**
     * Executes listCacheFiles operation.
     * @param rootPath - The rootPath parameter.
     * @returns The listCacheFiles result.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.listCacheFiles();
     * ```
     */
    async listCacheFiles(rootPath: string): Promise<string[]> {
    if (!(await fs.pathExists(rootPath))) return [];
    const files: string[] = [];
    const walk = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir);
      for (const entry of entries) {
        const full = path.join(dir, entry);
        const stat = await fs.stat(full);
        if (stat.isDirectory()) await walk(full);
        else if (entry.endsWith(".tgz")) files.push(full);
      }
    };
    await walk(rootPath);
    return files;
  }
}
