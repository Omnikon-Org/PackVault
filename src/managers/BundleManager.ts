import chalk from "chalk";
import { builtInBundleNames } from "../config/bundles.js";
import { PackVaultDatabase } from "../db/database.js";
import { formatBytes } from "../utils/format.js";
import type { BundleDefinition } from "../types/index.js";

/** Represents the BundleManager class. */
export class BundleManager {
  /**
     * Creates a new instance.
     * @param database - The database parameter.
     */
    constructor(private readonly database: PackVaultDatabase) {}

  /**
     * Executes seedBuiltIns operation.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.seedBuiltIns();
     * ```
     */
    async seedBuiltIns(): Promise<void> {
    const { builtInBundles } = await import("../config/bundles.js");
    for (const bundle of builtInBundles) {
      await this.database.upsertBundle(bundle);
    }
  }

  /**
     * Executes list operation.
     * @returns The list result.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.list();
     * ```
     */
    list(): BundleDefinition[] {
    return this.database.listBundles().map((b) => ({
      ...b,
      builtIn: builtInBundleNames.has(b.name)
    }));
  }

  /**
     * Executes save operation.
     * @param name - The name parameter.
     * @param packages - The packages parameter.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.save();
     * ```
     */
    async save(name: string, packages: string[]): Promise<void> {
    if (builtInBundleNames.has(name)) {
      throw new Error(`Cannot overwrite built-in bundle "${name}".`);
    }
    await this.database.upsertBundle({ name, packages });
    await this.database.addLog("bundle", `saved ${name}: ${packages.join(", ")}`, "cli");
  }

  /**
     * Executes remove operation.
     * @param name - The name parameter.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.remove();
     * ```
     */
    async remove(name: string): Promise<void> {
    if (builtInBundleNames.has(name)) {
      throw new Error(`Cannot delete built-in bundle "${name}".`);
    }
    await this.database.deleteBundle(name);
    await this.database.addLog("bundle", `deleted ${name}`, "cli");
  }

  /**
     * Executes printList operation.
     * @param database - The database parameter.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.printList();
     * ```
     */
    printList(database: PackVaultDatabase): void {
    const packages = database.listPackages();
    for (const bundle of this.list()) {
      const count = bundle.packages.length;
      const bytes = packages
        .filter((p) => bundle.packages.includes(p.name))
        .reduce((sum, p) => sum + p.size, 0);
      const tag = bundle.builtIn ? chalk.dim("(built-in)") : chalk.cyan("(custom)");
      console.log(`${chalk.bold(bundle.name)} ${tag} — ${count} packages, ${formatBytes(bytes)}`);
    }
  }
}
