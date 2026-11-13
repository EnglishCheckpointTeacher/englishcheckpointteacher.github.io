// English Checkpoint — shared layout and behaviour. Loaded in <head> so the header renders with the page.
(function () {
  const root = document.documentElement;
  root.classList.add("js");

  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  window.ecpStore = { load, save };

  // ---- theme (follows the device until the visitor chooses) ----
  const savedTheme = load("ecp-theme");
  if (savedTheme === "light" || savedTheme === "dark") root.dataset.theme = savedTheme;
  function isDark() {
    return root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  }

  const ic = (id, cls) => `<svg class="ic${cls ? " " + cls : ""}" aria-hidden="true"><use href="assets/icons.svg#${id}"/></svg>`;
  const EXAMS = {
    "primary-english": { level: "primary", title: "English", sub: "First Language · 0058", icon: "book" },
    "primary-esl": { level: "primary", title: "English as a Second Language", sub: "Second Language · 0057", icon: "message" },
    "secondary-english": { level: "secondary", title: "English", sub: "First Language · 0861", icon: "book" },
    "secondary-esl": { level: "secondary", title: "English as a Second Language", sub: "Second Language · 0876", icon: "message" }
  };

  function menu(level, label, current) {
    const items = Object.keys(EXAMS).filter(k => EXAMS[k].level === level);
    const active = items.includes(current);
    return `<div class="menu t-${level}">
      <button class="nav-btn${active ? " current" : ""}" aria-expanded="false" aria-haspopup="true">${label}${ic("chevron")}</button>
      <div class="drop">${items.map(k => `<a href="${k}.html"${k === current ? ' aria-current="page"' : ""}>
        <span class="chip-ic">${ic(EXAMS[k].icon)}</span><span>${EXAMS[k].title}<small>${EXAMS[k].sub}</small></span></a>`).join("")}</div>
    </div>`;
  }

  class SiteHeader extends HTMLElement {
    connectedCallback() {
      const cur = this.getAttribute("current") || "";
      this.innerHTML = `<a class="skip" href="#main">Skip to content</a>
<div class="read-bar" aria-hidden="true"><i></i></div>
<header class="site-header">
  <div class="wrap">
    <a class="logo" href="index.html" aria-label="English Checkpoint home">
      <span class="logo-mark">${ic("logo")}</span>
      <span class="logo-text"><b>English Checkpoint</b><small>Cambridge exam preparation</small></span>
    </a>
    <nav class="nav" id="site-nav" aria-label="Main">
      <a href="index.html"${cur === "home" ? ' aria-current="page"' : ""}>Home</a>
      ${menu("primary", "Primary", cur)}
      ${menu("secondary", "Lower Secondary", cur)}
      <a href="glossary.html"${cur === "glossary" ? ' aria-current="page"' : ""}>Glossary</a>
    </nav>
    <button class="icon-btn theme-btn" type="button" aria-label="Switch between light and dark theme">${ic("moon", "i-moon")}${ic("sun", "i-sun")}</button>
    <button class="icon-btn menu-btn" type="button" aria-label="Menu" aria-expanded="false" aria-controls="site-nav">${ic("menu")}</button>
  </div>
</header>`;
      const header = this.querySelector(".site-header");
      this.querySelector(".theme-btn").addEventListener("click", () => {
        const next = isDark() ? "light" : "dark";
        root.dataset.theme = next;
        save("ecp-theme", next);
      });
      const menuBtn = this.querySelector(".menu-btn");
      menuBtn.addEventListener("click", () => {
        const open = header.classList.toggle("nav-open");
        menuBtn.setAttribute("aria-expanded", open);
        menuBtn.innerHTML = ic(open ? "close" : "menu");
      });
      const menus = [...this.querySelectorAll(".menu")];
      const setOpen = (m, open) => {
        m.classList.toggle("open", open);
        m.querySelector(".nav-btn").setAttribute("aria-expanded", open);
      };
      menus.forEach(m => {
        m.querySelector(".nav-btn").addEventListener("click", e => {
          e.stopPropagation();
          const open = !m.classList.contains("open");
          menus.forEach(x => setOpen(x, false));
          setOpen(m, open);
        });
        if (matchMedia("(hover: hover)").matches) {
          let t;
          m.addEventListener("mouseenter", () => { clearTimeout(t); menus.forEach(x => setOpen(x, x === m)); });
          m.addEventListener("mouseleave", () => { t = setTimeout(() => setOpen(m, false), 180); });
        }
      });
      document.addEventListener("click", () => menus.forEach(m => setOpen(m, false)));
      document.addEventListener("keydown", e => {
        if (e.key !== "Escape") return;
        menus.forEach(m => setOpen(m, false));
        if (header.classList.contains("nav-open")) menuBtn.click();
      });
    }
  }

  class SiteFooter extends HTMLElement {
    connectedCallback() {
      this.innerHTML = `<footer class="site-footer">
  <div class="wrap">
    <div class="cols">
      <div>
        <a class="logo" href="index.html">
          <span class="logo-mark">${ic("logo")}</span>
          <span class="logo-text"><b>English Checkpoint</b><small>Cambridge exam preparation</small></span>
        </a>
        <p>Independent revision and practice materials for Cambridge Checkpoint English, written by Ms. Hanan Khalid.</p>
      </div>
      <div>
        <h4>Primary · Stage 6</h4>
        <ul>
          <li><a href="primary-english.html">English (0058)</a></li>
          <li><a href="primary-esl.html">English as a Second Language (0057)</a></li>
        </ul>
      </div>
      <div>
        <h4>Lower Secondary · Stage 9</h4>
        <ul>
          <li><a href="secondary-english.html">English (0861)</a></li>
          <li><a href="secondary-esl.html">English as a Second Language (0876)</a></li>
        </ul>
      </div>
      <div>
        <h4>Study tools</h4>
        <ul>
          <li><a href="glossary.html">Glossary of English terms</a></li>
          <li><a href="index.html#which">First or Second Language?</a></li>
          <li><a href="index.html#faq">Questions and answers</a></li>
        </ul>
      </div>
    </div>
    <div class="base"><span>© ${new Date().getFullYear()} Ms. Hanan Khalid · English Checkpoint</span><span>An independent site, not affiliated with or endorsed by Cambridge University Press &amp; Assessment</span></div>
  </div>
</footer>
<button class="icon-btn to-top" type="button" aria-label="Back to top">${ic("up")}</button>`;
      this.querySelector(".to-top").addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
    }
  }
  customElements.define("site-header", SiteHeader);
  customElements.define("site-footer", SiteFooter);

  // ---- everything below runs once the page content exists ----
  document.addEventListener("DOMContentLoaded", () => {
    const header = document.querySelector(".site-header");
    const bar = document.querySelector(".read-bar i");
    const toTop = document.querySelector(".to-top");
    let ticking = false;
    function onScroll() {
      ticking = false;
      const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
      if (header) header.classList.toggle("scrolled", y > 8);
      if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      if (toTop) toTop.classList.toggle("show", y > 900);
    }
    addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();

    // table of contents with scroll-spy (exam pages)
    const toc = document.querySelector(".toc");
    const sections = [...document.querySelectorAll(".content > section[id][data-nav]")];
    if (toc && sections.length) {
      toc.innerHTML = `<h2>On this page</h2><ol>${sections.map(s => `<li><a href="#${s.id}">${s.dataset.nav}</a></li>`).join("")}</ol>
        <div class="toc-extra"><b>Revising on paper?</b><span>Print this page to get every guide and checklist in one handout.</span><a role="button" tabindex="0" class="print-link">Print this page</a></div>`;
      const links = new Map(sections.map(s => [s.id, toc.querySelector(`a[href="#${s.id}"]`)]));
      const pr = toc.querySelector(".print-link");
      pr.addEventListener("click", () => print());
      pr.addEventListener("keydown", e => { if (e.key === "Enter") print(); });
      let current = null;
      const spy = () => {
        const line = (header ? header.offsetHeight : 0) + 120;
        let now = sections[0];
        for (const s of sections) if (s.getBoundingClientRect().top <= line) now = s;
        if (now.id === current) return;
        current = now.id;
        links.forEach((a, id) => a.classList.toggle("on", id === current));
        const a = links.get(current), list = toc.querySelector("ol");
        if (list.scrollWidth > list.clientWidth) list.scrollTo({ left: a.offsetLeft - list.offsetLeft - 40, behavior: "smooth" });
      };
      addEventListener("scroll", spy, { passive: true });
      spy();
    }

    // reveal on scroll
    const targets = document.querySelectorAll(".section-head, .card, .qtype, .steps li, .guide details, .faq details, .table-scroll, .band, .model-answer, .checklist, .quiz, .plan li, .stats, .about, .term");
    if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
      }, { rootMargin: "0px 0px -6% 0px" });
      targets.forEach(el => {
        const sibs = el.parentElement ? [...el.parentElement.children] : [];
        el.style.setProperty("--d", Math.min(sibs.indexOf(el), 5) * 0.06 + "s");
        el.classList.add("reveal");
        io.observe(el);
      });
      // safety net: never leave content hidden
      setTimeout(() => document.querySelectorAll(".reveal:not(.in)").forEach(el => {
        if (el.getBoundingClientRect().top < innerHeight) el.classList.add("in");
      }), 1200);
    }

    // tabs
    document.querySelectorAll("[data-tabs]").forEach(group => {
      const tabs = [...group.querySelectorAll(".tabs button")];
      const panels = [...group.querySelectorAll(".panel")];
      const pick = n => {
        tabs.forEach((t, i) => { t.setAttribute("aria-selected", i === n); t.tabIndex = i === n ? 0 : -1; });
        panels.forEach((p, i) => p.hidden = i !== n);
      };
      tabs.forEach((t, i) => {
        t.setAttribute("role", "tab");
        t.addEventListener("click", () => pick(i));
        t.addEventListener("keydown", e => {
          const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
          if (!d) return;
          const n = (i + d + tabs.length) % tabs.length;
          pick(n); tabs[n].focus();
        });
      });
      pick(0);
    });

    // inline multiple choice: <div class="mcq"> … <button data-ok> marks the right answer
    document.querySelectorAll(".mcq").forEach(q => {
      const buttons = [...q.querySelectorAll(".options button")];
      const why = q.querySelector(".why");
      buttons.forEach(b => b.addEventListener("click", () => {
        buttons.forEach(x => { x.disabled = true; if (x.hasAttribute("data-ok")) x.classList.add("right"); });
        if (!b.hasAttribute("data-ok")) b.classList.add("wrong");
        if (why) why.hidden = false;
      }));
    });

    // checklists remember what has been ticked
    document.querySelectorAll(".checklist[data-key]").forEach(list => {
      const key = "ecp-check-" + list.dataset.key;
      const boxes = [...list.querySelectorAll("input[type=checkbox]")];
      const fill = list.querySelector(".progress div"), count = list.querySelector(".check-count");
      let state = {};
      try { state = JSON.parse(load(key) || "{}"); } catch (e) {}
      const update = () => {
        const done = boxes.filter(b => b.checked).length;
        if (fill) fill.style.width = (done / boxes.length) * 100 + "%";
        if (count) count.textContent = `${done} of ${boxes.length} done`;
      };
      boxes.forEach((b, i) => {
        b.checked = !!state[i];
        b.addEventListener("change", () => { state[i] = b.checked; save(key, JSON.stringify(state)); update(); });
      });
      const reset = list.querySelector(".check-reset");
      if (reset) reset.addEventListener("click", () => { state = {}; boxes.forEach(b => b.checked = false); save(key, "{}"); update(); });
      update();
    });
  });
})();
