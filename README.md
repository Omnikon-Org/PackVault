# PackVault

> Cache npm packages once. Install forever — even offline.

PackVault is an offline-first package caching and distribution CLI for JavaScript developers.

Download package tarballs while online, install them later without internet access, share them across your LAN, and bootstrap entire projects from a local package vault.

```bash
# Cache packages while online
packvault sync react vite tailwindcss

# Later... no internet required
packvault install react
```

⭐ Offline-first
🌐 LAN package sharing
📦 Project templates
🔒 Integrity verification
⚡ Peer-to-peer package sync

---

## Demo

> Add a terminal GIF or screenshot here.

```md
![PackVault Demo](docs/demo.gif)
```

---

## Why PackVault?

Modern JavaScript development assumes a reliable internet connection.

But many developers work:

* On unreliable networks
* While traveling
* In classrooms and workshops
* Behind restricted firewalls
* On multiple machines

Downloading the same dependencies repeatedly wastes bandwidth and time.

PackVault creates a reusable local package vault that works online and offline.

---

## How It Works

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

---

## Comparison

| Feature           | npm Cache | Verdaccio | PackVault |
| ----------------- | --------- | --------- | --------- |
| Offline installs  | ✓         | ✓         | ✓         |
| Lockfile sync     | Partial   | Partial   | ✓         |
| Peer-to-peer sync | ✗         | ✗         | ✓         |
| Offline templates | ✗         | ✗         | ✓         |
| Offline audit     | ✗         | ✗         | ✓         |
| Portable exports  | ✗         | Partial   | ✓         |
| Classroom mode    | ✗         | ✗         | ✓         |

---

## Features

### Offline Package Management

* Sync npm metadata and tarballs into a durable local vault
* Lockfile-aware sync for npm, Yarn, and pnpm
* SemVer-aware installs from cached packages
* Runtime dependency caching
* Incremental sync with skipped duplicates
* SHA-512 and shasum integrity verification

### Networking & Distribution

* LAN package sharing
* Transparent proxy registry
* Offline fallback support
* mDNS peer discovery
* Peer authentication tokens
* Bidirectional peer synchronization

### Project Bootstrapping

* Offline starter project templates
* Framework bundles
* Automatic dependency installation
* Project snapshots and restore
* Per-project configuration

### Security

* Integrity verification
* Offline vulnerability auditing
* Allowlist/blocklist policies
* Audit logging
* Trusted peer authentication

### Productivity

* Bundle management
* Vault search
* Auto-sync scheduling
* Portable export/import
* Shell completion
* Project readiness diagnostics

---

## Installation

### npm

```bash
npm install -g packvault
```

### GitHub

```bash
npm install -g github:Demon-Die/PackVault
```

### Local Development

```bash
git clone https://github.com/Demon-Die/PackVault
cd PackVault

npm install
npm run build
npm link
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
packvault install vite
```

No registry required.

---

## Create Projects Offline

Interactive wizard:

```bash
packvault create
```

Create directly:

```bash
packvault create react my-app
packvault create vue dashboard
packvault create svelte app
packvault create nextjs web-app
packvault create astro docs-site
packvault create fastify api-server
```

Install dependencies automatically:

```bash
packvault create react my-app --install
```

---

## Bundles

Pre-cache common ecosystems:

```bash
packvault bundle frontend
packvault bundle backend
packvault bundle fullstack
packvault bundle frameworks
```

Create custom bundles:

```bash
packvault bundle save my-stack react vite tailwindcss
```

---

## LAN Sharing

Share your vault:

```bash
packvault share
```

Discover peers:

```bash
packvault discover
```

Connect:

```bash
packvault connect 192.168.1.25
```

Bidirectional synchronization:

```bash
packvault connect 192.168.1.25 --bidirectional
```

---

## Common Workflow

### 1. Sync Dependencies

```bash
packvault sync react vite tailwindcss
```

### 2. Verify Vault Health

```bash
packvault doctor
```

### 3. Disconnect Internet

Continue working offline.

### 4. Install Packages

```bash
packvault install react
```

### 5. Share With Other Machines

```bash
packvault share
```

---

## Commands

### Sync

```bash
packvault sync react vite tailwindcss
packvault sync --from-lockfile
packvault sync --from-lockfile ./package-lock.json
packvault sync --concurrency 10
packvault sync my-private-pkg --registry https://npm.mycompany.com --token TOKEN
```

### Install

```bash
packvault install react
packvault install vite
packvault install --from-package-json
```

### Bundle

```bash
packvault bundle save my-stack react vite tailwindcss
packvault bundle list
packvault bundle delete my-stack
packvault bundle frontend
```

### Doctor

```bash
packvault doctor
packvault doctor --project ./my-app
packvault doctor --fix
```

### Search

```bash
packvault search react
packvault search vite --versions
```

### Audit

```bash
packvault audit
packvault audit --project ./my-app
packvault audit --fix
```

### Export / Import

```bash
packvault export -o my-vault.tar.gz
packvault import my-vault.tar.gz
```

### Policy

```bash
packvault policy allow react vite
packvault policy block lodash
packvault policy list
```

### Snapshot

```bash
packvault snapshot --project ./my-app -o my-app.vault
packvault snapshot restore my-app.vault
```

### Classroom Mode

```bash
packvault classroom --host
packvault classroom --join
```

---

## Use Cases

### Remote Development

Prepare dependencies before traveling and continue building without internet access.

### Workshops & Classrooms

Share one prepared vault with dozens of students and eliminate repeated downloads.

### Team Development

Reduce bandwidth usage across multiple machines and local networks.

### Air-Gapped Systems

Prepare dependency vaults in advance and build applications without external network access.

---

## Vault Layout

```text
~/.packvault/
├── cache/
├── templates/
├── bundles/
├── database/
├── exports/
└── config.json
```

---

## Security

PackVault prioritizes reproducibility and security.

* SHA-512 integrity verification
* shasum verification support
* Offline vulnerability auditing
* Package allowlist/blocklist enforcement
* Authenticated peer synchronization
* Audit logging

---

## Database Schema

```sql
CREATE TABLE packages (
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  size INTEGER NOT NULL,
  cache_path TEXT NOT NULL,
  dependencies TEXT NOT NULL DEFAULT '{}',
  dist_tarball TEXT,
  integrity TEXT,
  shasum TEXT,
  accessed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (name, version)
);
```

Additional tables store bundles, peers, logs, advisories, and schema versions.

---

## Documentation

* docs/ARCHITECTURE.md
* docs/ROADMAP.md

---

## Roadmap

* Differential peer synchronization
* Enhanced registry mirroring
* Smarter dependency graph analysis
* Multi-user vault support
* Improved web UI

---

## License

MIT

---

Built for developers who don't want internet availability to determine whether they can build software.
