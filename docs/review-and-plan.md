# Avalogica AI News MCP — Architecture Review

## Server bootstrap & transports
- **Entry point**: `src/index.ts` loads environment variables via `dotenv`, reads CLI flags, and chooses between STDIO and HTTP transports before bootstrapping the MCP server instance. `createStandaloneServer()` is invoked for STDIO sessions while HTTP mode delegates to `startHttpTransport` with configuration derived from `src/config.ts`. 
- **Configuration**: `loadConfig()` in `src/config.ts` exposes weather and OpenAI API keys, environment mode, and HTTP port defaults. The CLI parser in `src/cli.ts` understands `--stdio` and `--port`, keeping the runtime options minimal and explicit.
- **Transport adapters**: `src/transport/stdio.ts` wraps the MCP SDK `StdioServerTransport` for interactive runs, while `src/transport/http.ts` implements a session-aware HTTP server built on `StreamableHTTPServerTransport`. HTTP requests under `/mcp` spawn isolated MCP sessions backed by `createStandaloneServer()`, and `/health` exposes a JSON readiness probe. Transports log session lifecycle events and surface host binding differences between production and development runs.

## Tool registration flow
- **Server factory**: `src/server.ts` exports both the `AiNewsServer` class (used for long-lived processes) and `createStandaloneServer()` (used per HTTP session). Each server instance registers request handlers for `ListToolsRequestSchema` and `CallToolRequestSchema` from the MCP SDK.
- **Registration pattern**:
  - `ListTools` returns the array of tool definitions imported from `src/tools/index.ts` (`getForecastTool.definition`, `getTechUpdateTool.definition`).
  - `CallTool` dispatches on the MCP tool name string with explicit argument validation. Invalid inputs raise `McpError` with `ErrorCode.InvalidParams`, and unknown tools raise `ErrorCode.MethodNotFound`.
  - Both server variants duplicate the same switch statement today; future tooling should keep these blocks in sync or centralise them when adding new tools.
- **Fingerprints & logging**: Each tool handler logs a fingerprinted message before hitting external services. Returned text payloads include the required fingerprints (`[served by avalogica-weather-mcp]` for weather, `[served by avalogica-ai-news-mcp]` for AI news) so downstream clients can confirm provenance.

## Tool design conventions
- **Module layout**: Tool modules live under `src/tools/` and export a singleton `<toolName>Tool` object with `definition` metadata and an async `handler` returning a `CallToolResult`.
- **JSON Schema**: Each tool advertises its own Draft-07 JSON schema describing accepted arguments. Required fields and defaults are declared in the schema instead of the handler.
- **Argument validation**: Even with schemas, `server.ts` performs runtime validation and throws `McpError` instances with descriptive guidance. `get_tech_update` additionally validates the topic keyword against an internal registry before hitting OpenAI.
- **Response shaping**: Handlers return structured JSON (serialized as pretty-printed text) or formatted text along with the mandatory fingerprint tag. Weather responses set `isError` if upstream calls fail; AI news responses raise `McpError(ErrorCode.InternalError, ...)` so the MCP transport propagates proper error envelopes.
- **Error reporting**: `McpError` and `ErrorCode` are the canonical error types. Unexpected exceptions are logged, wrapped, and re-thrown as `McpError` with `InternalError` so clients receive consistent failure structures.

## OpenAI Responses integration
- **Client abstraction**: `src/newsClient.ts` implements a lightweight wrapper around `https://api.openai.com/v1/responses`. It enforces the presence of `OPENAI_API_KEY`, forwards request payloads, and verifies JSON responses.
- **Tool usage**: `getTechUpdateTool` in `src/tools/techUpdate.ts` calls `newsClient.createResponse(...)` with `model: "gpt-4.1-2025-04-14"` and enables web search via `tools: [{ type: "web_search_preview" }]`. The handler normalises the topic, constructs a domain-specific prompt, extracts textual output (with recursive fallbacks), and derives citation metadata from tool outputs.
- **Environment variables**: `OPENAI_API_KEY` powers the OpenAI client; `WEATHER_API_KEY` is optional today but plumbed through the configuration layer for future expansion. Missing keys trigger clear exceptions before any HTTP request is attempted.

## Naming, schema, and fingerprint conventions
- Tool names follow the `get_<topic>` snake_case convention exposed to MCP clients. The corresponding module exports use camelCase (`getTechUpdateTool`) and keep the trailing `Tool` suffix for clarity.
- Logging prefixes use `[AI News MCP]` (or `[Weather MCP]`) along with emoji fingerprints to aid Dedalus log parsing.
- Structured responses returned to clients are JSON strings with two-space indentation plus a blank line before the fingerprint tag.
- Error messages specify the expected argument shape to help client developers correct payloads quickly.
- ESM imports inside the source tree always include the `.js` extension so that compiled output preserves valid NodeNext module specifiers.

## Risks & pitfalls to watch
- **Duplicated routing logic**: `AiNewsServer` and `createStandaloneServer` duplicate the same switch statements. Any new tool must update both blocks to avoid HTTP/STDIO divergence.
- **ESM path suffixes**: Forgetting the `.js` suffix in relative imports causes runtime failures after compilation because the emitted JS retains those paths verbatim.
- **Server identity**: STDIO and HTTP servers currently advertise different `name` strings (`avalogica-ai-news` vs. `avalogica-ai-news-discovery`). Tool lists remain the same, but clients relying on `ListTools` metadata should treat them consistently when adding new tools.
- **Error consistency**: Weather tool handlers return `isError: true` rather than throwing `McpError`, so client experiences differ between tools. New implementations should pick one approach (preferably `McpError`) and document it to avoid mixed conventions.
- **Env propagation**: `loadConfig()` reads `OPENAI_API_KEY`, but HTTP sessions instantiate fresh servers without reusing configuration objects. Any future per-request secrets must be passed explicitly when `createStandaloneServer()` is called.
