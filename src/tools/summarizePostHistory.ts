import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import type {
  SummarizePostHistoryArgs,
  SummarizePostHistoryResult,
  PostSummaryFocus,
} from "../types.js";
import { loadUserXCreds, ensureValidXCreds } from "../xCredsStore.js";
import { XClient } from "../xClient.js";
import { OpenAIResponsesClient } from "../openaiResponsesClient.js";

const openai = new OpenAIResponsesClient();

function normalizeFocus(focus?: PostSummaryFocus): PostSummaryFocus {
  if (!focus) return "all";
  if (focus === "tone" || focus === "topics" || focus === "interests") return focus;
  return "all";
}

export const summarizePostHistoryTool = {
  definition: {
    name: "summarize_post_history",
    description:
      "Analyze a user's recent X posts to summarize tone, topics, and key interests.",
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
          default: 50,
          description:
            "Number of recent posts to analyze (10–100). Default 50.",
        },
        focus: {
          type: "string",
          enum: ["all", "tone", "topics", "interests"],
          description:
            "Optional focus area: 'tone', 'topics', 'interests', or 'all'. Default 'all'.",
        },
      },
      required: ["userId"],
    },
  },

  handler: async (args: SummarizePostHistoryArgs): Promise<CallToolResult> => {
    const focus = normalizeFocus(args.focus);
    const limit = Math.max(10, Math.min(args.limit ?? 50, 100));

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

      const xClient = new XClient();
      const posts = await xClient.getRecentPosts(
        creds.accessToken,
        creds.twitterUserId,
        limit
      );

      if (!posts.length) {
        throw new McpError(
          ErrorCode.InternalError,
          "No posts available to summarize."
        );
      }

      const corpus = posts
        .map((p) => `[${p.createdAt}] ${p.text}`)
        .join("\n");

      const systemPrompt = `
You are an expert social media strategist analyzing a user's X (Twitter) history.

Given a set of recent posts, provide:
- ToneSummary: How this account tends to sound (e.g., playful, technical, serious, marketing-heavy).
- TopicSummary: Main themes, recurring topics, and any niche areas.
- InterestSummary: Apparent interests or priorities of the account owner.
- SuggestionsForBranding: Practical advice for future posts to maintain or improve brand coherence.

Write in concise paragraphs with clear headings.
`;

      const userPrompt = `
Analyze the following X posts.

FOCUS: ${focus}

POSTS:
${corpus}
`;

      const response = await openai.createResponse({
        model: "gpt-4.1-2025-04-14",
        input: `${systemPrompt}\n\n${userPrompt}`,
      });

      const text =
        (response as any).output_text ??
        (Array.isArray((response as any).output)
          ? JSON.stringify((response as any).output)
          : "No textual output from OpenAI.");

      const result: SummarizePostHistoryResult = {
        focus,
        totalPostsAnalyzed: posts.length,
        sampleRangeDescription: `Last ${posts.length} posts.`,
        toneSummary: text, // currently hold the full analysis here
        topicSummary: "",
        interestSummary: "",
        suggestionsForBranding: "",
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err: any) {
      console.error("[avalogica-x-mcp] summarize_post_history error:", err);
      const msg = err?.message || String(err);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to summarize post history: ${msg}`
      );
    }
  },
};