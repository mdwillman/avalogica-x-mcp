#!/usr/bin/env node
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

interface PlannedChange {
  path: string;
  type: "create" | "modify";
  oldContent: string;
  newContent: string;
}

interface CliOptions {
  dryRun: boolean;
  name: string;
  description: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function parseArgs(): CliOptions {
  const argv = process.argv.slice(2);
  let dryRun = false;
  const positional: string[] = [];

  for (const arg of argv) {
    if (arg === "--dry-run") {
      dryRun = true;
    } else {
      positional.push(arg);
    }
  }

  if (positional.length < 2) {
    throw new Error("Usage: tsx scripts/newTool.ts [--dry-run] <toolName> <description>");
  }

  const rawName = positional[0].trim();
  const description = positional.slice(1).join(" ").trim();

  if (!rawName) {
    throw new Error("Tool name is required.");
  }

  if (!description) {
    throw new Error("Tool description is required.");
  }

  return { dryRun, name: rawName, description };
}

function toSnakeCase(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Tool name cannot be empty.");
  }

  const withUnderscores = trimmed
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .replace(/__+/g, "_")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");

  const normalized = withUnderscores.startsWith("get_")
    ? withUnderscores
    : `get_${withUnderscores.replace(/^get_?/, "")}`;

  if (!/^get_[a-z0-9_]+$/.test(normalized)) {
    throw new Error(`Tool name must resolve to snake_case starting with get_: received "${normalized}".`);
  }

  return normalized;
}

function toCamelCase(snake: string): string {
  return snake.replace(/_([a-z0-9])/g, (_, letter: string) => letter.toUpperCase());
}

function toPascalCase(snake: string): string {
  const camel = toCamelCase(snake);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

function escapeForTemplate(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function createToolTemplate(options: {
  toolVarName: string;
  mcpName: string;
  argsType: string;
  resultType: string;
  description: string;
}): string {
  const { toolVarName, mcpName, argsType, resultType, description } = options;
  const escapedDescription = escapeForTemplate(description);

  return `import { CallToolResult, ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { NewsClient } from "../newsClient.js";
import type { ${argsType}, ${resultType} } from "../types.js";

const newsClient = new NewsClient();

export const ${toolVarName} = {
  definition: {
    name: "${mcpName}",
    description: "${escapedDescription}",
    inputSchema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Primary focus or filter for the request.",
        },
      },
      required: ["query"],
    },
  },

  handler: async (args: ${argsType}): Promise<CallToolResult> => {
    const { query } = args;

    if (typeof query !== "string" || !query.trim()) {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Invalid or missing arguments for ${mcpName}. Expected { query: string }."
      );
    }

    console.log("[AI News MCP] 🔍 Fingerprint: ${mcpName} handler invoked");

    try {
      const response = await newsClient.createResponse({
        model: "gpt-4.1-2025-04-14",
        tools: [{ type: "web_search_preview" }],
        input: \`TODO: replace with a domain-specific prompt for "\${query}"\`,
      });

      const summary =
        (typeof response.output_text === "string" && response.output_text.trim()) ||
        (typeof response.output === "string" && response.output.trim()) ||
        JSON.stringify(response, null, 2);

      const result: ${resultType} = {
        summary,
        rawResponse: response,
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2) + "\n\n[served by avalogica-ai-news-mcp]",
          },
        ],
      };
    } catch (error) {
      console.error("[AI News MCP] ${mcpName} handler error:", error);

      if (error instanceof McpError) {
        throw error;
      }

      const message =
        error instanceof Error
          ? error.message
          : "Unexpected error calling OpenAI Responses API.";

      throw new McpError(ErrorCode.InternalError, message);
    }
  },
};
`;
}

function createCaseBlock(options: {
  mcpName: string;
  toolVarName: string;
  argsType: string;
  indent: string;
}): string {
  const { mcpName, toolVarName, argsType, indent } = options;
  const innerIndent = `${indent}    `;
  return [
    `${indent}case "${mcpName}": {`,
    `${innerIndent}if (`,
    `${innerIndent}    !args ||`,
    `${innerIndent}    typeof args !== "object" ||`,
    `${innerIndent}    typeof (args as any).query !== "string" ||`,
    `${innerIndent}    !(args as any).query.trim()`,
    `${innerIndent}) {`,
    `${innerIndent}    throw new McpError(`,
    `${innerIndent}        ErrorCode.InvalidParams,`,
    `${innerIndent}        "Invalid or missing arguments for ${mcpName}. Expected { query: string }."`,
    `${innerIndent}    );`,
    `${innerIndent}}`,
    `${innerIndent}return await ${toolVarName}.handler(args as unknown as ${argsType});`,
    `${indent}}`,
  ].join("\n");
}

function ensureTrailingNewline(value: string): string {
  return value.endsWith("\n") ? value : `${value}\n`;
}

function createTypesBlock(options: { argsType: string; resultType: string; mcpName: string }): string {
  const { argsType, resultType, mcpName } = options;
  return [
    `// --- ${mcpName} tool types start ---`,
    `/**`,
    ` * Arguments for the ${mcpName} tool.`,
    ` */`,
    `export interface ${argsType} {`,
    "  /** Primary focus or filter for the update request. */",
    "  query: string;",
    "}",
    "",
    "/**",
    ` * Result payload returned by the ${mcpName} tool.`,
    " */",
    `export interface ${resultType} {`,
    "  /** Human-readable summary generated by the Responses API. */",
    "  summary: string;",
    "  /** Raw OpenAI Responses API payload for downstream parsing or debugging. */",
    "  rawResponse: unknown;",
    "}",
    `// --- ${mcpName} tool types end ---`,
  ].join("\n");
}

function createDiff(oldContent: string, newContent: string, filePath: string): string {
  if (oldContent === newContent) {
    return `No changes for ${filePath}`;
  }

  const oldLines = oldContent.length > 0 ? oldContent.split("\n") : [];
  const newLines = newContent.length > 0 ? newContent.split("\n") : [];
  const m = oldLines.length;
  const n = newLines.length;
  const lcs: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (oldLines[i] === newLines[j]) {
        lcs[i][j] = lcs[i + 1][j + 1] + 1;
      } else {
        lcs[i][j] = Math.max(lcs[i + 1][j], lcs[i][j + 1]);
      }
    }
  }

  const diffLines: string[] = [];
  let i = 0;
  let j = 0;

  while (i < m && j < n) {
    if (oldLines[i] === newLines[j]) {
      diffLines.push(` ${oldLines[i]}`);
      i += 1;
      j += 1;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      diffLines.push(`-${oldLines[i]}`);
      i += 1;
    } else {
      diffLines.push(`+${newLines[j]}`);
      j += 1;
    }
  }

  while (i < m) {
    diffLines.push(`-${oldLines[i]}`);
    i += 1;
  }

  while (j < n) {
    diffLines.push(`+${newLines[j]}`);
    j += 1;
  }

  return [`--- ${filePath}`, `+++ ${filePath}`, ...diffLines].join("\n");
}

