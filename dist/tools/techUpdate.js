import { ErrorCode, McpError, } from "@modelcontextprotocol/sdk/types.js";
import { NewsClient } from "../newsClient.js";
const TOPIC_DEFINITIONS = [
    {
        slug: "aiProductUpdates",
        title: "AI Product & Platform Updates",
        description: "Recent improvements or new features added to existing AI products or platforms.",
        promptTemplate: `
Generate a concise, formatted news-style update about recent improvements to AI products or platforms.
Follow this structure:
1. Level 3 header for topic
2. Today's date in bold on a new line under the header
3. 1–4 sections marked with clear level 4 headers
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
1. Level 2 header for topic
2. Today's date in bold on a separate line under the header
3. 1–4 sections with clear level 3 headers
4. Each section describes one or more launches from major companies, startups, or labs

Special Requirements:
- Prioritize releases within the past month
- Highlight unique capabilities or applications relevant to AI developers
- Avoid general consumer summaries
- Use no more than 8 reputable sources
- If no major launches occurred this month, mention noteworthy product releases from the past quarter instead
- Include inline numeric citations [1], [2], etc.
`,
        keywords: ["aiproducts", "newaiproducts", "aiproductlaunches"],
    },
    {
        slug: "newModels",
        title: "New AI Model Releases",
        description: "Fresh releases of base or fine-tuned AI models and platform capabilities.",
        promptTemplate: `
Generate a short, formatted summary of new AI model releases or fine-tunes from the past month.
Include model names, organizations, and notable capabilities.
Emphasize benchmark results, training innovations, and practical deployment notes.
Include inline numeric citations and stay under 200 words.
`,
        keywords: ["newmodels", "modelrelease", "modelreleases", "latestmodels"],
    },
    {
        slug: "techResearch",
        title: "AI & Tech Research Highlights",
        description: "Notable research publications, benchmarks, and open-source releases in AI and adjacent fields.",
        promptTemplate: `
Write a concise research summary highlighting 2–4 notable AI or tech papers, benchmarks, or open-source releases.
Emphasize key findings, performance metrics, and implications for practitioners.
Include inline numeric citations and stay under 200 words.
`,
        keywords: ["techresearch", "airesearch", "researchupdates", "mlresearch"],
    },
    {
        slug: "polEthicsAndSafety",
        title: "Policy, Ethics & Safety",
        description: "Developments in AI regulation, governance frameworks, safety tooling, and ethical debates.",
        promptTemplate: `
Provide a brief overview of major developments in AI policy, governance, and safety initiatives.
Summarize new regulations, frameworks, or ethics-related proposals.
Use inline numeric citations and keep the tone factual and balanced.
`,
        keywords: ["polethicsandsafety", "policyethics", "polsafety"],
    },
    {
        slug: "upcomingEvents",
        title: "Upcoming AI & Tech Events",
        description: "Major conferences, product showcases, and community gatherings worth tracking.",
        promptTemplate: `
List and summarize 3–5 notable upcoming AI or tech events happening soon.
Mention dates, key topics, and why each event matters to practitioners.
Include citations to official event pages.
`,
        keywords: ["upcomingevents", "aievents", "techevents"],
    },
];
const topicIndex = new Map();
for (const topic of TOPIC_DEFINITIONS) {
    for (const keyword of topic.keywords) {
        topicIndex.set(keyword, topic);
    }
    topicIndex.set(topic.slug.toLowerCase(), topic);
}
const newsClient = new NewsClient();
function normalizeTopicKey(topic) {
    return topic.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}
