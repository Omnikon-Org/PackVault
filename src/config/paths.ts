import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import type { VaultPaths } from "../types/index.js";

const root = process.env.PACKVAULT_HOME ?? path.join(os.homedir(), ".packvault");

export const vaultPaths: VaultPaths = {
  root,
  cache: path.join(root, "cache"),
  templates: path.join(root, "templates"),
  bundles: path.join(root, "bundles"),
  database: path.join(root, "database"),
  exports: path.join(root, "exports")
};

/** Function ensureVaultLayout. */
export async function ensureVaultLayout(): Promise<void> {
  await fs.ensureDir(vaultPaths.cache);
  await fs.ensureDir(vaultPaths.templates);
  await fs.ensureDir(vaultPaths.bundles);
  await fs.ensureDir(vaultPaths.database);
  await fs.ensureDir(vaultPaths.exports);
}

/**
 * Function packageCachePath.
 * @param packageName - The packageName parameter.
 * @param version - The version parameter.
 */
export function packageCachePath(packageName: string, version: string): string {
  const safeName = packageName.replace("/", "__");
  return path.join(vaultPaths.cache, safeName, version, `${safeName}-${version}.tgz`);
}
