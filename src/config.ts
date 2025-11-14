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
}

export function loadConfig(): Config {
  const openAiApiKey = process.env.OPENAI_API_KEY;
  const xClientId = process.env.X_CLIENT_ID;
  const xClientSecret = process.env.X_CLIENT_SECRET;

  const nodeEnv =
    process.env.NODE_ENV === 'production' ? 'production' : 'development';

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