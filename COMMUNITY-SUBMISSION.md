# Community Plugin Directory submission

AutoTOC's repository files and release assets meet the technical packaging requirements. Before submission, the repository owner must complete the GitHub-specific steps below.

1. Create a public GitHub repository and place the contents of this project at the repository root. In particular, `manifest.json`, `README.md`, `LICENSE`, and `versions.json` must be at the root.
2. Push the source and confirm the repository's default branch contains the compiled `main.js`.
3. Run `npm test`, `npm run build`, and `npm run validate` locally.
4. Commit the validated source and compiled `main.js`, then create and push the exact tag `1.0.4`. Do not prefix it with `v`.
5. On GitHub, create a release for tag `1.0.4` and attach `main.js` and `manifest.json` as separate release assets. This project intentionally contains no GitHub Actions workflows.
6. Test the release on every platform claimed in the Obsidian submission form. AutoTOC declares mobile support, so test Android and iOS as applicable as well as the available desktop platforms.
7. Fork `obsidianmd/obsidian-releases`, add an entry to `community-plugins.json` using the exact ID `autotoc`, the display name `AutoTOC`, the author `Lawrence Walters`, the same manifest description, and the public repository URL.
8. Open the pull request using Obsidian's current plugin-submission template. Confirm that the manifest in the repository and the manifest attached to release `1.0.4` are identical.

The repository URL and cross-platform test attestations cannot be completed inside the plugin package and must be supplied by the repository owner.
