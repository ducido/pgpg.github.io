// Page chrome: reading progress, the side contents, reveal on scroll, BibTeX copy, and math.
// Math is written as HTML with a data-tex source; KaTeX replaces it when the CDN has loaded,
// otherwise the HTML fallback stays.
(() => {
  window.PGPG = window.PGPG || {};
  PGPG.tex = (el, src, display = false) => {
    if (!el) return;
    if (window.katex) {
      try { katex.render(src, el, { displayMode: display, throwOnError: false, strict: "ignore" }); return; } catch {}
    }
    el.textContent = src;
  };
  document.querySelectorAll("[data-tex]").forEach((el) => window.katex && PGPG.tex(el, el.dataset.tex));
  document.querySelectorAll("[data-tex-display]").forEach((el) => window.katex && PGPG.tex(el, el.dataset.texDisplay, true));

  const bar = document.getElementById("progress");
  const links = [...document.querySelectorAll(".side-nav a")];
  const secs = links.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);

  function onScroll() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    if (bar) bar.style.width = `${max > 0 ? (100 * h.scrollTop) / max : 0}%`;
    let cur = 0;
    secs.forEach((s, i) => { if (s.getBoundingClientRect().top < innerHeight * 0.35) cur = i; });
    links.forEach((a, i) => a.classList.toggle("on", i === cur));
  }
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const io = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  const copy = document.getElementById("copy");
  const bib = document.getElementById("bib");
  if (copy && bib) {
    copy.addEventListener("click", async () => {
      const text = bib.innerText.replace(copy.innerText, "").trim();
      try {
        await navigator.clipboard.writeText(text);
        copy.textContent = "Copied";
      } catch {
        copy.textContent = "Select and copy";
      }
      setTimeout(() => (copy.textContent = "Copy"), 1600);
    });
  }
})();
