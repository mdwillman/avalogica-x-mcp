# Avalogica X MCP

**Version:** 0.1.0

The Avalogica X MCP server provides integration with X (Twitter), allowing clients to link accounts, post updates, fetch recent posts, and summarize posting history. It follows the Model Context Protocol (MCP) specification and works with Atlas, the Dedalus SDK, and other compatible clients.

---

## Features

- Link an X account via OAuth2/PKCE
- Post updates to X
- Fetch recent posts
- Summarize recent post history (tone, topics, interests)
- Dual transports (STDIO and HTTP) with a /health route

---

## Prerequisites

- Node.js 18 or later
- OpenAI API key (`OPENAI_API_KEY`)
- X OAuth client credentials (`X_CLIENT_ID`, `X_CLIENT_SECRET`)

---

## Configuration

Create a .env file with:  
```
OPENAI_API_KEY=...
X_CLIENT_ID=...
X_CLIENT_SECRET=...
PORT=3002
NODE_ENV=development
```

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

### `link_x_account`
- **Description:** Initiate OAuth2/PKCE flow to link an X account.

### `post_to_x`
- **Description:** Post a new update to the linked X account.

### `get_recent_posts`
- **Description:** Retrieve recent posts from the linked X account.

### `summarize_post_history`
- **Description:** Provide a summary of recent post history, including tone, topics, and interests.

---

## Development Notes

- The codebase remains ESM (`"type": "module"`).
- `npm run build` compiles TypeScript to `dist/` and adjusts the CLI executable bit.
- STDIO transport can be tested with the MCP Inspector: `npm run build && npm run inspector`.

---

## License

MIT © Marshall D. Willman
