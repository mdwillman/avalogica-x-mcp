import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from '@modelcontextprotocol/sdk/types.js';
import { getForecastTool, getHourlyForecastTool, getTechUpdateTool, getAirQualityTool, getMarineConditionsTool, } from "./tools/index.js";
/**
 * Main server class for Avalogica AI News MCP integration
 * @class AiNewsServer
 */
export class AiNewsServer {
    server;
    constructor() {
        this.server = new Server({
            name: 'avalogica-ai-news',
            version: '0.1.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupHandlers();
        this.setupErrorHandling();
    }
    /**
     * Registers all MCP tool handlers for the Avalogica AI News MCP server.
     * @private
     */
    setupHandlers() {
        // ---- List Available Tools ----
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                getForecastTool.definition,
                getHourlyForecastTool.definition,
                getAirQualityTool.definition,
                getMarineConditionsTool.definition,
                getTechUpdateTool.definition,
            ],
        }));
        // ---- Handle Tool Calls ----
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            switch (name) {
                case "get_forecast": {
                    if (!args ||
                        typeof args !== "object" ||
                        typeof args.latitude !== "number" ||
                        typeof args.longitude !== "number") {
                        throw new McpError(ErrorCode.InvalidParams, "Invalid or missing arguments for get_forecast. Expected { latitude: number, longitude: number, days?: number }.");
                    }
                    return await getForecastTool.handler(args);
                }
                case "get_hourly_forecast": {
                    if (!args ||
                        typeof args !== "object" ||
                        typeof args.latitude !== "number" ||
                        typeof args.longitude !== "number" ||
                        (args.hours !== undefined &&
                            typeof args.hours !== "number")) {
                        throw new McpError(ErrorCode.InvalidParams, "Invalid or missing arguments for get_hourly_forecast. Expected { latitude: number, longitude: number, hours?: number }.");
                    }
                    return await getHourlyForecastTool.handler(args);
                }
                case "get_air_quality": {
                    if (!args ||
                        typeof args !== "object" ||
                        typeof args.latitude !== "number" ||
                        typeof args.longitude !== "number" ||
                        (args.hours !== undefined &&
                            typeof args.hours !== "number")) {
                        throw new McpError(ErrorCode.InvalidParams, "Invalid or missing arguments for get_air_quality. Expected { latitude: number, longitude: number, hours?: number }.");
                    }
                    return await getAirQualityTool.handler(args);
                }
                case "get_marine_conditions": {
                    if (!args ||
                        typeof args !== "object" ||
                        typeof args.latitude !== "number" ||
                        typeof args.longitude !== "number" ||
                        (args.hours !== undefined &&
                            typeof args.hours !== "number")) {
                        throw new McpError(ErrorCode.InvalidParams, "Invalid or missing arguments for get_marine_conditions. Expected { latitude: number, longitude: number, hours?: number }.");
                    }
                    return await getMarineConditionsTool.handler(args);
                }
                case "get_tech_update": {
                    if (!args ||
                        typeof args !== "object" ||
                        typeof args.topic !== "string" ||
                        !args.topic.trim()) {
                        throw new McpError(ErrorCode.InvalidParams, "Invalid or missing arguments for get_tech_update. Expected { topic: string }.");
                    }
                    return await getTechUpdateTool.handler(args);
                }
                default:
                    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
            }
        });
    }
    /**
     * Configures error handling and graceful shutdown
     * @private
     */
    setupErrorHandling() {
        this.server.onerror = (error) => console.error(error);
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }
    /**
     * Returns the underlying MCP server instance
     * @returns {Server} MCP server instance
     */
    getServer() {
        return this.server;
    }
}
/**
 * Factory function for creating standalone Avalogica AI News MCP server instances.
 * Used by HTTP transport for session-based connections.
 * @returns {Server} Configured MCP server instance
 */
export function createStandaloneServer() {
    const server = new Server({
        name: 'avalogica-ai-news-discovery',
        version: '0.1.0',
    }, {
        capabilities: {
            tools: {},
        },
    });
    // ---- List available tools ----
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: [
            getForecastTool.definition,
            getHourlyForecastTool.definition,
            getAirQualityTool.definition,
            getMarineConditionsTool.definition,
            getTechUpdateTool.definition,
        ],
    }));
    // ---- Handle tool calls ----
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        switch (name) {
            case "get_forecast": {
                if (!args ||
                    typeof args !== "object" ||
                    typeof args.latitude !== "number" ||
                    typeof args.longitude !== "number") {
                    throw new McpError(ErrorCode.InvalidParams, "Invalid or missing arguments for get_forecast. Expected { latitude: number, longitude: number, days?: number }.");
                }
                return await getForecastTool.handler(args);
            }
            case "get_hourly_forecast": {
                if (!args ||
                    typeof args !== "object" ||
                    typeof args.latitude !== "number" ||
                    typeof args.longitude !== "number" ||
                    (args.hours !== undefined &&
                        typeof args.hours !== "number")) {
                    throw new McpError(ErrorCode.InvalidParams, "Invalid or missing arguments for get_hourly_forecast. Expected { latitude: number, longitude: number, hours?: number }.");
                }
                return await getHourlyForecastTool.handler(args);
            }
            case "get_air_quality": {
                if (!args ||
                    typeof args !== "object" ||
                    typeof args.latitude !== "number" ||
                    typeof args.longitude !== "number" ||
                    (args.hours !== undefined &&
                        typeof args.hours !== "number")) {
                    throw new McpError(ErrorCode.InvalidParams, "Invalid or missing arguments for get_air_quality. Expected { latitude: number, longitude: number, hours?: number }.");
                }
                return await getAirQualityTool.handler(args);
            }
            case "get_marine_conditions": {
                if (!args ||
                    typeof args !== "object" ||
                    typeof args.latitude !== "number" ||
                    typeof args.longitude !== "number" ||
                    (args.hours !== undefined &&
                        typeof args.hours !== "number")) {
                    throw new McpError(ErrorCode.InvalidParams, "Invalid or missing arguments for get_marine_conditions. Expected { latitude: number, longitude: number, hours?: number }.");
                }
                return await getMarineConditionsTool.handler(args);
            }
            case "get_tech_update": {
                if (!args ||
                    typeof args !== "object" ||
                    typeof args.topic !== "string" ||
                    !args.topic.trim()) {
                    throw new McpError(ErrorCode.InvalidParams, "Invalid or missing arguments for get_tech_update. Expected { topic: string }.");
                }
                return await getTechUpdateTool.handler(args);
            }
            default:
                throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
    });
    return server;
}
