# Records every "Listen" text in the Grade 5 Unit 3 smartboard lesson with the British neural
# woman's voice Sonia and builds the recordings into the HTML file, so it still works offline.
# Run again whenever a model text is edited:
#   pip install edge-tts
#   python3 tools/record_grade5_unit3.py grade5/unit3-writing-to-persuade-smartboard.html
import asyncio, base64, html, pathlib, re, sys
import edge_tts
PAGE = pathlib.Path(sys.argv[1])
VOICE, RATE = "en-GB-SoniaNeural", "-8%"
t = PAGE.read_text(encoding="utf-8")
body = t.split("<script>")[0]

def clean(s):
    s = re.sub(r'<b class="pl nosay">.*?</b>', "", s, flags=re.S)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", s))).strip()

# 1) texts written in the page, in page order  2) the compositions kept in the script, in page order
texts = [clean(m.group(2)) for m in re.finditer(r'<(div|p) class="(?:big )?say"[^>]*>(.*?)</\1>', body, re.S)]
comps = {m.group(1): re.findall(r"'([^']*)'", m.group(2)) for m in re.finditer(r"(\w+):\{t:'[^']*',p:\[(.*?)\]\}", t, re.S)}
texts += [" ".join(comps[k]) for k in re.findall(r'data-comp="(\w+)"', body)]

async def say(text):
    buf = b""
    async for chunk in edge_tts.Communicate(text, VOICE, rate=RATE).stream():
        if chunk["type"] == "audio": buf += chunk["data"]
    return buf

async def main():
    sem = asyncio.Semaphore(4)
    async def one(tx):
        async with sem: return await say(tx)
    clips = await asyncio.gather(*(one(tx) for tx in texts))
    for tx, c in zip(texts, clips): print(len(c) // 1024, "KB", tx[:50])
    js = "window.G5AUDIO=[" + ",".join('"data:audio/mpeg;base64,' + base64.b64encode(c).decode() + '"' for c in clips) + "];"
    block = "<script>/*AUDIO-START*/" + js + "/*AUDIO-END*/</script>"
    if "/*AUDIO-START*/" in t:
        out = re.sub(r"<script>/\*AUDIO-START\*/.*?/\*AUDIO-END\*/</script>", lambda m: block, t, flags=re.S)
    else:
        i = t.rindex("<script>")
        out = t[:i] + block + "\n" + t[i:]
    PAGE.write_text(out, encoding="utf-8")
    print("clips:", len(clips), "| page size:", len(out) // 1024, "KB")
asyncio.run(main())
