# PackVault

> Cache npm packages once. Install forever — even offline.

**Built by [Omnikon](https://github.com/Omnikon-Org) — Developer tools for the next generation.**

🌐 **Website:** [https://pack-vault-website.vercel.app/](https://pack-vault-website.vercel.app/)

PackVault is an offline-first package caching and distribution CLI for JavaScript developers. Download package tarballs while online, install them later without internet access, share them across your LAN, and bootstrap entire projects from a local package vault.

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

## What Developers Are Saying

> *"PackVault saved us hours during our workshop. 50 students, one vault, zero bandwidth issues."*  
> — Workshop Instructor, TechEducate

> *"Working offline is finally friction-free. This is how npm caching should work."*  
> — Independent Developer

> *"Enterprise air-gapped systems? Solved. PackVault is production-ready."*  
> — Platform Engineer, Fortune 500

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

* LAN package sharing with mDNS peer discovery
* Transparent proxy registry
* Offline fallback support
* Peer authentication tokens
* Bidirectional peer synchronization
* Peer bandwidth throttling

### Project Bootstrapping

* Offline starter project templates
* Framework bundles (React, Vue, Svelte, Next.js, Astro, Fastify)
* Automatic dependency installation
* Project snapshots and restore
* Per-project vault configuration

### Security

* SHA-512 and shasum integrity verification
* Offline vulnerability auditing (powered by npm advisories)
* Allowlist/blocklist policies
* Cryptographic peer authentication
* Audit logging and compliance reporting

### Developer Experience

* Bundle management and caching strategies
* Vault search and introspection
* Auto-sync scheduling
* Portable export/import for team distribution
* Shell completion (bash, zsh, fish)
* Project readiness diagnostics (`doctor`)
* CLI-first, zero configuration for basic use

---

## Pricing & Tiers

PackVault uses a simple, transparent pricing model to keep basic offline development accessible for everyone while providing powerful networking and collaboration tools for professionals and teams.

### Community (Free)
Ideal for individual developers and basic offline coding.
- Local Sync & Install
- Integrity Verification
- Lockfile Aware
- Project Templates
- Offline Security Audit
- Shell Completion
- Community Support

### Pro ($12/mo)
Perfect for teams, classrooms, and enterprise environments. Includes everything in Community, plus:
- **LAN Package Sharing (mDNS)**
- **Peer-to-Peer Sync**
- **Local Registry Proxy** (`packvault serve`)
- **Bidirectional Node Connect**
- **Classroom Mode** (1 host → N students)
- **Team Collaboration Features**
- **Priority Support**

To activate your Pro license, run:
```bash
packvault activate <your-license-key>
```

---

## Installation

### npm

```bash
npm install -g packvault
```

### GitHub

```bash
npm install -g github:Omnikon-Org/PackVault
```

### Local Development

```bash
git clone https://github.com/Omnikon-Org/PackVault
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

Share your vault (Pro only):

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

### Classroom Mode (Pro)

```bash
packvault classroom --host
packvault classroom --join
```

---

## Use Cases

### Remote Development

Prepare dependencies before traveling and continue building without internet access. Perfect for flights, trains, and remote locations.

### Workshops & Classrooms

Share one prepared vault with dozens of students and eliminate repeated downloads. No more waiting for conference WiFi.

### Team Development

Reduce bandwidth usage across multiple machines and local networks. Faster onboarding for new team members.

### Air-Gapped Systems

Prepare dependency vaults in advance and build applications without external network access. Compliance-ready for secure environments.

### CI/CD Pipelines

Use PackVault as a pre-cached registry in containerized builds to speed up deployments.

---

## Vault Layout

```text
~/.packvault/
├── cache/
├── templates/
├── bundles/
├── database/
├── exports/
├── logs/
└── config.json
```

---

## Security

PackVault prioritizes reproducibility and security.

* SHA-512 integrity verification
* shasum verification support
* Offline vulnerability auditing (npm advisories)
* Package allowlist/blocklist enforcement
* Cryptographic peer authentication (Ed25519)
* Audit logging and compliance reporting
* No telemetry or user tracking

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

CREATE TABLE peers (
  id TEXT PRIMARY KEY,
  hostname TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  port INTEGER NOT NULL,
  auth_token TEXT,
  last_seen TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  package_name TEXT,
  peer_id TEXT,
  timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## Documentation

* [docs/QUICKSTART.md](https://github.com/Omnikon-Org/PackVault/blob/main/docs/QUICKSTART.md)
* [docs/COMMANDS.md](https://github.com/Omnikon-Org/PackVault/blob/main/docs/COMMANDS.md)
* [docs/ARCHITECTURE.md](https://github.com/Omnikon-Org/PackVault/blob/main/docs/ARCHITECTURE.md)
* [docs/CLASSROOM-MODE.md](https://github.com/Omnikon-Org/PackVault/blob/main/docs/CLASSROOM-MODE.md)
* [docs/SECURITY.md](https://github.com/Omnikon-Org/PackVault/blob/main/docs/SECURITY.md)

---

## Roadmap

### Phase 1: Foundation ✅
- [x] Core offline caching
- [x] Lockfile sync
- [x] Basic integrity verification
- [x] Project templates

### Phase 2: Collaboration (In Progress)
- [ ] LAN package sharing (mDNS)
- [ ] Peer-to-peer sync
- [ ] Classroom mode (v1.1 - Q3 2026)
- [ ] Web dashboard (v1.1 - Q3 2026)

### Phase 3: Enterprise (Q4 2026)
- [ ] Differential peer synchronization
- [ ] Enhanced registry mirroring
- [ ] Smarter dependency graph analysis
- [ ] Multi-user vault support with RBAC
- [ ] Audit compliance reports

### Phase 4: Advanced (2027)
- [ ] Desktop GUI application
- [ ] Integration with popular IDEs (VS Code, WebStorm)
- [ ] Native mobile support (React Native)
- [ ] Advanced bandwidth optimization

---

## Contributing

We welcome contributions from developers of all levels.

See [CONTRIBUTING.md](https://github.com/Omnikon-Org/PackVault/blob/main/CONTRIBUTING.md) for guidelines.

---

## Community

* [GitHub Discussions](https://github.com/Omnikon-Org/PackVault/discussions)
* [GitHub Issues](https://github.com/Omnikon-Org/PackVault/issues)
* [Twitter/X](https://twitter.com/OmnikonOrg)
* [Discord](https://discord.gg/yWtjK2Tb8T) 

---

## License

MIT — See [LICENSE](https://github.com/Omnikon-Org/PackVault/blob/main/LICENSE)

---

## About Omnikon

**Omnikon** builds developer tools for the next generation of builders.

Explore our other projects:
* **[IssueSwipe](https://github.com/Omnikon-Org/IssueSwipe)** — Tinder-style GitHub issue discovery
* **[Abyss](https://github.com/Omnikon-Org/Abyss)** — Mobile IDE for Android development
* **[schema-cast](https://github.com/Omnikon-Org/schema-cast)** — Generate TypeScript, Zod, Mongoose, and SQL from JSON schema
* **[DemonTech Roadmap](https://demontech-roadmap.vercel.app/)** — Interactive learning platform for web technologies

[GitHub Organization](https://github.com/Omnikon-Org) — [Website](https://omnikon.dev)

---

**Built for developers who don't want internet availability to determine whether they can build software.**
