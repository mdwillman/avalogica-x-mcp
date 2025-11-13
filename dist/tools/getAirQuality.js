import { WeatherClient } from "../weatherClient.js";
/**
 * MCP Tool: get_air_quality
 * Retrieves an air quality summary for specified coordinates.
 * Uses the WeatherClient to fetch and format Open-Meteo air quality data.
 */
const weatherClient = new WeatherClient();
function categorizeUsAqi(aqi) {
    if (aqi <= 50)
        return "Good";
    if (aqi <= 100)
        return "Moderate";
    if (aqi <= 150)
        return "Unhealthy for sensitive groups";
    if (aqi <= 200)
        return "Unhealthy";
    if (aqi <= 300)
        return "Very unhealthy";
    return "Hazardous";
}
function categorizeEuropeanAqi(aqi) {
    if (aqi < 20)
        return "Good";
    if (aqi < 40)
        return "Fair";
    if (aqi < 60)
        return "Moderate";
    if (aqi < 80)
        return "Poor";
    if (aqi <= 100)
        return "Very poor";
    return "Extremely poor";
}
export const getAirQualityTool = {
    definition: {
        name: "get_air_quality",
        description: "Get an air quality summary (US & European AQI plus PM2.5/PM10) for the given coordinates over the next few hours.",
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
     * Handles the MCP `tools/call` request for air quality.
     */
    handler: async (args) => {
        try {
            const { latitude, longitude, hours = 24 } = args;
            const data = await weatherClient.getAirQuality(latitude, longitude, hours);
            const { hourly } = data;
            if (!hourly.time || hourly.time.length === 0) {
                throw new Error("No air quality data returned for the requested range");
            }
            // Use first time step as "current" snapshot
            const idx = 0;
            const time = hourly.time[idx];
            const usAqi = hourly.us_aqi?.[idx];
            const euAqi = hourly.european_aqi?.[idx];
            const pm25 = hourly.pm2_5?.[idx];
            const pm10 = hourly.pm10?.[idx];
            const usCategory = typeof usAqi === "number" ? categorizeUsAqi(usAqi) : "unknown";
            const euCategory = typeof euAqi === "number" ? categorizeEuropeanAqi(euAqi) : "unknown";
            const loc = `${data.latitude.toFixed(3)}, ${data.longitude.toFixed(3)}`;
            const lines = [
                `Air quality for ${loc} at ${time} (${data.timezone}):`,
            ];
            if (typeof usAqi === "number") {
                lines.push(`- US AQI: ${usAqi} (${usCategory})`);
            }
            if (typeof euAqi === "number") {
                lines.push(`- European AQI: ${euAqi} (${euCategory})`);
            }
            if (typeof pm25 === "number") {
                lines.push(`- PM2.5: ${pm25} μg/m³`);
            }
            if (typeof pm10 === "number") {
                lines.push(`- PM10: ${pm10} μg/m³`);
            }
            lines.push("", `Summary window: next ${hours}h (Open-Meteo Air Quality API)`);
            const text = lines.join("\n") + "\n\n[served by avalogica-weather-mcp]";
            return {
                content: [{ type: "text", text }],
                isError: false,
            };
        }
        catch (err) {
            console.error("[Weather MCP] Air quality handler error:", err);
            return {
                content: [
                    {
                        type: "text",
                        text: `Error fetching air quality: ${err?.message ?? String(err)}`,
                    },
                ],
                isError: true,
            };
        }
    },
};
