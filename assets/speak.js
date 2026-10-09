// Read-aloud with a calm British woman's voice. The choice is remembered.
(function () {
  const PREFERRED = ["Sonia", "Libby", "Maisie", "Serena", "Kate", "Stephanie", "Google UK English Female", "Martha", "Hazel", "Susan"];
  // Male voices plus macOS novelty voices, which don't sound calm or natural
  const MALE = /(Daniel|Arthur|Oliver|Ryan|Thomas|George|Alfie|Elliot|Ethan|Noah|Male|Rishi|Fred|Ralph|Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley|Albert|Jester|Junior|Whisper|Zarvox|Bubbles|Bells|Boing|Organ|Cellos|Trinoids|Wobble|Superstar|Bahh|News)/i;
  const KEY = "ecp-voice";
  const synth = window.speechSynthesis;
  let voices = [];
  let chosen = null;

  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function rank(v) {
    const i = PREFERRED.findIndex(n => v.name.includes(n));
    let score = i === -1 ? 50 : i;
    if (/natural|neural|online/i.test(v.name)) score -= 20;
    return score;
  }

  function refresh() {
    if (!synth) return;
    const all = synth.getVoices();
    let gb = all.filter(v => /en[-_]GB/i.test(v.lang) && !MALE.test(v.name));
    if (!gb.length) gb = all.filter(v => /^en/i.test(v.lang) && !MALE.test(v.name));
    voices = gb.sort((a, b) => rank(a) - rank(b));
    const saved = load(KEY);
    chosen = voices.find(v => v.name === saved) || voices[0] || null;
    document.querySelectorAll(".voice-select").forEach(fill);
  }

  function fill(sel) {
    sel.innerHTML = "";
    if (!voices.length) {
      sel.innerHTML = "<option>No British voice found on this device</option>";
      sel.disabled = true;
      return;
    }
    sel.disabled = false;
    voices.forEach(v => {
      const o = document.createElement("option");
      o.value = v.name;
      o.textContent = v.name.replace(/^Microsoft /, "").replace(/ Online \(Natural\)/, " (natural)");
      if (chosen && v.name === chosen.name) o.selected = true;
      sel.appendChild(o);
    });
  }

  function stop() {
    if (synth) synth.cancel();
    document.querySelectorAll(".say.on").forEach(b => b.classList.remove("on"));
  }

  function speak(text, btn) {
    if (!synth) return;
    const wasOn = btn && btn.classList.contains("on");
    stop();
    if (wasOn) return;
    const u = new SpeechSynthesisUtterance(text);
    if (chosen) { u.voice = chosen; u.lang = chosen.lang; } else { u.lang = "en-GB"; }
    u.rate = 0.9;
    u.pitch = 1;
    if (btn) {
      btn.classList.add("on");
      u.onend = u.onerror = () => btn.classList.remove("on");
    }
    synth.speak(u);
  }

  document.addEventListener("change", e => {
    if (!e.target.classList.contains("voice-select")) return;
    chosen = voices.find(v => v.name === e.target.value) || chosen;
    save(KEY, chosen ? chosen.name : "");
    document.querySelectorAll(".voice-select").forEach(fill);
  });

  document.addEventListener("click", e => {
    const btn = e.target.closest(".say");
    if (!btn) return;
    const card = btn.closest(".tip");
    const text = btn.dataset.text || (card ? card.innerText.replace(/🔊/g, "") : "");
    speak(text, btn);
  });

  if (synth) {
    refresh();
    synth.onvoiceschanged = refresh;
  } else {
    document.querySelectorAll(".voice-bar").forEach(b => b.hidden = true);
    document.querySelectorAll(".say").forEach(b => b.hidden = true);
  }

  window.ecpSpeak = speak;
})();
