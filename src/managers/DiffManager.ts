import chalk from "chalk";
import { PackVaultDatabase } from "../db/database.js";

/** Represents the DiffManager class. */
export class DiffManager {
  /**
     * Creates a new instance.
     * @param database - The database parameter.
     */
    constructor(private readonly database: PackVaultDatabase) {}

  /**
     * Executes diff operation.
     * @param options - The options parameter.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.diff();
     * ```
     */
    diff(options: { since?: string; bundle?: string } = {}): void {
    const days = options.since ? parseInt(options.since.replace("d", ""), 10) : 7;
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const packages = this.database.listPackages();

    let filtered = packages;
    if (options.bundle) {
      const bundle = this.database.listBundles().find((b) => b.name === options.bundle);
      if (bundle) filtered = packages.filter((p) => bundle.packages.includes(p.name));
    }

    const recent = filtered.filter((p) => p.createdAt >= cutoff);
    const byName = new Map<string, typeof packages>();
    for (const pkg of filtered) {
      const list = byName.get(pkg.name) ?? [];
      list.push(pkg);
      byName.set(pkg.name, list);
    }

    console.log(chalk.bold(`\nChanges since ${days} days ago:`));

    if (recent.length === 0) {
      console.log(chalk.dim("  No changes."));
      return;
    }

    for (const pkg of recent) {
      const all = byName.get(pkg.name) ?? [];
      const older = all.filter((p) => p.createdAt < cutoff).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      if (older.length > 0) {
        console.log(chalk.green(`+ ${pkg.name.padEnd(14)} ${older[0].version} → ${pkg.version}  (upgraded)`));
      } else {
        console.log(chalk.cyan(`+ ${pkg.name.padEnd(14)} ${pkg.version}  (new)`));
      }
    }
  }
}
