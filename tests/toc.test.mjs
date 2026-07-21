import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";

await build({ entryPoints: ["toc.ts"], bundle: true, platform: "node", format: "esm", outfile: "/tmp/automatic-toc-test.mjs" });
const { ensureNoTocProperty, extractHeadings, hasNoTocProperty, hasToc, removeNoTocProperty, removeToc, updateToc } = await import("file:///tmp/automatic-toc-test.mjs?test=1");
const options = { title: "Contents", minLevel: 1, maxLevel: 3, includeH1: false, placement: "first-h1" };

test("extracts ATX and setext headings but ignores fenced code", () => {
  const input = "# Title\n\n## One\n\n```md\n## Not a heading\n```\n\nTwo\n---\n";
  assert.deepEqual(extractHeadings(input).map(({ level, text }) => ({ level, text })), [
    { level: 1, text: "Title" }, { level: 2, text: "One" }, { level: 2, text: "Two" }
  ]);
});

test("inserts after first H1 and creates nested Obsidian heading links", () => {
  const output = updateToc("# Title\n\n## First\n\n### Child\n", options);
  assert.match(output, /# Title\n\n<!-- automatic-toc:start -->/);
  assert.match(output, /- \[\[#First\|First\]\]\n  - \[\[#Child\|Child\]\]/);
});

test("indents each additional heading level", () => {
  const output = updateToc("# Title\n\n## Parent\n\n### Child\n\n#### Grandchild\n", { ...options, maxLevel: 4 });
  assert.match(output, /- \[\[#Parent\|Parent\]\]\n  - \[\[#Child\|Child\]\]\n    - \[\[#Grandchild\|Grandchild\]\]/);
});

test("updates one marked block without duplicating it", () => {
  const once = updateToc("# Title\n\n## First\n", options);
  const twice = updateToc(once.replace("## First", "## Renamed"), options);
  assert.equal((twice.match(/automatic-toc:start/g) ?? []).length, 1);
  assert.match(twice, /#Renamed\|Renamed/);
  assert.doesNotMatch(twice, /#First\|First/);
});

test("removes the generated block", () => {
  const input = updateToc("# Title\n\n## First\n", options);
  assert.equal(removeToc(input), "---\nNoTOC: false\n---\n\n# Title\n\n## First\n");
});

test("shows nothing when there are no eligible headings", () => {
  const plainNote = "This note has no headings.\n";
  assert.equal(updateToc(plainNote, options), "---\nNoTOC: false\n---\n\nThis note has no headings.\n");

  const existing = updateToc("# Title\n\n## First\n", options);
  assert.equal(updateToc(existing.replace("## First", "Plain text"), options), "---\nNoTOC: false\n---\n\n# Title\n\nPlain text\n");
});

test("detects an existing generated TOC", () => {
  const generated = updateToc("# Title\n\n## First\n", options);
  assert.equal(hasToc(generated), true);
  assert.equal(hasToc("# Title\n"), false);
});

test("ignores headings and values inside Properties", () => {
  const input = "---\ntitle: '# Property title'\nsummary: |\n  # Property heading\ntags:\n  - '#tag'\n---\n# Note title\n\n## Included\n";
  assert.deepEqual(extractHeadings(input).map(({ level, text }) => ({ level, text })), [
    { level: 1, text: "Note title" },
    { level: 2, text: "Included" }
  ]);
  const output = updateToc(input, options);
  const generatedBlock = output.match(/<!-- automatic-toc:start -->([\s\S]*?)<!-- automatic-toc:end -->/)?.[1] ?? "";
  assert.match(generatedBlock, /#Included\|Included/);
  assert.doesNotMatch(generatedBlock, /Property heading|Property title|#tag/);
});

test("creates an unchecked NoTOC checkbox property", () => {
  const input = "# Title\n\n## Section\n";
  const output = updateToc(input, options);
  assert.match(output, /^---\nNoTOC: false\n---/);
  assert.equal(hasNoTocProperty(output), false);
  assert.equal(hasToc(output), true);
});

test("suppresses the TOC when the NoTOC checkbox is checked", () => {
  const input = "---\nNoTOC: true\n---\n# Title\n\n## Section\n";
  assert.equal(hasNoTocProperty(input), true);
  assert.equal(updateToc(input, options), input);
});

test("checking NoTOC removes an existing generated TOC", () => {
  const original = "---\nNoTOC: false\n---\n# Title\n\n## Section\n";
  const generated = updateToc(original, options);
  const suppressed = generated.replace("NoTOC: false", "NoTOC: true");
  const output = updateToc(suppressed, options);
  assert.equal(hasNoTocProperty(suppressed), true);
  assert.equal(hasToc(output), false);
  assert.match(output, /## Section/);
});

test("NoTOC used in another property does not suppress generation", () => {
  const input = "---\ntags:\n  - NoTOC\n---\n# Title\n\n## Section\n";
  const output = updateToc(input, options);
  assert.equal(hasNoTocProperty(output), false);
  assert.equal(hasToc(output), true);
  assert.match(output, /NoTOC: false/);
});

test("cleanup removes the plugin-created property", () => {
  const input = ensureNoTocProperty("# Title\n");
  assert.equal(removeNoTocProperty(input), "# Title\n");
});
