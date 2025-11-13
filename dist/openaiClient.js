/**
 * Minimal client for interacting with the OpenAI Responses API.
 */
export class OpenAIClient {
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
        return (await response.json());
    }
}
