# Community Plugin Directory submission

AutoTOC's repository files and release assets meet the technical packaging requirements. Before submission, the repository owner must complete the GitHub-specific steps below.

1. Create a public GitHub repository and place the contents of this project at the repository root. In particular, `manifest.json`, `README.md`, `LICENSE`, and `versions.json` must be at the root.
2. Push the source and confirm the repository's default branch contains the compiled `main.js`.
3. Create and push the exact tag `1.0.0`. Do not prefix it with `v`. The included release workflow will run the tests, build the plugin, validate the files, and create a GitHub release whose individually attached assets are `main.js` and `manifest.json`.
4. Test the release on every platform claimed in the Obsidian submission form. AutoTOC declares mobile support, so test Android and iOS as applicable as well as the available desktop platforms.
5. Fork `obsidianmd/obsidian-releases`, add an entry to `community-plugins.json` using the exact ID `autotoc`, the display name `AutoTOC`, the author `Lawrence Walters`, the same manifest description, and the public repository URL.
6. Open the pull request using Obsidian's current plugin-submission template. Confirm that the manifest in the repository and the manifest attached to release `1.0.0` are identical.

The repository URL and cross-platform test attestations cannot be completed inside the plugin package and must be supplied by the repository owner.
