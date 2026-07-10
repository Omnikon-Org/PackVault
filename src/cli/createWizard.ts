import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

/** Interface for TemplateChoice */
export interface TemplateChoice {
  label: string;
  value: string;
}

interface FrameworkChoice {
  id: string;
  label: string;
  variants: TemplateChoice[];
}

const frameworks: FrameworkChoice[] = [
  {
    id: "react",
    label: "React",
    variants: [
      { label: "TypeScript + Vite", value: "react-vite" },
      { label: "JavaScript + Vite", value: "react-vite-js" }
    ]
  },
  {
    id: "vue",
    label: "Vue",
    variants: [
      { label: "TypeScript + Vite", value: "vue-vite" },
      { label: "JavaScript + Vite", value: "vue-vite-js" }
    ]
  },
  {
    id: "svelte",
    label: "Svelte",
    variants: [
      { label: "TypeScript + Vite", value: "svelte-vite" },
      { label: "JavaScript + Vite", value: "svelte-vite-js" }
    ]
  },
  {
    id: "solid",
    label: "Solid",
    variants: [
      { label: "TypeScript + Vite", value: "solid-vite" },
      { label: "JavaScript + Vite", value: "solid-vite-js" }
    ]
  },
  {
    id: "preact",
    label: "Preact",
    variants: [
      { label: "TypeScript + Vite", value: "preact-vite" },
      { label: "JavaScript + Vite", value: "preact-vite-js" }
    ]
  },
  {
    id: "qwik",
    label: "Qwik",
    variants: [{ label: "TypeScript", value: "qwik" }]
  },
  {
    id: "angular",
    label: "Angular",
    variants: [{ label: "TypeScript", value: "angular" }]
  },
  {
    id: "next",
    label: "Next.js",
    variants: [{ label: "TypeScript", value: "nextjs" }]
  },
  {
    id: "nuxt",
    label: "Nuxt",
    variants: [{ label: "TypeScript", value: "nuxt" }]
  },
  {
    id: "sveltekit",
    label: "SvelteKit",
    variants: [{ label: "TypeScript", value: "sveltekit" }]
  },
  {
    id: "astro",
    label: "Astro",
    variants: [{ label: "TypeScript", value: "astro" }]
  },
  {
    id: "remix",
    label: "Remix",
    variants: [{ label: "TypeScript", value: "remix" }]
  },
  {
    id: "express",
    label: "Express API",
    variants: [{ label: "TypeScript", value: "express-api" }]
  },
  {
    id: "fastify",
    label: "Fastify API",
    variants: [{ label: "TypeScript", value: "fastify-api" }]
  },
  {
    id: "nest",
    label: "NestJS API",
    variants: [{ label: "TypeScript", value: "nest-api" }]
  },
  {
    id: "node",
    label: "Node.js",
    variants: [{ label: "TypeScript", value: "node-ts" }]
  }
];

/** Interface for CreateWizardResult */
export interface CreateWizardResult {
  projectName: string;
  templateName: string;
}

/**
 * Function runCreateWizard.
 * @param defaultProjectName - The defaultProjectName parameter.
 * @param preferredFrameworkId - The preferredFrameworkId parameter.
 */
export async function runCreateWizard(
  defaultProjectName?: string,
  preferredFrameworkId?: string
): Promise<CreateWizardResult> {
  if (!process.stdin.isTTY) {
    throw new Error("Interactive create requires a terminal. Use packvault create <template> <project-name> instead.");
  }

  const reader = readline.createInterface({ input, output });

  try {
    console.log("PackVault offline project creator");
    console.log("");

    const projectName = await promptText(reader, "Project name", defaultProjectName ?? "my-packvault-app");
    const framework = findFramework(preferredFrameworkId)
      ?? await promptSelect(reader, "Select a framework", frameworks);
    const variant = framework.variants.length === 1
      ? framework.variants[0]
      : await promptSelect(reader, "Select a variant", framework.variants);

    return {
      projectName,
      templateName: variant.value
    };
  } finally {
    reader.close();
  }
}

/**
 * Function isKnownFramework.
 * @param value - The value parameter.
 */
export function isKnownFramework(value: string): boolean {
  return Boolean(findFramework(value));
}

/**
 * Function isKnownTemplate.
 * @param value - The value parameter.
 */
export function isKnownTemplate(value: string): boolean {
  return knownTemplates().includes(value);
}

/**
 * Function normalizeTemplateName.
 * @param value - The value parameter.
 */
export function normalizeTemplateName(value: string): string {
  return value === "react-app" ? "react-vite" : value;
}

/** Function knownTemplates. */
export function knownTemplates(): string[] {
  return [
    "react-vite",
    "react-vite-js",
    "react-app",
    "vue-vite",
    "vue-vite-js",
    "svelte-vite",
    "svelte-vite-js",
    "solid-vite",
    "solid-vite-js",
    "preact-vite",
    "preact-vite-js",
    "qwik",
    "angular",
    "nextjs",
    "nuxt",
    "sveltekit",
    "astro",
    "remix",
    "express-api",
    "fastify-api",
    "nest-api",
    "node-ts"
  ];
}

function findFramework(value?: string): FrameworkChoice | undefined {
  if (!value) {
    return undefined;
  }

  return frameworks.find((framework) => framework.id === value || framework.label.toLowerCase() === value);
}

async function promptText(
  reader: readline.Interface,
  label: string,
  defaultValue: string
): Promise<string> {
  const answer = await reader.question(`${label} (${defaultValue}): `);
  return answer.trim() || defaultValue;
}

async function promptSelect<T extends { label: string }>(
  reader: readline.Interface,
  label: string,
  choices: T[]
): Promise<T> {
  console.log(label);
  choices.forEach((choice, index) => {
    console.log(`  ${index + 1}. ${choice.label}`);
  });

  while (true) {
    const answer = await reader.question("Choose a number: ");
    const index = Number(answer.trim()) - 1;

    if (Number.isInteger(index) && choices[index]) {
      return choices[index];
    }

    console.log(`Please choose a number between 1 and ${choices.length}.`);
  }
}
