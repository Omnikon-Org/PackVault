import fs from "fs-extra";
import chalk from "chalk";
import { PackVaultDatabase } from "../db/database.js";
import { formatBytes } from "../utils/format.js";

/** Represents the PruneManager class. */
export class PruneManager {
  /**
     * Creates a new instance.
     * @param database - The database parameter.
     */
    constructor(private readonly database: PackVaultDatabase) {}

  /**
     * Executes prune operation.
     * @param options - The options parameter.
     * @returns The prune result.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.prune();
     * ```
     */
    async prune(options: {
    olderThan?: string;
    keepLatest?: boolean;
    dryRun?: boolean;
    interactive?: boolean;
  } = {}): Promise<{ removed: number; freed: number }> {
    const packages = this.database.listPackages();
    const toRemove: typeof packages = [];

    if (options.keepLatest) {
      const byName = new Map<string, typeof packages>();
      for (const pkg of packages) {
        const list = byName.get(pkg.name) ?? [];
        list.push(pkg);
        byName.set(pkg.name, list);
      }
      for (const [, versions] of byName) {
        const sorted = [...versions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        toRemove.push(...sorted.slice(1));
      }
    }

    if (options.olderThan) {
      const days = parseInt(options.olderThan.replace("d", ""), 10);
      const cutoff = Date.now() - days * 86400000;
      for (const pkg of packages) {
        const accessed = pkg.accessedAt ?? pkg.createdAt;
        if (new Date(accessed).getTime() < cutoff) toRemove.push(pkg);
      }
    }

    const unique = [...new Map(toRemove.map((p) => [`${p.name}@${p.version}`, p])).values()];

    if (unique.length === 0) {
      console.log(chalk.green("Nothing to prune."));
      return { removed: 0, freed: 0 };
    }

    console.log(`Would remove ${unique.length} package(s):`);
    for (const pkg of unique) {
      console.log(`  ${pkg.name}@${pkg.version}  ${formatBytes(pkg.size)}`);
    }

    if (options.dryRun) return { removed: 0, freed: 0 };

    if (options.interactive) {
      const readline = await import("node:readline/promises");
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const answer = await rl.question("Proceed? (y/N) ");
      rl.close();
      if (answer.toLowerCase() !== "y") {
        console.log("Cancelled.");
        return { removed: 0, freed: 0 };
      }
    }

    let freed = 0;
    for (const pkg of unique) {
      if (await fs.pathExists(pkg.cachePath)) {
        await fs.remove(pkg.cachePath);
        freed += pkg.size;
      }
      await this.database.deletePackage(pkg.name, pkg.version);
    }

    console.log(chalk.green(`Removed ${unique.length} packages. Freed ${formatBytes(freed)}.`));
    return { removed: unique.length, freed };
  }
}
