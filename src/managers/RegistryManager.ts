import axios, { type AxiosInstance } from "axios";
import dns from "node:dns/promises";
import semver from "semver";
import type { NpmPackageMetadata, NpmVersionMetadata } from "../types/index.js";
import { PackVaultError } from "../utils/errors.js";

/** Represents the RegistryManager class. */
export class RegistryManager {
  private readonly client: AxiosInstance;
  private online: boolean | undefined;

  /**
     * Creates a new instance.
     * @param registryUrl - The registryUrl parameter.
     * @param token - The token parameter.
     */
    constructor(
    private readonly registryUrl = "https://registry.npmjs.org",
    private readonly token?: string
  ) {
    this.client = axios.create({
      baseURL: registryUrl,
      timeout: 30_000,
      headers: {
        "User-Agent": "packvault/0.2.0",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
  }

  /**
     * Executes isOnline operation.
     * @returns The isOnline result.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.isOnline();
     * ```
     */
    async isOnline(): Promise<boolean> {
    if (this.online !== undefined) return this.online;
    try {
      await dns.lookup("registry.npmjs.org");
      this.online = true;
    } catch {
      this.online = false;
    }
    return this.online;
  }

  /**
     * Executes getPackageMetadata operation.
     * @param name - The name parameter.
     * @returns The getPackageMetadata result.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.getPackageMetadata();
     * ```
     */
    async getPackageMetadata(name: string): Promise<NpmPackageMetadata> {
    try {
      const response = await this.client.get<NpmPackageMetadata>(`/${encodeURIComponent(name)}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new PackVaultError("sync", `Package "${name}" not found in registry.`, "Check the package name.");
        }
        if (error.code === "ENOTFOUND") {
          throw new PackVaultError("sync", "Network unreachable — you appear to be offline.", "Use cached packages or connect to a peer.");
        }
      }
      throw error;
    }
  }

  /**
     * Executes resolveVersion operation.
     * @param name - The name parameter.
     * @param requestedVersion - The requestedVersion parameter.
     * @returns The resolveVersion result.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.resolveVersion();
     * ```
     */
    async resolveVersion(name: string, requestedVersion = "latest"): Promise<NpmVersionMetadata> {
    const metadata = await this.getPackageMetadata(name);
    const version = this.resolveVersionFromMetadata(metadata, requestedVersion);
    const versionMetadata = metadata.versions[version];
    if (!versionMetadata) {
      throw new PackVaultError("sync", `Version ${requestedVersion} for ${name} was not found.`, `Run packvault sync ${name}`);
    }
    return versionMetadata;
  }

  private resolveVersionFromMetadata(metadata: NpmPackageMetadata, requestedVersion: string): string {
    const tagged = metadata["dist-tags"][requestedVersion];
    if (tagged) return tagged;
    if (metadata.versions[requestedVersion]) return requestedVersion;

    const versions = Object.keys(metadata.versions).filter((v) => semver.valid(v));
    const maxSatisfying = semver.maxSatisfying(versions, requestedVersion);
    if (!maxSatisfying) {
      throw new PackVaultError("sync", `No version of ${metadata.name} satisfies "${requestedVersion}".`, `Run packvault sync ${metadata.name}`);
    }
    return maxSatisfying;
  }

  /**
     * Executes downloadTarball operation.
     * @param tarballUrl - The tarballUrl parameter.
     * @returns The downloadTarball result.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.downloadTarball();
     * ```
     */
    async downloadTarball(tarballUrl: string): Promise<NodeJS.ReadableStream> {
    const response = await axios.get<NodeJS.ReadableStream>(tarballUrl, {
      responseType: "stream",
      timeout: 120_000,
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {}
    });
    return response.data;
  }

  /**
     * Executes fetchAdvisories operation.
     * @param packages - The packages parameter.
     * @returns The fetchAdvisories result.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.fetchAdvisories();
     * ```
     */
    async fetchAdvisories(packages: string[]): Promise<Array<{
    packageName: string;
    versionRange: string;
    severity: string;
    title: string;
    url?: string;
  }>> {
    if (packages.length === 0) return [];
    try {
      const response = await axios.post<Record<string, Array<{
        id: number;
        title: string;
        severity: string;
        url: string;
        vulnerable_versions: string;
      }>>>(
        "https://registry.npmjs.org/-/npm/v1/security/advisories/bulk",
        Object.fromEntries(packages.map((p) => [p, []]))
      );

      const advisories: Array<{
        packageName: string;
        versionRange: string;
        severity: string;
        title: string;
        url?: string;
      }> = [];

      for (const [pkgName, items] of Object.entries(response.data)) {
        for (const item of items) {
          advisories.push({
            packageName: pkgName,
            versionRange: item.vulnerable_versions,
            severity: item.severity,
            title: item.title,
            url: item.url
          });
        }
      }
      return advisories;
    } catch {
      return [];
    }
  }
}
