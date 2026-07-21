# Changelog

## 1.0.4

- Revalidated command names against the Community Plugin Directory rule that omits the plugin name.
- Revalidated searchable settings using `getSettingDefinitions()` with no deprecated `display()` override.
- Revalidated destructive buttons using `setDestructive()` instead of `setWarning()`.
- Revalidated the native Node.js built-in module list and regular expressions against the reported warnings.

## 1.0.3

- Removed GitHub Actions workflow files.
- Updated the Community submission instructions for a manual GitHub release.

## 1.0.2

- Added searchable settings using Obsidian's declarative settings API.
- Updated destructive buttons to the current API.
- Simplified the vault-cleanup command name so Obsidian does not repeat the plugin name.
- Replaced the deprecated `builtin-modules` dependency with Node's built-in module list.
- Removed an unnecessary regular-expression escape.
- Raised the minimum Obsidian version to 1.13.0 for the declarative settings API.

## 1.0.1

- Updated the plugin release version.

## 1.0.0

Initial Community Plugin Directory release.

AutoTOC generates and maintains heading-based tables of contents, supports per-note `NoTOC` checkbox control, provides configurable heading and placement settings, and includes confirmed vault-wide generation, regeneration, and cleanup actions.
