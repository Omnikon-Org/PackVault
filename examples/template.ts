import { TemplateManager } from "../src/index.js";

async function scaffold() {
  const templates = new TemplateManager();
  
  console.log("Bootstrapping a new React project...");
  await templates.scaffold("react", "./my-offline-react-app");
  
  console.log("Project created in ./my-offline-react-app");
}

scaffold().catch(console.error);
