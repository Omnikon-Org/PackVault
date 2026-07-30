# Security Policy

## Supported Versions

PackVault actively supports the latest stable version available on the `main` branch.

| Version           | Supported |
| ----------------- | --------- |
| Latest (`main`)   | ✅ Yes     |
| Previous releases | ❌ No      |

---

# Reporting a Vulnerability

The security of PackVault and its users is a priority. If you believe you have found a security vulnerability, please report it responsibly.

**Please do not disclose security vulnerabilities publicly until they have been reviewed and resolved.**

## How to Report

Please send the following information to our security team:

* Description of the vulnerability
* Steps to reproduce the issue
* Expected vs. actual behavior
* Potential impact
* Proof of concept (if applicable)
* Suggested mitigation (optional)

**Security Contact:** [security@omnikon.org](mailto:security@omnikon.org)

If email is unavailable, you may also use GitHub's **Private Vulnerability Reporting** feature for this repository.

---

# What to Expect

After receiving your report, we aim to:

* Acknowledge your report within **48 hours**
* Investigate the issue promptly
* Keep you informed of significant progress
* Release a security fix as soon as reasonably possible
* Credit your responsible disclosure (if you wish)

Response times may vary depending on the severity and complexity of the issue.

---

# Scope

This policy applies to all components maintained within the PackVault repository, including:

* CLI commands
* Package caching logic
* Dependency management
* Package installation workflow
* Configuration handling
* Local cache management
* Build scripts
* GitHub Actions workflows

Third-party package managers and external services are outside the scope of this policy.

---

# Responsible Disclosure Guidelines

We kindly ask that you:

* Avoid public disclosure until a fix is available.
* Do not access, modify, or delete data belonging to others.
* Do not perform denial-of-service or destructive testing.
* Report vulnerabilities in good faith.
* Allow reasonable time for investigation and remediation before publishing findings.

---

# Security Best Practices

When contributing to PackVault:

* Never commit secrets or credentials.
* Review dependencies before adding them.
* Keep dependencies up to date.
* Validate user input where applicable.
* Follow secure coding practices.
* Report suspicious behavior immediately.

---

# Dependency Security

PackVault relies on open-source dependencies. Contributors are encouraged to:

* Regularly update dependencies.
* Review security advisories before upgrading packages.
* Use trusted packages from reputable maintainers.
* Avoid introducing unnecessary dependencies.

---

# Security Updates

Security fixes are released through the normal GitHub release process. Critical vulnerabilities may be patched and released independently of regular feature updates.

---

Thank you for helping keep **PackVault** secure and reliable for developers around the world.
