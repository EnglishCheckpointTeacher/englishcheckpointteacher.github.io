// Multiple-choice quiz. Each page sets window.QUIZ = [{q, options, answer, why}] and has <div id="quiz" data-key="…">.
(function () {
  const box = document.getElementById("quiz");
  if (!box || !window.QUIZ) return;
  const all = window.QUIZ;
  const KEY = "ecp-best-" + (box.dataset.key || location.pathname);
  const ROUND = Math.min(10, all.length);
  let order, i, score, answered, missed;

  function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  function shuffle(a) { return a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(p => p[1]); }
  const icon = id => `<svg class="ic" aria-hidden="true"><use href="assets/icons.svg#${id}"/></svg>`;

  function intro() {
    const best = load();
    box.innerHTML = `
      <div class="quiz-intro">
        <h3>Ready when you are</h3>
        <p>${all.length} questions in the bank. Choose a quick round or try them all. Every answer comes with an explanation.</p>
        <div class="btn-row">
          <button class="btn" data-n="${ROUND}">Quick round · ${ROUND} questions ${icon("arrow")}</button>
          ${all.length > ROUND ? `<button class="btn ghost" data-n="${all.length}">Full test · ${all.length} questions</button>` : ""}
        </div>
        ${best ? `<div class="best">${icon("trophy")}Your best so far: ${best.score} out of ${best.total}</div>` : ""}
      </div>`;
    box.querySelectorAll("[data-n]").forEach(b => b.onclick = () => start(+b.dataset.n));
  }

  function start(n) {
    // shuffle the questions, and the options inside each question
    order = shuffle(all.slice()).slice(0, n).map(item => {
      const opts = shuffle(item.options.map((text, k) => ({ text, ok: k === item.answer })));
      return { q: item.q, why: item.why, options: opts.map(o => o.text), answer: opts.findIndex(o => o.ok) };
    });
    i = 0; score = 0; missed = [];
    show();
  }

  function show() {
    answered = false;
    const item = order[i];
    box.innerHTML = `
      <div class="quiz-top"><span>Question ${i + 1} of ${order.length}</span><span class="sc">Score: ${score}</span></div>
      <div class="progress"><div style="width:${(i / order.length) * 100}%"></div></div>
      <div class="q-text"></div>
      <div class="options"></div>
      <div class="feedback" aria-live="polite"></div>
      <button class="btn" id="next" hidden>Next question ${icon("arrow")}</button>`;
    box.querySelector(".q-text").textContent = item.q;
    const opts = box.querySelector(".options");
    item.options.forEach((text, n) => {
      const b = document.createElement("button");
      b.textContent = text;
      b.onclick = () => choose(n, b);
      opts.appendChild(b);
    });
    box.querySelector("#next").onclick = () => { i++; i < order.length ? show() : finish(); };
  }

  function choose(n, b) {
    if (answered) return;
    answered = true;
    const item = order[i];
    const buttons = box.querySelectorAll(".options button");
    buttons.forEach(x => x.disabled = true);
    buttons[item.answer].classList.add("right");
    const fb = box.querySelector(".feedback");
    if (n === item.answer) {
      score++;
      fb.className = "feedback right";
      fb.textContent = "Correct. " + item.why;
    } else {
      b.classList.add("wrong");
      missed.push(item);
      fb.className = "feedback wrong";
      fb.textContent = "Not quite. " + item.why;
    }
    box.querySelector(".sc").textContent = "Score: " + score;
    box.querySelector(".progress div").style.width = ((i + 1) / order.length) * 100 + "%";
    const next = box.querySelector("#next");
    next.hidden = false;
    if (i === order.length - 1) next.innerHTML = "See my result " + icon("arrow");
    next.focus({ preventScroll: true });
  }

  function finish() {
    const total = order.length, pct = Math.round((score / total) * 100);
    const best = load();
    if (!best || score / total > best.score / best.total || (score / total === best.score / best.total && total > best.total)) save({ score, total });
    const head = pct >= 80 ? "Excellent work" : pct >= 50 ? "Good effort" : "Keep practising";
    const msg = pct >= 80 ? "You're on track for Checkpoint. Try the full test, or come back tomorrow to keep it fresh."
      : pct >= 50 ? "You know a lot of this already. Read the explanations below, then have another go."
      : "Work through the guides on this page, then try again. Every attempt makes the next one easier.";
    box.innerHTML = `
      <div class="result">
        <div class="ring" style="--p:${pct}"><span>${score}/${total}</span></div>
        <div><h3>${head}</h3><p>You scored ${pct}%. ${msg}</p>
          <div class="btn-row" style="margin-top:6px"><button class="btn" id="again">Try again ${icon("refresh")}</button></div>
        </div>
      </div>
      ${missed.length ? `<div class="review"><h4>Review your mistakes</h4><ol></ol></div>` : ""}`;
    const ol = box.querySelector(".review ol");
    if (ol) missed.forEach(m => {
      const li = document.createElement("li");
      const b = document.createElement("b"); b.textContent = m.q;
      const em = document.createElement("em"); em.textContent = m.options[m.answer] + ". ";
      const span = document.createElement("span"); span.textContent = m.why;
      li.append(b, em, span);
      ol.appendChild(li);
    });
    box.querySelector("#again").onclick = intro;
    box.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  intro();
})();
