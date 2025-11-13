import { WeatherClient } from "../weatherClient.js";
/**
 * MCP Tool: get_forecast
 * Retrieves a multi-day weather forecast for specified coordinates.
 * Uses the WeatherClient to fetch and format Open-Meteo data.
 */
const weatherClient = new WeatherClient();
export const getForecastTool = {
    definition: {
        name: "get_forecast",
        description: "Get a weather forecast for the given coordinates (default 3 days). Returns min and max daily temperatures.",
        inputSchema: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
                latitude: {
                    type: "number",
                    description: "Latitude in decimal degrees (e.g., 37.7749 for San Francisco)",
                },
                longitude: {
                    type: "number",
                    description: "Longitude in decimal degrees (e.g., -122.4194 for San Francisco)",
                },
                days: {
                    type: "number",
                    default: 3,
                    description: "Number of forecast days (default: 3)",
                },
            },
            required: ["latitude", "longitude"],
        },
    },
    /**
     * Handles the MCP `tools/call` request.
     * @param {GetForecastArgs} args - Input arguments from the MCP client
     * @returns {Promise<CallToolResult>} MCP-compliant response payload
     */
    handler: async (args) => {
        try {
            const { latitude, longitude, days = 3 } = args;
            // Fetch data from the weather API
            const data = await weatherClient.getForecast(latitude, longitude, days);
            // Format summary for display in Atlas or Dedalus
            const summary = data.daily.time
                .map((date, i) => {
                const tmin = data.daily.temperature_2m_min[i];
                const tmax = data.daily.temperature_2m_max[i];
                return `${date}: Low ${tmin}°C / High ${tmax}°C`;
            })
                .join("\n");
            return {
                content: [{ type: "text", text: summary + "\n\n[served by avalogica-weather-mcp]" }],
                isError: false,
            };
        }
        catch (err) {
            console.error("[Weather MCP] Forecast handler error:", err);
            return {
                content: [
                    {
                        type: "text",
                        text: `Error fetching forecast: ${err.message || String(err)}`,
                    },
                ],
                isError: true,
            };
        }
    },
};
