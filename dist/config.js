export function loadConfig() {
    const openAiApiKey = process.env.OPENAI_API_KEY;
    const xClientId = process.env.X_CLIENT_ID;
    const xClientSecret = process.env.X_CLIENT_SECRET;
    const nodeEnv = process.env.NODE_ENV === "production" ? "production" : "development";
    const port = parseInt(process.env.PORT || "3002", 10);
    // Explicit redirect URI (takes precedence if set)
    const xRedirectUriEnv = process.env.X_REDIRECT_URI;
    // Legacy / fallback pieces
    const xRedirectBaseUrlEnv = process.env.X_REDIRECT_BASE_URL || "";
    const xRedirectPathEnv = process.env.X_REDIRECT_PATH ?? "/x/oauth/callback";
    if (nodeEnv === "production") {
        if (!xRedirectUriEnv && !xRedirectBaseUrlEnv) {
            throw new Error("Missing redirect configuration: set X_REDIRECT_URI or X_REDIRECT_BASE_URL");
        }
    }
    let xRedirectUri = "";
    if (xRedirectUriEnv) {
        // Preferred: explicit full redirect URI
        xRedirectUri = xRedirectUriEnv;
    }
    else if (xRedirectBaseUrlEnv) {
        // Backwards-compatible behavior using base + path
        // Special-case custom schemes like "avalogica://"
        if (xRedirectBaseUrlEnv.startsWith("avalogica://")) {
            const base = xRedirectBaseUrlEnv.replace(/\/+$/, ""); // trim trailing slashes
            const path = xRedirectPathEnv.replace(/^\/+/, ""); // trim leading slashes
            xRedirectUri = `${base}/${path}`;
        }
        else {
            xRedirectUri = new URL(xRedirectPathEnv, xRedirectBaseUrlEnv).toString();
        }
    }
    return {
        openAiApiKey,
        xClientId,
        xClientSecret,
        port,
        nodeEnv,
        isProduction: nodeEnv === "production",
        xRedirectBaseUrl: xRedirectBaseUrlEnv,
        xRedirectPath: xRedirectPathEnv,
        xRedirectUri,
    };
}
