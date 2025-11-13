import { WeatherClient } from "../weatherClient.js";
/**
 * MCP Tool: get_marine_conditions
 * Retrieves marine conditions (wave height, direction, period, sea surface temperature)
 * for specified coordinates.
 */
const weatherClient = new WeatherClient();
export const getMarineConditionsTool = {
    definition: {
        name: "get_marine_conditions",
        description: "Get marine conditions (wave height, direction, period, and sea surface temperature) for the given coordinates over the next few hours.",
        inputSchema: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
                latitude: {
                    type: "number",
                    description: "Latitude in decimal degrees (e.g., 36.6000 for Monterey Bay)",
                },
                longitude: {
                    type: "number",
                    description: "Longitude in decimal degrees (e.g., -121.9000 for Monterey Bay)",
                },
                hours: {
                    type: "number",
                    default: 24,
                    minimum: 1,
                    maximum: 120,
                    description: "Number of forecast hours to summarize (default: 24, max: 120)",
                },
            },
            required: ["latitude", "longitude"],
        },
    },
    /**
     * Handles the MCP `tools/call` request for marine conditions.
     */
    handler: async (args) => {
        try {
            const { latitude, longitude, hours = 24 } = args;
            const data = await weatherClient.getMarineConditions(latitude, longitude, hours);
            const { hourly } = data;
            if (!hourly.time || hourly.time.length === 0) {
                throw new Error("No marine conditions data returned for the requested range");
            }
            const idx = 0; // "current" snapshot
            const time = hourly.time[idx];
            const waveHeight = hourly.wave_height?.[idx];
            const waveDir = hourly.wave_direction?.[idx];
            const wavePeriod = hourly.wave_period?.[idx];
            const sst = hourly.sea_surface_temperature?.[idx];
            // Derive a simple max wave height over the window for planning context
            const maxWaveHeight = hourly.wave_height && hourly.wave_height.length > 0
                ? Math.max(...hourly.wave_height.filter((v) => Number.isFinite(v)))
                : undefined;
            const loc = `${data.latitude.toFixed(3)}, ${data.longitude.toFixed(3)}`;
            const lines = [
                `Marine conditions for ${loc} at ${time} (${data.timezone}):`,
            ];
            if (typeof waveHeight === "number") {
                lines.push(`- Wave height: ${waveHeight.toFixed(2)} m`);
            }
            if (typeof waveDir === "number") {
                lines.push(`- Wave direction: ${waveDir.toFixed(0)}° (direction waves are coming from)`);
            }
            if (typeof wavePeriod === "number") {
                lines.push(`- Wave period: ${wavePeriod.toFixed(1)} s`);
            }
            if (typeof sst === "number") {
                lines.push(`- Sea surface temperature: ${sst.toFixed(1)} °C`);
            }
            if (typeof maxWaveHeight === "number") {
                lines.push("", `Max wave height over next ${hours}h: ${maxWaveHeight.toFixed(2)} m`);
            }
            lines.push("", `Data source: Open-Meteo Marine API (hourly forecast)`);
            const text = lines.join("\n") + "\n\n[served by avalogica-weather-mcp]";
            return {
                content: [{ type: "text", text }],
                isError: false,
            };
        }
        catch (err) {
            console.error("[Weather MCP] Marine conditions handler error:", err);
            return {
                content: [
                    {
                        type: "text",
                        text: `Error fetching marine conditions: ${err?.message ?? String(err)}`,
                    },
                ],
                isError: true,
            };
        }
    },
};
