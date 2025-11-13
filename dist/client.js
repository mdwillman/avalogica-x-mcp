/**
 * Client for interacting with the Open-Meteo API
 * @class WeatherClient
 * @description
 * Encapsulates calls to the Open-Meteo weather API.
 * This client currently requires no authentication.
 * Future versions may support authenticated providers (e.g., Tomorrow.io).
 */
export class WeatherClient {
    /** Base URL for Open-Meteo forecast endpoint */
    baseUrl = "https://api.open-meteo.com/v1/forecast";
    /**
     * Fetches a multi-day weather forecast for given coordinates.
     *
     * @param {number} latitude - Latitude of the location.
     * @param {number} longitude - Longitude of the location.
     * @param {number} [days=3] - Number of forecast days (default: 3).
     * @returns {Promise<WeatherForecastResponse>} Parsed weather data.
     * @throws {Error} If the HTTP request fails or returns a non-OK status.
     */
    async getForecast(latitude, longitude, days = 3) {
        // Construct the full URL and parameters
        const url = new URL(this.baseUrl);
        url.searchParams.set("latitude", latitude.toString());
        url.searchParams.set("longitude", longitude.toString());
        url.searchParams.set("daily", "temperature_2m_min,temperature_2m_max");
        url.searchParams.set("timezone", "auto");
        url.searchParams.set("forecast_days", days.toString());
        // Perform request
        const response = await fetch(url.toString(), {
            method: "GET",
            headers: { Accept: "application/json" },
        });
        // Validate HTTP response
        if (!response.ok) {
            const message = await response.text();
            throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}\n${message}`);
        }
        // Parse and validate response body
        const data = await response.json();
        if (!data?.daily?.time || !Array.isArray(data.daily.time)) {
            throw new Error("Unexpected API response structure");
        }
        return data;
    }
}
