# Records the site's read-aloud tips and listening scripts with British neural women's voices
# (Sonia, Libby, Maisie). Run again whenever a tip or a listening script is edited:
#   pip install edge-tts
#   python3 tools/record_audio.py .
import asyncio, re, html, pathlib, sys
import edge_tts
ROOT = pathlib.Path(sys.argv[1])
OUT = ROOT / "assets" / "audio"; OUT.mkdir(parents=True, exist_ok=True)
VOICES = {"n": "en-GB-SoniaNeural", "a": "en-GB-LibbyNeural", "b": "en-GB-MaisieNeural"}
RATE = "-8%"
def clean(s): return html.unescape(re.sub(r"<[^>]+>", "", s)).strip()
jobs = []  # (file, [(voice, text)])
for page in ROOT.glob("*.html"):
    t = page.read_text()
    for m in re.finditer(r'<div class="card tip">.*?data-audio="([^"]+)".*?<h3>(.*?)</h3><p>(.*?)</p>', t, re.S):
        jobs.append((m.group(1), [("n", clean(m.group(2)) + ". " + clean(m.group(3)))]))
    for m in re.finditer(r'<article class="card listen-card">.*?data-audio="([^"]+)".*?<div class="script">(.*?)</div>', t, re.S):
        parts = [(v, clean(re.sub(r"<b>.*?</b>", "", p))) for v, p in re.findall(r'<p data-v="(\w)">(.*?)</p>', m.group(2), re.S)]
        jobs.append((m.group(1), parts))
async def say(voice, text):
    buf = b""
    async for chunk in edge_tts.Communicate(text, VOICES[voice], rate=RATE).stream():
        if chunk["type"] == "audio": buf += chunk["data"]
    return buf
async def main():
    sem = asyncio.Semaphore(4)
    async def one(path, parts):
        async with sem:
            # merge consecutive lines by the same voice so a monologue flows naturally
            merged = []
            for v, tx in parts:
                if merged and merged[-1][0] == v: merged[-1][1] += " " + tx
                else: merged.append([v, tx])
            data = b""
            for v, tx in merged: data += await say(v, tx)
            (ROOT / path).write_bytes(data)
            print(path, len(data))
    await asyncio.gather(*(one(p, parts) for p, parts in jobs))
    print("files:", len(jobs))
asyncio.run(main())
