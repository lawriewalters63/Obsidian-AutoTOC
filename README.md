# AutoTOC

AutoTOC creates and automatically updates a table of contents in the active Markdown note.

## Features

- Updates shortly after a heading is edited.
- Uses Obsidian heading links, so entries continue to work when a note is renamed.
- Supports ATX (`## Heading`) and Setext headings.
- Ignores headings inside fenced code blocks.
- Ignores all values inside the note's YAML Properties block.
- Creates an unchecked `NoTOC` checkbox Property and suppresses the TOC when it is checked.
- Lets you select the heading levels, placement, title, and update delay.
- Provides commands to insert/update or remove the TOC manually.
- Can regenerate existing TOCs across the vault or generate TOCs on all eligible notes.
- Can remove every generated AutoTOC block before the plugin is uninstalled.
- Works on desktop and mobile.

The plugin owns only text between these markers:

```markdown
<!-- automatic-toc:start -->
<!-- automatic-toc:end -->
```

Do not remove just one marker. Use the **Remove table of contents** command to remove the generated block safely.

## Install from the Community Plugin Directory

1. Open **Settings → Community plugins** in Obsidian.
2. Select **Browse** and search for **AutoTOC**.
3. Select **Install**, then **Enable**.

Until AutoTOC is accepted into the Community Plugin Directory, use the manual installation steps below.

## Manual installation

1. Extract the ZIP file.
2. Copy the `autotoc` folder into your vault's `.obsidian/plugins/` folder.
3. In Obsidian, open **Settings → Community plugins**.
4. Select **Reload plugins**, then enable **AutoTOC**.

The distributed folder must contain `manifest.json` and `main.js`. The TypeScript files and development files are included for reference but are not required by Obsidian.

## Use

Open a Markdown note containing headings. The TOC is inserted automatically after the first H1 by default. You can also open the command palette and run:

- **AutoTOC: Insert or update table of contents**
- **AutoTOC: Remove table of contents**
- **AutoTOC: Regenerate existing tables of contents in all notes**
- **AutoTOC: Generate or update tables of contents in all notes**
- **AutoTOC: Remove tables of contents from all notes**

Change behaviour under **Settings → AutoTOC**.

AutoTOC adds `NoTOC: false` to the note's Properties. Obsidian displays this Boolean value as an unchecked checkbox. Check `NoTOC` to prevent TOC generation for that note. If a generated TOC already exists, AutoTOC removes it while leaving the note's headings and other content unchanged.

The settings page also contains **Regenerate all** and **Generate on all notes** buttons. Vault-wide actions display a confirmation before changing any notes.

Before uninstalling, use **Remove AutoTOC from all notes** in the settings page or Command Palette. Obsidian does not provide plugins with a dependable uninstall hook, so this cleanup must be run before the plugin is removed.

## Privacy

AutoTOC works locally inside your vault. It does not collect telemetry, make network requests, or send note content to an external service.

## Compatibility

AutoTOC requires Obsidian 1.13.0 or later and supports desktop and mobile.

## Development

```bash
npm install
npm test
npm run build
npm run validate
```

## Licence

AutoTOC is released under the MIT License. See `LICENSE`.
