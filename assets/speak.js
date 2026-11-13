// Read-aloud and listening practice.
// Recordings (a calm British woman's voice, Sonia) ship with the site so it sounds the same on every device.
// If a recording can't be played, or the visitor picks a device voice, the browser's own British female voice is used.
(function () {
  const PREFERRED = ["Sonia", "Libby", "Maisie", "Serena", "Kate", "Stephanie", "Google UK English Female", "Martha", "Hazel", "Susan"];
  // Male voices plus macOS novelty voices, which don't sound calm or natural
  const MALE = /(Daniel|Arthur|Oliver|Ryan|Thomas|George|Alfie|Elliot|Ethan|Noah|Male|Rishi|Fred|Ralph|Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley|Albert|Jester|Junior|Whisper|Zarvox|Bubbles|Bells|Boing|Organ|Cellos|Trinoids|Wobble|Superstar|Bahh|News)/i;
  const KEY = "ecp-voice";
  const RECORDED = "__recorded";
  const synth = window.speechSynthesis;
  const player = new Audio();
  let voices = [];
  let choice = RECORDED;
  let activeBtn = null;

  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function rank(v) {
    const i = PREFERRED.findIndex(n => v.name.includes(n));
    let score = i === -1 ? 50 : i;
    if (/natural|neural|online/i.test(v.name)) score -= 20;
    return score;
  }

  function refresh() {
    if (synth) {
      const all = synth.getVoices();
      let gb = all.filter(v => /en[-_]GB/i.test(v.lang) && !MALE.test(v.name));
      if (!gb.length) gb = all.filter(v => /^en/i.test(v.lang) && !MALE.test(v.name));
      voices = gb.sort((a, b) => rank(a) - rank(b));
    }
    const saved = load(KEY);
    choice = saved && voices.some(v => v.name === saved) ? saved : RECORDED;
    document.querySelectorAll(".voice-select").forEach(fill);
  }

  function fill(sel) {
    sel.innerHTML = "";
    const rec = document.createElement("option");
    rec.value = RECORDED;
    rec.textContent = "Sonia · British (recorded)";
    sel.appendChild(rec);
    voices.forEach(v => {
      const o = document.createElement("option");
      o.value = v.name;
      o.textContent = v.name.replace(/^Microsoft /, "").replace(/ Online \(Natural\).*/, " (natural)") + " · this device";
      sel.appendChild(o);
    });
    sel.value = choice;
  }

  function stop() {
    player.pause();
    player.onended = player.onerror = null;
    if (synth) synth.cancel();
    if (activeBtn) activeBtn.classList.remove("on");
    activeBtn = null;
  }

  function deviceSpeak(text, btn) {
    if (!synth || !text) { if (btn) btn.classList.remove("on"); return; }
    const u = new SpeechSynthesisUtterance(text);
    const v = voices.find(x => x.name === choice) || voices[0];
    if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = "en-GB"; }
    u.rate = 0.9;
    u.pitch = 1;
    u.onend = u.onerror = () => { if (activeBtn === btn) { btn.classList.remove("on"); activeBtn = null; } };
    synth.speak(u);
  }

  function textFor(btn) {
    if (btn.dataset.text) return btn.dataset.text;
    const card = btn.closest(".tip, .listen-card");
    if (!card) return "";
    const script = card.querySelector(".script");
    if (script) return [...script.querySelectorAll("p")].map(p => p.textContent.replace(/^[^:]{1,20}:\s*/, "")).join(" ");
    const h = card.querySelector("h3"), p = card.querySelector("p");
    return [h && h.textContent, p && p.textContent].filter(Boolean).join(". ");
  }

  function play(btn) {
    const wasOn = btn === activeBtn;
    stop();
    if (wasOn) return;
    activeBtn = btn;
    btn.classList.add("on");
    const src = btn.dataset.audio;
    if (src && choice === RECORDED) {
      player.src = src;
      player.onended = () => { if (activeBtn === btn) { btn.classList.remove("on"); activeBtn = null; } };
      player.onerror = () => deviceSpeak(textFor(btn), btn);
      const p = player.play();
      if (p && p.catch) p.catch(() => { if (activeBtn === btn && player.error) deviceSpeak(textFor(btn), btn); });
    } else {
      deviceSpeak(textFor(btn), btn);
    }
  }

  document.addEventListener("change", e => {
    if (!e.target.classList.contains("voice-select")) return;
    stop();
    choice = e.target.value;
    save(KEY, choice);
    document.querySelectorAll(".voice-select").forEach(s => s.value = choice);
  });

  document.addEventListener("click", e => {
    const btn = e.target.closest(".say, .play");
    if (btn) play(btn);
  });

  addEventListener("pagehide", stop);
  refresh();
  if (synth) synth.onvoiceschanged = refresh;
})();
