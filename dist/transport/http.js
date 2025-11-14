import { createServer } from 'http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'crypto';
import { createStandaloneServer } from '../server.js';
/** Session storage for streamable HTTP connections */
const sessions = new Map();
/**
 * Starts the HTTP transport server
 * @param {Config} config - Server configuration
 */
export function startHttpTransport(config) {
    const httpServer = createServer();
    httpServer.on('request', async (req, res) => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        switch (url.pathname) {
            case '/mcp':
                await handleMcpRequest(req, res, config);
                break;
            case '/health':
                handleHealthCheck(res);
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
async function handleMcpRequest(req, res, config) {
    const sessionId = req.headers['mcp-session-id'];
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
async function createNewSession(req, res, config) {
    // ✅ create fresh AI News server instance
    const serverInstance = createStandaloneServer();
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId) => {
            sessions.set(sessionId, { transport, server: serverInstance });
            // console.error('[AI News MCP] New session created:', sessionId);
        }
    });
    transport.onclose = () => {
        if (transport.sessionId) {
            sessions.delete(transport.sessionId);
            // console.error('[AI News MCP] Session closed:', transport.sessionId);
        }
    };
    try {
        await serverInstance.connect(transport);
        await transport.handleRequest(req, res);
    }
    catch (error) {
        // console.error('[AI News MCP] Streamable HTTP connection error:', error);
        res.statusCode = 500;
        res.end('Internal server error');
    }
}
/**
 * Handles health check endpoint
 * @param {ServerResponse} res - HTTP response
 * @private
 */
function handleHealthCheck(res) {
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
function handleNotFound(res) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
}
/**
 * Logs server startup information
 * @param {Config} config - Server configuration
 * @private
 */
function logServerStart(config) {
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
    }
}
