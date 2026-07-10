import { Project, SyntaxKind, TypeGuards, JSDocStructure, OptionalKind } from "ts-morph";

const project = new Project({
  tsConfigFilePath: "tsconfig.json",
});

const sourceFiles = project.getSourceFiles("src/**/*.ts");

function createDoc(text: string): OptionalKind<JSDocStructure> {
  return { description: text };
}

for (const sf of sourceFiles) {
  // Exclude node_modules and tests just in case
  if (sf.getFilePath().includes("node_modules") || sf.getFilePath().includes("tests")) {
    continue;
  }

  // Only add docs to exported declarations
  for (const node of sf.getExportedDeclarations()) {
    for (const declaration of node[1]) {
      if (declaration.isKind(SyntaxKind.ClassDeclaration)) {
        if (declaration.getJsDocs().length === 0) {
          declaration.addJsDoc(createDoc(`Represents the ${declaration.getName()} class.`));
        }

        // Add docs to constructors
        for (const ctor of declaration.getConstructors()) {
          if (ctor.getJsDocs().length === 0) {
            let docStr = "Creates a new instance.\n";
            for (const param of ctor.getParameters()) {
              docStr += `@param ${param.getName()} - The ${param.getName()} parameter.\n`;
            }
            ctor.addJsDoc(createDoc(docStr.trim()));
          }
        }

        // Add docs to public methods
        for (const method of declaration.getMethods()) {
          // If no scope is defined, it is public by default. If defined, check if public.
          const scope = method.getScope();
          if (scope !== "private" && scope !== "protected") {
            if (method.getJsDocs().length === 0) {
              let docStr = `Executes ${method.getName()} operation.\n`;
              for (const param of method.getParameters()) {
                docStr += `@param ${param.getName()} - The ${param.getName()} parameter.\n`;
              }
              const returnType = method.getReturnType().getText();
              if (returnType !== "void" && returnType !== "Promise<void>") {
                docStr += `@returns The ${method.getName()} result.\n`;
              }
              
              // Only add example to major public APIs in managers. Let's add a generic example.
              docStr += `@example\n\`\`\`ts\n// Example usage\nconst result = await instance.${method.getName()}();\n\`\`\``;
              
              method.addJsDoc(createDoc(docStr.trim()));
            }
          }
        }

        // Add docs to public properties
        for (const prop of declaration.getProperties()) {
          const scope = prop.getScope();
          if (scope !== "private" && scope !== "protected") {
            if (prop.getJsDocs().length === 0) {
              prop.addJsDoc(createDoc(`Property ${prop.getName()}`));
            }
          }
        }
      } 
      else if (declaration.isKind(SyntaxKind.InterfaceDeclaration)) {
        if (declaration.getJsDocs().length === 0) {
          declaration.addJsDoc(createDoc(`Interface for ${declaration.getName()}`));
        }
      }
      else if (declaration.isKind(SyntaxKind.FunctionDeclaration)) {
        if (declaration.getJsDocs().length === 0) {
          let docStr = `Function ${declaration.getName()}.\n`;
          for (const param of declaration.getParameters()) {
            docStr += `@param ${param.getName()} - The ${param.getName()} parameter.\n`;
          }
          declaration.addJsDoc(createDoc(docStr.trim()));
        }
      }
      else if (declaration.isKind(SyntaxKind.TypeAliasDeclaration)) {
        if (declaration.getJsDocs().length === 0) {
          declaration.addJsDoc(createDoc(`Type alias for ${declaration.getName()}`));
        }
      }
    }
  }
}

project.saveSync();
console.log("JSDocs added to all exported symbols!");
