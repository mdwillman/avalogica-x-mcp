/**
 * Minimal client for interacting with the OpenAI Responses API.
 */
export class NewsClient {
    apiKey;
    fetchImpl;
    baseUrl = "https://api.openai.com/v1/responses";
    constructor(apiKey = process.env.OPENAI_API_KEY, fetchImpl = fetch) {
        this.apiKey = apiKey;
        this.fetchImpl = fetchImpl;
    }
    async createResponse(payload) {
        const key = this.apiKey ?? process.env.OPENAI_API_KEY;
        if (!key) {
            throw new Error("Missing OPENAI_API_KEY environment variable.");
        }
        if (payload.tools && !payload.tool_choice) {
            payload.tool_choice = "auto";
        }
        const response = await this.fetchImpl(this.baseUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify(payload),
        });
        const contentType = response.headers.get("content-type") ?? "";
        if (!response.ok) {
            const errorBody = contentType.includes("application/json")
                ? JSON.stringify(await response.json())
                : await response.text();
            throw new Error(`OpenAI Responses API error: ${response.status} ${response.statusText}${errorBody ? ` - ${errorBody}` : ""}`);
        }
        if (!contentType.includes("application/json")) {
            throw new Error("Unexpected response format from OpenAI Responses API.");
        }
        // const json = (await response.json()) as OpenAIResponsesResult;
        // Debugging: log the full raw response object
        // console.error("[AI News MCP] 🔍 Raw OpenAI Responses API output:\n", JSON.stringify(json, null, 2));
        // return json;
        return (await response.json());
    }
}
