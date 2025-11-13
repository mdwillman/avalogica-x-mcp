export class WeatherClient {
    /** Base URL for Open-Meteo forecast endpoint */
    forecastBaseUrl = "https://api.open-meteo.com/v1/forecast";
    /** Base URL for Open-Meteo air quality endpoint */
    airQualityBaseUrl = "https://air-quality-api.open-meteo.com/v1/air-quality";
    /** Base URL for Open-Meteo marine endpoint */
    marineBaseUrl = "https://marine-api.open-meteo.com/v1/marine";
    /**
     * Fetches a multi-day weather forecast for given coordinates.
     *
     * @param latitude Latitude of the location.
     * @param longitude Longitude of the location.
     * @param days Number of forecast days (default: 3).
     */
    async getForecast(latitude, longitude, days = 3) {
        const url = new URL(this.forecastBaseUrl);
        url.searchParams.set("latitude", latitude.toString());
        url.searchParams.set("longitude", longitude.toString());
        url.searchParams.set("daily", "temperature_2m_min,temperature_2m_max");
        url.searchParams.set("timezone", "auto");
        url.searchParams.set("forecast_days", days.toString());
        const response = await fetch(url.toString(), {
            method: "GET",
            headers: { Accept: "application/json" },
        });
        if (!response.ok) {
            const message = await response.text();
            throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}\n${message}`);
        }
        const data = await response.json();
        if (!data?.daily?.time || !Array.isArray(data.daily.time)) {
            throw new Error("Unexpected forecast API response structure");
        }
        return data;
    }
    async getHourlyForecast(latitude, longitude, hours = 24) {
        const clampedHours = Math.max(1, Math.min(hours, 48)); // keep it sane
        const url = new URL(this.forecastBaseUrl);
        url.searchParams.set("latitude", latitude.toString());
        url.searchParams.set("longitude", longitude.toString());
        url.searchParams.set("hourly", "temperature_2m,apparent_temperature,precipitation_probability");
        url.searchParams.set("timezone", "auto");
        url.searchParams.set("forecast_hours", clampedHours.toString());
        const response = await fetch(url.toString(), {
            method: "GET",
            headers: { Accept: "application/json" },
        });
        if (!response.ok) {
            const message = await response.text();
            throw new Error(`Open-Meteo hourly forecast API error: ${response.status} ${response.statusText}\n${message}`);
        }
        const data = await response.json();
        if (!data?.hourly?.time || !Array.isArray(data.hourly.time)) {
            throw new Error("Unexpected hourly forecast API response structure");
        }
        return data;
    }
    async getAirQuality(latitude, longitude, hours = 24) {
        const url = new URL(this.airQualityBaseUrl);
        url.searchParams.set("latitude", latitude.toString());
        url.searchParams.set("longitude", longitude.toString());
        url.searchParams.set("hourly", "us_aqi,european_aqi,pm10,pm2_5");
        url.searchParams.set("timezone", "auto");
        url.searchParams.set("forecast_hours", hours.toString());
        const response = await fetch(url.toString(), {
            method: "GET",
            headers: { Accept: "application/json" },
        });
        if (!response.ok) {
            const message = await response.text();
            throw new Error(`Open-Meteo Air Quality API error: ${response.status} ${response.statusText}\n${message}`);
        }
        const data = await response.json();
        if (!data?.hourly?.time || !Array.isArray(data.hourly.time)) {
            throw new Error("Unexpected air quality API response structure");
        }
        return data;
    }
    async getMarineConditions(latitude, longitude, hours = 24) {
        const url = new URL(this.marineBaseUrl);
        url.searchParams.set("latitude", latitude.toString());
        url.searchParams.set("longitude", longitude.toString());
        url.searchParams.set("hourly", "wave_height,wave_direction,wave_period,sea_surface_temperature");
        url.searchParams.set("timezone", "auto");
        url.searchParams.set("forecast_hours", hours.toString());
        const response = await fetch(url.toString(), {
            method: "GET",
            headers: { Accept: "application/json" },
        });
        if (!response.ok) {
            const message = await response.text();
            throw new Error(`Open-Meteo Marine API error: ${response.status} ${response.statusText}\n${message}`);
        }
        const data = await response.json();
        if (!data?.hourly?.time || !Array.isArray(data.hourly.time)) {
            throw new Error("Unexpected marine API response structure");
        }
        return data;
    }
}