async function main() {
  const { dryRun, name, description } = parseArgs();
  const mcpName = toSnakeCase(name);
  const camelName = toCamelCase(mcpName);
  const pascalName = toPascalCase(mcpName);
  const toolVarName = `${camelName}Tool`;
  const argsType = `${pascalName}Args`;
  const resultType = `${pascalName}Result`;

  const toolFilePath = path.join(repoRoot, "src", "tools", `${camelName}.ts`);
  const toolsIndexPath = path.join(repoRoot, "src", "tools", "index.ts");
  const serverPath = path.join(repoRoot, "src", "server.ts");
  const typesPath = path.join(repoRoot, "src", "types.ts");

  const changes: PlannedChange[] = [];

  try {
    await fs.access(toolFilePath);
    throw new Error(`Tool file already exists: ${path.relative(repoRoot, toolFilePath)}`);
  } catch (error: any) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  const toolTemplate = ensureTrailingNewline(
    createToolTemplate({ toolVarName, mcpName, argsType, resultType, description })
  );
  changes.push({ path: toolFilePath, type: "create", oldContent: "", newContent: toolTemplate });

  // Update src/tools/index.ts
  const toolsIndexContent = await fs.readFile(toolsIndexPath, "utf8");
  const exportLine = `export { ${toolVarName} } from "./${camelName}.js";`;
  if (!toolsIndexContent.includes(exportLine)) {
    const lines = toolsIndexContent
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0);
    lines.push(exportLine);
    const uniqueLines = Array.from(new Set(lines));
    uniqueLines.sort((a, b) => a.localeCompare(b));
    const updatedIndex = ensureTrailingNewline(uniqueLines.join("\n"));
    changes.push({
      path: toolsIndexPath,
      type: "modify",
      oldContent: toolsIndexContent,
      newContent: updatedIndex,
    });
  }

  // Update src/server.ts
  let serverContent = await fs.readFile(serverPath, "utf8");
  const originalServerContent = serverContent;

  // Import from tools/index.js
  const toolsImportRegex = /import \{([^}]+)\} from "\.\/tools\/index\.js";/;
  const importMatch = serverContent.match(toolsImportRegex);
  if (!importMatch) {
    throw new Error("Unable to locate tools import in src/server.ts");
  }

  const existingTools = importMatch[1]
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!existingTools.includes(toolVarName)) {
    existingTools.push(toolVarName);
    existingTools.sort((a, b) => a.localeCompare(b));
    const newImport = `import { ${existingTools.join(", ")} } from "./tools/index.js";`;
    serverContent = serverContent.replace(toolsImportRegex, newImport);
  }

  // Import args from types
  const typesImportRegex = /import \{([^}]+)\} from "\.\/types\.js";/;
  const typesImportMatch = serverContent.match(typesImportRegex);
  if (!typesImportMatch) {
    throw new Error("Unable to locate types import in src/server.ts");
  }

  const existingTypes = typesImportMatch[1]
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!existingTypes.includes(argsType)) {
    existingTypes.push(argsType);
    existingTypes.sort((a, b) => a.localeCompare(b));
    const newTypesImport = `import { ${existingTypes.join(", ")} } from "./types.js";`;
    serverContent = serverContent.replace(typesImportRegex, newTypesImport);
  }

  // Update tool definitions list occurrences
  const listRegex = /tools: \[([^\]]+)\],/g;
  serverContent = serverContent.replace(listRegex, (match, group) => {
    const entries = group
      .split(",")
      .map((part: string) => part.trim())
      .filter(Boolean);
    const definitionEntry = `${toolVarName}.definition`;
    if (!entries.includes(definitionEntry)) {
      entries.push(definitionEntry);
    }
    return `tools: [${entries.join(", ")}],`;
  });

  // Insert switch case blocks
  const switchMarker = "switch (name) {";
  const caseMarker = 'case "get_tech_update": {';
  let switchSearchIndex = 0;
  while (true) {
    const switchIndex = serverContent.indexOf(switchMarker, switchSearchIndex);
    if (switchIndex === -1) {
      break;
    }

    const caseIndex = serverContent.indexOf(caseMarker, switchIndex);
    if (caseIndex === -1) {
      switchSearchIndex = switchIndex + switchMarker.length;
      continue;
    }

    const remainder = serverContent.slice(caseIndex);
    const defaultMatch = remainder.match(/\n\s*default:/);
    if (!defaultMatch || defaultMatch.index === undefined) {
      break;
    }

    const newlineOffset = defaultMatch[0].lastIndexOf("\n");
    const indent = defaultMatch[0].slice(newlineOffset + 1, defaultMatch[0].lastIndexOf("default:"));
    const insertionPoint = caseIndex + defaultMatch.index + newlineOffset + 1;
    const defaultKeywordIndex = insertionPoint + indent.length;
    const caseBlock = createCaseBlock({ mcpName, toolVarName, argsType, indent });
    const segment = serverContent.slice(caseIndex, defaultKeywordIndex);
    let insertionLength = 0;
    if (!segment.includes(`case "${mcpName}":`)) {
      const insertion = `${caseBlock}\n\n`;
      insertionLength = insertion.length;
      serverContent =
        serverContent.slice(0, insertionPoint) +
        insertion +
        serverContent.slice(insertionPoint);
    }

    switchSearchIndex = defaultKeywordIndex + "default:".length + insertionLength;
  }

  changes.push({
    path: serverPath,
    type: "modify",
    oldContent: originalServerContent,
    newContent: serverContent,
  });

  // Update src/types.ts
  const typesContent = await fs.readFile(typesPath, "utf8");
  const marker = `// --- ${mcpName} tool types start ---`;
  if (!typesContent.includes(marker)) {
    const block = createTypesBlock({ argsType, resultType, mcpName });
    const updatedTypes = ensureTrailingNewline(`${typesContent.trimEnd()}\n\n${block}`);
    changes.push({
      path: typesPath,
      type: "modify",
      oldContent: typesContent,
      newContent: updatedTypes,
    });
  }

  if (dryRun) {
    console.log("Running in dry-run mode. Proposed changes:\n");
    for (const change of changes) {
      const relativePath = path.relative(repoRoot, change.path);
      const diff = createDiff(change.oldContent, change.newContent, relativePath);
      console.log(diff + "\n");
    }
    return;
  }

  for (const change of changes) {
    const relativePath = path.relative(repoRoot, change.path);
    if (change.type === "create") {
      await fs.mkdir(path.dirname(change.path), { recursive: true });
      await fs.writeFile(change.path, change.newContent, "utf8");
      console.log(`Created ${relativePath}`);
    } else {
      if (change.oldContent === change.newContent) {
        console.log(`No updates required for ${relativePath}`);
      } else {
        await fs.writeFile(change.path, change.newContent, "utf8");
        console.log(`Updated ${relativePath}`);
      }
    }
  }

  console.log("\nNext steps:");
  console.log(`1. Review ${path.relative(repoRoot, toolFilePath)} to customise the JSON schema, prompt, and result shape.`);
  console.log(`2. Adjust the generated interfaces in src/types.ts as needed.`);
  console.log("3. Document the new tool (README/docs) and surface any required environment variables in .env.example.");
  console.log("4. Run npm run build && npm run dev:stdio (or dev:http) to verify registration.");
  console.log("5. Set OPENAI_API_KEY before invoking the tool.");
}

main().catch((error) => {
  console.error("Error generating tool scaffold:", error);
  process.exitCode = 1;
});
