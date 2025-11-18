// src/tools/startLinkXAccount.ts

import crypto from "node:crypto";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { loadConfig } from "../config.js";

const config = loadConfig();

interface StartLinkXAccountResult {
  authorizationUrl: string;
  codeVerifier: string;
  state: string;
}

/**
 * Generate a high-entropy PKCE code_verifier.
 */
function generateCodeVerifier(length = 64): string {
  // 43–128 chars recommended; using URL-safe base64
  return crypto.randomBytes(length).toString("base64url").slice(0, length);
}

/**
 * Compute the S256 code_challenge from a verifier.
 */
function generateCodeChallenge(codeVerifier: string): string {
  return crypto.createHash("sha256").update(codeVerifier).digest("base64url");
}

export const startLinkXAccountTool = {
  definition: {
    name: "start_link_x_account",
    description:
      "Start the OAuth2/PKCE flow to link an X (Twitter) account and return an authorization URL for the client to open.",
    inputSchema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },

  handler: async (): Promise<CallToolResult> => {
    const clientId = process.env.X_CLIENT_ID;
    const redirectUri = config.xRedirectUri; // e.g. "avalogica://x-oauth-callback"

    console.log("[avalogica-x-mcp] redirectUri from config:", redirectUri, {
      xRedirectUriEnv: process.env.X_REDIRECT_URI,
      xRedirectBaseUrlEnv: process.env.X_REDIRECT_BASE_URL,
      xRedirectPathEnv: process.env.X_REDIRECT_PATH,
    });

    const authBaseUrl =
      process.env.X_AUTH_BASE_URL ??
      "https://twitter.com/i/oauth2/authorize";
    const scopeEnv = process.env.X_SCOPE;
    const scope =
      scopeEnv ?? "tweet.read tweet.write users.read offline.access";

    if (!clientId) {
      throw new McpError(
        ErrorCode.InternalError,
        "X_CLIENT_ID is not configured for avalogica-x-mcp."
      );
    }

    if (!redirectUri) {
      throw new McpError(
        ErrorCode.InternalError,
        "No redirect URI configured. Set X_REDIRECT_BASE_URL (and optional X_REDIRECT_PATH) for avalogica-x-mcp."
      );
    }

    try {
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);
      const state = crypto.randomBytes(16).toString("hex");

      // Build the authorization URL directly, using redirectUri as-is.
      const url = new URL(authBaseUrl);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", clientId);
      url.searchParams.set("redirect_uri", redirectUri); // ← no extra slash or path
      url.searchParams.set("scope", scope);
      url.searchParams.set("state", state);
      url.searchParams.set("code_challenge", codeChallenge);
      url.searchParams.set("code_challenge_method", "S256");

      const authorizationUrl = url.toString();

      const payload: StartLinkXAccountResult = {
        authorizationUrl,
        codeVerifier,
        state,
      };

      console.log("[avalogica-x-mcp] start_link_x_account – payload", payload);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    } catch (err: any) {
      console.error("[avalogica-x-mcp] start_link_x_account error:", err);
      const message = err?.message || String(err);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to start X link flow: ${message}`
      );
    }
  },
};