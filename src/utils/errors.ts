import chalk from "chalk";

/** Represents the PackVaultError class. */
export class PackVaultError extends Error {
  /**
     * Creates a new instance.
     * @param command - The command parameter.
     * @param message - The message parameter.
     * @param hint - The hint parameter.
     */
    constructor(
    public readonly command: string,
    message: string,
    public readonly hint?: string
  ) {
    super(message);
    this.name = "PackVaultError";
  }

  /**
     * Executes format operation.
     * @returns The format result.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.format();
     * ```
     */
    format(): string {
    const lines = [`✗ [${this.command}] Error: ${this.message}`];
    if (this.hint) {
      lines.push(`Hint: ${this.hint}`);
    }
    return lines.join("\n");
  }
}

/**
 * Function formatError.
 * @param command - The command parameter.
 * @param error - The error parameter.
 */
export function formatError(command: string, error: unknown): string {
  if (error instanceof PackVaultError) {
    return error.format();
  }

  if (error instanceof Error) {
    const message = error.message;
    if (message.includes("ENOTFOUND") || message.includes("getaddrinfo")) {
      return new PackVaultError(command, "Network unreachable — you appear to be offline.", "Check your connection or use cached packages.").format();
    }
    if (message.includes("ETIMEDOUT") || message.includes("timeout")) {
      return new PackVaultError(command, "Request timed out.", "Try again or check registry availability.").format();
    }
    if (message.includes("404") || message.includes("not found")) {
      return new PackVaultError(command, message, "Verify the package name and run packvault sync.").format();
    }
    if (message.includes("5") && message.includes("status")) {
      return new PackVaultError(command, "Registry server error.", "The registry may be down — try again later.").format();
    }
    return new PackVaultError(command, message).format();
  }

  return chalk.red(`✗ [${command}] Error: ${String(error)}`);
}

/**
 * Function handleCommandError.
 * @param command - The command parameter.
 * @param error - The error parameter.
 */
export function handleCommandError(command: string, error: unknown): void {
  console.error(formatError(command, error));
  process.exitCode = 1;
}
