import {
  CallToolResult,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { NewsClient } from "../newsClient.js";
import {
  TechUpdateArgs,
  TechUpdateCitation,
  TechUpdateResult,
} from "../types.js";

interface TopicDefinition {
  slug: string;
  title: string;
  description: string;
  promptTemplate: string;
  keywords: string[];
}

const TOPIC_DEFINITIONS: TopicDefinition[] = [
  {
    slug: "aiProductUpdates",
    title: "AI Product & Platform Updates",
    description:
      "Recent improvements or new features added to existing AI products or platforms.",
    promptTemplate: `
Generate a concise, formatted news-style update about recent improvements to AI products or platforms.
Follow this structure:
1. Level 2 header for the topic
2. Today's date in bold on a new line under the header
3. 1–4 sections marked with clear level 3 headers
4. Each section highlights one notable update from a leading company, startup, or lab

Special Requirements:
- Prioritize developments from the past month
- Focus on performance improvements, new capabilities, and usability upgrades
- Use no more than 8 reputable sources
- If there are no notable updates this month, summarize key enhancements from the recent past
- Target an audience of AI developers and builders
- Include inline numeric citations [1], [2], etc., linked to credible references
`,
    keywords: ["aiproductupdates", "productupdates", "platformupdates", "aiproduct"],
  },
  {
    slug: "aiProducts",
    title: "AI Products",
    description: "AI-driven tools or services recently launched.",
    promptTemplate: `
Generate a concise, formatted tech update about recently launched AI-powered products or platforms.
Follow this structure:
1. Level 2 header for the topic
2. Today's date in bold on a separate line under the header
3. 1–4 sections with clear level 3 headers
4. Each section describes one or more launches from major companies, startups, or labs

Special Requirements:
- Prioritize releases within the past month
- Highlight unique capabilities or applications relevant to AI developers
- Avoid general consumer summaries
- Use no more than 8 reputable sources
- If no major launches occurred this month, mention noteworthy product releases from the past quarter instead
- Include inline numeric citations [1], [2], etc., linked to credible references
`,
    keywords: ["aiproducts", "newaiproducts", "aiproductlaunches"],
  },
  {
    slug: "newModels",
    title: "New AI Model Releases",
    description:
      "Fresh releases of base or fine-tuned AI models and platform capabilities.",
    promptTemplate: `
Generate a concise, formatted update on newly released AI models and significant fine-tunes.
Follow this structure:
1. Level 2 header for the topic
2. Today's date in bold on a separate line under the header
3. 1–4 sections with clear level 3 headers using the model or family name
4. Each section summarizes the releasing organization, key capabilities, and practical implications

Special Requirements:
- Prioritize models released or announced in the past month
- Emphasize benchmark results, training or architecture innovations, and deployment notes
- Include parameter counts or model families when relevant (e.g., "Llama 4 70B")
- Use no more than 8 reputable sources
- If there are no major releases this month, highlight notable models from the past quarter instead
- Target an audience of AI researchers and engineers
- Include inline numeric citations [1], [2], etc., linked to credible references
`,
    keywords: ["newmodels", "modelrelease", "modelreleases", "latestmodels"],
  },
  {
    slug: "techResearch",
    title: "AI & Tech Research Highlights",
    description:
      "Notable research publications, benchmarks, and open-source releases in AI and adjacent fields.",
    promptTemplate: `
Generate a concise, formatted research update covering notable AI and tech papers, benchmarks, or open-source releases.
Follow this structure:
1. Level 2 header for the topic
2. Today's date in bold on a separate line under the header
3. 2–4 sections with level 3 headers using the paper, project, or benchmark name
4. Each section summarizes the core idea, key results, and implications for practitioners

Special Requirements:
- Prioritize work published, accepted, or widely discussed in the past month (e.g., major conferences, arXiv, respected blogs)
- Highlight quantitative performance where available (benchmark scores, efficiency gains, or robustness metrics)
- Prefer work with open-source code, models, or datasets when possible
- Use no more than 8 reputable sources
- If there are few notable items this month, include influential work from the recent past that is still shaping practice
- Target an audience of applied ML researchers and senior engineers
- Include inline numeric citations [1], [2], etc., linked to credible references
`,
    keywords: ["techresearch", "airesearch", "researchupdates", "mlresearch"],
  },
  {
    slug: "polEthicsAndSafety",
    title: "Policy, Ethics & Safety",
    description:
      "Developments in AI regulation, governance frameworks, safety tooling, and ethical debates.",
    promptTemplate: `
Generate a concise, formatted briefing on recent developments in AI policy, governance, ethics, and safety.
Follow this structure:
1. Level 2 header for the topic
2. Today's date in bold on a separate line under the header
3. 2–4 sections with level 3 headers grouped by theme (e.g., "Regulation", "Safety Tooling", "Governance & Standards")
4. Each section summarizes one or more concrete developments, decisions, or proposals

Special Requirements:
- Prioritize actions or announcements from the past month (laws, regulatory guidance, government strategies, industry frameworks)
- Maintain a neutral, factual tone and avoid advocacy language
- Clearly distinguish between binding regulation, voluntary commitments, and open proposals
- Use no more than 8 reputable sources (official documents, major outlets, leading organizations)
- If there are few new developments this month, recap the most impactful changes from the recent past
- Target an audience of AI leaders, policy-minded engineers, and compliance teams
- Include inline numeric citations [1], [2], etc., linked to credible references
`,
    keywords: ["polethicsandsafety", "policyethics", "polsafety"],
  },
  {
    slug: "upcomingEvents",
    title: "Upcoming AI & Tech Events",
    description:
      "Major conferences, product showcases, and community gatherings worth tracking.",
    promptTemplate: `
Generate a concise, formatted preview of notable upcoming AI and tech events.
Follow this structure:
1. Level 2 header for the topic
2. Today's date in bold on a separate line under the header
3. 3–6 sections with level 3 headers using the event name
4. Each section lists the dates, location (or "virtual"), main focus areas, and why it matters for practitioners

Special Requirements:
- Focus on events happening within the next 3 months
- Mix major conferences with at most a couple of focused summits or community gatherings
- Include links to official event pages, CFPs, or agendas where available
- Use no more than 8 reputable sources
- If there are very few events in the next 3 months, include the next major conference(s) slightly beyond that window
- Target an audience of practitioners planning talks, attendance, or launches
- Include inline numeric citations [1], [2], etc., linked to official event sources
`,
    keywords: ["upcomingevents", "aievents", "techevents"],
  },
];

const topicIndex = new Map<string, TopicDefinition>();
for (const topic of TOPIC_DEFINITIONS) {
  for (const keyword of topic.keywords) {
    topicIndex.set(keyword, topic);
  }
  topicIndex.set(topic.slug.toLowerCase(), topic);
}

const newsClient = new NewsClient();

function normalizeTopicKey(topic: string): string {
  return topic.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function resolveTopic(topic: string): TopicDefinition | undefined {
  return topicIndex.get(normalizeTopicKey(topic));
}

function extractResponseText(response: any): string | undefined {
  if (!response) return undefined;

  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }

  if (Array.isArray(response.output)) {
    for (const block of response.output) {
      if (block.type === "message" && Array.isArray(block.content)) {
        for (const item of block.content) {
          if (item.type === "output_text" && typeof item.text === "string" && item.text.trim()) {
            return item.text.trim();
          }
        }
      }
    }
  }

  if (response.data) {
    const nested = extractResponseText(response.data);
    if (nested) return nested;
  }

  if (response.tool_outputs) {
    const nested = extractResponseText(response.tool_outputs);
    if (nested) return nested;
  }

  return undefined;
}

function extractCitations(input: unknown, fallbackText: string): TechUpdateCitation[] {
  const citations: TechUpdateCitation[] = [];
  const seen = new Set<string>();

  const pushCitation = (label: string, url: string) => {
    if (!url || seen.has(url)) return;
    citations.push({ label: label || url, url });
    seen.add(url);
  };

  const explore = (node: unknown) => {
    if (!node) return;
    if (Array.isArray(node)) {
      for (const item of node) explore(item);
      return;
    }
    if (typeof node === "object") {
      const record = node as Record<string, unknown>;
      if (typeof record.url === "string") {
        const label =
          (typeof record.label === "string" && record.label) ||
          (typeof record.title === "string" && record.title) ||
          (typeof record.name === "string" && record.name) ||
          record.url;
        pushCitation(label, record.url);
      }
      if (Array.isArray(record.citations)) {
        for (const item of record.citations) {
          if (typeof item === "object" && item !== null) {
            const citationRecord = item as Record<string, unknown>;
            if (typeof citationRecord.url === "string") {
              const label =
                (typeof citationRecord.label === "string" && citationRecord.label) ||
                (typeof citationRecord.title === "string" && citationRecord.title) ||
                citationRecord.url;
              pushCitation(label, citationRecord.url);
            }
          }
        }
      }
      for (const value of Object.values(record)) explore(value);
    }
  };

  explore(input);

  if (citations.length === 0 && fallbackText) {
    const urlRegex = /(https?:\/\/[^\s)]+)(?![^\[]*\])/gi;
    let match: RegExpExecArray | null;
    while ((match = urlRegex.exec(fallbackText)) !== null) {
      const url = match[1];
      pushCitation(url, url);
    }
  }

  return citations;
}

