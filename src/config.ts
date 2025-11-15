/**
 * Configuration interface for Avalogica X MCP
 */
export interface Config {
  /** OpenAI API key for summarization */
  openAiApiKey?: string;

  /** X (Twitter) OAuth client ID */
  xClientId?: string;

  /** X (Twitter) OAuth client secret */
  xClientSecret?: string;

  /** Port number for HTTP server */
  port: number;

  /** Current environment mode */
  nodeEnv: 'development' | 'production';

  /** Convenience flag for production environment */
  isProduction: boolean;

  /** Base URL of this service for OAuth redirect */
  xRedirectBaseUrl: string;

  /** Path for OAuth callback */
  xRedirectPath: string;

  /** Fully qualified redirect URI for OAuth */
  xRedirectUri: string;
}

export function loadConfig(): Config {
  const openAiApiKey = process.env.OPENAI_API_KEY;
  const xClientId = process.env.X_CLIENT_ID;
  const xClientSecret = process.env.X_CLIENT_SECRET;

  const nodeEnv =
    process.env.NODE_ENV === 'production' ? 'production' : 'development';

  const port = parseInt(process.env.PORT || '3002', 10);

  // New redirect-related config variables
  const xRedirectBaseUrl = process.env.X_REDIRECT_BASE_URL;
  const xRedirectPath = process.env.X_REDIRECT_PATH || '/x/oauth/callback';

  // Validate required values in production
  if (nodeEnv === 'production') {
    if (!xRedirectBaseUrl) {
      throw new Error(
        'Missing required environment variable: X_REDIRECT_BASE_URL'
      );
    }
  }

  // Compute full redirect URI if base URL is defined
  const xRedirectUri =
    xRedirectBaseUrl !== undefined
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