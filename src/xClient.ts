import type { XCredentials, XPost } from "./types.js";

const X_API_BASE = process.env.X_API_BASE ?? "https://api.x.com/2";

export interface ExchangeTokensResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  twitterUserId?: string;
}

export class XClient {
  constructor(
    private readonly clientId: string | undefined = process.env.X_CLIENT_ID,
    private readonly clientSecret: string | undefined = process.env.X_CLIENT_SECRET,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  private ensureClientConfig() {
    if (!this.clientId) throw new Error("Missing X_CLIENT_ID");
    if (!this.clientSecret) throw new Error("Missing X_CLIENT_SECRET");
  }

  async exchangeAuthCodeForTokens(
    code: string,
    codeVerifier: string,
    redirectUri: string
  ): Promise<ExchangeTokensResult> {
    this.ensureClientConfig();

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
      client_id: this.clientId!,
    });

    const response = await this.fetchImpl(`${X_API_BASE.replace(/\/2$/, "")}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(`${this.clientId}:${this.clientSecret}`, "utf8").toString("base64"),
      },
      body,
    });

    const json = await response.json() as any;

    if (!response.ok) {
      throw new Error(
        `X token exchange failed: ${response.status} ${response.statusText} - ${JSON.stringify(
          json
        )}`
      );
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const expiresIn: number = json.expires_in ?? 7200;

    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      twitterUserId: json.user_id ?? json.user?.id,
      expiresAt: nowSec + expiresIn,
    };
  }

  async refreshTokens(refreshToken: string): Promise<ExchangeTokensResult> {
    this.ensureClientConfig();

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: this.clientId!,
    });

    const response = await this.fetchImpl(`${X_API_BASE.replace(/\/2$/, "")}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const json = await response.json() as any;

    if (!response.ok) {
      throw new Error(
        `X token refresh failed: ${response.status} ${response.statusText} - ${JSON.stringify(
          json
        )}`
      );
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const expiresIn: number = json.expires_in ?? 7200;

    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? refreshToken,
      twitterUserId: json.user_id ?? json.user?.id,
      expiresAt: nowSec + expiresIn,
    };
  }

  async getMe(accessToken: string): Promise<{ id: string; username?: string }> {
    const response = await this.fetchImpl(`${X_API_BASE}/users/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const json = await response.json() as any;

    if (!response.ok) {
      throw new Error(
        `X /users/me failed: ${response.status} ${response.statusText} - ${JSON.stringify(json)}`
      );
    }

    return {
      id: json.data?.id,
      username: json.data?.username,
    };
  }

  async getUser(accessToken: string, userId: string): Promise<{ id: string; username?: string }> {
    const response = await this.fetchImpl(`${X_API_BASE}/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const json = await response.json() as any;

    if (!response.ok) {
      throw new Error(
        `X /users/:id failed: ${response.status} ${response.statusText} - ${JSON.stringify(json)}`
      );
    }

    return {
      id: json.data?.id,
      username: json.data?.username,
    };
  }

  async getRecentPosts(
    accessToken: string,
    userId: string,
    limit: number
  ): Promise<XPost[]> {
    const maxResults = Math.max(5, Math.min(limit, 100));
    const url = new URL(`${X_API_BASE}/users/${userId}/tweets`);
    url.searchParams.set("max_results", String(maxResults));
    // Minimal fields; you can expand with tweet.fields, etc.
    url.searchParams.set("tweet.fields", "created_at,lang");

    const response = await this.fetchImpl(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const json = await response.json() as any;

    if (!response.ok) {
      throw new Error(
        `X /users/:id/tweets failed: ${response.status} ${response.statusText} - ${JSON.stringify(
          json
        )}`
      );
    }

    const data = (json.data ?? []) as any[];

    return data.map((t) => ({
      id: t.id,
      text: t.text,
      createdAt: t.created_at,
      lang: t.lang,
    }));
  }

  async postTweet(accessToken: string, text: string): Promise<string> {
    const response = await this.fetchImpl(`${X_API_BASE}/tweets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    const json = await response.json() as any;

    if (!response.ok) {
      throw new Error(
        `X /tweets failed: ${response.status} ${response.statusText} - ${JSON.stringify(json)}`
      );
    }

    const id = json.data?.id;
    if (!id) {
      throw new Error("X /tweets response missing data.id");
    }
    return id;
  }
}