function resolveTopic(topic) {
    return topicIndex.get(normalizeTopicKey(topic));
}
function extractResponseText(response) {
    if (!response)
        return undefined;
    // Fast path: use output_text if present
    if (typeof response.output_text === "string" && response.output_text.trim()) {
        return response.output_text.trim();
    }
    // Look for assistant messages in structured outputs
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
    // Fallback: sometimes the Responses API nests outputs in data or tool_outputs
    if (response.data) {
        const nested = extractResponseText(response.data);
        if (nested)
            return nested;
    }
    if (response.tool_outputs) {
        const nested = extractResponseText(response.tool_outputs);
        if (nested)
            return nested;
    }
    return undefined;
}
function extractCitations(input, fallbackText) {
    const citations = [];
    const seen = new Set();
    const pushCitation = (label, url) => {
        if (!url || seen.has(url))
            return;
        citations.push({ label: label || url, url });
        seen.add(url);
    };
    const explore = (node) => {
        if (!node)
            return;
        if (Array.isArray(node)) {
            for (const item of node)
                explore(item);
            return;
        }
        if (typeof node === "object") {
            const record = node;
            if (typeof record.url === "string") {
                const label = (typeof record.label === "string" && record.label) ||
                    (typeof record.title === "string" && record.title) ||
                    (typeof record.name === "string" && record.name) ||
                    record.url;
                pushCitation(label, record.url);
            }
            if (Array.isArray(record.citations)) {
                for (const item of record.citations) {
                    if (typeof item === "object" && item !== null) {
                        const citationRecord = item;
                        if (typeof citationRecord.url === "string") {
                            const label = (typeof citationRecord.label === "string" && citationRecord.label) ||
                                (typeof citationRecord.title === "string" && citationRecord.title) ||
                                citationRecord.url;
                            pushCitation(label, citationRecord.url);
                        }
                    }
                }
            }
            for (const value of Object.values(record))
                explore(value);
        }
    };
    explore(input);
    if (citations.length === 0 && fallbackText) {
        const urlRegex = /(https?:\/\/[^\s)]+)(?![^\[]*\])/gi;
        let match;
        while ((match = urlRegex.exec(fallbackText)) !== null) {
            const url = match[1];
            pushCitation(url, url);
        }
    }
    return citations;
}
/**
 * 🔍 Helper: Preview the prompt template for a given topic
 * Example usage:
 *   npx tsx src/tools/getTechUpdate.ts aiProductUpdates
 */
export function promptTemplatePreview(topic) {
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
        description: "Generate a concise, citation-rich update about recent developments in AI or technology for a specific topic.",
        inputSchema: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
                topic: {
                    type: "string",
                    description: "Topic focus for the update. Supported values: aiProductUpdates, aiProducts, newModels, techResearch, polEthicsAndSafety, upcomingEvents.",
                },
            },
            required: ["topic"],
        },
    },
    handler: async (args) => {
        const topicDefinition = resolveTopic(args.topic);
        if (!topicDefinition) {
            throw new McpError(ErrorCode.InvalidParams, "Unsupported topic for get_tech_update. Choose one of: aiProductUpdates, aiProducts, newModels, techResearch, polEthicsAndSafety, upcomingEvents.");
        }
        // Build the full model prompt
        const prompt = topicDefinition.promptTemplate.trim() +
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
            // ✅ Use the new extractor to pull actual content (not ws_... ID)
            const text = extractResponseText(response);
            if (!text) {
                throw new Error("OpenAI response did not include any textual content.");
            }
            const createdAt = Number.isFinite(response.created)
                ? new Date(response.created * 1000).toISOString()
                : new Date().toISOString();
            const citations = extractCitations(response.tool_outputs ?? response, text);
            const result = {
                topic: topicDefinition.slug,
                title: topicDefinition.title,
                description: topicDefinition.description,
                model: response.model ?? "gpt-4.1-2025-04-14",
                createdAt,
                content: text, // Markdown text from the assistant
                citations,
                fingerprint: "[served by avalogica-ai-news-mcp]",
            };
            // 🧾 Optional debug snippet
            console.error("[AI News MCP] 🧩 Extracted content preview:\n", text.slice(0, 200));
            // ✅ Return as valid JSON text for Dedalus
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            console.error("[AI News MCP] ❌ Tech update handler error:", error);
            const message = error instanceof Error
                ? error.message
                : "Unexpected error calling OpenAI Responses API.";
            throw new McpError(ErrorCode.InternalError, message);
        }
    },
};
// ✅ Allow command-line preview usage with metadata display
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
    // 🗂️ If no topic argument is given, show a list of all topics
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
