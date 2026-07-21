import {
  App,
  Editor,
  MarkdownView,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  SettingDefinitionItem,
  TFile
} from "obsidian";
import { hasToc, removeNoTocProperty, removeToc, TocOptions, updateToc } from "./toc";

interface PluginSettings extends TocOptions {
  automatic: boolean;
  delayMs: number;
}

const DEFAULT_SETTINGS: PluginSettings = {
  automatic: true,
  title: "Table of contents",
  minLevel: 1,
  maxLevel: 6,
  includeH1: false,
  placement: "first-h1",
  delayMs: 700
};

export default class AutomaticTableOfContentsPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;
  private timer: number | null = null;
  private applying = false;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addCommand({
      id: "insert-or-update-table-of-contents",
      name: "Insert or update table of contents",
      editorCallback: (editor: Editor) => this.updateEditor(editor, true)
    });
    this.addCommand({
      id: "remove-table-of-contents",
      name: "Remove table of contents",
      editorCallback: (editor: Editor) => {
        const updated = removeToc(editor.getValue());
        if (updated !== editor.getValue()) {
          editor.setValue(updated);
          new Notice("Table of contents removed");
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
      name: "Remove tables of contents from all notes",
      callback: () => this.confirmRemoveAll()
    });

    this.registerEvent(this.app.workspace.on("editor-change", (editor: Editor, view: MarkdownView) => {
      if (this.settings.automatic && view.file && !this.applying) this.scheduleUpdate(editor, view.file);
    }));
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => {
      if (!this.settings.automatic) return;
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (view?.file) this.scheduleUpdate(view.editor, view.file);
    }));
    this.addSettingTab(new AutomaticTocSettingTab(this.app, this));
  }

  onunload(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
  }

  private scheduleUpdate(editor: Editor, file: TFile): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      this.timer = null;
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (view?.file?.path === file.path && view.editor === editor) this.updateEditor(editor, false);
    }, this.settings.delayMs);
  }

  private updateEditor(editor: Editor, showNotice: boolean): void {
    const original = editor.getValue();
    const updated = updateToc(original, this.settings);
    if (updated === original) {
      if (showNotice) new Notice("Table of contents is already up to date");
      return;
    }

    const cursor = editor.getCursor();
    this.applying = true;
    editor.setValue(updated);
    editor.setCursor({
      line: Math.min(cursor.line, editor.lastLine()),
      ch: cursor.ch
    });
    window.setTimeout(() => { this.applying = false; }, 0);
    if (showNotice) new Notice("Table of contents updated");
  }

  confirmBulkUpdate(includeMissing: boolean): void {
    new BulkUpdateConfirmModal(this.app, includeMissing, () => {
      void this.bulkUpdate(includeMissing);
    }).open();
  }

  confirmRemoveAll(): void {
    new RemoveAllConfirmModal(this.app, () => {
      void this.removeAllTocs(true);
    }).open();
  }

  private async bulkUpdate(includeMissing: boolean): Promise<void> {
    const files = this.app.vault.getMarkdownFiles();
    let changed = 0;
    let skipped = 0;
    let failed = 0;

    new Notice(`AutoTOC is processing ${files.length} notes…`, 4000);
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
    new Notice(`AutoTOC finished: ${changed} changed, ${unchanged} unchanged, ${skipped} skipped.${failureText}`, 10000);
  }

  private async removeAllTocs(showNotices: boolean): Promise<void> {
    const files = this.app.vault.getMarkdownFiles();
    let changed = 0;
    let failed = 0;

    if (showNotices) new Notice(`AutoTOC is checking ${files.length} notes…`, 4000);
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
      new Notice(`AutoTOC removed its TOCs and NoTOC properties from ${changed} notes.${failureText}`, 10000);
    }
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<PluginSettings>);
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}

class AutomaticTocSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly autoTocPlugin: AutomaticTableOfContentsPlugin) {
    super(app, autoTocPlugin);
  }

  override getSettingDefinitions(): SettingDefinitionItem[] {
    const headingOptions = Object.fromEntries(
      Array.from({ length: 6 }, (_, index) => [String(index + 1), `H${index + 1}`])
    );

    return [
      {
        name: "Automatic updates",
        desc: "Update the table of contents after headings change in the active note.",
        control: { type: "toggle", key: "automatic", defaultValue: DEFAULT_SETTINGS.automatic }
      },
      {
        name: "Table title",
        desc: "Leave blank to omit the title above the list.",
        control: { type: "text", key: "title", placeholder: "Table of contents", defaultValue: DEFAULT_SETTINGS.title }
      },
      {
        name: "Include level 1 headings",
        control: { type: "toggle", key: "includeH1", defaultValue: DEFAULT_SETTINGS.includeH1 }
      },
      {
        name: "Minimum heading level",
        control: { type: "dropdown", key: "minLevel", options: headingOptions, defaultValue: String(DEFAULT_SETTINGS.minLevel) }
      },
      {
        name: "Maximum heading level",
        control: { type: "dropdown", key: "maxLevel", options: headingOptions, defaultValue: String(DEFAULT_SETTINGS.maxLevel) }
      },
      {
        name: "TOC placement",
        control: {
          type: "dropdown",
          key: "placement",
          options: { "first-h1": "After the first H1", frontmatter: "After frontmatter" },
          defaultValue: DEFAULT_SETTINGS.placement
        }
      },
      {
        name: "Update delay",
        desc: "Wait time after typing before updating, in milliseconds.",
        control: {
          type: "number",
          key: "delayMs",
          min: 200,
          max: 10000,
          step: 100,
          defaultValue: DEFAULT_SETTINGS.delayMs,
          validate: (value) => value >= 200 && value <= 10000 ? undefined : "Enter a value from 200 to 10,000."
        }
      },
      {
        name: "Regenerate existing TOCs",
        desc: "Update AutoTOC blocks that already exist across all Markdown notes.",
        render: (setting) => {
          setting.addButton((button) => button
            .setButtonText("Regenerate all")
            .onClick(() => this.autoTocPlugin.confirmBulkUpdate(false)));
        }
      },
      {
        name: "Include TOC on all notes",
        desc: "Generate or update AutoTOC in every Markdown note that has eligible headings.",
        render: (setting) => {
          setting.addButton((button) => button
            .setButtonText("Generate on all notes")
            .setDestructive()
            .onClick(() => this.autoTocPlugin.confirmBulkUpdate(true)));
        }
      },
      {
        name: "Remove AutoTOC from all notes",
        desc: "Delete every generated AutoTOC block and NoTOC property before uninstalling the plugin.",
        render: (setting) => {
          setting.addButton((button) => button
            .setButtonText("Remove from all notes")
            .setDestructive()
            .onClick(() => this.autoTocPlugin.confirmRemoveAll()));
        }
      }
    ];
  }

  getControlValue(key: string): unknown {
    const value = this.autoTocPlugin.settings[key as keyof PluginSettings];
    return key === "minLevel" || key === "maxLevel" ? String(value) : value;
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    if (key === "minLevel" || key === "maxLevel") {
      this.autoTocPlugin.settings[key] = Number(value);
      if (this.autoTocPlugin.settings.maxLevel < this.autoTocPlugin.settings.minLevel) {
        if (key === "minLevel") this.autoTocPlugin.settings.maxLevel = this.autoTocPlugin.settings.minLevel;
        else this.autoTocPlugin.settings.minLevel = this.autoTocPlugin.settings.maxLevel;
      }
      await this.autoTocPlugin.saveSettings();
      this.update();
      return;
    }

    if (key === "automatic" || key === "includeH1") {
      this.autoTocPlugin.settings[key] = Boolean(value);
    } else if (key === "delayMs") {
      this.autoTocPlugin.settings.delayMs = Math.round(Number(value));
    } else if (key === "placement") {
      this.autoTocPlugin.settings.placement = value as PluginSettings["placement"];
    } else if (key === "title") {
      this.autoTocPlugin.settings.title = String(value);
    }
    await this.autoTocPlugin.saveSettings();
  }
}

class BulkUpdateConfirmModal extends Modal {
  constructor(app: App, private includeMissing: boolean, private onConfirm: () => void) {
    super(app);
  }

  onOpen(): void {
    this.setTitle(this.includeMissing ? "Generate AutoTOC on all notes?" : "Regenerate existing AutoTOCs?");
    this.contentEl.createEl("p", {
      text: this.includeMissing
        ? "This will inspect every Markdown note and add or update a table of contents wherever eligible headings are found."
        : "This will update every existing AutoTOC block in the vault. Notes without an AutoTOC block will not be changed."
    });

    const controls = new Setting(this.contentEl);
    controls.addButton((button) => button.setButtonText("Cancel").onClick(() => this.close()));
    controls.addButton((button) => button
      .setButtonText(this.includeMissing ? "Generate on all notes" : "Regenerate all")
      .setCta()
      .onClick(() => {
        this.close();
        this.onConfirm();
      }));
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

class RemoveAllConfirmModal extends Modal {
  constructor(app: App, private onConfirm: () => void) {
    super(app);
  }

  onOpen(): void {
    this.setTitle("Remove AutoTOC from all notes?");
    this.contentEl.createEl("p", {
      text: "This will delete every block generated by AutoTOC and its NoTOC properties from all Markdown notes. Your headings and other note content will not be changed."
    });

    const controls = new Setting(this.contentEl);
    controls.addButton((button) => button.setButtonText("Cancel").onClick(() => this.close()));
    controls.addButton((button) => button
      .setButtonText("Remove from all notes")
      .setDestructive()
      .setCta()
      .onClick(() => {
        this.close();
        this.onConfirm();
      }));
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
