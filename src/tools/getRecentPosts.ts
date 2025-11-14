import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import type { GetRecentPostsArgs, GetRecentPostsResult } from "../types.js";
import { loadUserXCreds, ensureValidXCreds } from "../xCredsStore.js";
import { XClient } from "../xClient.js";

export const getRecentPostsTool = {
  definition: {
    name: "get_recent_posts",
    description:
      "Fetch the authenticated user's most recent X posts (e.g., last 20–100).",
    inputSchema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      properties: {
        userId: {
          type: "string",
          description:
            "Internal user id from Dedalus Bridge (already authenticated).",
        },
        limit: {
          type: "number",
          default: 20,
          description: "Max number of posts to fetch (5–100). Default 20.",
        },
      },
      required: ["userId"],
    },
  },

  handler: async (args: GetRecentPostsArgs): Promise<CallToolResult> => {
    const rawLimit = args.limit ?? 20;
    const limit = Math.max(5, Math.min(rawLimit, 100));

    try {
      let creds = await loadUserXCreds(args.userId);
      if (!creds) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          "X account not linked."
        );
      }

      creds = await ensureValidXCreds(args.userId, creds);

      if (!creds.twitterUserId) {
        throw new McpError(
          ErrorCode.InternalError,
          "Missing twitterUserId in stored credentials."
        );
      }

      const client = new XClient();
      const posts = await client.getRecentPosts(
        creds.accessToken,
        creds.twitterUserId,
        limit
      );

      const payload: GetRecentPostsResult = {
        posts,
        twitterUserId: creds.twitterUserId,
        twitterHandle: creds.twitterHandle,
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    } catch (err: any) {
      console.error("[avalogica-x-mcp] get_recent_posts error:", err);
      const msg = err?.message || String(err);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to fetch recent posts: ${msg}`
      );
    }
  },
};