# How to Add a New AI News MCP Tool (Manual Checklist)

Follow this checklist to add a new Avalogica AI News MCP tool without relying on automation. Each step matches the existing conventions used by `get_forecast` and `get_tech_update`.

1. **Choose the tool identity**
   - Pick a descriptive snake_case MCP name that starts with `get_` (for example `get_ai_startups`).
   - Define the purpose in one sentence and outline the JSON schema for inputs: required properties, optional fields, defaults, and descriptions.

2. **Create the tool module** (`src/tools/<YourTool>.ts`)
   - Use camelCase for the file base name (e.g., `getAiStartups.ts`).
   - Export a singleton `<toolVarName>` (e.g., `getAiStartupsTool`) shaped like the other tools:
     ```ts
     import { CallToolResult, ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
     import { NewsClient } from "../newsClient.js"; // swap if you use a different client
     import type { GetAiStartupsArgs, GetAiStartupsResult } from "../types.js";

     const newsClient = new NewsClient();

     export const getAiStartupsTool = {
       definition: {
         name: "get_ai_startups",
         description: "Get the latest AI startup funding updates.",
         inputSchema: { /* Draft-07 JSON schema describing arguments */ },
       },
       handler: async (args: GetAiStartupsArgs): Promise<CallToolResult> => {
         console.log("[AI News MCP] 🔍 Fingerprint: get_ai_startups handler invoked");

         // Validate arguments explicitly before hitting external services
         if (!args.query?.trim()) {
           throw new McpError(ErrorCode.InvalidParams, "Invalid or missing arguments for get_ai_startups. Expected { query: string }.");
         }

         try {
           const response = await newsClient.createResponse({
             model: "gpt-4.1-2025-04-14",
             tools: [{ type: "web_search_preview" }],
             input: "TODO: craft a domain-specific prompt",
           });

           const result: GetAiStartupsResult = { /* shape your output */ };

           return {
             content: [
               {
                 type: "text",
                 text: JSON.stringify(result, null, 2) + "\n\n[served by avalogica-ai-news-mcp]",
               },
             ],
           };
         } catch (error) {
           console.error("[AI News MCP] get_ai_startups handler error:", error);

           if (error instanceof McpError) {
             throw error;
           }

           const message = error instanceof Error ? error.message : "Unexpected error calling OpenAI Responses API.";
           throw new McpError(ErrorCode.InternalError, message);
         }
       },
     };
     ```

3. **Export the tool**
   - Add `export { getAiStartupsTool } from "./getAiStartups.js";` to `src/tools/index.ts` (keep alphabetical ordering).

4. **Register the tool in the server** (`src/server.ts`)
   - Extend the import list from `./tools/index.js` to include the new tool.
   - Add the definition to both `ListTools` handlers (class-based and standalone server).
   - Insert a new `case "get_ai_startups"` inside each `CallTool` switch. Validate the input object, throw `McpError(ErrorCode.InvalidParams, ...)` on misuse, and call your tool’s handler when validation succeeds.

5. **Define TypeScript types** (`src/types.ts`)
   - Append interfaces for `<ToolName>Args`, `<ToolName>Result`, and any supporting shapes.
   - Describe each field with comments so future contributors understand the schema.

6. **Surface configuration**
   - If your tool needs new environment variables or runtime options, expose them in `src/config.ts` and document them in `.env.example`.
   - Keep ESM imports with `.js` suffixes everywhere to avoid build-time resolution errors.

7. **Build & smoke test**
   - Run `npm run build` to emit the compiled server.
   - Launch STDIO locally with `npm run dev:stdio` or HTTP with `npm run dev:http`. Confirm the startup logs list your new tool.
   - For Dedalus or other MCP clients, send a sample `tools/call` request and verify the returned fingerprint: `[served by avalogica-ai-news-mcp]`.

8. **Document usage**
   - Update `README.md` (or a dedicated docs page) with sample requests, expected outputs, and any configuration notes.

9. **Version & release hygiene**
   - Bump the package version (patch) when shipping a new tool.
   - Commit your changes with a descriptive message and open a PR summarising the new capability and tests.

> Need a quicker path? Use `npm run new-tool` to scaffold the files, then follow the “Next steps” it prints to finish polishing prompts, schemas, and documentation.
