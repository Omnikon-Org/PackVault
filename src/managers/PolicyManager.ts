import chalk from "chalk";
import { loadVaultConfig, updateVaultConfig } from "../utils/config.js";

/** Represents the PolicyManager class. */
export class PolicyManager {
  /**
     * Executes allow operation.
     * @param packages - The packages parameter.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.allow();
     * ```
     */
    async allow(packages: string[]): Promise<void> {
    await updateVaultConfig((config) => {
      const allow = new Set(config.policy?.allow ?? []);
      for (const pkg of packages) allow.add(pkg);
      return { ...config, policy: { ...config.policy, allow: [...allow] } };
    });
    console.log(chalk.green(`Added ${packages.length} package(s) to allowlist.`));
  }

  /**
     * Executes block operation.
     * @param packages - The packages parameter.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.block();
     * ```
     */
    async block(packages: string[]): Promise<void> {
    await updateVaultConfig((config) => {
      const block = new Set(config.policy?.block ?? []);
      for (const pkg of packages) block.add(pkg);
      return { ...config, policy: { ...config.policy, block: [...block] } };
    });
    console.log(chalk.yellow(`Blocked ${packages.length} package(s).`));
  }

  /**
     * Executes list operation.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.list();
     * ```
     */
    async list(): Promise<void> {
    const config = await loadVaultConfig();
    const policy = config.policy;
    if (!policy?.allow?.length && !policy?.block?.length) {
      console.log("No policy rules configured.");
      return;
    }
    if (policy.allow?.length) {
      console.log(chalk.green("Allowlist:"), policy.allow.join(", "));
    }
    if (policy.block?.length) {
      console.log(chalk.red("Blocklist:"), policy.block.join(", "));
    }
  }

  /**
     * Executes clear operation.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.clear();
     * ```
     */
    async clear(): Promise<void> {
    await updateVaultConfig((config) => ({ ...config, policy: undefined }));
    console.log(chalk.green("Policy cleared."));
  }
}
