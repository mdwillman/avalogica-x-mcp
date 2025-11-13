# Contributing to Avalogica AI News MCP

Thank you for improving the Avalogica AI News MCP server! This project has two supported workflows for shipping new tools:

1. **Manual checklist** — Follow [docs/add-tool-manually.md](docs/add-tool-manually.md) for the step-by-step process. The checklist covers naming conventions, server registration, typing, configuration, tests, and release hygiene.
2. **Generator CLI** — Run `npm run new-tool -- <ToolName> "<Description>"` to scaffold a tool file, update registrations, and append type stubs. The CLI validates naming, keeps imports ESM-safe, and prints the next steps you must complete (prompt tuning, documentation, etc.). Use the `--dry-run` flag to inspect changes before writing.

After either approach, always:
- Update documentation and `.env.example` if you introduce new environment variables.
- Run `npm run build` and start the server locally (`npm run dev:stdio` or `npm run dev:http`) to verify registration.
- Ensure fingerprints stay in responses (`[served by avalogica-ai-news-mcp]`).
- Open a PR with a clear summary, test notes, and links to any newly added docs.
