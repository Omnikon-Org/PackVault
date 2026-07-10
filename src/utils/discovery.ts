import { Bonjour } from "bonjour-service";

/** Interface for DiscoveredPeer */
export interface DiscoveredPeer {
  hostname: string;
  ip: string;
  port: number;
  packages: number;
}

let bonjourInstance: Bonjour | undefined;

/**
 * Function startMdnsBroadcast.
 * @param port - The port parameter.
 * @param packageCount - The packageCount parameter.
 */
export function startMdnsBroadcast(port: number, packageCount: number): void {
  stopMdnsBroadcast();
  bonjourInstance = new Bonjour();
  bonjourInstance.publish({
    name: `PackVault-${process.env.HOSTNAME ?? "node"}`,
    type: "packvault",
    port,
    txt: { packages: String(packageCount) }
  });
}

/** Function stopMdnsBroadcast. */
export function stopMdnsBroadcast(): void {
  bonjourInstance?.unpublishAll(() => bonjourInstance?.destroy());
  bonjourInstance = undefined;
}

/**
 * Function discoverPeers.
 * @param timeoutMs - The timeoutMs parameter.
 */
export function discoverPeers(timeoutMs = 3000): Promise<DiscoveredPeer[]> {
  return new Promise((resolve) => {
    const bonjour = new Bonjour();
    const peers: DiscoveredPeer[] = [];
    const browser = bonjour.find({ type: "packvault" });

    browser.on("up", (service) => {
      const ip = service.addresses?.find((a) => a.includes(".")) ?? service.host;
      peers.push({
        hostname: service.name,
        ip,
        port: service.port,
        packages: parseInt(service.txt?.packages ?? "0", 10)
      });
    });

    setTimeout(() => {
      browser.stop();
      bonjour.destroy();
      resolve(peers);
    }, timeoutMs);
  });
}