/**
 * helper: preview prompt template for given topic
 */
export function promptTemplatePreview(topic: string): void {
  const topicDefinition = resolveTopic(topic);
  if (!topicDefinition) {
    console.error(`❌ Unknown topic: ${topic}`);
    console.info("Available topics:", [...topicIndex.keys()].join(", "));
    process.exit(1);
  }
  console.log(`\n🧠 Prompt template for topic: ${topicDefinition.title}\n`);
  console.log(topicDefinition.promptTemplate.trim());
  console.log("\n-----------------------------------------------\n");
}

export const getTechUpdateTool = {
  definition: {
    name: "get_tech_update",
    description:
      "Generate a concise, citation-rich update about recent developments in AI or technology for a specific topic.",
    inputSchema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      properties: {
        topic: {
          type: "string",
          description:
            "Topic focus for the update. Supported values: aiProductUpdates, aiProducts, newModels, techResearch, polEthicsAndSafety, upcomingEvents.",
        },
      },
      required: ["topic"],
    },
  },

  handler: async (args: TechUpdateArgs): Promise<CallToolResult> => {
    const topicDefinition = resolveTopic(args.topic);
    if (!topicDefinition) {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Unsupported topic for get_tech_update. Choose one of: aiProductUpdates, aiProducts, newModels, techResearch, polEthicsAndSafety, upcomingEvents."
      );
    }

    const prompt =
      topicDefinition.promptTemplate.trim() +
      "\n\nAfter gathering any relevant information from search results, " +
      "compose a concise, structured summary following the format above. " +
      "Write your final response directly in natural language — do not return search references.";

    try {
      console.error(`[AI News MCP] 🔍 Invoked topic: ${topicDefinition.slug}`);

      const response = await new NewsClient().createResponse({
        model: "gpt-4.1-2025-04-14",
        tools: [{ type: "web_search_preview" }],
        input: prompt,
      });

      const text = extractResponseText(response);

      if (!text) {
        throw new Error("OpenAI response did not include any textual content.");
      }

      const createdAt = Number.isFinite(response.created)
        ? new Date(response.created * 1000).toISOString()
        : new Date().toISOString();

      const citations = extractCitations(response.tool_outputs ?? response, text);

      const result: TechUpdateResult = {
        topic: topicDefinition.slug,
        title: topicDefinition.title,
        description: topicDefinition.description,
        model: response.model ?? "gpt-4.1-2025-04-14",
        createdAt,
        content: text, // Markdown text from the assistant
        citations,
        fingerprint: "[served by avalogica-ai-news-mcp]",
      };

      console.error("[AI News MCP] 🧩 Extracted content preview:\n", text.slice(0, 200));

      // return as valid JSON text for Dedalus
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("[AI News MCP] ❌ Tech update handler error:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Unexpected error calling OpenAI Responses API.";
      throw new McpError(ErrorCode.InternalError, message);
    }
  },

};

