# Avalogica AI News MCP

**Version:** 0.2.0  
**License:** MIT

The Avalogica AI News MCP server combines the original Avalogica weather forecasting tool with a new AI and technology news update tool. It follows the [Model Context Protocol (MCP)](https://modelcontextprotocol.io) specification and works with Atlas, the Dedalus SDK, and other compatible clients.

---

## Features

- **Weather forecasts** via the `get_forecast` tool (multi-day daily highs/lows).
- **Hourly weather** via the `get_hourly_forecast` tool (24–48h hourly temps and precip probabilities).
- **Air quality & marine conditions** via the `get_air_quality` and `get_marine_conditions` tools backed by Open-Meteo.
- **AI technology briefings** via the `get_tech_update` tool powered by OpenAI's Responses API with web search preview.
- Dual transports (STDIO and HTTP) with a `/health` route for readiness checks.
- TypeScript-first build pipeline with strict type checking.

---

## Prerequisites

- Node.js 18 or later
- An OpenAI API key with access to the Responses API (`OPENAI_API_KEY`).

---

## Installation

```bash
git clone https://github.com/mdwillman/avalogica-ai-news-mcp.git
cd avalogica-ai-news-mcp
npm install
```

## Configuration

Copy `.env.example` to `.env` and fill in any required values.

```bash
cp .env.example .env
```

```dotenv
OPENAI_API_KEY=sk-...
WEATHER_API_KEY=optional
# PORT=3002
```

`WEATHER_API_KEY` is currently optional. `OPENAI_API_KEY` is required when calling `get_tech_update`.

---

## Build & Run

```bash
npm run build
npm run start            # starts HTTP transport on port 8080 by default
npm run dev:stdio        # run via STDIO (useful with the MCP Inspector)
npm run dev:shttp        # HTTP transport with live TypeScript reloading
```

The HTTP server exposes:

- `GET /health` → returns a JSON payload confirming readiness.
- `POST /mcp` / Server-Sent Events under `/sse` for MCP clients.

---

## Tools

### `get_forecast`
- **Input:** `{ latitude: number, longitude: number, days?: number }`
- **Output:** Plain-text daily high/low temperature summary.

### `get_hourly_forecast`
- **Input:** `{ latitude: number, longitude: number, hours?: number }` (default `hours = 24`, max `48`)
- **Output:** Plain-text hourly summary (temperatures and precipitation probabilities) over the requested horizon.

### `get_air_quality`
- **Input:** `{ latitude: number, longitude: number, hours?: number }` (default `hours = 24`, max `120`)
- **Output:** Plain-text snapshot of current air quality plus a short outlook, including:
  - US AQI and European AQI categories where available
  - PM2.5 and PM10 estimates

### `get_marine_conditions`
- **Input:** `{ latitude: number, longitude: number, hours?: number }` (default `hours = 24`, max `120`)
- **Output:** Plain-text summary of near-term marine conditions, including:
  - Wave height, direction, and period
  - Sea surface temperature
  - Max wave height over the requested window

### `get_tech_update`
- **Input:** `{ topic: string }`
  - Supported topics: `newModels`, `aiProductUpdates`, `techResearch`, `polEthicsAndSafety`, `upcomingEvents`.
- **Behavior:**
  1. Validates the topic.
  2. Calls OpenAI's Responses API (`model: gpt-4.1-2025-04-14`) with web search preview enabled.
  3. Returns a JSON payload (stringified in MCP `text` content) containing:
     - `content`: Narrative summary
     - `citations`: Array of `{ label, url }`
     - `model`, `createdAt`, `topic`, `title`, `description`

#### Example `call_tool`

```json
{
  "name": "get_tech_update",
  "arguments": {
    "topic": "newModels"
  }
}
```

The response body contains a JSON-formatted string with the structured result.

---

## Development Notes

- The codebase remains ESM (`"type": "module"`).
- `npm run build` compiles TypeScript to `dist/` and adjusts the CLI executable bit.
- STDIO transport can be tested with the MCP Inspector: `npm run build && npm run inspector`.

---

## License

MIT © Marshall D. Willman
