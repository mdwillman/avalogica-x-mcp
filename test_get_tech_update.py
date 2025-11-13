import asyncio
import functools
import httpx
from dotenv import load_dotenv
from dedalus_labs import AsyncDedalus, DedalusRunner
from dedalus_labs.utils.streaming import stream_async

# ---- BEGIN HTTPX MONKEY-PATCH ----
_orig_async_send = httpx.AsyncClient.send

async def _logging_async_send(self, request, *args, **kwargs):
    print(f"\n🌐 HTTPX SEND: {request.method} {request.url}\nHeaders: {dict(request.headers)}\n")
    return await _orig_async_send(self, request, *args, **kwargs)

httpx.AsyncClient.send = _logging_async_send
# ---- END HTTPX MONKEY-PATCH ----

# Env variables (.env should contain DEDALUS_API_KEY and OPENAI_API_KEY)
load_dotenv()

async def main():
    client = AsyncDedalus()
    runner = DedalusRunner(client)

    # Optional log runner invocation
    async def _run_wrapper(self, *args, **kwargs):
        print(f"🧩 DedalusRunner.run called with args={args}, kwargs={kwargs}")
        return await self._orig_run(*args, **kwargs)

    runner._orig_run = runner.run
    runner.run = functools.partial(_run_wrapper, runner)

    test_input = (
        "Call the registered MCP server tool `get_tech_update` from "
        "`mdwillman/avalogica-ai-news-mcp` with topic='aiProducts'. "
        "Return the JSON response from the server exactly as provided."
    )

    result = await runner.run(
        input=test_input,
        model="openai/gpt-5-mini",
        mcp_servers=["mdwillman/avalogica-ai-news-mcp"],
        stream=False
    )

    print("\n=== Final Output ===")
    print(result.final_output)

if __name__ == "__main__":
    asyncio.run(main())
