import { access, readFile } from "node:fs/promises";

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

console.log(`AutoTOC ${manifest.version} release files are valid.`);
