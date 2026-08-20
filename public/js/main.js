/* =========================================================================
   Mehmet Rahbay Mimarlık — ön yüz etkileşimleri
   ========================================================================= */
(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  /* ------------------------------------------------------------ preloader */
  const pre = $('#preloader');

  function runPreloader(done) {
    if (!pre) return done();
    if (reduced) { pre.classList.add('done'); return done(); }

    const out = $('[data-pl-count]', pre);
    const bar = $('.pl-bar', pre);
    const clip = $('#plClipRect', pre);
    const crane = $('.pl-crane', pre);
    const wins = $$('.pl-build .win', pre);
    const GROUND = 274, TOP = 34;

    let p = 0, loaded = document.readyState === 'complete', finished = false;
    addEventListener('load', () => { loaded = true; });
    const t0 = performance.now();

    function paint(v) {
      const h = (GROUND - TOP) * (v / 100);
      const top = GROUND - h;
      if (clip) { clip.setAttribute('y', top.toFixed(1)); clip.setAttribute('height', h.toFixed(1)); }
      if (crane) crane.setAttribute('transform', `translate(0 ${(top - 24).toFixed(1)})`);
      for (const w of wins) {
        const wy = parseFloat(w.getAttribute('data-y'));
        if (wy > top + 4) w.classList.add('lit');
      }
      if (out) out.textContent = Math.round(v);
      if (bar) bar.style.width = v + '%';
    }

    function finish() {
      if (finished) return;
      finished = true;
      paint(100);
      pre.classList.add('built');
      setTimeout(() => {
        pre.classList.add('done');
        document.body.classList.add('loaded');
        done();
      }, 620);
    }

    (function frame(now) {
      const el = now - t0;
      // yükleme bitmediyse %92'de bekler, bittiğinde tepeye çıkar
      const target = loaded && el > 900 ? 100 : Math.min(92, el / 16);
      p += (target - p) * 0.09;
      if (p > 99.4) p = 100;
      paint(p);
      if (p >= 100) return finish();
      if (el > 6500) return finish();          // güvenlik ağı
      requestAnimationFrame(frame);
    })(t0);
  }

  /* ------------------------------------------------------------- header */
  function initHeader() {
    const header = $('.header');
    if (!header) return;
    let last = 0;
    const onScroll = () => {
      const y = scrollY;
      header.classList.toggle('solid', y > 40);
      header.classList.toggle('hidden', y > 420 && y > last && !document.body.classList.contains('menu-open'));
      last = y;
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const burger = $('.burger');
    if (burger) burger.addEventListener('click', () => {
      document.body.classList.toggle('menu-open');
      document.body.classList.toggle('no-scroll', document.body.classList.contains('menu-open'));
    });
    $$('.menu-links a').forEach((a) => a.addEventListener('click', () => {
      document.body.classList.remove('menu-open', 'no-scroll');
    }));
  }

  /* ------------------------------------------------ görünüme girince animasyon */
  let io;
  function observe(root) {
    const els = $$('.reveal, .mask-up, .img-clip, [data-count]', root || document);
    if (reduced) { els.forEach((el) => el.classList.add('in')); return; }
    if (!io) {
      io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          en.target.classList.add('in');
          if (en.target.hasAttribute('data-count')) countUp(en.target);
          io.unobserve(en.target);
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    }
    els.forEach((el) => io.observe(el));
  }

  function countUp(el) {
    const target = parseFloat(el.getAttribute('data-count')) || 0;
    const dur = 1500;
    const t0 = performance.now();
    (function step(t) {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * e).toLocaleString('tr-TR');
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ---------------------------------------------------------- parallax */
  function initParallax() {
    if (reduced) return;
    const items = $$('[data-parallax]');
    if (!items.length) return;
    let ticking = false;
    const update = () => {
      const vh = innerHeight;
      items.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const amt = parseFloat(el.getAttribute('data-parallax')) || 0.1;
        const prog = (r.top + r.height / 2 - vh / 2) / vh;
        const img = el.tagName === 'IMG' ? el : el.querySelector('img');
        if (img) img.style.transform = `translate3d(0, ${(-prog * amt * 100).toFixed(2)}px, 0) scale(1.06)`;
      });
      ticking = false;
    };
    addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    addEventListener('resize', update);
    update();
  }

  /* --------------------------------------------------- sayfa geçiş perdesi */
  function initTransitions() {
    const curtain = $('#transition');
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a || reduced || !curtain) return;
      const href = a.getAttribute('href') || '';
      if (a.target === '_blank' || href.startsWith('#') || href.startsWith('http') ||
          href.startsWith('mailto') || href.startsWith('tel') || a.hasAttribute('data-top')) return;
      e.preventDefault();
      curtain.classList.add('out');
      setTimeout(() => { location.href = href; }, 620);
    });
    const top = $('[data-top]');
    if (top) top.addEventListener('click', (e) => { e.preventDefault(); scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); });
  }

  /* ------------------------------------------------------------- render */
  function fill(sel, value, html) {
    $$(sel).forEach((el) => { if (html) el.innerHTML = value; else el.textContent = value; });
  }

  function renderHome(c) {
    document.title = `${c.site.name} — ${c.site.role}`;
    fill('[data-brand-name]', c.site.name);
    fill('[data-brand-role]', c.site.role);
    fill('[data-brand-mark]', c.site.logo || 'MR');
    fill('[data-pl-name]', c.site.name);
    fill('[data-foot-name]', c.site.name);
    fill('[data-foot-note]', c.site.footerNote || '');
    fill('[data-year]', new Date().getFullYear());

    /* hero */
    fill('[data-hero-eyebrow]', c.hero.eyebrow);
    const h1 = $('[data-hero-title]');
    if (h1) h1.innerHTML = (c.hero.titleLines || []).map((l, i) =>
      `<span class="line-mask"><span class="${i % 2 ? 'indent' : ''}">${esc(l)}</span></span>`).join('');
    const hi = $('[data-hero-img]');
    if (hi) hi.src = c.hero.image;
    fill('[data-hero-tagline]', c.hero.tagline || '');
    fill('[data-hero-sub]', c.hero.subtitle);
    fill('[data-hero-cta]', c.hero.cta);
    fill('[data-hero-hint]', c.hero.scrollHint || 'Kaydır');

    /* marquee */
    const words = (c.marquee && c.marquee.length ? c.marquee : ['Mimarlık']);
    $$('[data-marquee]').forEach((tr) => {
      tr.innerHTML = words.concat(words).map((w) => `<span>${esc(w)}</span>`).join('');
    });

    /* hakkında */
    fill('[data-about-eyebrow]', c.about.eyebrow);
    fill('[data-about-title]', c.about.title);
    const ai = $('[data-about-img]'); if (ai) ai.src = c.about.image;
    const ab = $('[data-about-body]');
    if (ab) ab.innerHTML = (c.about.paragraphs || []).map((p, i) =>
      `<p class="reveal" data-d="${Math.min(i + 1, 5)}">${esc(p)}</p>`).join('');
    fill('[data-about-sign]', c.about.signature || '');

    const st = $('[data-stats]');
    if (st) st.innerHTML = (c.stats || []).map((s, i) =>
      `<div class="stat reveal" data-d="${Math.min(i + 1, 5)}">
         <b><span data-count="${esc(s.value)}">0</span>${esc(s.suffix || '')}</b>
         <span>${esc(s.label)}</span>
       </div>`).join('');

    /* projeler */
    fill('[data-proj-eyebrow]', c.projectsSection.eyebrow);
    fill('[data-proj-title]', c.projectsSection.title);
    fill('[data-proj-text]', c.projectsSection.text);
    const pr = $('[data-projects]');
    if (pr) pr.innerHTML = (c.projects || []).map((p, i) => `
      <article class="project reveal" data-d="${(i % 3) + 1}">
        <a href="/proje/${esc(p.slug)}">
          <figure class="project-media">
            <span class="idx">${String(i + 1).padStart(2, '0')}</span>
            <img src="${esc(p.cover)}" alt="${esc(p.title)}" loading="lazy">
            <span class="go">↗</span>
          </figure>
          <div class="project-info">
            <h3 class="h3">${esc(p.title)}</h3>
            <span class="mono meta">${esc(p.category)}<br>${esc(p.year)}</span>
          </div>
        </a>
      </article>`).join('');

    /* hizmetler */
    fill('[data-serv-eyebrow]', c.services.eyebrow);
    fill('[data-serv-title]', c.services.title);
    const sv = $('[data-services]');
    if (sv) sv.innerHTML = (c.services.items || []).map((s) => `
      <div class="service reveal">
        <span class="mono no">${esc(s.no)}</span>
        <h3 class="h3">${esc(s.title)}</h3>
        <p>${esc(s.text)}</p>
      </div>`).join('');

    /* süreç */
    fill('[data-proc-eyebrow]', c.process.eyebrow);
    fill('[data-proc-title]', c.process.title);
    const sp = $('[data-steps]');
    if (sp) sp.innerHTML = (c.process.steps || []).map((s, i) => `
      <div class="step reveal" data-d="${Math.min(i + 1, 5)}">
        <span class="no">${esc(s.no)}</span>
        <h4>${esc(s.title)}</h4>
        <p>${esc(s.text)}</p>
      </div>`).join('');

    /* iletişim */
    fill('[data-cont-eyebrow]', c.contact.eyebrow);
    fill('[data-cont-title]', c.contact.title);
    fill('[data-cont-text]', c.contact.text);
    const ml = $('[data-cont-mail]');
    if (ml) { ml.textContent = c.contact.email; ml.href = 'mailto:' + c.contact.email; }
    const cs = $('[data-cont-side]');
    if (cs) cs.innerHTML = `
      <div class="c-item reveal"><h5>Telefon</h5><a href="tel:${esc((c.contact.phone || '').replace(/\s/g, ''))}">${esc(c.contact.phone)}</a></div>
      <div class="c-item reveal" data-d="1"><h5>Adres</h5><p>${esc(c.contact.address)}</p></div>
      <div class="c-item reveal" data-d="2"><h5>Çalışma Saatleri</h5><p>${esc(c.contact.hours)}</p></div>
      <div class="c-item reveal" data-d="3"><h5>Takip</h5>
        <div class="socials">${(c.contact.socials || []).map((s) =>
          `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join('')}</div>
      </div>`;
    fill('[data-menu-mail]', c.contact.email);
    fill('[data-menu-phone]', c.contact.phone);
    fill('[data-menu-addr]', c.contact.address);
  }

  /* ------------------------------------------------------- proje detay */
  function renderProject(c) {
    const slug = decodeURIComponent(location.pathname.split('/').filter(Boolean).pop() || '');
    const list = c.projects || [];
    const i = list.findIndex((p) => p.slug === slug);
    const p = list[i];
    if (!p) { location.replace('/'); return null; }

    document.title = `${p.title} — ${c.site.name}`;
    fill('[data-brand-name]', c.site.name);
    fill('[data-brand-role]', c.site.role);
    fill('[data-brand-mark]', c.site.logo || 'MR');
    fill('[data-pl-name]', p.title);
    fill('[data-foot-name]', c.site.name);
    fill('[data-foot-note]', c.site.footerNote || '');
    fill('[data-year]', new Date().getFullYear());
    fill('[data-menu-mail]', c.contact.email);
    fill('[data-menu-phone]', c.contact.phone);
    fill('[data-menu-addr]', c.contact.address);

    fill('[data-pd-cat]', `${p.category} — ${p.year}`);
    const t = $('[data-pd-title]');
    if (t) t.innerHTML = `<span class="line-mask"><span>${esc(p.title)}</span></span>`;
    fill('[data-pd-summary]', p.summary || '');
    const cov = $('[data-pd-cover]'); if (cov) cov.src = p.cover;

    const facts = [
      ['Konum', p.location], ['Yıl', p.year], ['Alan', p.area],
      ['İşveren', p.client], ['Durum', p.status]
    ];
    const fe = $('[data-pd-facts]');
    if (fe) fe.innerHTML = facts.map((f, k) =>
      `<div class="fact reveal" data-d="${Math.min(k + 1, 5)}"><h5>${esc(f[0])}</h5><p>${esc(f[1] || '—')}</p></div>`).join('');

    const bd = $('[data-pd-desc]');
    if (bd) bd.innerHTML = (p.description || []).map((x, k) =>
      `<p class="reveal" data-d="${Math.min(k + 1, 5)}">${esc(x)}</p>`).join('');

    const ft = $('[data-pd-features]');
    if (ft) ft.innerHTML = (p.features || []).map((x, k) =>
      `<div class="feat reveal" data-d="${Math.min(k + 1, 5)}">${esc(x)}</div>`).join('');

    const gl = $('[data-pd-gallery]');
    const imgs = (p.images || []).filter(Boolean);
    if (gl) gl.innerHTML = imgs.map((src, k) =>
      `<figure class="img-clip reveal" data-lb="${k}"><img src="${esc(src)}" alt="${esc(p.title)} — görsel ${k + 1}" loading="lazy"></figure>`).join('');

    const prev = list[(i - 1 + list.length) % list.length];
    const next = list[(i + 1) % list.length];
    const nv = $('[data-pd-nav]');
    if (nv) nv.innerHTML = `
      <a class="prev" href="/proje/${esc(prev.slug)}"><span class="mono">← Önceki</span><span class="h3">${esc(prev.title)}</span></a>
      <a class="next" href="/proje/${esc(next.slug)}" style="text-align:right"><span class="mono">Sonraki →</span><span class="h3">${esc(next.title)}</span></a>`;

    initLightbox(imgs, p.title);
    return p;
  }

  function initLightbox(images, title) {
    if (!images || !images.length) return;
    const box = document.createElement('div');
    box.className = 'lightbox';
    box.innerHTML = `<button class="close" data-close>Kapat ✕</button>
      <button class="nav-btn prev" data-prev>←</button>
      <button class="nav-btn next" data-next>→</button>
      <img alt="${esc(title)}">`;
    document.body.appendChild(box);
    const img = $('img', box);
    let idx = 0;
    const show = (i) => { idx = (i + images.length) % images.length; img.src = images[idx]; };
    document.addEventListener('click', (e) => {
      const fig = e.target.closest('[data-lb]');
      if (fig) { show(parseInt(fig.getAttribute('data-lb'), 10) || 0); box.classList.add('open'); document.body.classList.add('no-scroll'); }
    });
    box.addEventListener('click', (e) => {
      if (e.target.closest('[data-next]')) return show(idx + 1);
      if (e.target.closest('[data-prev]')) return show(idx - 1);
      if (e.target === box || e.target.closest('[data-close]')) {
        box.classList.remove('open'); document.body.classList.remove('no-scroll');
      }
    });
    addEventListener('keydown', (e) => {
      if (!box.classList.contains('open')) return;
      if (e.key === 'Escape') { box.classList.remove('open'); document.body.classList.remove('no-scroll'); }
      if (e.key === 'ArrowRight') show(idx + 1);
      if (e.key === 'ArrowLeft') show(idx - 1);
    });
  }

  /* --------------------------------------------------------------- boot */
  async function boot() {
    initHeader();
    initTransitions();

    let content = null;
    try {
      const r = await fetch('/api/content', { cache: 'no-store' });
      content = await r.json();
    } catch (e) {
      console.error('İçerik yüklenemedi', e);
    }

    if (content) {
      if (document.body.dataset.page === 'project') renderProject(content);
      else renderHome(content);
    }

    runPreloader(() => {
      document.body.classList.add('loaded');
      observe();
      initParallax();
      $$('.line-mask > span').forEach((s) => { s.style.transform = 'translateY(0)'; });
    });

    // preloader takılırsa güvenlik ağı
    setTimeout(() => {
      if (pre && !pre.classList.contains('done')) {
        pre.classList.add('done');
        document.body.classList.add('loaded');
        observe(); initParallax();
      }
    }, 8000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
