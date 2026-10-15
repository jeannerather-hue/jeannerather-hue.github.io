/* Renders the site from window.PORTFOLIO (content.js). You shouldn't need to edit this file. */
(function () {
  "use strict";
  const P = window.PORTFOLIO;
  if (!P) return;

  const $ = (sel) => document.querySelector(sel);
  let focus = (() => { try { const f = new URLSearchParams(location.search).get("focus"); return f && P.focus[f] ? f : ""; } catch (e) { return ""; } })();

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  const STATUS = { concept: "Concept", prototype: "Prototype", "in-development": "In development", testing: "Working build · in testing", published: "Published" };
  const RESULT = { measured: "Measured result", qualitative: "Qualitative result" };
  const icon = {
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 4v12m0 0-5-5m5 5 5-5M5 20h14"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/></svg>',
    ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>',
  };
  const badge = (cls, text) => `<span class="badge b-${esc(cls)}">${esc(text)}</span>`;
  const resultBadge = (r) => badge(r.type, RESULT[r.type] || r.type);
  const tags = (arr) => (arr && arr.length ? `<ul class="tags">${arr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "");

  /* ---------- Resume download ----------
     In a published artifact, downloads go through the viewer's save prompt.
     Opened as plain files or on a normal web host, the link downloads directly. */
  let downloadsApi = null;
  if (window.claude && typeof window.claude.use === "function") {
    window.claude.use("downloads").then((d) => { downloadsApi = d; }).catch(() => {});
  }
  function resumeButton(primary) {
    const p = P.person;
    if (!p.resume) return "";
    const name = p.resume.split("/").pop();
    return `<a class="btn${primary ? " btn-primary" : ""} js-resume" href="${esc(p.resume)}" download="${esc(name)}">${icon.down}Download Resume</a>`;
  }
  document.addEventListener("click", async (e) => {
    const a = e.target.closest(".js-resume");
    if (!a || !downloadsApi) return;
    e.preventDefault();
    try {
      const res = await fetch(a.getAttribute("href"));
      const blob = await res.blob();
      await downloadsApi.save({ filename: a.getAttribute("download"), data: blob });
    } catch (err) {
      if (err && err.code === "declined") return;
      setStatus("The download didn't start here. Email me and I'll send my resume.");
    }
  });

  function setStatus(msg) {
    const el = $("#contact-status");
    if (el) { el.textContent = msg; if (msg) setTimeout(() => { if (el.textContent === msg) el.textContent = ""; }, 4000); }
  }

  /* ---------- Navigation ---------- */
  function setupNav() {
    const btn = document.querySelector(".menu-btn");
    const nav = $("#nav");
    btn.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", (e) => {
      if (e.target.closest("a")) { nav.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); }
    });
  }

  const caseById = (id) => P.caseStudies.find((c) => c.id === id);
  const caseLinks = (ids) => (ids || []).map(caseById).filter(Boolean)
    .map((c) => `<a href="#case-${esc(c.id)}">${esc(c.title)}</a>`).join("");

  /* ---------- Home ---------- */
  function orderedCases() {
    const list = P.caseStudies.slice();
    if (!focus) return list;
    return list.map((c, i) => ({ c, i, hit: (c.focus || []).includes(focus) ? 0 : 1 }))
      .sort((a, b) => a.hit - b.hit || a.i - b.i).map((x) => x.c);
  }

  function renderHero() {
    const f = focus ? P.focus[focus] : null;
    $("#hero-eyebrow").textContent = (f && f.eyebrow) || P.hero.eyebrow;
    $("#hero-title").textContent = (f && f.headline) || P.hero.headline;
    $("#hero-intro").textContent = P.hero.intro;
    $("#hero-invite").textContent = P.hero.invite;
    $("#hero-actions").innerHTML =
      `<a class="btn btn-primary" href="#work">View My Work ${icon.arrow}</a>` + resumeButton(false) + `<a class="btn" href="#contact">Contact</a>`;
    $("#proof").innerHTML = P.hero.proof.map((p) =>
      `<li><span class="pv">${esc(p.value)}</span><span class="pl">${esc(p.label)}</span><span class="ps">${esc(p.source)}</span></li>`).join("");
  }

  function renderFocusBar() {
    const bar = $("#focus-bar");
    const opts = [["", "All work"]].concat(Object.entries(P.focus).map(([k, v]) => [k, v.label]));
    bar.innerHTML = `<span class="label">Emphasize:</span>` +
      opts.map(([k, label]) => `<button type="button" class="chip" data-focus="${esc(k)}" aria-pressed="${k === focus}">${esc(label)}</button>`).join("");
    bar.querySelectorAll("[data-focus]").forEach((b) => b.addEventListener("click", () => {
      focus = b.dataset.focus;
      renderHero(); renderFocusBar(); renderCases();
    }));
  }

  function renderCases() {
    $("#cases").innerHTML = orderedCases().map((c) => {
      const metrics = c.metrics.length
        ? c.metrics.map((m) => `<div><span class="mv">${esc(m.value)}</span><span class="ml">${esc(m.label)}</span></div>`).join("")
        : `<div><span class="mv mv-text">${esc(c.deliverable || RESULT[c.result.type])}</span><span class="ml">Qualitative outcome</span></div>`;
      return `<article class="case-card" data-case="${esc(c.id)}">
        <p class="card-org">${esc(c.org)}</p>
        <h3><a href="#case-${esc(c.id)}">${esc(c.title)}</a></h3>
        <div class="card-metrics">${metrics}</div>
        <p class="card-problem">${esc(c.problem.split(". ")[0].replace(/\.$/, ""))}.</p>
        <div class="card-foot">
          ${resultBadge(c.result)}
          ${c.status ? badge(c.statusType || "progress", c.status) : ""}
          <a class="card-more" href="#case-${esc(c.id)}" aria-label="Read the case study: ${esc(c.title)}">Read case study ${icon.arrow}</a>
        </div>
      </article>`;
    }).join("");
  }

  function renderDelivery() {
    const D = P.delivery;
    $("#delivery-intro").textContent = D.intro;
    $("#delivery-flow").innerHTML = D.flow.map((f) => `<li>${esc(f)}</li>`).join("");
    $("#method-grid").innerHTML = D.methods.map((m) =>
      `<div class="method"><h3>${esc(m.title)}</h3><p>${esc(m.text)}</p>${m.cases && m.cases.length ? `<p class="seen-in"><span>Seen in</span>${caseLinks(m.cases)}</p>` : ""}</div>`).join("");
  }

  function renderTools() {
    $("#tool-grid").innerHTML = P.tools.map((g) =>
      `<div class="tool-group"><h3>${esc(g.group)}</h3><p>${esc(g.use)}</p>${tags(g.items)}${g.cases && g.cases.length ? `<p class="seen-in"><span>Used in</span>${caseLinks(g.cases)}</p>` : ""}</div>`).join("");
  }

  function renderProjects() {
    const tierItem = (it) => (typeof it === "string" ? `<li>${esc(it)}</li>`
      : `<li><span class="tier-text">${esc(it.text)}</span>${it.note ? `<span class="tier-note">${esc(it.note)}</span>` : ""}${it.link ? `<a class="tier-link" href="${esc(it.link)}">${esc(it.linkLabel || "More")} ${icon.arrow}</a>` : ""}</li>`);
    $("#tiers").innerHTML = P.aiData.map((g) =>
      `<div class="tier"><h3>${esc(g.title)}</h3><ul>${g.items.map(tierItem).join("")}</ul></div>`).join("");

    const R = P.research;
    $("#research").innerHTML = `
      <header class="research-head">
        <div class="research-title"><h3 id="research-title">${esc(R.name)}</h3>${badge("research", R.status)}</div>
        <p class="research-label">${esc(R.label)}</p>
      </header>
      <div class="research-grid">
        <div><h4>Problem</h4><p>${esc(R.problem)}</p></div>
        <div><h4>My role</h4><p>${esc(R.role)}</p></div>
      </div>
      <ul class="facts-strip">${R.facts.map((f) => `<li><span class="fv">${esc(f.value)}</span><span class="fl">${esc(f.label)}</span></li>`).join("")}</ul>
      <div class="research-parts">${R.parts.map((p) => `<div class="part"><h4>${esc(p.title)}</h4><p>${esc(p.text)}</p></div>`).join("")}</div>
      <div class="research-grid">
        <div><h4>Forecast features · 16, from daily bars</h4>${tags(R.features)}</div>
        <div><h4>Look-ahead and reproducibility checks</h4><ul class="checks">${R.checks.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div>
      </div>
      <div class="research-grid">
        <div><h4>Evaluation design</h4><p>${esc(R.evaluation)}</p></div>
        <div><h4>Limitations</h4><p>${esc(R.limitations)}</p></div>
      </div>
      <div class="research-grid">
        <div><h4>What I learned</h4><p class="lesson">${esc(R.lesson)}</p></div>
        <div><h4>Tools</h4>${tags(R.tools)}</div>
      </div>`;

    $("#app-list").innerHTML = P.apps.map((a) => {
      const art = a.icon
        ? `<img class="app-icon" src="${esc(a.icon)}" alt="${esc(a.name)} app icon" width="88" height="88">`
        : `<div class="week" aria-hidden="true">${["M", "T", "W", "T", "F", "S", "S"].map((d) => `<span>${d}</span>`).join("")}</div>`;
      const rows = [["For", a.audience], ["Problem", a.problem], ["What I've done", a.did], ["Next milestone", a.next]]
        .filter(([, v]) => v).map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("");
      return `<article class="app" id="app-${esc(a.id)}">
        <div class="app-cover" style="--c1:${esc(a.color)};--c2:${esc(a.color2)}">
          ${art}
          <p class="app-tag">${esc(a.tagline)}</p>
          <span class="cover-note">${a.icon ? "App icon from the project files" : "Concept cover"}</span>
        </div>
        <div class="app-body">
          <div class="app-head"><h4 class="app-name">${esc(a.name)}</h4><span class="app-badges">${badge(a.status, STATUS[a.status] || a.status)}${a.extraBadge ? badge("done", a.extraBadge) : ""}</span></div>
          <dl>${rows}</dl>
          ${a.link ? `<div class="actions"><a class="btn" href="${esc(a.link)}" target="_blank" rel="noopener">${icon.ext}${esc(a.linkLabel || "Visit")}</a></div>` : ""}
        </div>
      </article>`;
    }).join("");
  }

  function renderAbout() {
    $("#about-text").innerHTML = P.about.map((p) => `<p>${esc(p)}</p>`).join("");
    $("#education").innerHTML = P.education.map((e) => `<li>${esc(e)}</li>`).join("");
    $("#expertise").innerHTML = P.expertise.map((x) => `<div><dt>${esc(x.title)}</dt><dd>${esc(x.text)}</dd></div>`).join("");
  }

  function renderExperience() {
    $("#exp-list").innerHTML = P.experience.map((e) =>
      `<li><span class="dates">${esc(e.dates)}</span><span class="org">${esc(e.org)}</span><span class="title">${esc(e.title)}</span></li>`).join("");
  }

  function renderContact() {
    const p = P.person;
    $("#contact-email").textContent = p.email;
    const links = [];
    if (p.linkedin) links.push(`<a class="btn" href="${esc(p.linkedin)}" target="_blank" rel="noopener">${icon.ext}LinkedIn</a>`);
    if (p.github) links.push(`<a class="btn" href="${esc(p.github)}" target="_blank" rel="noopener">${icon.ext}GitHub</a>`);
    $("#contact-actions").innerHTML =
      `<a class="btn btn-primary" href="mailto:${esc(p.email)}">${icon.mail}Email me</a>` +
      `<button type="button" class="btn" id="copy-email">${icon.copy}Copy address</button>` +
      resumeButton(false) + links.join("");
    $("#copy-email").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(p.email); setStatus("Email address copied."); }
      catch {
        const r = document.createRange(); r.selectNodeContents($("#contact-email"));
        const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        setStatus("Address selected. Copy it with your keyboard.");
      }
    });
  }

  /* Illustrative program map for the data-platform case. Generic, sanitized: not a company artifact. */
  function programMap() {
    const col = (title, items, cls) => `<div class="pm-col ${cls}"><h3>${title}</h3><ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul></div>`;
    return `<figure class="pmap">
      <figcaption><span class="badge b-research">Illustrative example</span> A recreated, simplified view of how the program fit together. Not a company artifact or as-built architecture.</figcaption>
      <div class="pm-grid">
        ${col("Workstreams", ["Platform delivery", "Master data management", "Source integration", "Data governance", "Systems-integrator evaluation", "ERP modernization"], "pm-work")}
        ${col("Governance ownership", ["Access control", "Data quality", "MDM monitoring", "Business validation"], "pm-gov")}
        ${col("Delivery gates", ["Planning baseline", "Readiness review", "Vendor decision", "Build and integration", "Business validation sign-off"], "pm-gates")}
      </div>
      <p class="pm-band">Tracked across every workstream: <strong>dependencies</strong> · <strong>risks</strong> · <strong>decisions</strong> · <strong>executive reporting</strong></p>
      <p class="pm-status">Status: my assigned program deliverables completed.</p>
    </figure>`;
  }

  /* ---------- Case study view (#case-<id>) ---------- */
  const homeSections = () => document.querySelectorAll("#main > section");
  function showCase(id) {
    const list = orderedCases();
    const idx = list.findIndex((c) => c.id === id);
    const view = $("#case-view");
    if (idx < 0) { view.hidden = true; homeSections().forEach((s) => (s.hidden = false)); return false; }
    const c = list[idx];
    const sec = (label, body) => (body ? `<section class="case-sec"><h2>${label}</h2><div class="content">${body}</div></section>` : "");
    const ul = (arr) => `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
    const prev = list[idx - 1], next = list[idx + 1];
    const metrics = c.metrics.length
      ? `<ul class="case-metrics">${c.metrics.map((m) => `<li><span class="mv">${esc(m.value)}</span><span class="ml">${esc(m.label)}</span></li>`).join("")}</ul>` : "";
    const outcome = `<div class="outcome-box">
        <div class="case-badges">${resultBadge(c.result)}${c.status ? badge(c.statusType || "progress", c.status) : ""}</div>
        ${c.deliverable ? `<p class="deliverable"><span>Deliverable</span>${esc(c.deliverable)}</p>` : ""}
        <p>${esc(c.result.text)}</p></div>`;
    view.innerHTML = `
      <header class="wrap case-hero">
        <a class="back" href="#work">← All case studies</a>
        <p class="eyebrow">${esc(c.org)}</p>
        <h1 id="case-title" tabindex="-1">${esc(c.title)}</h1>
        <div class="case-badges">${resultBadge(c.result)}${c.status ? badge(c.statusType || "progress", c.status) : ""}</div>
        ${metrics}
      </header>
      <div class="wrap case-body">
        ${sec("Challenge", `<p>${esc(c.problem)}</p>`)}
        ${sec("My role", `<p>${esc(c.role)}</p>`)}
        ${sec("What I did", ul(c.did))}
        ${c.diagram ? sec("Program map", programMap()) : ""}
        ${sec("Tools and methods", tags(c.methods) + (c.methodsNote ? `<p class="note">${esc(c.methodsNote)}</p>` : ""))}
        ${sec("Outcome", outcome)}
        ${c.lesson ? sec("What I learned", `<p class="lesson">${esc(c.lesson)}</p>`) : ""}
        <nav class="case-nav" aria-label="More case studies">
          ${prev ? `<a href="#case-${esc(prev.id)}">← ${esc(prev.title)}</a>` : "<span></span>"}
          ${next ? `<a href="#case-${esc(next.id)}">${esc(next.title)} →</a>` : ""}
        </nav>
      </div>`;
    homeSections().forEach((s) => (s.hidden = true));
    view.hidden = false;
    window.scrollTo(0, 0);
    const h = $("#case-title"); if (h) h.focus({ preventScroll: true });
    return true;
  }

  function goTo(hash, push) {
    const h = decodeURIComponent((hash || "").replace(/^#/, ""));
    if (push) { try { history.pushState(null, "", "#" + h); } catch (e) { /* sandboxed: ignore */ } }
    if (h.startsWith("case-") && showCase(h.slice(5))) return;
    $("#case-view").hidden = true;
    homeSections().forEach((s) => (s.hidden = false));
    const el = h && document.getElementById(h);
    if (el) el.scrollIntoView({ block: "start" });
    else if (!h) window.scrollTo(0, 0);
  }
  function route() { goTo(location.hash, false); }

  // Handle every in-page link in script so navigation works the same in a browser and inside an embedded viewer.
  document.addEventListener("click", (e) => {
    const card = e.target.closest(".case-card");
    const a = e.target.closest('a[href^="#"]');
    if (!a && card && !e.target.closest("button")) { e.preventDefault(); goTo("#case-" + card.dataset.case, true); return; }
    if (!a || a.classList.contains("skip")) return;
    e.preventDefault();
    goTo(a.getAttribute("href"), true);
  });
  window.addEventListener("popstate", route);

  setupNav();
  renderHero(); renderFocusBar(); renderCases(); renderDelivery(); renderTools(); renderProjects(); renderAbout(); renderExperience(); renderContact();
  route();
})();
