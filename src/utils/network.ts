import os from "node:os";

/** Function getLanAddresses. */
export function getLanAddresses(): string[] {
  return Object.values(os.networkInterfaces())
    .flatMap((interfaces) => interfaces ?? [])
    .filter((network) => network.family === "IPv4" && !network.internal)
    .map((network) => network.address);
}
