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

/**
 * Build the X OAuth2 authorization URL using PKCE.
 *
 * Env vars used:
 *   - X_CLIENT_ID (required)
 *   - X_AUTH_BASE_URL (optional; defaults to Twitter/X OAuth2 URL)
 *   - X_SCOPE (optional; defaults to common scopes)
 */
function buildAuthorizationUrl(params: {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state: string;
  scope?: string;
  authBaseUrl?: string;
}): string {
  const {
    clientId,
    redirectUri,
    codeChallenge,
    state,
    scope,
    authBaseUrl,
  } = params;

  const base =
    authBaseUrl ?? "https://twitter.com/i/oauth2/authorize"; // adjust if you prefer api.x.com

  const url = new URL(base);

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set(
    "scope",
    scope ??
      ["tweet.read", "tweet.write", "users.read", "offline.access"].join(" ")
  );
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  return url.toString();
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
    const redirectUri = config.xRedirectUri;
    const authBaseUrl = process.env.X_AUTH_BASE_URL;
    const scope = process.env.X_SCOPE;

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

      const authorizationUrl = buildAuthorizationUrl({
        clientId,
        redirectUri,
        codeChallenge,
        state,
        scope,
        authBaseUrl,
      });

      const payload: StartLinkXAccountResult = {
        authorizationUrl,
        codeVerifier,
        state,
      };

      // Match linkXAccountTool style: JSON string wrapped in text content
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