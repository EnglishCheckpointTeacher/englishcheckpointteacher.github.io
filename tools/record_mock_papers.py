# Records the reading texts of the mock papers, one file per paragraph, with the calm British
# neural voice Sonia. Run again whenever a mock-paper text is edited:
#   pip install edge-tts
#   python3 tools/record_mock_papers.py .
import asyncio, re, html, pathlib, sys
import edge_tts

ROOT = pathlib.Path(sys.argv[1])
VOICE, RATE = "en-GB-SoniaNeural", "-8%"

def clean(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s)).strip()

jobs = []
for page in sorted(ROOT.glob("mock-paper-*.html")):
    t = page.read_text()
    m = re.search(r'class="insert" data-audio="([^"]+)"', t)
    if not m:
        continue
    base = m.group(1)
    for n, body in re.findall(r'<p data-p="(\d+)">(.*?)</p>', t, re.S):
        jobs.append((ROOT / f"{base}{n}.mp3", clean(body)))

async def one(sem, path, text):
    async with sem:
        path.parent.mkdir(parents=True, exist_ok=True)
        buf = b""
        async for chunk in edge_tts.Communicate(text, VOICE, rate=RATE).stream():
            if chunk["type"] == "audio":
                buf += chunk["data"]
        path.write_bytes(buf)
        print(path.relative_to(ROOT), len(buf))

async def main():
    sem = asyncio.Semaphore(4)
    await asyncio.gather(*(one(sem, p, tx) for p, tx in jobs))
    print("files:", len(jobs))

asyncio.run(main())
