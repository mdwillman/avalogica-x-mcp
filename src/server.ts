import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

import {
  startLinkXAccountTool,
  linkXAccountTool,
  postToXTool,
  getRecentPostsTool,
  getFollowingTimelineTool,
  summarizePostHistoryTool,
} from "./tools/index.js";

import type {
  LinkXAccountArgs,
  PostToXArgs,
  GetRecentPostsArgs,
  GetFollowingTimelineArgs,
  SummarizePostHistoryArgs,
} from "./types.js";

export class AvalogicaXServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "avalogica-x-mcp",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupHandlers(): void {
    // List tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        startLinkXAccountTool.definition,
        linkXAccountTool.definition,
        postToXTool.definition,
        getRecentPostsTool.definition,
        getFollowingTimelineTool.definition,
        summarizePostHistoryTool.definition,
      ],
    }));

    // Call tools
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "start_link_x_account": {
          // This tool takes no arguments.
          return await startLinkXAccountTool.handler();
        }

        case "link_x_account": {
          if (
            !args ||
            typeof args !== "object" ||
            typeof (args as any).userId !== "string" ||
            typeof (args as any).code !== "string" ||
            typeof (args as any).codeVerifier !== "string" ||
            (
              (args as any).redirectUri !== undefined &&
              typeof (args as any).redirectUri !== "string"
            )
          ) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "Invalid or missing arguments for link_x_account."
            );
          }
          return await linkXAccountTool.handler(
            args as unknown as LinkXAccountArgs
          );
        }

        case "post_to_x": {
          if (
            !args ||
            typeof args !== "object" ||
            typeof (args as any).userId !== "string" ||
            typeof (args as any).blurb !== "string"
          ) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "Invalid or missing arguments for post_to_x."
            );
          }
          return await postToXTool.handler(args as unknown as PostToXArgs);
        }

        case "get_recent_posts": {
          if (
            !args ||
            typeof args !== "object" ||
            typeof (args as any).userId !== "string" ||
            ((args as any).limit !== undefined &&
              typeof (args as any).limit !== "number")
          ) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "Invalid or missing arguments for get_recent_posts."
            );
          }
          return await getRecentPostsTool.handler(
            args as unknown as GetRecentPostsArgs
          );
        }

        case "get_following_timeline": {
          if (
            !args ||
            typeof args !== "object" ||
            typeof (args as any).userId !== "string" ||
            ((args as any).limit !== undefined &&
              typeof (args as any).limit !== "number")
            // if you exposed sinceId/untilId in the schema, also validate them as strings here
          ) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "Invalid or missing arguments for get_following_timeline."
            );
          }
          return await getFollowingTimelineTool.handler(
            args as unknown as GetFollowingTimelineArgs
          );
        }

        case "summarize_post_history": {
          if (
            !args ||
            typeof args !== "object" ||
            typeof (args as any).userId !== "string"
          ) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "Invalid or missing arguments for summarize_post_history."
            );
          }
          return await summarizePostHistoryTool.handler(
            args as unknown as SummarizePostHistoryArgs
          );
        }

        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    });
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => console.error(error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  getServer(): Server {
    return this.server;
  }
}

// factory used by HTTP transport
export function createStandaloneServer(): Server {
  const instance = new AvalogicaXServer();
  return instance.getServer();
}