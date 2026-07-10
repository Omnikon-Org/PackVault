import type { VaultConfig } from "../types/index.js";
import { PackVaultError } from "./errors.js";

/**
 * Function enforcePolicy.
 * @param name - The name parameter.
 * @param config - The config parameter.
 * @param command - The command parameter.
 */
export function enforcePolicy(name: string, config: VaultConfig, command: string): void {
  const policy = config.policy;
  if (!policy) return;

  if (policy.block?.includes(name)) {
    throw new PackVaultError(command, `Package "${name}" is blocked by policy.`, "Run packvault policy list to review rules.");
  }

  if (policy.allow && policy.allow.length > 0 && !policy.allow.includes(name)) {
    throw new PackVaultError(
      command,
      `Package "${name}" is not on the allowlist.`,
      "Run packvault policy allow <package> or packvault policy clear."
    );
  }
}
