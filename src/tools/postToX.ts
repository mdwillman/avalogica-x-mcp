import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import type { PostToXArgs, PostToXResult } from "../types.js";
import { loadUserXCreds, ensureValidXCreds } from "../xCredsStore.js";
import { XClient } from "../xClient.js";

export const postToXTool = {
  definition: {
    name: "post_to_x",
    description:
      "Post a new update to X (Twitter) on behalf of the authenticated user. Assumes Dedalus Bridge has already authenticated the user and provides a trusted userId.",
    inputSchema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      properties: {
        userId: {
          type: "string",
          description:
            "Internal user id from Dedalus Bridge (already authenticated).",
        },
        blurb: {
          type: "string",
          description: "The text of the post to publish.",
        },
      },
      required: ["userId", "blurb"],
    },
  },

  handler: async (args: PostToXArgs): Promise<CallToolResult> => {
    const blurb = (args.blurb ?? "").trim();
    const userId = args.userId;

    if (!blurb) {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Missing or empty 'blurb'."
      );
    }

    try {
      // Load and ensure valid X credentials for this user
      let creds = await loadUserXCreds(userId);
      if (!creds) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          "X account not linked."
        );
      }

      creds = await ensureValidXCreds(userId, creds);

      const client = new XClient();
      const tweetId = await client.postTweet(creds.accessToken, blurb);

      const handle = creds.twitterHandle || creds.twitterUserId || "i";
      const tweetUrl = `https://twitter.com/${handle.replace(/^@/, "")}/status/${tweetId}`;

      console.log(
        `[avalogica-x-mcp] post_to_x – posted tweet for userId ${userId}: ${tweetUrl}`
      );

      const payload: PostToXResult = { ok: true, tweetUrl };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    } catch (err: any) {
      console.error("[avalogica-x-mcp] post_to_x error:", err);
      const msg = err?.message || String(err);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to post to X: ${msg}`
      );
    }
  },
};