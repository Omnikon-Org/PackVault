import { PeerManager } from "../src/index.js";

async function syncWithPeers() {
  const peers = new PeerManager();
  
  // Discover peers on the local network
  console.log("Discovering PackVault peers...");
  const peerList = await peers.discover();
  console.log(`Found ${peerList.length} peers.`);
  
  for (const peer of peerList) {
    console.log(`Syncing with peer: ${peer.hostname}...`);
    await peers.syncFromPeer(peer.id);
  }
}

syncWithPeers().catch(console.error);
