import { WeatherClient } from "../weatherClient.js";
/**
 * MCP Tool: get_hourly_forecast
 * Retrieves an hourly weather forecast (default 24h) for specified coordinates.
 */
const weatherClient = new WeatherClient();
export const getHourlyForecastTool = {
    definition: {
        name: "get_hourly_forecast",
        description: "Get an hourly weather forecast for the given coordinates (default 24 hours). Returns hourly temperature and precipitation probability.",
        inputSchema: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
                latitude: {
                    type: "number",
                    description: "Latitude in decimal degrees (e.g., 34.05 for Los Angeles)",
                },
                longitude: {
                    type: "number",
                    description: "Longitude in decimal degrees (e.g., -118.25 for Los Angeles)",
                },
                hours: {
                    type: "number",
                    default: 24,
                    minimum: 1,
                    maximum: 48,
                    description: "Number of forecast hours to summarize (default: 24, max: 48)",
                },
            },
            required: ["latitude", "longitude"],
        },
    },
    /**
     * Handles the MCP `tools/call` request for hourly forecast.
     */
    handler: async (args) => {
        try {
            const { latitude, longitude, hours = 24 } = args;
            const data = await weatherClient.getHourlyForecast(latitude, longitude, hours);
            const { hourly, timezone } = data;
            if (!hourly.time || hourly.time.length === 0) {
                throw new Error("No hourly forecast data returned for the requested range");
            }
            // Limit to requested hours, in case API gave more
            const sliceCount = Math.min(hours, hourly.time.length);
            const temps = (hourly.temperature_2m ?? []).slice(0, sliceCount);
            const precip = (hourly.precipitation_probability ?? []).slice(0, sliceCount);
            const times = hourly.time.slice(0, sliceCount);
            const validTemps = temps.filter((t) => typeof t === "number");
            const minTemp = validTemps.length > 0 ? Math.min(...validTemps) : undefined;
            const maxTemp = validTemps.length > 0 ? Math.max(...validTemps) : undefined;
            // Build a compact hourly table (e.g., every 3 hours to keep it readable)
            const lines = [];
            lines.push(`Hourly forecast for ${data.latitude.toFixed(3)}, ${data.longitude.toFixed(3)} (${timezone}), next ${sliceCount}h:`, "");
            const step = sliceCount <= 24 ? 1 : 2; // keep output manageable
            for (let i = 0; i < sliceCount; i += step) {
                const t = times[i];
                const temp = temps[i];
                const p = precip[i];
                const timeLabel = t.replace(/T/, " ");
                const tempLabel = typeof temp === "number" ? `${temp.toFixed(1)}°C` : "n/a";
                const precipLabel = typeof p === "number" ? `${p.toFixed(0)}%` : "n/a";
                lines.push(`- ${timeLabel}: ${tempLabel}, precip prob: ${precipLabel}`);
            }
            if (minTemp !== undefined && maxTemp !== undefined) {
                lines.push("", `Temperature range over next ${sliceCount}h: ${minTemp.toFixed(1)}°C – ${maxTemp.toFixed(1)}°C`);
            }
            lines.push("", "Source: Open-Meteo hourly forecast API");
            const text = lines.join("\n") + "\n\n[served by avalogica-weather-mcp]";
            return {
                content: [{ type: "text", text }],
                isError: false,
            };
        }
        catch (err) {
            console.error("[Weather MCP] Hourly forecast handler error:", err);
            return {
                content: [
                    {
                        type: "text",
                        text: `Error fetching hourly forecast: ${err?.message ?? String(err)}`,
                    },
                ],
                isError: true,
            };
        }
    },
};
