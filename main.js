var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => AutomaticTableOfContentsPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");

// toc.ts
var TOC_START = "<!-- automatic-toc:start -->";
var TOC_END = "<!-- automatic-toc:end -->";
function hasToc(markdown) {
  return markdown.split("\n").some((line) => line.trim() === TOC_START);
}
function hasNoTocProperty(markdown) {
  var _a;
  const lines = markdown.split("\n");
  if (((_a = lines[0]) == null ? void 0 : _a.trim()) !== "---") return false;
  const propertiesEnd = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (propertiesEnd < 0) return false;
  return lines.slice(1, propertiesEnd).some((line) => {
    const match = line.match(/^\s*["']?notoc["']?\s*:\s*([^#]*?)(?:\s+#.*)?$/i);
    if (!match) return false;
    return match[1].trim().replace(/^["']|["']$/g, "").toLowerCase() === "true";
  });
}
function ensureNoTocProperty(markdown) {
  var _a;
  const lines = markdown.split("\n");
  if (((_a = lines[0]) == null ? void 0 : _a.trim()) === "---") {
    const propertiesEnd = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
    if (propertiesEnd >= 0) {
      const propertyLine = lines.findIndex(
        (line, index) => index > 0 && index < propertiesEnd && /^\s*["']?notoc["']?\s*:/i.test(line)
      );
      if (propertyLine >= 0) {
        lines[propertyLine] = lines[propertyLine].replace(/^(\s*)["']?notoc["']?(\s*:)/i, "$1NoTOC$2");
        return lines.join("\n");
      }
      lines.splice(propertiesEnd, 0, "NoTOC: false");
      return lines.join("\n");
    }
  }
  return `---
NoTOC: false
---

${markdown}`;
}
function removeNoTocProperty(markdown) {
  var _a;
  const hadFinalNewline = markdown.endsWith("\n");
  const lines = markdown.split("\n");
  if (((_a = lines[0]) == null ? void 0 : _a.trim()) !== "---") return markdown;
  const propertiesEnd = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (propertiesEnd < 0) return markdown;
  const propertyLine = lines.findIndex(
    (line, index) => index > 0 && index < propertiesEnd && /^\s*["']?notoc["']?\s*:/i.test(line)
  );
  if (propertyLine < 0) return markdown;
  lines.splice(propertyLine, 1);
  const newPropertiesEnd = propertiesEnd - 1;
  const hasOtherProperties = lines.slice(1, newPropertiesEnd).some((line) => line.trim() !== "");
  if (!hasOtherProperties) {
    lines.splice(0, newPropertiesEnd + 1);
    while (lines[0] === "") lines.shift();
  }
  let result = lines.join("\n");
  if (hadFinalNewline && !result.endsWith("\n")) result += "\n";
  return result;
}
function tocRange(lines) {
  const start = lines.findIndex((line) => line.trim() === TOC_START);
  if (start < 0) return null;
  const end = lines.findIndex((line, index) => index >= start && line.trim() === TOC_END);
  return end < 0 ? { start, end: start } : { start, end };
}
function cleanHeading(raw) {
  return raw.replace(/\s+#+\s*$/, "").replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1").replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target, alias) => alias != null ? alias : target).replace(/[*_~`]/g, "").trim();
}
function extractHeadings(markdown) {
  var _a;
  const lines = markdown.split("\n");
  const range = tocRange(lines);
  const headings = [];
  let fence = null;
  let propertiesEnd = -1;
  if (((_a = lines[0]) == null ? void 0 : _a.trim()) === "---") {
    propertiesEnd = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  }
  for (let index = 0; index < lines.length; index += 1) {
    if (propertiesEnd >= 0 && index <= propertiesEnd) continue;
    if (range && index >= range.start && index <= range.end) continue;
    const line = lines[index];
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (fence === marker) fence = null;
      else if (fence === null) fence = marker;
      continue;
    }
    if (fence !== null) continue;
    const atx = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (atx) {
      const text = cleanHeading(atx[2]);
      if (text) headings.push({ level: atx[1].length, text, line: index });
      continue;
    }
    if (index + 1 < lines.length && line.trim() && !/^\s*>/.test(line)) {
      const setext = lines[index + 1].match(/^\s*(=+|-+)\s*$/);
      if (setext) {
        headings.push({ level: setext[1][0] === "=" ? 1 : 2, text: cleanHeading(line), line: index });
        index += 1;
      }
    }
  }
  return headings;
}
function escapeAlias(text) {
  return text.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\]/g, "\\]");
}
function buildToc(markdown, options) {
  if (hasNoTocProperty(markdown)) return "";
  const headings = extractHeadings(markdown).filter(
    (heading) => heading.level >= options.minLevel && heading.level <= options.maxLevel && (options.includeH1 || heading.level !== 1)
  );
  const title = options.title.trim();
  const titleLine = title ? `## ${title}` : "";
  if (headings.length === 0) return "";
  const baseLevel = Math.min(...headings.map((heading) => heading.level));
  const items = headings.map((heading) => {
    const label = escapeAlias(heading.text);
    const indent = "  ".repeat(Math.max(0, heading.level - baseLevel));
    return `${indent}- [[#${label}|${label}]]`;
  });
  return [TOC_START, titleLine, ...items, TOC_END].filter(Boolean).join("\n");
}
function insertionLine(lines, markdown, placement) {
  var _a;
  if (placement === "first-h1") {
    const firstH1 = extractHeadings(markdown).find((heading) => heading.level === 1);
    if (firstH1) {
      const underline = lines[firstH1.line + 1];
      return underline && /^\s*=+\s*$/.test(underline) ? firstH1.line + 2 : firstH1.line + 1;
    }
  }
  if (((_a = lines[0]) == null ? void 0 : _a.trim()) === "---") {
    const closing = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
    if (closing >= 0) return closing + 1;
  }
  return 0;
}
function updateToc(markdown, options) {
  var _a, _b;
  const controlledMarkdown = ensureNoTocProperty(markdown);
  const hadFinalNewline = controlledMarkdown.endsWith("\n");
  const lines = controlledMarkdown.split("\n");
  const range = tocRange(lines);
  const generated = buildToc(controlledMarkdown, options);
  if (!generated) return range ? removeToc(controlledMarkdown) : controlledMarkdown;
  const block = generated.split("\n");
  if (range) {
    lines.splice(range.start, range.end - range.start + 1, ...block);
  } else {
    const position = insertionLine(lines, controlledMarkdown, options.placement);
    const prefixBlank = position > 0 && ((_a = lines[position - 1]) == null ? void 0 : _a.trim()) !== "";
    const suffixBlank = ((_b = lines[position]) == null ? void 0 : _b.trim()) !== "";
    lines.splice(position, 0, ...prefixBlank ? [""] : [], ...block, ...suffixBlank ? [""] : []);
  }
  let result = lines.join("\n").replace(/\n{3,}/g, "\n\n");
  if (hadFinalNewline && !result.endsWith("\n")) result += "\n";
  return result;
}
function removeToc(markdown) {
  const hadFinalNewline = markdown.endsWith("\n");
  const lines = markdown.split("\n");
  const range = tocRange(lines);
  if (!range) return markdown;
  lines.splice(range.start, range.end - range.start + 1);
  let result = lines.join("\n").replace(/\n{3,}/g, "\n\n").replace(/^\n+/, "");
  if (hadFinalNewline && !result.endsWith("\n")) result += "\n";
  return result;
}

// main.ts
var DEFAULT_SETTINGS = {
  automatic: true,
  title: "Table of contents",
  minLevel: 1,
  maxLevel: 6,
  includeH1: false,
  placement: "first-h1",
  delayMs: 700
};
var AutomaticTableOfContentsPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this.timer = null;
    this.applying = false;
  }
  async onload() {
    await this.loadSettings();
    this.addCommand({
      id: "insert-or-update-table-of-contents",
      name: "Insert or update table of contents",
      editorCallback: (editor) => this.updateEditor(editor, true)
    });
    this.addCommand({
      id: "remove-table-of-contents",
      name: "Remove table of contents",
      editorCallback: (editor) => {
        const updated = removeToc(editor.getValue());
        if (updated !== editor.getValue()) {
          editor.setValue(updated);
          new import_obsidian.Notice("Table of contents removed");
        }
      }
    });
    this.addCommand({
      id: "regenerate-existing-tocs-in-all-notes",
      name: "Regenerate existing tables of contents in all notes",
      callback: () => this.confirmBulkUpdate(false)
    });
    this.addCommand({
      id: "generate-tocs-in-all-notes",
      name: "Generate or update tables of contents in all notes",
      callback: () => this.confirmBulkUpdate(true)
    });
    this.addCommand({
      id: "remove-tocs-from-all-notes",
      name: "Remove AutoTOC from all notes",
      callback: () => this.confirmRemoveAll()
    });
    this.registerEvent(this.app.workspace.on("editor-change", (editor, view) => {
      if (this.settings.automatic && view.file && !this.applying) this.scheduleUpdate(editor, view.file);
    }));
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => {
      if (!this.settings.automatic) return;
      const view = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
      if (view == null ? void 0 : view.file) this.scheduleUpdate(view.editor, view.file);
    }));
    this.addSettingTab(new AutomaticTocSettingTab(this.app, this));
  }
  onunload() {
    if (this.timer !== null) window.clearTimeout(this.timer);
  }
  scheduleUpdate(editor, file) {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      var _a;
      this.timer = null;
      const view = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
      if (((_a = view == null ? void 0 : view.file) == null ? void 0 : _a.path) === file.path && view.editor === editor) this.updateEditor(editor, false);
    }, this.settings.delayMs);
  }
  updateEditor(editor, showNotice) {
    const original = editor.getValue();
    const updated = updateToc(original, this.settings);
    if (updated === original) {
      if (showNotice) new import_obsidian.Notice("Table of contents is already up to date");
      return;
    }
    const cursor = editor.getCursor();
    this.applying = true;
    editor.setValue(updated);
    editor.setCursor({
      line: Math.min(cursor.line, editor.lastLine()),
      ch: cursor.ch
    });
    window.setTimeout(() => {
      this.applying = false;
    }, 0);
    if (showNotice) new import_obsidian.Notice("Table of contents updated");
  }
  confirmBulkUpdate(includeMissing) {
    new BulkUpdateConfirmModal(this.app, includeMissing, () => {
      void this.bulkUpdate(includeMissing);
    }).open();
  }
  confirmRemoveAll() {
    new RemoveAllConfirmModal(this.app, () => {
      void this.removeAllTocs(true);
    }).open();
  }
  async bulkUpdate(includeMissing) {
    const files = this.app.vault.getMarkdownFiles();
    let changed = 0;
    let skipped = 0;
    let failed = 0;
    new import_obsidian.Notice(`AutoTOC is processing ${files.length} notes\u2026`, 4e3);
    for (const file of files) {
      try {
        let fileChanged = false;
        await this.app.vault.process(file, (content) => {
          if (!includeMissing && !hasToc(content)) {
            skipped += 1;
            return content;
          }
          const updated = updateToc(content, this.settings);
          fileChanged = updated !== content;
          return updated;
        });
        if (fileChanged) changed += 1;
      } catch (error) {
        failed += 1;
        console.error(`AutoTOC could not update ${file.path}`, error);
      }
    }
    const unchanged = files.length - changed - skipped - failed;
    const failureText = failed > 0 ? ` ${failed} failed; details are in the developer console.` : "";
    new import_obsidian.Notice(`AutoTOC finished: ${changed} changed, ${unchanged} unchanged, ${skipped} skipped.${failureText}`, 1e4);
  }
  async removeAllTocs(showNotices) {
    const files = this.app.vault.getMarkdownFiles();
    let changed = 0;
    let failed = 0;
    if (showNotices) new import_obsidian.Notice(`AutoTOC is checking ${files.length} notes\u2026`, 4e3);
    for (const file of files) {
      try {
        let fileChanged = false;
        await this.app.vault.process(file, (content) => {
          const updated = removeNoTocProperty(removeToc(content));
          fileChanged = updated !== content;
          return updated;
        });
        if (fileChanged) changed += 1;
      } catch (error) {
        failed += 1;
        console.error(`AutoTOC could not clean ${file.path}`, error);
      }
    }
    if (showNotices) {
      const failureText = failed > 0 ? ` ${failed} failed; details are in the developer console.` : "";
      new import_obsidian.Notice(`AutoTOC removed its TOCs and NoTOC properties from ${changed} notes.${failureText}`, 1e4);
    }
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
var AutomaticTocSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian.Setting(containerEl).setName("Automatic updates").setDesc("Update the table of contents after headings change in the active note.").addToggle((toggle) => toggle.setValue(this.plugin.settings.automatic).onChange(async (value) => {
      this.plugin.settings.automatic = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Table title").setDesc("Leave blank to omit the title above the list.").addText((text) => text.setPlaceholder("Table of contents").setValue(this.plugin.settings.title).onChange(async (value) => {
      this.plugin.settings.title = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Include level 1 headings").addToggle((toggle) => toggle.setValue(this.plugin.settings.includeH1).onChange(async (value) => {
      this.plugin.settings.includeH1 = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Minimum heading level").addDropdown((dropdown) => {
      for (let level = 1; level <= 6; level += 1) dropdown.addOption(String(level), `H${level}`);
      dropdown.setValue(String(this.plugin.settings.minLevel)).onChange(async (value) => {
        this.plugin.settings.minLevel = Number(value);
        if (this.plugin.settings.maxLevel < this.plugin.settings.minLevel) this.plugin.settings.maxLevel = this.plugin.settings.minLevel;
        await this.plugin.saveSettings();
        this.display();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Maximum heading level").addDropdown((dropdown) => {
      for (let level = this.plugin.settings.minLevel; level <= 6; level += 1) dropdown.addOption(String(level), `H${level}`);
      dropdown.setValue(String(this.plugin.settings.maxLevel)).onChange(async (value) => {
        this.plugin.settings.maxLevel = Number(value);
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("TOC placement").addDropdown((dropdown) => dropdown.addOption("first-h1", "After the first H1").addOption("frontmatter", "After frontmatter").setValue(this.plugin.settings.placement).onChange(async (value) => {
      this.plugin.settings.placement = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Update delay").setDesc("Wait time after typing before updating, in milliseconds.").addText((text) => text.setValue(String(this.plugin.settings.delayMs)).onChange(async (value) => {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed >= 200 && parsed <= 1e4) {
        this.plugin.settings.delayMs = Math.round(parsed);
        await this.plugin.saveSettings();
      }
    }));
    new import_obsidian.Setting(containerEl).setName("Regenerate existing TOCs").setDesc("Update AutoTOC blocks that already exist across all Markdown notes.").addButton((button) => button.setButtonText("Regenerate all").onClick(() => this.plugin.confirmBulkUpdate(false)));
    new import_obsidian.Setting(containerEl).setName("Include TOC on all notes").setDesc("Generate or update AutoTOC in every Markdown note that has eligible headings.").addButton((button) => button.setButtonText("Generate on all notes").setWarning().onClick(() => this.plugin.confirmBulkUpdate(true)));
    new import_obsidian.Setting(containerEl).setName("Remove AutoTOC from all notes").setDesc("Delete every generated AutoTOC block and NoTOC property before uninstalling the plugin.").addButton((button) => button.setButtonText("Remove from all notes").setWarning().onClick(() => this.plugin.confirmRemoveAll()));
  }
};
var BulkUpdateConfirmModal = class extends import_obsidian.Modal {
  constructor(app, includeMissing, onConfirm) {
    super(app);
    this.includeMissing = includeMissing;
    this.onConfirm = onConfirm;
  }
  onOpen() {
    this.setTitle(this.includeMissing ? "Generate AutoTOC on all notes?" : "Regenerate existing AutoTOCs?");
    this.contentEl.createEl("p", {
      text: this.includeMissing ? "This will inspect every Markdown note and add or update a table of contents wherever eligible headings are found." : "This will update every existing AutoTOC block in the vault. Notes without an AutoTOC block will not be changed."
    });
    const controls = new import_obsidian.Setting(this.contentEl);
    controls.addButton((button) => button.setButtonText("Cancel").onClick(() => this.close()));
    controls.addButton((button) => button.setButtonText(this.includeMissing ? "Generate on all notes" : "Regenerate all").setCta().onClick(() => {
      this.close();
      this.onConfirm();
    }));
  }
  onClose() {
    this.contentEl.empty();
  }
};
var RemoveAllConfirmModal = class extends import_obsidian.Modal {
  constructor(app, onConfirm) {
    super(app);
    this.onConfirm = onConfirm;
  }
  onOpen() {
    this.setTitle("Remove AutoTOC from all notes?");
    this.contentEl.createEl("p", {
      text: "This will delete every block generated by AutoTOC and its NoTOC properties from all Markdown notes. Your headings and other note content will not be changed."
    });
    const controls = new import_obsidian.Setting(this.contentEl);
    controls.addButton((button) => button.setButtonText("Cancel").onClick(() => this.close()));
    controls.addButton((button) => button.setButtonText("Remove from all notes").setWarning().onClick(() => {
      this.close();
      this.onConfirm();
    }));
  }
  onClose() {
    this.contentEl.empty();
  }
};
