import httpx, asyncio, json, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

async def test(q):
    async with httpx.AsyncClient(timeout=10.0) as c:
        r = await c.post("http://localhost:8000/api/sign-search",
                         json={"query": q})
        d = r.json()
        print(f"[{q}] source={d.get('source')} name={d.get('name')}")
        lm = d.get("landmarks", [])
        if len(lm) >= 9:
            print(f"  INDEX_PIP[6]: {lm[6]}")
            print(f"  INDEX_TIP[8]: {lm[8]}")

async def main():
    for q in ["ㄱ", "ㄴ", "ㅇ", "안녕하세요"]:
        await test(q)

asyncio.run(main())
