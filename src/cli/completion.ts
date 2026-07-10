import type { PackVaultDatabase } from "../db/database.js";
import { knownTemplates } from "../cli/createWizard.js";

/**
 * Function generateCompletion.
 * @param shell - The shell parameter.
 * @param database - The database parameter.
 */
export function generateCompletion(shell: string, database: PackVaultDatabase): string {
  const packages = [...new Set(database.listPackages().map((p) => p.name))];
  const bundles = database.listBundles().map((b) => b.name);
  const templates = knownTemplates();

  if (shell === "bash") return bashCompletion(packages, bundles, templates);
  if (shell === "zsh") return zshCompletion(packages, bundles, templates);
  if (shell === "fish") return fishCompletion(packages, bundles, templates);
  throw new Error(`Unsupported shell: ${shell}. Use bash, zsh, or fish.`);
}

function bashCompletion(packages: string[], bundles: string[], templates: string[]): string {
  return `# packvault bash completion
_packvault_completions() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  local cmd="\${COMP_WORDS[1]}"
  case "$cmd" in
    sync|install) COMPREPLY=($(compgen -W "${packages.join(" ")}" -- "$cur")) ;;
    bundle) COMPREPLY=($(compgen -W "${bundles.join(" ")}" -- "$cur")) ;;
    create) COMPREPLY=($(compgen -W "${templates.join(" ")}" -- "$cur")) ;;
    *) COMPREPLY=($(compgen -W "sync install create doctor bundle serve share connect search prune export import log audit policy diff schedule snapshot init completion discover classroom" -- "$cur")) ;;
  esac
}
complete -F _packvault_completions packvault
`;
}

function zshCompletion(packages: string[], bundles: string[], templates: string[]): string {
  return `#compdef packvault
_packvault() {
  local -a commands packages bundles templates
  commands=(sync install create doctor bundle serve share connect search prune export import log audit policy diff schedule snapshot init completion discover classroom)
  packages=(${packages.map((p) => `"${p}"`).join(" ")})
  bundles=(${bundles.map((b) => `"${b}"`).join(" ")})
  templates=(${templates.map((t) => `"${t}"`).join(" ")})
  _arguments -C "1:command:(\${commands})" "*:args:(\${packages})"
}
_packvault
`;
}

function fishCompletion(packages: string[], bundles: string[], templates: string[]): string {
  const cmds = "sync install create doctor bundle serve share connect search prune export import log audit policy diff schedule snapshot init completion discover classroom";
  return `complete -c packvault -f
complete -c packvault -n __fish_use_subcommand -a "${cmds}"
complete -c packvault -n "__fish_seen_subcommand_from sync install" -a "${packages.join(" ")}"
complete -c packvault -n "__fish_seen_subcommand_from bundle" -a "${bundles.join(" ")}"
complete -c packvault -n "__fish_seen_subcommand_from create" -a "${templates.join(" ")}"
`;
}
