import { access, readFile, readdir } from "node:fs/promises";

const requiredManifestFields = [
  "id",
  "name",
  "version",
  "minAppVersion",
  "description",
  "author",
  "isDesktopOnly"
];

const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
const versions = JSON.parse(await readFile("versions.json", "utf8"));
const source = await readFile("main.ts", "utf8");
const compiled = await readFile("main.js", "utf8");
const packageJsonSource = await readFile("package.json", "utf8");
const packageLockSource = await readFile("package-lock.json", "utf8");
const buildConfig = await readFile("esbuild.config.mjs", "utf8");

for (const field of requiredManifestFields) {
  if (!(field in manifest) || manifest[field] === "") {
    throw new Error(`manifest.json is missing the required ${field} field`);
  }
}

if (!/^[a-z-]+$/.test(manifest.id) || manifest.id.endsWith("plugin") || manifest.id.includes("obsidian")) {
  throw new Error("manifest id does not satisfy Community Plugin Directory rules");
}

if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
  throw new Error("manifest version must be semantic version x.y.z");
}

if (versions[manifest.version] !== manifest.minAppVersion) {
  throw new Error("versions.json must map the current version to minAppVersion");
}

for (const file of ["main.js", "manifest.json", "README.md", "LICENSE", "versions.json"]) {
  await access(file);
}

try {
  const workflows = await readdir(".github/workflows", { recursive: true });
  if (workflows.length > 0) {
    throw new Error("GitHub Actions workflows must not be included");
  }
} catch (error) {
  if (error instanceof Error && error.message === "GitHub Actions workflows must not be included") {
    throw error;
  }
  if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) {
    throw error;
  }
}

if (packageJsonSource.includes('"builtin-modules"') || packageLockSource.includes('"builtin-modules"')) {
  throw new Error('replace the deprecated "builtin-modules" package with node:module');
}

if (!/import\s*\{\s*builtinModules\s*\}\s*from\s*["']node:module["']/.test(buildConfig)) {
  throw new Error("esbuild.config.mjs must use builtinModules from node:module");
}

const commandNames = [...source.matchAll(/this\.addCommand\(\{[\s\S]*?\bname:\s*["']([^"']+)["']/g)]
  .map((match) => match[1]);

if (commandNames.length === 0) {
  throw new Error("main.ts does not contain any statically verifiable command names");
}

for (const commandName of commandNames) {
  if (commandName.toLocaleLowerCase().includes(manifest.name.toLocaleLowerCase())) {
    throw new Error(`command name must not include the plugin name: ${commandName}`);
  }
}

if (!/override\s+getSettingDefinitions\s*\(\s*\)\s*:\s*SettingDefinitionItem\[\]/.test(source)) {
  throw new Error("PluginSettingTab must explicitly override getSettingDefinitions()");
}

if (/\bdisplay\s*\(\s*\)\s*:/.test(source)) {
  throw new Error("main.ts must not override the deprecated display() settings method");
}

if (/\.setWarning\s*\(/.test(source) || /\.setWarning\s*\(/.test(compiled)) {
  throw new Error("use setDestructive() instead of the deprecated setWarning() button API");
}

if (/\bdisplay\s*\(\s*\)\s*[{:]?/.test(compiled)) {
  throw new Error("compiled main.js must not contain the deprecated display() settings method");
}

if (!/getSettingDefinitions\s*\(\s*\)\s*\{/.test(compiled)) {
  throw new Error("compiled main.js does not contain getSettingDefinitions()");
}

console.log(`AutoTOC ${manifest.version} release files are valid.`);
