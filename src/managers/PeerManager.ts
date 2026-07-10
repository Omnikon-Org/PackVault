import axios from "axios";
import os from "node:os";
import chalk from "chalk";
import { PackVaultDatabase } from "../db/database.js";
import type { CachedPackage, PeerRecord } from "../types/index.js";
import { CacheManager } from "./CacheManager.js";
import { discoverPeers, type DiscoveredPeer } from "../utils/discovery.js";

/** Represents the PeerManager class. */
export class PeerManager {
  /**
     * Creates a new instance.
     * @param database - The database parameter.
     * @param cache - The cache parameter.
     */
    constructor(
    private readonly database: PackVaultDatabase,
    private readonly cache: CacheManager
  ) {}

  /**
     * Executes recordPeer operation.
     * @param ip - The ip parameter.
     * @param hostname - The hostname parameter.
     * @returns The recordPeer result.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.recordPeer();
     * ```
     */
    async recordPeer(ip: string, hostname = "unknown"): Promise<PeerRecord> {
    const peer = { ip, hostname, lastSeen: new Date().toISOString() };
    await this.database.upsertPeer(peer);
    return peer;
  }

  /**
     * Executes listPeers operation.
     * @returns The listPeers result.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.listPeers();
     * ```
     */
    listPeers(): PeerRecord[] {
    return this.database.listPeers();
  }

  /**
     * Executes discover operation.
     * @returns The discover result.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.discover();
     * ```
     */
    async discover(): Promise<DiscoveredPeer[]> {
    return discoverPeers();
  }

  /**
     * Executes connect operation.
     * @param ip - The ip parameter.
     * @param port - The port parameter.
     * @param options - The options parameter.
     * @returns The connect result.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.connect();
     * ```
     */
    async connect(ip: string, port = 4873, options: { token?: string; bidirectional?: boolean } = {}): Promise<CachedPackage[]> {
    const headers = options.token ? { Authorization: `Bearer ${options.token}` } : {};
    const baseUrl = `http://${ip}:${port}`;

    const [remoteRes, localPkgs] = await Promise.all([
      axios.get<CachedPackage[]>(`${baseUrl}/-/packvault/packages`, { timeout: 10_000, headers }),
      Promise.resolve(this.database.listPackages())
    ]);

    await this.recordPeer(ip, os.hostname());
    const remotePkgs = remoteRes.data;

    const localKeys = new Set(localPkgs.map((p) => `${p.name}@${p.version}`));
    const remoteKeys = new Set(remotePkgs.map((p) => `${p.name}@${p.version}`));

    const missingLocal = remotePkgs.filter((p) => !localKeys.has(`${p.name}@${p.version}`));
    const missingRemote = localPkgs.filter((p) => !remoteKeys.has(`${p.name}@${p.version}`));

    if (options.bidirectional) {
      console.log(chalk.dim(`You have ${missingRemote.length} packages peer is missing. Peer has ${missingLocal.length} packages you are missing.`));
    }

    const imported: CachedPackage[] = [];
    for (const remote of missingLocal) {
      const local = this.database.findPackage(remote.name, remote.version);
      if (local && await this.cache.hasTarball(local)) continue;

      const tarball = await axios.get<NodeJS.ReadableStream>(`${baseUrl}/-/packvault/tarball`, {
        params: { name: remote.name, version: remote.version },
        responseType: "stream",
        timeout: 120_000,
        headers
      });

      const cached = await this.cache.importTarball(remote, tarball.data);
      await this.database.upsertPackage(cached);
      imported.push(cached);
    }

    if (options.bidirectional && missingRemote.length > 0) {
      console.log(chalk.dim(`Pushing ${missingRemote.length} packages to peer is not yet supported via HTTP — peer should run connect to you.`));
    }

    await this.database.addLog("connect", `${ip}:${port} imported ${imported.length}`, "cli");
    return imported;
  }

  /**
     * Executes interactiveConnect operation.
     * @param options - The options parameter.
     * @returns The interactiveConnect result.
     * @example
     * ```ts
     * // Example usage
     * const result = await instance.interactiveConnect();
     * ```
     */
    async interactiveConnect(options: { port?: number; token?: string } = {}): Promise<CachedPackage[]> {
    const peers = await this.discover();
    if (peers.length === 0) {
      throw new Error("No PackVault nodes found on the network. Try packvault discover.");
    }

    console.log(`Found ${peers.length} PackVault node${peers.length === 1 ? "" : "s"}:`);
    peers.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.hostname}  ${p.ip}:${p.port}  ${p.packages} packages`);
    });

    const readline = await import("node:readline/promises");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question("Select node (number): ");
    rl.close();

    const idx = parseInt(answer, 10) - 1;
    if (idx < 0 || idx >= peers.length) throw new Error("Invalid selection.");
    const peer = peers[idx];
    return this.connect(peer.ip, options.port ?? peer.port, { token: options.token });
  }
}
