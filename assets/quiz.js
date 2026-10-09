// Simple multiple-choice quiz. Each page sets window.QUIZ = [{q, options, answer, why}].
(function () {
  const box = document.getElementById("quiz");
  if (!box || !window.QUIZ) return;
  const all = window.QUIZ;
  let order, i, score, answered;

  function shuffle(a) { return a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(p => p[1]); }

  function start() {
    order = shuffle(all.slice());
    i = 0; score = 0;
    show();
  }

  function show() {
    answered = false;
    const item = order[i];
    box.innerHTML = `
      <div class="quiz-top"><span>Question ${i + 1} of ${order.length}</span><span>Score: ${score}</span></div>
      <div class="progress"><div style="width:${(i / order.length) * 100}%"></div></div>
      <div class="q-text"></div>
      <div class="options"></div>
      <div class="feedback" aria-live="polite"></div>
      <button class="btn" id="next" hidden>Next question →</button>`;
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
      fb.textContent = "✓ Correct! " + item.why;
    } else {
      b.classList.add("wrong");
      fb.className = "feedback wrong";
      fb.textContent = "✗ Not quite. " + item.why;
    }
    box.querySelector(".quiz-top span:last-child").textContent = "Score: " + score;
    const next = box.querySelector("#next");
    next.hidden = false;
    if (i === order.length - 1) next.textContent = "See my result →";
    next.focus();
  }

  function finish() {
    const pct = Math.round((score / order.length) * 100);
    const msg = pct >= 80 ? "Excellent work — you're Checkpoint ready!" : pct >= 50 ? "Good effort! Review the tips above and try again." : "Keep practising — read the skills section and have another go.";
    box.innerHTML = `
      <div class="progress"><div style="width:100%"></div></div>
      <h3>You scored ${score} out of ${order.length} (${pct}%)</h3>
      <p>${msg}</p>
      <button class="btn" id="again">Try again</button>`;
    box.querySelector("#again").onclick = start;
  }

  start();
})();
