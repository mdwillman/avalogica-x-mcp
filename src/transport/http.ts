import { createServer, IncomingMessage, ServerResponse } from 'http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'crypto';
import { createStandaloneServer } from '../server.js';
import { Config } from '../config.js';

/** Session storage for streamable HTTP connections */
const sessions = new Map<string, { transport: StreamableHTTPServerTransport; server: any }>();

/**
 * Starts the HTTP transport server
 * @param {Config} config - Server configuration
 */
export function startHttpTransport(config: Config): void {
    const httpServer = createServer();

    httpServer.on('request', async (req, res) => {
        const url = new URL(req.url!, `http://${req.headers.host}`);

        switch (url.pathname) {
            case '/mcp':
                await handleMcpRequest(req, res, config);
                break;
            case '/health':
                handleHealthCheck(res);
                break;
            case config.xRedirectPath:
                await handleXOauthCallback(req, res, config);
                break;
            default:
                handleNotFound(res);
        }
    });

    const host = config.isProduction ? '0.0.0.0' : 'localhost';

    httpServer.listen(config.port, host, () => {
        logServerStart(config);
    });
}

/**
 * Handles MCP protocol requests
 * @param {IncomingMessage} req - HTTP request
 * @param {ServerResponse} res - HTTP response
 * @param {Config} config - Server configuration
 * @returns {Promise<void>}
 * @private
 */
async function handleMcpRequest(
    req: IncomingMessage,
    res: ServerResponse,
    config: Config
): Promise<void> {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (sessionId) {
        const session = sessions.get(sessionId);
        if (!session) {
            res.statusCode = 404;
            res.end('Session not found');
            return;
        }
        return await session.transport.handleRequest(req, res);
    }

    if (req.method === 'POST') {
        await createNewSession(req, res, config);
        return;
    }

    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Invalid request' }));
}

/**
 * Creates a new MCP session for HTTP transport
 * @param {IncomingMessage} req - HTTP request
 * @param {ServerResponse} res - HTTP response
 * @param {Config} config - Server configuration
 * @returns {Promise<void>}
 * @private
 */
async function createNewSession(
    req: IncomingMessage,
    res: ServerResponse,
    config: Config
): Promise<void> {
    // ✅ create fresh Avalogica X MCP server instance
    const serverInstance = createStandaloneServer();

    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId) => {
            sessions.set(sessionId, { transport, server: serverInstance });
            // console.error('[avalogica-x-mcp] New session created:', sessionId);
        }
    });

    transport.onclose = () => {
        if (transport.sessionId) {
            sessions.delete(transport.sessionId);
            // console.error('[avalogica-x-mcp] Session closed:', transport.sessionId);
        }
    };

    try {
        await serverInstance.connect(transport);
        await transport.handleRequest(req, res);
    } catch (error) {
        // console.error('[avalogica-x-mcp] Streamable HTTP connection error:', error);
        res.statusCode = 500;
        res.end('Internal server error');
    }
}

/**
 * Handles X OAuth callback endpoint
 * NOTE: At this stage we only parse the query and return a simple response.
 * The actual token exchange + persistence logic will live here (or be delegated)
 * when we fully migrate the flow into avalogica-x-mcp.
 *
 * @param {IncomingMessage} req - HTTP request
 * @param {ServerResponse} res - HTTP response
 * @param {Config} _config - Server configuration
 * @private
 */
async function handleXOauthCallback(
    req: IncomingMessage,
    res: ServerResponse,
    _config: Config
): Promise<void> {
    try {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');

        console.log('[avalogica-x-mcp] OAuth callback received from X', {
            codePresent: !!code,
            statePresent: !!state
        });

        // TODO: validate state, look up user, exchange `code` for tokens,
        //       and persist credentials. For now, just acknowledge.
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(`
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>X account linked</title>
  </head>
  <body>
    <p>Your X account authorization has been received by Avalogica X MCP.</p>
    <p>You can close this window and return to the app.</p>
  </body>
</html>
        `.trim());
    } catch (error) {
        console.error('[avalogica-x-mcp] Error handling OAuth callback:', error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Error handling X OAuth callback.');
    }
}

/**
 * Handles health check endpoint
 * @param {ServerResponse} res - HTTP response
 * @private
 */
function handleHealthCheck(res: ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        status: 'healthy',
        service: 'avalogica-x-mcp',
        version: '0.1.0',
        timestamp: new Date().toISOString()
    }));
}

/**
 * Handles 404 Not Found responses
 * @param {ServerResponse} res - HTTP response
 * @private
 */
function handleNotFound(res: ServerResponse): void {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
}

/**
 * Logs server startup information
 * @param {Config} config - Server configuration
 * @private
 */
function logServerStart(config: Config): void {
    const displayUrl = config.isProduction
        ? `Port ${config.port}`
        : `http://localhost:${config.port}`;

    if (!config.isProduction) {
        console.log('Put this in your client config:');
        console.log(JSON.stringify({
            mcpServers: {
                "avalogica-x-mcp": {
                    url: `http://localhost:${config.port}/mcp`
                }
            }
        }, null, 2));
        console.log(`OAuth redirect URI (X): ${config.xRedirectUri}`);
    } else {
        console.log(`[avalogica-x-mcp] HTTP server listening on ${displayUrl}`);
    }
}