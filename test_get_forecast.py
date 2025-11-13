import asyncio
from dedalus_labs import AsyncDedalus, DedalusRunner
from dotenv import load_dotenv
from dedalus_labs.utils.streaming import stream_async

# ---- BEGIN HTTPX MONKEY-PATCH ----
import httpx
_orig_async_send = httpx.AsyncClient.send

async def _logging_async_send(self, request, *args, **kwargs):
    print(f"\n🌐 HTTPX SEND: {request.method} {request.url}\nHeaders: {dict(request.headers)}\n")
    return await _orig_async_send(self, request, *args, **kwargs)

httpx.AsyncClient.send = _logging_async_send
# ---- END HTTPX MONKEY-PATCH ----

# Load environment variables (for DEDALUS_API_KEY and OPENAI_API_KEY)
load_dotenv()

async def main():

    client = AsyncDedalus()
    runner = DedalusRunner(client)

    import functools
    async def _run_wrapper(self, *args, **kwargs):
        print(f"🧩 DedalusRunner.run called with args={args}, kwargs={kwargs}")
        return await self._orig_run(*args, **kwargs)

    runner._orig_run = runner.run
    runner.run = functools.partial(_run_wrapper, runner)
   
    result = await runner.run(
        input=(
            "Use the avalogica-ai-news-mcp tool 'get_forecast' with "
            "latitude=40.7128, longitude=-74.0060, and days=3. "
            "Return the JSON result exactly as provided by that MCP server."
        ),
        model="openai/gpt-5-mini",
        mcp_servers=["mdwillman/avalogica-ai-news-mcp"],
        stream=False
    )

    print("\n=== Final Output ===")
    print(result.final_output)

if __name__ == "__main__":
    asyncio.run(main())
