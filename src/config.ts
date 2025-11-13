/**
 * Configuration interface for Avalogica AI News MCP
 */
export interface Config {
  /** Optional API key for external weather providers */
  apiKey?: string;
  /** Optional API key for OpenAI Responses API */
  openAiApiKey?: string;
  /** Port number for HTTP server */
  port: number;
  /** Current environment mode */
  nodeEnv: 'development' | 'production';
  /** Convenience flag for production environment */
  isProduction: boolean;
}

export function loadConfig(): Config {
  const apiKey = process.env.WEATHER_API_KEY;
  const openAiApiKey = process.env.OPENAI_API_KEY;
  const nodeEnv = process.env.NODE_ENV === 'production' ? 'production' : 'development';
  const port = parseInt(process.env.PORT || '3002', 10);

  return {
    apiKey,
    openAiApiKey,
    port,
    nodeEnv,
    isProduction: nodeEnv === 'production',
  };
}