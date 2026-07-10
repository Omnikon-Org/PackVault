import path from "node:path";
import fs from "fs-extra";
import { fileURLToPath } from "node:url";
import { vaultPaths } from "../config/paths.js";

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../templates");

export class TemplateManager {
  async seedTemplates(): Promise<void> {
    if (!(await fs.pathExists(sourceRoot))) {
      return;
    }

    await fs.copy(sourceRoot, vaultPaths.templates, {
      overwrite: false,
      errorOnExist: false
    });
  }

  async create(templateName: string, projectName: string, destination: string = process.cwd()): Promise<string> {
    await this.seedTemplates();

    const templatePath = path.join(vaultPaths.templates, templateName);
    if (!(await fs.pathExists(templatePath))) {
      throw new Error(`Unknown template "${templateName}". Run packvault create to see available frameworks.`);
    }

    const target = path.join(destination, projectName);
    await fs.copy(templatePath, target, { overwrite: false, errorOnExist: true });
    await this.replaceTokens(target, projectName);
    return target;
  }

  private async replaceTokens(directory: string, projectName: string): Promise<void> {
    const entries = await fs.readdir(directory);

    for (const entry of entries) {
      const fullPath = path.join(directory, entry);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory()) {
        await this.replaceTokens(fullPath, projectName);
        continue;
      }

      const content = await fs.readFile(fullPath, "utf8");
      await fs.writeFile(fullPath, content.replaceAll("__PROJECT_NAME__", projectName));
    }
  }
}
