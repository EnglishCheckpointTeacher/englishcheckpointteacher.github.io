// English Checkpoint — interactive practice engine.
// Mock papers: window.PAPER = { key, questions: [...], writing: {...} } with the reading text in .insert p[data-p].
// Skills gym: window.DRILLS = [...] with a <div class="drill" data-drill="id"> for each.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const icon = id => `<svg class="ic" aria-hidden="true"><use href="assets/icons.svg#${id}"/></svg>`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const load = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const shuffle = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(p => p[1]);
  const norm = s => String(s || "").toLowerCase().replace(/[‘’'"“”.,!?;:()\[\]–—-]/g, " ").replace(/\s+/g, " ").trim();
  const words = s => (String(s).trim().match(/[A-Za-z0-9’'-]+/g) || []).length;
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  const SKILLS = {
    retrieve: { name: "Finding information", drill: "skills-gym.html#hunter" },
    vocab: { name: "Words and phrases in context", drill: "skills-gym.html#hunter" },
    language: { name: "Language and techniques", drill: "skills-gym.html#techniques" },
    punctuation: { name: "Punctuation for effect", drill: "skills-gym.html#punctuation" },
    sentences: { name: "Sentences and grammar for effect", drill: "skills-gym.html#sentences" },
    structure: { name: "Structure and cohesion", drill: "skills-gym.html#order" },
    inference: { name: "Inference and viewpoint", drill: "skills-gym.html#quote" },
    opinion: { name: "Opinion with two quotations", drill: "skills-gym.html#quote" },
    summary: { name: "Summary in your own words", drill: "skills-gym.html#summary" }
  };

  /* =====================================================================
     READ-ALOUD for the insert: plays paragraph recordings in order, highlighting each.
     Falls back to a British female device voice if a recording is missing or one is chosen.
     ===================================================================== */
  function setupListen() {
    const ins = $(".insert");
    if (!ins) return;
    const paras = $$("p[data-p]", ins);
    const btn = $(".listen-btn", ins);
    const base = ins.dataset.audio; // e.g. assets/audio/mock1/p
    const player = new Audio();
    const synth = window.speechSynthesis;
    let idx = -1, playing = false;

    function deviceVoice() {
      if (!synth) return null;
      const pref = (() => { try { return localStorage.getItem("ecp-voice"); } catch (e) { return null; } })();
      const all = synth.getVoices();
      const gb = all.filter(v => /en[-_]GB/i.test(v.lang) && !/(Daniel|Arthur|Oliver|Ryan|Thomas|George|Male|Fred|Ralph)/i.test(v.name));
      return all.find(v => v.name === pref) || gb.find(v => /Sonia|Libby|Serena|Kate|Stephanie|Female/i.test(v.name)) || gb[0] || null;
    }
    const useRecording = () => { try { const v = localStorage.getItem("ecp-voice"); return !v || v === "__recorded"; } catch (e) { return true; } };

    function mark(i) { paras.forEach((p, k) => p.classList.toggle("speaking", k === i)); if (i >= 0) { const top = paras[i].offsetTop - 70; if (ins.scrollHeight > ins.clientHeight) ins.scrollTo({ top, behavior: "smooth" }); } }
    function setBtn() { if (btn) btn.innerHTML = playing ? `${icon("pause")} Pause` : `${icon("play")} Listen to the text`; }
    function stop() { playing = false; player.pause(); if (synth) synth.cancel(); mark(-1); setBtn(); }
    function next() {
      if (!playing) return;
      idx++;
      if (idx >= paras.length) { idx = -1; stop(); return; }
      mark(idx);
      const n = paras[idx].dataset.p;
      if (base && useRecording()) {
        player.src = `${base}${n}.mp3`;
        player.onended = next;
        player.onerror = () => speak(paras[idx].textContent);
        const pr = player.play(); if (pr && pr.catch) pr.catch(() => {});
      } else speak(paras[idx].textContent);
    }
    function speak(text) {
      if (!synth) { next(); return; }
      const u = new SpeechSynthesisUtterance(text);
      const v = deviceVoice(); if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "en-GB";
      u.rate = 0.9; u.onend = () => next();
      synth.speak(u);
    }
    function startAt(i) { stop(); playing = true; idx = i - 1; setBtn(); next(); }
    if (btn) btn.addEventListener("click", () => playing ? stop() : startAt(idx > 0 ? idx : 0));
    paras.forEach((p, i) => p.addEventListener("click", e => { if (e.offsetX < 40) startAt(i); }));
    addEventListener("pagehide", stop);
    setBtn();
  }

  /* =====================================================================
     MOCK PAPER
     ===================================================================== */
  function setupPaper(P) {
    const box = $("#paper-questions");
    if (!box) return;
    const KEY = "ecp-paper-" + P.key;
    const st = load(KEY) || { a: {}, m: {}, mode: "practice" };
    const persist = () => save(KEY, st);
    const total = P.questions.reduce((s, q) => s + q.marks, 0);
    const wide = matchMedia("(min-width: 1040px)");
    const ins = $(".insert");
    const bar = $("#scorebar");

    function paraHTML(nums) {
      return nums.map(n => { const p = $(`.insert p[data-p="${n}"]`); return p ? `<p><b>¶${n}</b>${p.innerHTML}</p>` : ""; }).join("");
    }
    function showParas(nums, q, chip) {
      if (wide.matches && ins) {
        $$(".insert p.hl").forEach(p => p.classList.remove("hl"));
        const ps = nums.map(n => $(`.insert p[data-p="${n}"]`)).filter(Boolean);
        ps.forEach(p => p.classList.add("hl"));
        if (ps[0]) ins.scrollTo({ top: ps[0].offsetTop - 70, behavior: "smooth" });
      } else {
        const peek = $(".para-peek", q);
        if (peek) { peek.remove(); chip.setAttribute("aria-expanded", "false"); return; }
        const d = el("div", "para-peek", paraHTML(nums));
        ($(".hint", q) || $(".qq", q)).after(d);
        chip.setAttribute("aria-expanded", "true");
      }
    }

    // ---------- build each question ----------
    P.questions.forEach((q, qi) => {
      q.id = q.id || "q" + qi;
      const a = st.a[q.id] || (st.a[q.id] = {});
      const card = el("article", "pq");
      card.id = "q-" + q.id;
      const paras = q.paras ? `<button class="para-chip" type="button" aria-expanded="false">${icon("book")} ${q.paras.length > 1 ? "¶" + q.paras[0] + "–" + q.paras[q.paras.length - 1] : "¶" + q.paras[0]}</button>` : "";
      card.innerHTML = `<header><span class="qn">${q.n}</span>${paras}<span class="skill">${SKILLS[q.skill] ? SKILLS[q.skill].name : ""}</span><span class="mk">[${q.marks}]</span></header>
        <div class="qq">${q.q}</div>${q.hint ? `<p class="hint">${q.hint}</p>` : ""}<div class="ans"></div>
        <div class="pq-actions"><button class="btn small check" type="button">Check my answer</button></div><div class="pq-fb" aria-live="polite"></div>`;
      const chip = $(".para-chip", card);
      if (chip) chip.addEventListener("click", () => showParas(q.paras, card, chip));
      const ans = $(".ans", card);
      const fb = $(".pq-fb", card);
      const ui = TYPES[q.type].render(q, a, ans, () => { persist(); });
      q._check = () => {
        const res = TYPES[q.type].check(q, a, ans, fb, ui, s => { st.m[q.id] = s; persist(); updateCard(); updateBar(); });
        st.m[q.id] = res; persist(); updateCard(); updateBar();
      };
      function updateCard() {
        const m = st.m[q.id];
        const mk = $(".mk", card);
        if (m != null) { mk.textContent = `${m} / ${q.marks}`; mk.classList.add("got"); card.classList.add("done"); }
      }
      q._card = card; q._update = updateCard;
      $(".check", card).addEventListener("click", q._check);
      box.appendChild(card);
      if (st.m[q.id] != null) q._check(); // restore marked state
    });

    // ---------- score bar, modes, timer ----------
    function updateBar() {
      const marked = P.questions.filter(q => st.m[q.id] != null);
      const got = marked.reduce((s, q) => s + (st.m[q.id] || 0), 0);
      $(".sb-score", bar).innerHTML = `${got} / ${total} marks<span>${marked.length} of ${P.questions.length} questions checked</span>`;
      $(".progress div", bar).style.width = (marked.length / P.questions.length) * 100 + "%";
    }
    function setMode(m) {
      st.mode = m; persist();
      $$(".seg button[data-mode]").forEach(b => b.setAttribute("aria-pressed", b.dataset.mode === m));
      document.body.classList.toggle("exam-mode", m === "exam");
      $$(".pq .check").forEach(b => b.hidden = m === "exam" && !b.closest(".pq").classList.contains("done"));
      const t = $("#timer"); if (t) t.hidden = m !== "exam";
    }
    $$(".seg button[data-mode]").forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)));
    setMode(st.mode || "practice");
    updateBar();

    $("#finish").addEventListener("click", () => {
      P.questions.forEach(q => {
        if (st.m[q.id] != null) return;
        q._check();
        if (st.m[q.id] == null) {
          st.m[q.id] = 0; q._update();
          $(".pq-fb", q._card).innerHTML = `<div class="fb wrong"><b>No answer, so no marks this time.</b> Have a go now, then press Check.</div>`;
        }
      });
      persist(); updateBar();
      $$(".pq .check").forEach(b => b.hidden = false);
      setMode(st.mode);
      $$(".pq .check").forEach(b => b.hidden = false);
      showResults();
    });
    $("#reset-paper").addEventListener("click", () => {
      if (!confirm("Clear all your answers on this paper and start again?")) return;
      save(KEY, null); location.reload();
    });
    if (P.questions.every(q => st.m[q.id] != null)) showResults();

    function showResults() {
      const got = P.questions.reduce((s, q) => s + (st.m[q.id] || 0), 0);
      const pct = Math.round(got / total * 100);
      const by = {};
      P.questions.forEach(q => { const k = q.skill; by[k] = by[k] || { got: 0, max: 0 }; by[k].got += st.m[q.id] || 0; by[k].max += q.marks; });
      const rows = Object.keys(by).map(k => ({ k, ...by[k], p: Math.round(by[k].got / by[k].max * 100) })).sort((x, y) => x.p - y.p);
      const r = $("#results");
      const head = pct >= 75 ? "Excellent reading" : pct >= 50 ? "Good work" : "A solid start";
      const opens = P.questions.some(q => ["open", "opinion", "summary"].includes(q.type));
      r.innerHTML = `<div class="card"><div class="result"><div class="ring" style="--p:${pct}"><span>${got}/${total}</span></div>
        <div><h3>${head}</h3><p>You scored ${pct}% on Section A.${opens ? " Some marks came from your own ticks against the mark scheme, so be honest with yourself, or ask your teacher to check those answers." : ""}</p></div></div>
        <h4>Your skills, weakest first</h4><ul class="skill-bars">${rows.map(x => `<li class="${x.p < 60 ? "low" : ""}"><b>${SKILLS[x.k].name}</b><span>${x.got} / ${x.max}</span><span class="meter" style="--v:${x.p}"><i></i></span>${x.p < 60 ? `<a href="${SKILLS[x.k].drill}">Practise this in the skills gym →</a>` : ""}</li>`).join("")}</ul></div>`;
      r.hidden = false;
      const best = load("ecp-best-paper-" + P.key);
      if (!best || got > best) save("ecp-best-paper-" + P.key, got);
    }

    // timer (exam mode)
    const T = $("#timer");
    if (T) {
      const LEN = (P.minutes || 35) * 60;
      let left = st.timeLeft != null ? st.timeLeft : LEN, tick = null;
      const out = $("b", T), go = $("button", T);
      const show = () => { const m = Math.floor(left / 60), s = left % 60; out.textContent = `${m}:${String(s).padStart(2, "0")}`; T.classList.toggle("low", left <= 300); };
      go.addEventListener("click", () => {
        if (tick) { clearInterval(tick); tick = null; go.textContent = "Start"; return; }
        go.textContent = "Pause";
        tick = setInterval(() => { left = Math.max(0, left - 1); st.timeLeft = left; if (left % 10 === 0) persist(); show(); if (!left) { clearInterval(tick); tick = null; go.textContent = "Start"; alert("Time is up! Finish your sentence, then press ‘Finish and mark’."); } }, 1000);
      });
      $(".timer-reset", T)?.addEventListener("click", () => { left = LEN; st.timeLeft = LEN; persist(); show(); });
      show();
    }

    if (P.writing) setupWriting(P.writing, P.key);
  }

  // ---------- question types ----------
  const TYPES = {};

  // one word or short phrase, checked against accepted answers
  TYPES.text = {
    render(q, a, box, changed) {
      box.innerHTML = `<input type="text" autocomplete="off" spellcheck="false" placeholder="${q.placeholder || "Type your answer"}">`;
      const i = $("input", box); i.value = a.v || "";
      i.addEventListener("input", () => { a.v = i.value; changed(); });
      i.addEventListener("keydown", e => { if (e.key === "Enter") q._check(); });
    },
    check(q, a, box, fb, ui, setScore) {
      const v = norm(a.v);
      if (!v) { fb.innerHTML = `<div class="fb info">Write an answer first, then check it.</div>`; return null; }
      const ok = q.accept.some(x => q.contains ? v.includes(norm(x)) : v === norm(x));
      const s = ok ? q.marks : (a.over ? q.marks : 0);
      fb.innerHTML = `<div class="fb ${ok ? "right" : "wrong"}"><b>${ok ? "Correct." : "Not quite."}</b> ${q.why || ""} ${ok ? "" : `<br>Answer: <b>${esc(q.accept[0])}</b>`}</div>` +
        (ok ? "" : `<label class="override"><input type="checkbox" ${a.over ? "checked" : ""}> My answer is spelt differently but it is the same word. Count it.</label>`);
      const o = $(".override input", fb);
      if (o) o.addEventListener("change", () => { a.over = o.checked; setScore(o.checked ? q.marks : 0); });
      return s;
    }
  };

  // tick one or more boxes
  TYPES.mcq = {
    render(q, a, box, changed) {
      const pick = Array.isArray(q.answer) ? q.answer.length : 1;
      box.innerHTML = `<p class="hint">Tick ${pick === 1 ? "one box" : pick + " boxes"}.</p><div class="tickopts">${q.options.map((o, i) => `<button type="button" aria-pressed="false" data-i="${i}">${o}</button>`).join("")}</div>`;
      a.sel = a.sel || [];
      const btns = $$("button", box);
      const sync = () => btns.forEach((b, i) => b.setAttribute("aria-pressed", a.sel.includes(i)));
      btns.forEach((b, i) => b.addEventListener("click", () => {
        if (b.disabled) return;
        if (a.sel.includes(i)) a.sel = a.sel.filter(x => x !== i);
        else { a.sel.push(i); if (a.sel.length > pick) a.sel.shift(); }
        sync(); changed();
      }));
      sync();
    },
    check(q, a, box, fb) {
      const right = Array.isArray(q.answer) ? q.answer : [q.answer];
      if (!a.sel || !a.sel.length) { fb.innerHTML = `<div class="fb info">Tick ${right.length === 1 ? "a box" : right.length + " boxes"} first.</div>`; return null; }
      const btns = $$(".tickopts button", box);
      btns.forEach((b, i) => { b.disabled = true; b.classList.toggle("right", right.includes(i)); b.classList.toggle("wrong", a.sel.includes(i) && !right.includes(i)); });
      const got = a.sel.filter(i => right.includes(i)).length;
      const s = Math.round(got / right.length * q.marks);
      fb.innerHTML = `<div class="fb ${s === q.marks ? "right" : "wrong"}"><b>${s === q.marks ? "Correct." : s ? "Partly right." : "Not quite."}</b> ${q.why || ""}</div>`;
      return s;
    }
  };

  // write a number in each box to show the order
  TYPES.order = {
    render(q, a, box, changed) {
      const n = q.items.length;
      a.v = a.v || {};
      // show items in a jumbled but fixed order (q.show), with the example given
      const show = q.show || q.items.map((_, i) => i);
      box.innerHTML = `<div class="order-rows">${show.map(i => i === q.example
        ? `<div class="orow" data-i="${i}"><span class="fixed">${i + 1}</span><span>${q.items[i]} <em>(example)</em></span></div>`
        : `<div class="orow" data-i="${i}"><select aria-label="Position for: ${esc(q.items[i])}"><option value="">–</option>${q.items.map((_, k) => `<option>${k + 1}</option>`).join("")}</select><span>${q.items[i]}</span></div>`).join("")}</div>`;
      $$(".orow", box).forEach(r => {
        const s = $("select", r); if (!s) return;
        const i = r.dataset.i; s.value = a.v[i] || "";
        s.addEventListener("change", () => { a.v[i] = s.value; changed(); });
      });
    },
    check(q, a, box, fb) {
      const rows = $$(".orow", box).filter(r => $("select", r));
      if (rows.some(r => !$("select", r).value)) { fb.innerHTML = `<div class="fb info">Give every box a number first.</div>`; return null; }
      let right = 0;
      rows.forEach(r => { const ok = +$("select", r).value === +r.dataset.i + 1; right += ok; r.classList.toggle("right", ok); r.classList.toggle("wrong", !ok); $("select", r).disabled = true; });
      const s = q.score(right);
      fb.innerHTML = `<div class="fb ${s === q.marks ? "right" : "wrong"}"><b>${right} of ${rows.length} in the right place.</b> ${q.why || ""}<br>Correct order: ${q.items.map((t, i) => `<b>${i + 1}</b> ${t}`).join(" · ")}</div>`;
      return s;
    }
  };

  // shared: a mark-scheme checklist the student ticks themselves
  function scheme(q, a, fb, items, title, scoreFn, setScore, extra) {
    a.t = a.t || [];
    const wrap = el("div", "scheme");
    wrap.innerHTML = `<h4>${title}</h4>${items.map((t, i) => `<label><input type="checkbox" data-i="${i}" ${a.t.includes(i) ? "checked" : ""}><span>${t}</span></label>`).join("")}${extra || ""}<div class="self"></div>`;
    const upd = () => { const s = scoreFn(a.t.length); $(".self", wrap).textContent = `Your mark: ${s} / ${q.marks}`; setScore(s); return s; };
    $$("input", wrap).forEach(c => c.addEventListener("change", () => {
      const i = +c.dataset.i;
      a.t = c.checked ? [...new Set([...a.t, i])] : a.t.filter(x => x !== i);
      upd();
    }));
    fb.innerHTML = `<div class="fb info"><b>Mark it yourself.</b> Tick each point your answer makes. Same idea in different words counts.</div>`;
    fb.appendChild(wrap);
    const s = scoreFn(a.t.length); $(".self", wrap).textContent = `Your mark: ${s} / ${q.marks}`;
    return s;
  }

  // open answer, self-marked against the mark-scheme points
  TYPES.open = {
    render(q, a, box, changed) {
      box.innerHTML = `<textarea rows="${q.rows || 3}" placeholder="${q.placeholder || "Write your answer in full sentences"}"></textarea>`;
      const t = $("textarea", box); t.value = a.v || "";
      t.addEventListener("input", () => { a.v = t.value; changed(); });
    },
    check(q, a, box, fb, ui, setScore) {
      if (!norm(a.v)) { fb.innerHTML = `<div class="fb info">Write your answer first, then check it against the mark scheme.</div>`; return null; }
      return scheme(q, a, fb, q.points, `Mark scheme · any ${q.marks === 1 ? "one point" : q.marks + " points"} for ${q.marks} mark${q.marks > 1 ? "s" : ""}`,
        n => Math.min(q.marks, n), setScore, q.why ? `<p class="model"><b>Why:</b> ${q.why}</p>` : "");
    }
  };

  // several short answers on separate lines (e.g. what a word links back to)
  TYPES.rows = {
    render(q, a, box, changed) {
      a.v = a.v || [];
      box.innerHTML = q.rows.map((r, i) => `<div class="row"><label for="${q.id}-${i}">${r.label}</label><input id="${q.id}-${i}" type="text" autocomplete="off"></div>`).join("");
      $$("input", box).forEach((inp, i) => { inp.value = a.v[i] || ""; inp.addEventListener("input", () => { a.v[i] = inp.value; changed(); }); });
    },
    check(q, a, box, fb, ui, setScore) {
      if (!a.v.some(v => norm(v))) { fb.innerHTML = `<div class="fb info">Fill in the boxes first.</div>`; return null; }
      return scheme(q, a, fb, q.rows.map(r => `<b>${r.label}</b> → ${r.answer}`), "Mark scheme · 1 mark for each", n => Math.min(q.marks, n), setScore);
    }
  };

  // "Do you think…?" yes/no + two quotations + two explanations (4 marks)
  TYPES.opinion = {
    render(q, a, box, changed) {
      a.q = a.q || ["", ""]; a.e = a.e || ["", ""];
      box.innerHTML = `<div class="stance"><button type="button" data-v="yes">Yes</button><button type="button" data-v="no">No</button></div>` +
        [0, 1].map(i => `<div class="pair"><label class="lbl" for="${q.id}-q${i}">Quotation ${i + 1}</label><input id="${q.id}-q${i}" type="text" placeholder="Copy a short quotation from the text"><label class="lbl" for="${q.id}-e${i}">Explanation ${i + 1}</label><textarea id="${q.id}-e${i}" rows="2" placeholder="In your own words: this shows… because…"></textarea></div>`).join("");
      const sb = $$(".stance button", box);
      const sync = () => sb.forEach(b => b.setAttribute("aria-pressed", a.s === b.dataset.v));
      sb.forEach(b => b.addEventListener("click", () => { a.s = b.dataset.v; sync(); changed(); }));
      sync();
      [0, 1].forEach(i => {
        const qi = $(`#${q.id}-q${i}`, box), ei = $(`#${q.id}-e${i}`, box);
        qi.value = a.q[i]; ei.value = a.e[i];
        qi.addEventListener("input", () => { a.q[i] = qi.value; changed(); });
        ei.addEventListener("input", () => { a.e[i] = ei.value; changed(); });
      });
    },
    check(q, a, box, fb, ui, setScore) {
      if (!a.s || !norm(a.q[0])) { fb.innerHTML = `<div class="fb info">Choose Yes or No and write at least one quotation first.</div>`; return null; }
      const side = q.model[a.s] || [];
      const other = q.model[a.s === "yes" ? "no" : "yes"] || [];
      const extra = `<p class="model"><b>Examples that support “${a.s === "yes" ? "Yes" : "No"}”:</b><br>${side.map(m => `“${m[0]}” → ${m[1]}`).join("<br>")}</p>` +
        (other.length ? `<p class="model"><b>Students who chose the other side could use:</b><br>${other.map(m => `“${m[0]}” → ${m[1]}`).join("<br>")}</p>` : "");
      return scheme(q, a, fb, [
        "Quotation 1 is copied accurately and supports my choice",
        "Explanation 1 is in my own words and says <i>how</i> the quotation supports my choice",
        "Quotation 2 is a different quotation that also supports my choice",
        "Explanation 2 is in my own words and says <i>how</i> it supports my choice"
      ], "Mark scheme · 1 mark per quotation, 1 mark per explanation", n => Math.min(q.marks, n), setScore, extra);
    }
  };

  // summary with a word limit
  TYPES.summary = {
    render(q, a, box, changed) {
      box.innerHTML = `<textarea rows="4" placeholder="Write in full sentences, in your own words. No quotations, no examples, no opinions."></textarea><div class="wc"><span class="n"></span><span>Limit: ${q.limit} words</span></div>`;
      const t = $("textarea", box), wc = $(".wc", box);
      const upd = () => { const n = words(t.value); $(".n", wc).textContent = `${n} word${n === 1 ? "" : "s"}`; wc.classList.toggle("over", n > q.limit); };
      t.value = a.v || (q.start || ""); upd();
      t.addEventListener("input", () => { a.v = t.value; upd(); changed(); });
    },
    check(q, a, box, fb, ui, setScore) {
      const n = words(a.v || "");
      if (n < 8) { fb.innerHTML = `<div class="fb info">Write your summary first.</div>`; return null; }
      const over = n > q.limit;
      const fn = k => Math.min(over ? 1 : 2, k >= q.full ? 2 : k >= 1 ? 1 : 0);
      return scheme(q, a, fb, q.points, `Mark scheme · ${q.full} or more points in joined-up sentences = 2 marks, 1–${q.full - 1} points = 1 mark${over ? " · you are over the limit, so the most you can get is 1 mark" : ""}`,
        fn, setScore, `<p class="model"><b>Model summary (${words(q.model)} words):</b> ${q.model}</p>`);
    }
  };

  /* =====================================================================
     WRITING STUDIO: planner, draft with live coach, self-assessment
     ===================================================================== */
  const STRANDS = [
    { k: "wc", name: "Content, purpose and audience", max: 5, levels: [[1, "1", "Some ideas, but I drift from the task, or my text type isn’t clear."], [2, "2", "Relevant ideas, and some are developed. My purpose is clear."], [3, "3", "Detailed ideas. I use the features of the text type throughout, and my viewpoint stays consistent."], [5, "4–5", "Engaging and well developed. It is clearly aimed at my reader, and I keep a strong voice from start to finish."]] },
    { k: "ws", name: "Structure of the text", max: 7, levels: [[1, "1", "I use paragraphs and try to organise my ideas."], [3, "2–3", "Related points are grouped into paragraphs and linked with simple connectives."], [5, "4–5", "Ideas develop logically. Paragraphs are linked in varied ways, with a clear opening and ending."], [7, "6–7", "Shaped on purpose for effect: paragraphs of different lengths, smooth links, a memorable ending."]] },
    { k: "wg", name: "Grammar and punctuation", max: 7, levels: [[1, "1", "Mostly simple sentences. Full stops and capital letters mostly correct."], [3, "2–3", "Some complex sentences. Commas and question marks mostly correct."], [5, "4–5", "A range of sentence types used for effect. Varied punctuation ( ; : – ) mostly accurate."], [7, "6–7", "Confident control. Sentences crafted for effect, and a wide range of punctuation used accurately."]] },
    { k: "wv", name: "Vocabulary and language", max: 3, levels: [[1, "1", "Simple, everyday words."], [2, "2", "Some ambitious words and techniques chosen for effect."], [3, "3", "Precise, varied vocabulary and techniques used deliberately throughout."]] },
    { k: "ww", name: "Spelling", max: 3, levels: [[1, "1", "Common words are mostly spelt correctly."], [2, "2", "Most words are correct, including some longer ones."], [3, "3", "Nearly everything is correct, including ambitious words."]] }
  ];
  const WEAK = ["very", "really", "nice", "good", "bad", "got", "a lot", "lots", "things", "stuff", "said", "went", "big", "amazing", "awesome"];
  const LINKS = ["however", "although", "despite", "meanwhile", "furthermore", "moreover", "nevertheless", "consequently", "therefore", "as a result", "on the other hand", "in contrast", "similarly", "eventually", "suddenly", "later that", "by the time", "whereas", "unless", "even though", "afterwards", "finally", "in addition", "for example", "for instance"];
  function setupWriting(W, key) {
    const root = $("#writing-studio");
    if (!root) return;
    const KEY = "ecp-writing-" + key;
    const st = load(KEY) || { plan: {}, draft: "", lv: {} };
    const persist = () => save(KEY, st);

    // planner
    $$(".planner textarea", root).forEach(t => { const k = t.dataset.k; t.value = st.plan[k] || ""; t.addEventListener("input", () => { st.plan[k] = t.value; persist(); }); });

    // draft + coach
    const d = $(".draft textarea", root), coach = $(".coach", root), tips = $(".coach-tips", root), wc = $(".draft .wc .n", root);
    d.value = st.draft || "";
    function analyse() {
      const text = d.value; st.draft = text; persist();
      const n = words(text);
      wc.textContent = `${n} word${n === 1 ? "" : "s"}`;
      const paras = text.split(/\n\s*\n|\n/).filter(p => words(p) > 3).length;
      const sents = (text.match(/[^.!?]+[.!?]+/g) || []).map(s => words(s)).filter(Boolean);
      const shortS = sents.filter(x => x <= 6).length, longS = sents.filter(x => x >= 20).length;
      const marks = [[";", "semicolon"], [":", "colon"], ["–", "dash"], ["-", "dash"], ["?", "question mark"], ["!", "exclamation mark"], ["(", "brackets"], ["…", "ellipsis"], ["“", "speech marks"], ["\"", "speech marks"], ["‘", "inverted commas"], ["'", "apostrophe"]];
      const used = [...new Set(marks.filter(([c]) => text.includes(c)).map(m => m[1]))].filter(x => x !== "apostrophe");
      const low = text.toLowerCase();
      const links = LINKS.filter(l => new RegExp("\\b" + l + "\\b").test(low));
      const weak = WEAK.map(w => [w, (low.match(new RegExp("\\b" + w + "\\b", "g")) || []).length]).filter(x => x[1] >= 2).sort((x, y) => y[1] - x[1]);
      const openers = sents.length ? (text.match(/(^|[.!?]\s+)([A-Za-z]+)/g) || []).map(s => s.replace(/^[.!?\s]+/, "").toLowerCase()) : [];
      const counts = {}; openers.forEach(o => counts[o] = (counts[o] || 0) + 1);
      const rep = Object.entries(counts).filter(([w, c]) => c >= 3).map(([w]) => w);
      const C = (cls, b, s) => `<div class="c ${cls}"><b>${b}</b><span>${s}</span></div>`;
      coach.innerHTML =
        C(n >= 300 ? "good" : n > 60 ? "" : "warn", n, n >= 300 ? "words · a good length" : "words · aim for 300 to 450") +
        C(paras >= 4 ? "good" : "warn", paras, paras >= 4 ? "paragraphs · well organised" : "paragraphs · aim for 4 or more") +
        C(shortS && longS ? "good" : "warn", `${shortS} short · ${longS} long`, shortS && longS ? "sentences · good variety" : "sentences · mix short and long") +
        C(used.length >= 4 ? "good" : "warn", used.length, used.length ? "kinds of punctuation: " + used.join(", ") : "kinds of punctuation used") +
        C(links.length >= 3 ? "good" : "warn", links.length, links.length ? "linking words: " + links.slice(0, 5).join(", ") : "linking words (however, meanwhile…)");
      const t = [];
      if (n && n < 60) t.push("Responses under 60 words can only earn up to 7 marks. Keep going!");
      if (paras < 4 && n > 120) t.push("Press Enter twice to start a new paragraph each time you change time, place, speaker or idea.");
      if (!shortS && sents.length > 3) t.push("Add a very short sentence for impact. For example: <i>Nobody moved.</i>");
      if (!longS && sents.length > 3) t.push("Try one long, flowing sentence with a subordinate clause (<i>As the sun sank behind the hills, …</i>).");
      ["semicolon", "colon", "dash"].forEach(p => { if (!used.includes(p) && n > 100) t.push(`Use a <b>${p}</b> correctly once. Examiners reward a range of punctuation.`); });
      if (weak.length) t.push("You use " + weak.slice(0, 3).map(w => `<b>${w[0]}</b> ×${w[1]}`).join(", ") + ". Swap some for more precise words.");
      if (rep.length) t.push("Several sentences start with " + rep.map(w => `<b>${w}</b>`).join(", ") + ". Vary your openings: try an adverb, a place, or a time phrase.");
      if (W.coach) W.coach(low).forEach(x => t.push(x));
      tips.innerHTML = t.length ? t.map(x => `<li>${x}</li>`).join("") : (n ? "<li>Looking strong. Now check spelling and read it aloud to yourself.</li>" : "<li>Start writing and your coach will give you tips as you go.</li>");
    }
    d.addEventListener("input", analyse); analyse();

    // writing timer
    const wt = $(".wr-timer", root);
    if (wt) {
      let left = (st.wl != null ? st.wl : 35 * 60), tk = null;
      const out = $("b", wt), go = $("button", wt);
      const show = () => { out.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`; wt.classList.toggle("low", left <= 300); };
      go.addEventListener("click", () => {
        if (tk) { clearInterval(tk); tk = null; go.textContent = "Start"; return; }
        go.textContent = "Pause";
        tk = setInterval(() => { left = Math.max(0, left - 1); st.wl = left; if (left % 10 === 0) persist(); show(); if (!left) { clearInterval(tk); tk = null; go.textContent = "Start"; } }, 1000);
      });
      $(".timer-reset", wt).addEventListener("click", () => { left = 35 * 60; st.wl = left; persist(); show(); });
      show();
    }

    // copy / print
    $(".copy-draft", root)?.addEventListener("click", e => {
      const t = d.value; if (!t) return;
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { e.target.textContent = "Copied!"; setTimeout(() => e.target.textContent = "Copy my writing", 1500); }).catch(() => { d.select(); });
    });

    // self-assessment: the five strands Checkpoint examiners mark
    const sbox = $(".strands", root);
    if (sbox && !sbox.children.length) sbox.innerHTML = STRANDS.map(x => `<div class="strand" data-k="${x.k}" data-max="${x.max}"><h4>${x.name}<span>– / ${x.max}</span></h4><div class="levels">${x.levels.map(l => `<button type="button" data-v="${l[0]}"><b>${l[1]}</b><span>${l[2]}</span></button>`).join("")}</div></div>`).join("");
    const strands = $$(".strand", root);
    const total = $(".wr-total", root);
    function sum() { let s = 0; strands.forEach(x => { const k = x.dataset.k; s += st.lv[k] || 0; }); total.textContent = `Your writing mark: ${s} / 25`; }
    strands.forEach(x => {
      const k = x.dataset.k;
      $$(".levels button", x).forEach(b => {
        b.setAttribute("aria-pressed", String(st.lv[k] === +b.dataset.v));
        b.addEventListener("click", () => {
          st.lv[k] = +b.dataset.v; persist();
          $$(".levels button", x).forEach(y => y.setAttribute("aria-pressed", String(y === b)));
          $("h4 span", x).textContent = `${st.lv[k]} / ${x.dataset.max}`;
          sum();
        });
      });
      if (st.lv[k] != null) $("h4 span", x).textContent = `${st.lv[k]} / ${x.dataset.max}`;
    });
    sum();
    $(".reset-writing", root)?.addEventListener("click", () => { if (confirm("Clear your plan, writing and self-assessment?")) { save(KEY, null); location.reload(); } });
  }

  /* =====================================================================
     SKILLS GYM DRILLS
     ===================================================================== */
  function setupDrills(D) {
    D.forEach(dr => {
      const box = $(`.drill[data-drill="${dr.id}"]`);
      if (!box) return;
      const BEST = "ecp-drill-" + dr.id;
      const play = $(".drill-play", box);
      let order, i, score, maxScore;

      function intro() {
        const best = load(BEST);
        play.innerHTML = `<div class="drill-end"><p>${dr.items.length} ${dr.items.length === 1 ? "task" : "tasks"} · instant feedback</p>
          <div class="btn-row"><button class="btn" type="button">Start ${icon("arrow")}</button></div>
          ${best ? `<p class="best" style="margin-top:12px">${icon("trophy")} Best so far: ${best.s} / ${best.m}</p>` : ""}</div>`;
        $("button", play).onclick = start;
        updateCard();
      }
      function updateCard() {
        const best = load(BEST);
        const c = $(`.gym-grid a[href="#${dr.id}"] .best`);
        if (c) c.textContent = best ? `Best: ${best.s} / ${best.m}` : "Not tried yet";
      }
      function start() {
        order = dr.shuffle === false ? dr.items.slice() : shuffle(dr.items.slice());
        i = 0; score = 0; maxScore = 0;
        show();
      }
      function top() { return `<div class="quiz-top"><span>Task ${i + 1} of ${order.length}</span><span>Score: ${score}</span></div><div class="progress"><div style="width:${i / order.length * 100}%"></div></div>`; }
      function nextBtn(container) {
        const b = el("button", "btn", (i === order.length - 1 ? "See my score " : "Next ") + icon("arrow"));
        b.type = "button";
        b.onclick = () => { i++; i < order.length ? show() : end(); };
        container.appendChild(b);
        b.focus({ preventScroll: true });
      }
      function show() { const it = order[i]; DRILL[dr.type](it, play, top(), (got, max) => { score += got; maxScore += max; $(".quiz-top span:last-child", play).textContent = "Score: " + score; }, nextBtn); }
      function end() {
        const pct = Math.round(score / maxScore * 100);
        const best = load(BEST);
        if (!best || score / maxScore > best.s / best.m) save(BEST, { s: score, m: maxScore });
        play.innerHTML = `<div class="drill-end"><div class="ring" style="--p:${pct}"><span>${score}/${maxScore}</span></div>
          <h3>${pct >= 80 ? "Brilliant!" : pct >= 50 ? "Nice work" : "Keep going"}</h3><p>${pct >= 80 ? "You have this skill. Try a mock paper to use it under exam conditions." : "Read the tip at the top again, then have another go. Each round comes in a new order."}</p>
          <div class="btn-row"><button class="btn" type="button">Try again ${icon("refresh")}</button></div></div>`;
        $("button", play).onclick = start;
        updateCard();
      }
      intro();
    });
  }

  const DRILL = {};
  // multiple choice, answered instantly
  DRILL.mcq = (it, play, top, add, nextBtn) => {
    const opts = shuffle(it.options.map((t, k) => ({ t, ok: k === it.answer })));
    play.innerHTML = `${top}${it.ctx ? `<div class="ctx">${it.ctx}</div>` : ""}<div class="prompt">${it.q}</div><div class="options"></div><div class="feedback" aria-live="polite"></div><div class="nx"></div>`;
    const box = $(".options", play);
    opts.forEach(o => {
      const b = el("button", "", o.t); b.type = "button";
      b.onclick = () => {
        $$("button", box).forEach((x, k) => { x.disabled = true; if (opts[k].ok) x.classList.add("right"); });
        if (!o.ok) b.classList.add("wrong");
        const f = $(".feedback", play); f.className = "feedback " + (o.ok ? "right" : "wrong");
        f.innerHTML = (o.ok ? "<b>Correct.</b> " : "<b>Not quite.</b> ") + it.why;
        add(o.ok ? 1 : 0, 1); nextBtn($(".nx", play));
      };
      box.appendChild(b);
    });
  };
  // tap a word in the text
  DRILL.tap = (it, play, top, add, nextBtn) => {
    const toks = it.ctx.split(/(\s+)/);
    const ans = norm(it.answer).split(" ");
    // find the answer span in the token list
    const wordsOnly = toks.map((t, k) => ({ t, k })).filter(x => x.t.trim());
    let span = [];
    for (let s = 0; s < wordsOnly.length; s++) {
      const seq = wordsOnly.slice(s, s + ans.length).map(x => norm(x.t));
      if (seq.join(" ") === ans.join(" ")) { span = wordsOnly.slice(s, s + ans.length).map(x => x.k); break; }
    }
    play.innerHTML = `${top}<div class="prompt">${it.q}</div><div class="ctx tapctx">${toks.map((t, k) => t.trim() ? `<span class="tok" data-k="${k}" role="button" tabindex="0">${esc(t)}</span>` : t).join("")}</div><p class="hint" style="color:var(--ink-faint);font-size:.88rem">Tap ${ans.length > 1 ? "any word in the phrase" : "the word"} in the text.</p><div class="feedback" aria-live="polite"></div><div class="nx"></div>`;
    const ctx = $(".tapctx", play);
    let tries = 0, done = false;
    $$(".tok", ctx).forEach(tk => {
      const pick = () => {
        if (done) return;
        const ok = span.includes(+tk.dataset.k);
        const f = $(".feedback", play);
        if (ok || tries >= 1) {
          done = true; ctx.classList.add("locked");
          span.forEach(k => $(`.tok[data-k="${k}"]`, ctx).classList.add("right"));
          if (!ok) tk.classList.add("wrong");
          f.className = "feedback " + (ok ? "right" : "wrong");
          f.innerHTML = (ok ? (tries ? "<b>Got it on the second try.</b> " : "<b>Correct.</b> ") : "<b>Here it is.</b> ") + it.why;
          add(ok ? (tries ? 0.5 : 1) : 0, 1); nextBtn($(".nx", play));
        } else {
          tries++; tk.classList.add("wrong");
          f.className = "feedback wrong"; f.innerHTML = "<b>Not that one.</b> " + (it.hint || "Read the sentence around it again. You have one more try.");
        }
      };
      tk.addEventListener("click", pick);
      tk.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
    });
  };
  // put in order with up/down buttons
  DRILL.order = (it, play, top, add, nextBtn) => {
    let cur = shuffle(it.items.map((t, k) => ({ t, k })));
    if (cur.every((x, k) => x.k === k)) cur.reverse();
    play.innerHTML = `${top}${it.ctx ? `<div class="ctx">${it.ctx}</div>` : ""}<div class="prompt">${it.q}</div><ol class="sortable"></ol><button class="btn small" type="button">Check the order</button><div class="feedback" aria-live="polite"></div><div class="nx"></div>`;
    const ol = $(".sortable", play);
    const draw = (lock) => {
      ol.innerHTML = cur.map((x, p) => `<li data-k="${x.k}"><span class="num">${p + 1}</span><span class="t">${x.t}</span><button type="button" aria-label="Move up" ${p === 0 || lock ? "disabled" : ""}>↑</button><button type="button" aria-label="Move down" ${p === cur.length - 1 || lock ? "disabled" : ""}>↓</button></li>`).join("");
      $$("li", ol).forEach((li, p) => {
        const [u, d] = $$("button", li);
        u.onclick = () => { [cur[p - 1], cur[p]] = [cur[p], cur[p - 1]]; draw(); $$("li", ol)[p - 1].querySelector("button").focus(); };
        d.onclick = () => { [cur[p + 1], cur[p]] = [cur[p], cur[p + 1]]; draw(); $$("li", ol)[p + 1].querySelectorAll("button")[1].focus(); };
      });
    };
    draw();
    $(".btn.small", play).onclick = e => {
      e.target.remove(); draw(true);
      let right = 0;
      $$("li", ol).forEach((li, p) => { const ok = +li.dataset.k === p; right += ok; li.classList.add(ok ? "right" : "wrong"); });
      const f = $(".feedback", play); f.className = "feedback " + (right === cur.length ? "right" : "wrong");
      f.innerHTML = `<b>${right} of ${cur.length} in the right place.</b> ${it.why}${right < cur.length ? "<br>Correct order: " + it.items.map((t, k) => `<b>${k + 1}</b> ${t}`).join(" · ") : ""}`;
      add(right === cur.length ? 2 : right >= cur.length - 2 ? 1 : 0, 2); nextBtn($(".nx", play));
    };
  };
  // build a 4-mark "Do you think…?" answer
  DRILL.quote = (it, play, top, add, nextBtn) => {
    let side = null, picks = [], pts = 0;
    play.innerHTML = `${top}<div class="ctx">${it.ctx}</div><div class="prompt">${it.q}</div>
      <p class="step-lbl">Step 1 · Choose your side</p><div class="stance"><button type="button" data-v="yes">Yes</button><button type="button" data-v="no">No</button></div><div class="s2"></div><div class="feedback" aria-live="polite"></div><div class="nx"></div>`;
    $$(".stance button", play).forEach(b => b.onclick = () => {
      if (side) return; side = b.dataset.v; b.setAttribute("aria-pressed", "true");
      $$(".stance button", play).forEach(x => x.disabled = true);
      step2();
    });
    function step2() {
      const s2 = $(".s2", play);
      s2.innerHTML = `<p class="step-lbl">Step 2 · Tick two quotations that support “${side === "yes" ? "Yes" : "No"}”</p><div class="tickopts">${it.quotes.map((x, k) => `<button type="button" aria-pressed="false" data-k="${k}">“${x.t}”</button>`).join("")}</div><button class="btn small" type="button" disabled>Check my quotations</button>`;
      const bs = $$(".tickopts button", s2), go = $(".btn.small", s2);
      bs.forEach(b => b.onclick = () => {
        const k = +b.dataset.k;
        picks = picks.includes(k) ? picks.filter(x => x !== k) : [...picks, k].slice(-2);
        bs.forEach(x => x.setAttribute("aria-pressed", picks.includes(+x.dataset.k)));
        go.disabled = picks.length !== 2;
      });
      go.onclick = () => {
        go.remove();
        bs.forEach(b => { const k = +b.dataset.k; b.disabled = true; const good = it.quotes[k].s === side; if (picks.includes(k)) b.classList.add(good ? "right" : "wrong"); });
        const good = picks.filter(k => it.quotes[k].s === side);
        pts += good.length;
        const f = $(".feedback", play);
        f.className = "feedback " + (good.length === 2 ? "right" : "wrong");
        f.innerHTML = good.length === 2 ? "<b>Both support your side.</b> Now explain them." : `<b>${good.length} of 2 support your side.</b> ${it.quotes.filter(x => x.s === side).map(x => "“" + x.t + "”").join(" and ")} would work. ${it.quotes.filter(x => x.s === "none").length ? "Some quotations don't really answer the question at all." : ""}`;
        step3(good.length ? good : it.quotes.map((x, k) => k).filter(k => it.quotes[k].s === side).slice(0, 1));
      };
    }
    function step3(ks) {
      const s3 = el("div");
      s3.innerHTML = `<p class="step-lbl">Step 3 · Choose the best explanation</p>`;
      $(".s2", play).appendChild(s3);
      let left = ks.length;
      ks.forEach(k => {
        const qx = it.quotes[k];
        const box = el("div", "pair");
        const ex = shuffle(qx.e.map((t, j) => ({ t, ok: j === 0 })));
        box.innerHTML = `<b>“${qx.t}”</b><div class="options">${ex.map(x => `<button type="button">${x.t}</button>`).join("")}</div><div class="feedback"></div>`;
        $$(".options button", box).forEach((b, j) => b.onclick = () => {
          $$(".options button", box).forEach((x, m) => { x.disabled = true; if (ex[m].ok) x.classList.add("right"); });
          if (!ex[j].ok) b.classList.add("wrong");
          const f = $(".feedback", box); f.className = "feedback " + (ex[j].ok ? "right" : "wrong");
          f.innerHTML = ex[j].ok ? "<b>Yes.</b> It explains <i>how</i> the words prove your point, in your own words." : "<b>Not the best.</b> Repeating the quotation, or saying something vague, does not earn the mark. The best explanation says what the words <i>show</i>.";
          if (ex[j].ok) pts++;
          if (--left === 0) { add(pts, 4); nextBtn($(".nx", play)); }
        });
        s3.appendChild(box);
      });
      if (!ks.length) { add(pts, 4); nextBtn($(".nx", play)); }
    }
  };
  // choose summary points, then write within the limit
  DRILL.summary = (it, play, top, add, nextBtn) => {
    const pts = shuffle(it.points.map((p, k) => ({ ...p, k })));
    play.innerHTML = `${top}<div class="ctx">${it.ctx}</div><div class="prompt">${it.q}</div>
      <p class="step-lbl">Step 1 · Tick only the points that answer the question</p><div class="tickopts">${pts.map(p => `<button type="button" aria-pressed="false" data-k="${p.k}">${p.t}</button>`).join("")}</div>
      <button class="btn small" type="button">Check my points</button><div class="feedback" aria-live="polite"></div><div class="s2"></div><div class="nx"></div>`;
    const bs = $$(".tickopts button", play);
    const sel = new Set();
    bs.forEach(b => b.onclick = () => { const k = +b.dataset.k; sel.has(k) ? sel.delete(k) : sel.add(k); b.setAttribute("aria-pressed", sel.has(k)); });
    $(".btn.small", play).onclick = e => {
      e.target.remove();
      let right = 0;
      bs.forEach(b => { const p = it.points[+b.dataset.k]; b.disabled = true; const chosen = sel.has(+b.dataset.k); if (p.use) b.classList.add("right"); if (chosen && !p.use) b.classList.add("wrong"); if (chosen === p.use) right++; });
      const f = $(".feedback", play);
      f.className = "feedback " + (right === bs.length ? "right" : "wrong");
      f.innerHTML = `<b>${right} of ${bs.length} decisions correct.</b> ${it.why}`;
      const s2 = $(".s2", play);
      s2.innerHTML = `<p class="step-lbl" style="margin-top:16px">Step 2 · Now write it in your own words (${it.limit} words or fewer)</p><textarea rows="4" style="width:100%;font:inherit;padding:12px;border-radius:12px;border:1.5px solid var(--line);background:var(--bg);color:var(--ink)"></textarea><div class="wc"><span class="n">0 words</span><span>Limit: ${it.limit}</span></div><button class="btn small" type="button">Compare with a model</button>`;
      const t = $("textarea", s2), wc = $(".wc", s2);
      t.oninput = () => { const n = words(t.value); $(".n", wc).textContent = n + " words"; wc.classList.toggle("over", n > it.limit); };
      $(".btn.small", s2).onclick = ev => {
        ev.target.remove();
        s2.appendChild(el("div", "fb info", `<b>Model (${words(it.model)} words):</b> ${it.model}`));
        add(right === bs.length ? 2 : right >= bs.length - 2 ? 1 : 0, 2);
        nextBtn($(".nx", play));
      };
    };
  };

  document.addEventListener("DOMContentLoaded", () => {
    setupListen();
    if (window.PAPER) setupPaper(window.PAPER);
    if (window.DRILLS) setupDrills(window.DRILLS);
  });
})();
