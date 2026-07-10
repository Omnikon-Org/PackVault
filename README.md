# PackVault

> Offline-first package caching and distribution CLI for JavaScript and TypeScript developers.

**Built by [Omnikon](https://github.com/Omnikon-Org) — Developer tools for the next generation.**

🌐 **Website:** [https://pack-vault-website.vercel.app/](https://pack-vault-website.vercel.app/)

PackVault is an offline-first package caching and distribution library for JavaScript developers. Download package tarballs while online, install them later without internet access, share them across your LAN, and bootstrap entire projects from a local package vault.

---

## Features

⭐ **Offline-first:** Cache packages online, use them completely offline.  
🌐 **LAN package sharing:** Share packages over the local network via mDNS.  
📦 **Project templates:** Bootstrap projects with dependencies completely offline.  
🔒 **Integrity verification:** Ensures SHA-512 and shasum consistency.  
⚡ **Peer-to-peer package sync:** P2P synchronization with authorization tokens.  

---

## Installation

### JSR installation

You can install PackVault programmatically using JSR:

```bash
npx jsr add @omnikon-org/packvault
```

For Deno:
```bash
deno add jsr:@omnikon-org/packvault
```

### npm installation

```bash
npm install -g packvault
```

---

## Quick Start

### Cache Packages While Online

```bash
packvault sync react vite tailwindcss
```

Or sync directly from a lockfile:

```bash
packvault sync --from-lockfile
```

### Go Offline

Disconnect from the internet.

### Install From Cache

```bash
packvault install react
```

---

## CLI Usage

### Sync

```bash
packvault sync react vite tailwindcss
packvault sync --from-lockfile
packvault sync --concurrency 10
```

### Install

```bash
packvault install react
packvault install vite
```

### Bundle

```bash
packvault bundle save my-stack react vite tailwindcss
packvault bundle list
```

### Search

```bash
packvault search react
```

---

## API Examples

### Caching Packages Programmatically

```ts
import { CacheManager } from "@omnikon-org/packvault";

async function cachePackages() {
  const cache = new CacheManager();
  await cache.syncPackages(["vite", "typescript"]);
  
  const pkgPath = await cache.getPackagePath("vite", "latest");
  console.log("Vite is cached at:", pkgPath);
}

cachePackages();
```

### Offline Installation

```ts
import { PackageManager } from "@omnikon-org/packvault";

async function runOffline() {
  const manager = new PackageManager();
  const pkg = await manager.installOffline("react", "^18.0.0");
  console.log("Offline installation successful!", pkg);
}

runOffline();
```

---

## Configuration

The default configuration is stored in `~/.packvault/config.json`. You can modify it or use environment variables to adjust cache paths, registry URLs, and peer-to-peer settings.

Example:
```json
{
  "cacheDirectory": "~/.packvault/cache",
  "registry": "https://registry.npmjs.org/",
  "p2pPort": 8000
}
```

---

## Architecture

```text
npm Registry
      │
      ▼
  PackVault Sync
      │
      ▼
   Local Vault
      │
 ┌────┴────┐
 ▼         ▼
Offline   LAN
Install   Sharing
           │
           ▼
      Peer Sync
```

The core components include:
- **CacheManager:** Handles metadata and tarball caching.
- **PackageManager:** Orchestrates installations.
- **PeerManager:** Discovers and syncs with peers via mDNS.
- **LocalRegistryServer:** Exposes the local cache as a standard npm registry.

---

## Examples

We provide several executable examples in the `examples/` directory:

- [basic.ts](examples/basic.ts) - Basic package resolution.
- [cache.ts](examples/cache.ts) - Sync and caching workflow.
- [offline.ts](examples/offline.ts) - Demonstrates offline installation fallback.
- [sync.ts](examples/sync.ts) - Peer-to-peer LAN syncing.
- [template.ts](examples/template.ts) - Offline template scaffolding.

---

## FAQ

**Q: Does PackVault replace npm or Yarn?**  
A: No, it works alongside them. It acts as a smart cache and offline registry proxy.

**Q: Can I use it in CI environments?**  
A: Yes! You can point PackVault to a shared cache directory to drastically speed up CI times.

**Q: Is it compatible with Deno and Bun?**  
A: Yes, PackVault's core APIs and CLI are designed to be runtime agnostic where possible.

---

## Contributing

We welcome contributions from developers of all levels. Please check our [GitHub Issues](https://github.com/Omnikon-Org/PackVault/issues) and read the `CONTRIBUTING.md` guidelines.

---

## License

MIT — See [LICENSE](LICENSE)

---

## Roadmap

- [x] Core offline caching
- [x] Lockfile sync
- [x] Integrity verification
- [x] Project templates
- [ ] LAN package sharing (mDNS)
- [ ] Classroom mode
- [ ] Web dashboard
