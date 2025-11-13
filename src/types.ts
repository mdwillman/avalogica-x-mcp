/**
 * Type definitions for Avalogica AI News MCP
 */

export interface DailyForecast {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
}

export interface WeatherForecastResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  timezone: string;
  daily_units: {
    time: string;
    temperature_2m_max: string;
    temperature_2m_min: string;
  };
  daily: DailyForecast;
}

export interface GetForecastArgs {
  latitude: number;
  longitude: number;
  days?: number;
}

export interface HourlyForecast {
  time: string[];
  temperature_2m?: number[];
  apparent_temperature?: number[];
  precipitation_probability?: number[];
}

export interface HourlyForecastResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  generationtime_ms: number;
  hourly: HourlyForecast;
  hourly_units?: {
    time?: string;
    temperature_2m?: string;
    apparent_temperature?: string;
    precipitation_probability?: string;
  };
}

export interface GetHourlyForecastArgs {
  latitude: number;
  longitude: number;
  hours?: number; // default 24, max 48
}

export interface AirQualityHourly {
  time: string[];
  pm10?: number[];
  pm2_5?: number[];
  us_aqi?: number[];
  european_aqi?: number[];
}

export interface AirQualityResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: AirQualityHourly;
  hourly_units?: {
    time?: string;
    pm10?: string;
    pm2_5?: string;
    us_aqi?: string;
    european_aqi?: string;
  };
}

export interface GetAirQualityArgs {
  latitude: number;
  longitude: number;
  hours?: number; // defaults to 24
}

export interface MarineConditionsHourly {
  time: string[];
  wave_height?: number[];
  wave_direction?: number[];
  wave_period?: number[];
  sea_surface_temperature?: number[];
}

export interface MarineConditionsResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: MarineConditionsHourly;
  hourly_units?: {
    time?: string;
    wave_height?: string;
    wave_direction?: string;
    wave_period?: string;
    sea_surface_temperature?: string;
  };
}

export interface GetMarineConditionsArgs {
  latitude: number;
  longitude: number;
  hours?: number; // defaults to 24
}

export interface TechUpdateArgs {
  topic: string;
}

export interface TechUpdateCitation {
  label: string;
  url: string;
}

export interface TechUpdateResult {
  content: string;
  citations: TechUpdateCitation[];
  model: string;
  createdAt: string;
  topic: string;
  title: string;
  description: string;
  fingerprint: string;
}