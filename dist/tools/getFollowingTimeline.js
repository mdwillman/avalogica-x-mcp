import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { loadUserXCreds, ensureValidXCreds } from "../xCredsStore.js";
import { XClient } from "../xClient.js";
export const getFollowingTimelineTool = {
    definition: {
        name: "get_following_timeline",
        description: "Fetch the authenticated user's reverse-chronological home timeline on X (i.e., the 'Following' feed).",
        inputSchema: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
                userId: {
                    type: "string",
                    description: "Internal user id from Dedalus Bridge (already authenticated).",
                },
                limit: {
                    type: "number",
                    default: 50,
                    description: "Max number of posts to fetch from the Following timeline (5–100). Default 50.",
                },
                sinceId: {
                    type: "string",
                    description: "Only return posts more recent than this post ID (for incremental refresh).",
                },
                untilId: {
                    type: "string",
                    description: "Only return posts at or older than this post ID (for paging backwards).",
                },
            },
            required: ["userId"],
            additionalProperties: false,
        },
    },
    handler: async (args) => {
        const rawLimit = args.limit ?? 50;
        const limit = Math.max(5, Math.min(rawLimit, 100));
        try {
            let creds = await loadUserXCreds(args.userId);
            if (!creds) {
                throw new McpError(ErrorCode.InvalidRequest, "X account not linked.");
            }
            creds = await ensureValidXCreds(args.userId, creds);
            if (!creds.twitterUserId) {
                throw new McpError(ErrorCode.InternalError, "Missing twitterUserId in stored credentials.");
            }
            const client = new XClient();
            const { posts, nextToken, prevToken } = await client.getFollowingTimeline(creds.accessToken, creds.twitterUserId, {
                limit,
                sinceId: args.sinceId,
                untilId: args.untilId,
            });
            const payload = {
                posts,
                twitterUserId: creds.twitterUserId,
                twitterHandle: creds.twitterHandle,
                paging: {
                    nextToken: nextToken ?? null,
                    prevToken: prevToken ?? null,
                },
            };
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(payload, null, 2),
                    },
                ],
            };
        }
        catch (err) {
            console.error("[avalogica-x-mcp] get_following_timeline error:", err);
            const msg = err?.message || String(err);
            throw new McpError(ErrorCode.InternalError, `Failed to fetch Following timeline: ${msg}`);
        }
    },
};
