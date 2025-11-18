import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import type {
  LinkXAccountArgs,
  LinkXAccountResult,
  XCredentials,
} from "../types.js";
import { XClient } from "../xClient.js";
import { saveUserXCreds } from "../xCredsStore.js";
import { loadConfig } from "../config.js";

const config = loadConfig();

export const linkXAccountTool = {
  definition: {
    name: "link_x_account",
    description:
      "Link a user's X (Twitter) account via OAuth 2.0 PKCE. Assumes the caller (Dedalus Bridge) has already authenticated the user and provides a trusted userId.",
    inputSchema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      properties: {
        userId: {
          type: "string",
          description:
            "Internal user id from Dedalus Bridge (already authenticated).",
        },
        code: {
          type: "string",
          description:
            "Authorization code returned from X's OAuth2/PKCE callback (?code=...).",
        },
        codeVerifier: {
          type: "string",
          description: "The code_verifier used in the PKCE flow.",
        },
        redirectUri: {
          type: "string",
          description:
            "Legacy field; optional. The server now uses its configured redirect URI (X_REDIRECT_BASE_URL/X_REDIRECT_PATH) and ignores this value.",
        },
      },
      // redirectUri is now optional; the server uses its own configured redirect URI.
      required: ["userId", "code", "codeVerifier"],
      additionalProperties: false,
    },
  },

  handler: async (args: LinkXAccountArgs): Promise<CallToolResult> => {
    const { userId, code, codeVerifier } = args;

    // Use the configured redirect URI for the token exchange.
    const redirectUri = config.xRedirectUri;
    if (!redirectUri) {
      throw new McpError(
        ErrorCode.InternalError,
        "No redirect URI configured. Set X_REDIRECT_BASE_URL (and optional X_REDIRECT_PATH) for avalogica-x-mcp."
      );
    }

    try {
      const client = new XClient();

      console.log("[avalogica-x-mcp] link_x_account – exchanging code", {
        code,
        codeVerifier,
        redirectUri,
      });

      // 1) Exchange authorization code for tokens
      const tokenObj = await client.exchangeAuthCodeForTokens(
        code,
        codeVerifier,
        redirectUri
      );

      let twitterUserId = tokenObj.twitterUserId;
      let twitterHandle = "";

      // 2) Fallback: if token endpoint did not include user_id, fetch via /users/me
      if (!twitterUserId) {
        try {
          const me = await client.getMe(tokenObj.accessToken);
          twitterUserId = me.id;
          console.log(
            "[avalogica-x-mcp] link_x_account – fetched user_id via /users/me:",
            twitterUserId
          );
        } catch (err: any) {
          console.warn(
            "[avalogica-x-mcp] link_x_account – could not fetch user_id via /users/me:",
            err?.message ?? err
          );
        }
      }

      // 3) Optionally fetch Twitter handle
      if (twitterUserId) {
        try {
          const me = await client.getUser(tokenObj.accessToken, twitterUserId);
          if (me.username) {
            twitterHandle = `@${me.username}`;
          }
        } catch (err: any) {
          console.warn(
            "[avalogica-x-mcp] link_x_account – couldn’t fetch handle; continuing.",
            err?.message ?? err
          );
        }
      }

      // 4) Save credentials for this userId
      const credsToSave: XCredentials = {
        accessToken: tokenObj.accessToken,
        refreshToken: tokenObj.refreshToken,
        expiresAt: tokenObj.expiresAt,
        twitterUserId: twitterUserId || "",
        twitterHandle,
      };

      await saveUserXCreds(userId, credsToSave);

      console.log(
        `[avalogica-x-mcp] link_x_account – X linked for userId ${userId} as ${
          twitterHandle || twitterUserId || "unknown"
        }`
      );

      const payload: LinkXAccountResult = {
        ok: true,
        twitterHandle,
        twitterUserId: twitterUserId || "",
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    } catch (err: any) {
      console.error("[avalogica-x-mcp] link_x_account error:", err);
      const message = err?.message || String(err);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to link X account: ${message}`
      );
    }
  },
};