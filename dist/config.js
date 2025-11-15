export function loadConfig() {
    const openAiApiKey = process.env.OPENAI_API_KEY;
    const xClientId = process.env.X_CLIENT_ID;
    const xClientSecret = process.env.X_CLIENT_SECRET;
    const nodeEnv = process.env.NODE_ENV === 'production' ? 'production' : 'development';
    const port = parseInt(process.env.PORT || '3002', 10);
    // New redirect-related config variables
    const xRedirectBaseUrl = process.env.X_REDIRECT_BASE_URL;
    const xRedirectPath = process.env.X_REDIRECT_PATH || '/x/oauth/callback';
    // Validate required values in production
    if (nodeEnv === 'production') {
        if (!xRedirectBaseUrl) {
            throw new Error('Missing required environment variable: X_REDIRECT_BASE_URL');
        }
    }
    // Compute full redirect URI if base URL is defined
    const xRedirectUri = xRedirectBaseUrl !== undefined
        ? new URL(xRedirectPath, xRedirectBaseUrl).toString()
        : '';
    return {
        openAiApiKey,
        xClientId,
        xClientSecret,
        port,
        nodeEnv,
        isProduction: nodeEnv === 'production',
        xRedirectBaseUrl: xRedirectBaseUrl || '',
        xRedirectPath,
        xRedirectUri,
    };
}