// allow command-line preview usage with metadata display
if (process.argv[1] && process.argv[1].includes("techUpdate.ts")) {
  const arg = process.argv[2];

  // 🧠 If a topic argument is provided, show its detailed metadata and prompt
  if (arg) {
    const topicDefinition = resolveTopic(arg);
    if (!topicDefinition) {
      console.error(`Unknown topic: ${arg}`);
      console.info("\nAvailable topics:\n");
      for (const topic of TOPIC_DEFINITIONS) {
        console.log(`• ${topic.slug} — ${topic.title}`);
      }
      process.exit(1);
    }

    console.log(`\nPrompt Template Preview for Topic: ${topicDefinition.title}`);
    console.log("===============================================");
    console.log(`Description: ${topicDefinition.description}`);
    console.log(`Slug: ${topicDefinition.slug}`);
    console.log(`Keywords: ${topicDefinition.keywords.join(", ")}`);
    console.log("\nPrompt Template:\n");
    console.log(topicDefinition.promptTemplate.trim());
    console.log("\n-----------------------------------------------\n");
  }

  // if no topic argument given, show list of all topics
  else {
    console.log("\nAvailable Topics\n===============================================");
    for (const topic of TOPIC_DEFINITIONS) {
      console.log(` ${topic.slug} — ${topic.title}`);
      console.log(` ${topic.description}`);
      console.log("");
    }
    console.log("Use: npm run preview:prompt <topic>");
    console.log("-----------------------------------------------\n");
  }
}
