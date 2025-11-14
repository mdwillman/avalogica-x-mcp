// src/openaiResponsesClient.ts

export interface OpenAIResponsesPayload {
  model: string;
  input: string;
  tools?: Array<Record<string, unknown>>;
  tool_choice?: "auto" | "none" | Record<string, unknown>;
}

export interface OpenAIResponsesResult {
  id: string;
  created: number;
  model: string;
  output?: unknown;
  output_text?: string;
  data?: unknown;
  tool_outputs?: unknown;
  [key: string]: unknown;
}

/**
 * Minimal client for interacting with the OpenAI Responses API.
 */
export class OpenAIResponsesClient {
  private readonly baseUrl = "https://api.openai.com/v1/responses";

  constructor(
    private readonly apiKey: string | undefined = process.env.OPENAI_API_KEY,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async createResponse(
    payload: OpenAIResponsesPayload
  ): Promise<OpenAIResponsesResult> {
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
      throw new Error(
        `OpenAI Responses API error: ${response.status} ${response.statusText}${
          errorBody ? ` - ${errorBody}` : ""
        }`
      );
    }

    if (!contentType.includes("application/json")) {
      throw new Error("Unexpected response format from OpenAI Responses API.");
    }

    return (await response.json()) as OpenAIResponsesResult;
  }
}