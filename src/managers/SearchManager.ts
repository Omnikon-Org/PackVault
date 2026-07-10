import chalk from "chalk";
import { PackVaultDatabase } from "../db/database.js";
import { builtInBundles } from "../config/bundles.js";
import { formatBytes } from "../utils/format.js";

/** Represents the SearchManager class. */
export class SearchManager {
  /**
     * Creates a new instance.
     * @param database - The database parameter.
     */
    constructor(private readonly database: PackVaultDatabase) {}

  /**
     * Executes search operation.
     * @param query - The query parameter.
     * @param options - The options parameter.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.search();
     * ```
     */
    search(query: string, options: { all?: boolean; versions?: boolean } = {}): void {
    const packages = this.database.listPackages();
    const bundlePackages = new Set(builtInBundles.flatMap((b) => b.packages));

    const filtered = options.all
      ? packages
      : packages.filter((p) => p.name.includes(query));

    const byName = new Map<string, typeof packages>();
    for (const pkg of filtered) {
      const list = byName.get(pkg.name) ?? [];
      list.push(pkg);
      byName.set(pkg.name, list);
    }

    if (byName.size === 0) {
      console.log(chalk.yellow(`No packages matching "${query}".`));
      return;
    }

    for (const [name, versions] of byName) {
      const inBundle = bundlePackages.has(name) ? chalk.dim(" [bundle]") : "";
      if (options.versions) {
        console.log(chalk.bold(name) + inBundle);
        for (const v of versions) {
          console.log(`  ${v.version}  ${formatBytes(v.size)}  ${v.createdAt}`);
        }
      } else {
        const vers = versions.map((v) => v.version).join(", ");
        const totalSize = versions.reduce((s, v) => s + v.size, 0);
        console.log(`${chalk.bold(name)}${inBundle}  ${vers}  ${formatBytes(totalSize)}`);
      }
    }
  }
}
