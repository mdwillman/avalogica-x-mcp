export function loadConfig() {
    const openAiApiKey = process.env.OPENAI_API_KEY;
    const xClientId = process.env.X_CLIENT_ID;
    const xClientSecret = process.env.X_CLIENT_SECRET;
    const nodeEnv = process.env.NODE_ENV === 'production' ? 'production' : 'development';
    const port = parseInt(process.env.PORT || '3002', 10);
    return {
        openAiApiKey,
        xClientId,
        xClientSecret,
        port,
        nodeEnv,
        isProduction: nodeEnv === 'production',
    };
}
