/* FRIVOLO — interactions (vanilla JS, no dependencies) */
(function () {
  'use strict';
  var d = document, root = d.documentElement, body = d.body, w = window;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var BASE = root.getAttribute('data-root') || '';
  var REDUCED = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isDesk = function () { return w.innerWidth > 980; };
  var isHome = body.classList.contains('home');
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var store = {
    get: function (k, f) { try { var v = localStorage.getItem(k); return v === null ? f : JSON.parse(v); } catch (e) { return f; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  };
  var euro = function (n) { return n.toFixed(2).replace('.', ',') + ' €'; };
  var ease = {
    inOut: function (t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
    out2: function (t) { return 1 - Math.pow(1 - t, 2); },
    out4: function (t) { return 1 - Math.pow(1 - t, 4); }
  };
  function tween(dur, easing, step, done) {
    if (REDUCED) { step(1); if (done) done(); return; }
    var t0 = performance.now();
    (function f(t) {
      var p = clamp((t - t0) / dur, 0, 1); step(easing(p));
      if (p < 1) requestAnimationFrame(f); else if (done) done();
    })(t0);
  }

  /* ---------- page transition overlay & home intro ---------- */
  var overlay = $('#page-overlay');
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  function reveal() {
    body.classList.add('is-loaded');
    tween(650, ease.out2, function (p) { overlay.style.transform = 'scaleX(' + (1 - p) + ')'; }, function () { overlay.style.display = 'none'; });
  }
  function leave(url) {
    overlay.style.display = 'block'; overlay.style.transformOrigin = 'right';
    tween(450, ease.inOut, function (p) { overlay.style.transform = 'scaleX(' + p + ')'; }, function () { location.href = url; });
  }
  w.addEventListener('pageshow', function (e) { if (e.persisted) { overlay.style.display = 'none'; body.classList.add('is-loaded'); } });
  function intro() {
    var bg = $('.hero__bg'), word = $('.loader'), svg = $('.loader svg');
    var s0 = w.innerWidth < 479 ? .5 : (isDesk() ? .2 : .3), s1 = w.innerWidth < 479 ? .7 : (isDesk() ? .3 : .6), off = isDesk() ? 200 : 100;
    overlay.style.display = 'none'; word.style.display = 'grid'; svg.style.opacity = 0;
    body.style.overflow = 'hidden';
    if (!isDesk()) svg.style.width = '150px';
    bg.style.transition = 'none'; bg.style.transform = 'scale(' + s0 + ')'; bg.style.opacity = 0;
    tween(1200, ease.inOut, function (p) { bg.style.transform = 'scale(' + (s0 + (s1 - s0) * p) + ')'; bg.style.opacity = p; });
    setTimeout(function () { tween(800, ease.out2, function (p) { svg.style.opacity = p; svg.style.transform = 'translateY(' + off * (1 - p) + 'px) skewY(' + 15 * (1 - p) + 'deg)'; }); }, 900);
    setTimeout(function () { tween(600, ease.out4, function (p) { svg.style.opacity = 1 - p; svg.style.transform = 'scale(' + (1 - .15 * p) + ')'; }); }, 1800);
    setTimeout(function () {
      word.style.display = 'none';
      setTimeout(function () { body.classList.add('is-loaded'); }, 500);
      tween(1200, ease.out4, function (p) { bg.style.transform = 'scale(' + (s1 + (1 - s1) * p) + ')'; }, function () { bg.style.transform = ''; bg.style.transition = ''; body.style.overflow = ''; });
    }, 2350);
    try { sessionStorage.setItem('frivolo-intro', '1'); } catch (e) { /* ignore */ }
  }
  var played = false; try { played = !!sessionStorage.getItem('frivolo-intro'); } catch (e) { /* ignore */ }
  var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  if (isHome) w.scrollTo(0, 0);
  if (isHome && !REDUCED && (!played || (nav && nav.type === 'reload'))) {
    (d.fonts ? d.fonts.ready : Promise.resolve()).then(function () { requestAnimationFrame(intro); });
  } else {
    var go = function () { requestAnimationFrame(function () { requestAnimationFrame(reveal); }); };
    if (d.readyState === 'complete') go(); else { w.addEventListener('load', go); setTimeout(function () { if (!body.classList.contains('is-loaded')) reveal(); }, 2500); }
  }
  d.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a || a.hasAttribute('data-add') || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;
    var h = a.getAttribute('href');
    if (/^(mailto:|tel:|https?:|javascript:)/.test(h)) return;
    if (h.charAt(0) === '#') {
      var t = h.length > 1 && $(h); if (t) { e.preventDefault(); scrollToY(t.getBoundingClientRect().top + w.scrollY - 60); } return;
    }
    e.preventDefault(); leave(a.href);
  });

  /* ---------- smooth wheel scroll ---------- */
  var tgt = w.scrollY, cur = w.scrollY, smoothing = false;
  function locked() { return body.matches('.menu-open,.cart-open,.search-open'); }
  function loop() {
    cur += (tgt - cur) * .11;
    if (Math.abs(tgt - cur) < .6) { cur = tgt; smoothing = false; }
    w.scrollTo(0, cur);
    if (smoothing) requestAnimationFrame(loop);
  }
  function scrollToY(y) {
    tgt = clamp(y, 0, root.scrollHeight - w.innerHeight);
    if (REDUCED || !isDesk()) { w.scrollTo({ top: tgt, behavior: REDUCED ? 'auto' : 'smooth' }); return; }
    cur = w.scrollY; if (!smoothing) { smoothing = true; requestAnimationFrame(loop); }
  }
  if (!REDUCED && w.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    w.addEventListener('wheel', function (e) {
      if (e.ctrlKey || e.target.closest('.cart__list,.shop__side,.menu nav,textarea,select')) return;
      if (locked()) { e.preventDefault(); return; }
      e.preventDefault();
      if (!smoothing) { tgt = cur = w.scrollY; }
      var dy = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
      tgt = clamp(tgt + dy, 0, root.scrollHeight - w.innerHeight);
      if (!smoothing) { smoothing = true; requestAnimationFrame(loop); }
    }, { passive: false });
  }

  /* ---------- scroll driven ---------- */
  var tasks = [];
  function onScroll() { var y = w.scrollY, vh = w.innerHeight; for (var i = 0; i < tasks.length; i++) tasks[i](y, vh); }
  var tick = false;
  w.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(function () { tick = false; onScroll(); }); } }, { passive: true });
  w.addEventListener('resize', onScroll);
  w.addEventListener('load', onScroll);
  var mix = function (a, b, t) { return 'rgb(' + a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }).join(',') + ')'; };

  // header + hero
  var hero = $('.hero'), word = $('.hero__word'), finder = $('.finder'), hbg = $('.hero__bg'), fp = 0, frun = false;
  tasks.push(function (y) {
    if (!isHome) { if (y > 20) body.classList.add('scrolling'); else if (y <= 10) body.classList.remove('scrolling'); return; }
    if (!isDesk()) {
      if (y > 20) body.classList.add('scrolling'); else if (y <= 10) body.classList.remove('scrolling');
      hero.style.transform = 'scale(' + (1 - .1 * Math.min(y / 250, 1)) + ')'; hero.style.opacity = 1; word.style.cssText = '';
      body.style.backgroundColor = mix([255, 255, 255], [246, 239, 244], clamp(y / 400, 0, 1));
      finder.style.transform = ''; return;
    }
    var p = clamp(y / 700, 0, 1), q = clamp(y / 400, 0, 1);
    body.classList.toggle('scrolling', p >= .5);
    var f = Math.max(0, p - .5);
    hero.style.transform = 'scale(' + (1 - .5 * f) + ')'; hero.style.opacity = 1 - .2 * f;
    word.style.transform = 'translateY(' + 50 * p + 'px) scale(' + (1 - .5 * p) + ')'; word.style.opacity = 1 - 2 * p;
    var c = mix([255, 255, 255], [246, 239, 244], q);
    body.style.backgroundColor = c; hbg.style.borderColor = c;
    fp = p; if (!frun && finder) { frun = true; stepFinder(); }
  });
  var fc = 0;
  function stepFinder() {
    fc += (fp - fc) * .06;
    var e = ease.out2(fc);
    finder.style.transform = 'scale(' + (.8 + .2 * e) + ')'; finder.style.opacity = .9 + .1 * e;
    if (Math.abs(fp - fc) > .001) requestAnimationFrame(stepFinder); else frun = false;
  }

  // curved section edges drawn on canvas
  $$('canvas[data-wave]').forEach(function (c) {
    var ctx = c.getContext('2d'), inv = c.dataset.wave === 'up', color = c.dataset.color, curve = +(c.dataset.curve || .7), want = 0, y = 0, run = false;
    function size() { var r = Math.min(w.devicePixelRatio || 1, 2); c.width = c.offsetWidth * r; c.height = c.offsetHeight * r; paint(); }
    function paint() {
      var W = c.width, H = c.height, e = y * H, m = (1 - y) * H * curve; ctx.clearRect(0, 0, W, H); ctx.fillStyle = color; ctx.beginPath();
      if (inv) { ctx.moveTo(0, H); ctx.lineTo(0, H - e); ctx.bezierCurveTo(.25 * W, H - m, .75 * W, H - m, W, H - e); ctx.lineTo(W, H); }
      else { ctx.moveTo(0, 0); ctx.lineTo(0, e); ctx.bezierCurveTo(.25 * W, m, .75 * W, m, W, e); ctx.lineTo(W, 0); }
      ctx.closePath(); ctx.fill();
    }
    function anim() { y += (want - y) * .2; paint(); if (Math.abs(want - y) > .0008) requestAnimationFrame(anim); else run = false; }
    var first = true;
    tasks.push(function (sy, vh) {
      var r = c.getBoundingClientRect(), top = r.top + sy, h = r.height, a = top - .1 * h - vh, b = top - .3 * h;
      want = clamp((sy - a) / (b - a), 0, 1) * .7;
      if (first || REDUCED) { y = want; first = false; paint(); return; }
      if (!run && Math.abs(want - y) > .0008) { run = true; anim(); }
    });
    size(); w.addEventListener('resize', size); if (w.ResizeObserver) new ResizeObserver(size).observe(c);
  });

  // floating ingredients
  if (!REDUCED) $$('.float').forEach(function (el, i) {
    var sy = +(el.dataset.y || .15), sx = +(el.dataset.x || .03), ro = +(el.dataset.r || 8) * (i % 2 ? 1 : -1), c = 0, t = 0, run = false;
    function a() { c += (t - c) * .05; el.style.transform = 'translate(' + w.innerWidth * sx * c + 'px,' + (-w.innerHeight * sy * c) + 'px) rotate(' + ro * c + 'deg)'; if (Math.abs(t - c) > .001) requestAnimationFrame(a); else run = false; }
    tasks.push(function (y, vh) { var o = el.parentNode.getBoundingClientRect().top + el.offsetTop; t = ease.out2(clamp((vh - o) / (vh + el.offsetHeight), 0, 1)); if (!run) { run = true; a(); } });
  });
  if (!REDUCED) $$('.bowl').forEach(function (el) {
    tasks.push(function (y, vh) { var h = el.offsetHeight, o = el.parentNode.getBoundingClientRect().top + el.offsetTop, p = ease.out2(clamp((vh - o - .1 * h) / (.6 * h), 0, 1)); el.style.opacity = .7 + .3 * p; el.style.transform = 'scale(' + (.9 + .1 * p) + ')'; });
  });
  $$('[data-tint]').forEach(function (el) { // cream → white while scrolling
    tasks.push(function (y, vh) { var r = el.getBoundingClientRect(), s = r.top + y + .2 * r.height - vh / 2, e = r.bottom + y - .8 * vh; el.style.setProperty('--bg', mix([251, 241, 230], [255, 255, 255], clamp((y - s) / (e - s), 0, 1))); });
  });
  $$('[data-parallax]').forEach(function (el) {
    if (REDUCED) return;
    tasks.push(function (y, vh) { var r = el.parentNode.getBoundingClientRect(); if (r.bottom < -100 || r.top > vh + 100) return; var p = (vh - r.top) / (vh + r.height); el.style.transform = 'translateY(' + (p - .5) * 9 + '%)'; });
  });

  $$('[data-shrink]').forEach(function (el) { // full-bleed media that shrinks to a card
    var k = +el.dataset.shrink, c = 1, t = 1, run = false;
    function a() { c += (t - c) * .12; el.style.transform = 'scale(' + c + ')'; el.style.borderRadius = '0 0 ' + 100 / c + 'px ' + 100 / c + 'px'; if (Math.abs(t - c) > .0008) requestAnimationFrame(a); else run = false; }
    tasks.push(function (y) { if (REDUCED) return; t = 1 - (1 - (isDesk() ? k : .9)) * clamp(y / (w.innerHeight * .6), 0, 1); if (!run) { run = true; a(); } });
  });

  // product stage: tub dissolves into a popsicle made of its ingredients
  var stage = $('.pd-stage');
  if (stage) {
    var pic = $('.pd-pic .p', stage), cap = $('.pd-cap', stage), labs = $$('.pd-lab', stage);
    var st = { o: 0, c: 0, b: 0 }, to = { o: 0, c: 0, b: 0 }, srun = false;
    var draw = function () {
      stage.style.setProperty('--o', st.o);
      pic.style.clipPath = 'inset(' + st.c * 100 + '% 0 0 0)'; pic.style.opacity = 1 - st.c * .9;
      cap.style.clipPath = 'inset(-2% -260px ' + (102 - clamp((st.c * 620 - 179) / 262, 0, 1) * 104) + '% -20px)';
      labs.forEach(function (l, i) { l.style.setProperty('--b', clamp(st.b * 1.6 - i * .3, 0, 1)); });
    };
    var sa = function () { var m = 0; Object.keys(st).forEach(function (k) { st[k] += (to[k] - st[k]) * .12; m = Math.max(m, Math.abs(to[k] - st[k])); }); draw(); if (m > .002) requestAnimationFrame(sa); else srun = false; };
    tasks.push(function (y, vh) {
      if (!isDesk()) { pic.style.clipPath = ''; pic.style.opacity = 1; return; }
      var top = stage.getBoundingClientRect().top, p = clamp(-top / (stage.offsetHeight - vh), 0, 1);
      to.o = clamp((p - .02) / .5, 0, 1); to.c = clamp((p - .12) / .42, 0, 1); to.b = clamp((p - .5) / .34, 0, 1);
      if (!srun) { srun = true; sa(); }
    });
    var sticky = $('.sticky'), buy = $('.pd-buy');
    tasks.push(function () { sticky.classList.toggle('on', buy.getBoundingClientRect().bottom < 150 && isDesk()); buy.style.opacity = isDesk() ? clamp((buy.getBoundingClientRect().bottom - 100) / 200, 0, 1) : 1; });
  }

  /* ---------- observers ---------- */
  function watch(sel, th, fn) {
    if (!w.IntersectionObserver) { $$(sel).forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { fn ? fn(e) : e.target.classList.toggle('in', e.isIntersecting); }); }, { threshold: th });
    $$(sel).forEach(function (e) { io.observe(e); });
  }
  $$('.split').forEach(function (el) {
    $$('.ln', el).forEach(function (ln) {
      Array.prototype.slice.call(ln.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var fr = d.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (p) { if (!p) return; if (!p.trim()) fr.appendChild(d.createTextNode(' ')); else { var s = d.createElement('span'); s.className = 'w'; s.textContent = p; fr.appendChild(s); } });
          n.replaceWith(fr);
        } else if (n.nodeType === 1) {
          var b = n.tagName.toLowerCase(), parts = n.textContent.split(/(\s+)/), f2 = d.createDocumentFragment();
          parts.forEach(function (p) { if (!p.trim()) { f2.appendChild(d.createTextNode(' ')); return; } var s = d.createElement('span'); s.className = 'w'; var t = d.createElement(b); t.textContent = p; s.appendChild(t); f2.appendChild(s); });
          n.replaceWith(f2);
        }
      });
    });
  });
  watch('.split', .3, function (e) {
    e.target.classList.toggle('in', e.isIntersecting);
    $$('.ln', e.target).forEach(function (l, i) { $$('.w', l).forEach(function (x, j) { x.style.transitionDelay = e.isIntersecting ? 250 * i + 20 * j + 'ms' : ''; }); });
  });
  watch('.fade', .05);
  $$('.reveal').forEach(function (e, i) { e.style.transitionDelay = (i % 3) * 100 + 'ms'; });
  watch('.reveal', .12);
  watch('.blurbs', .2, function (e) { e.target.classList.toggle('in', e.isIntersecting); $$('.blurb', e.target).forEach(function (b, i) { b.style.transitionDelay = e.isIntersecting ? 260 * i + 'ms' : '0ms'; }); });
  // hand-drawn strokes
  $$('.draw path').forEach(function (p) { var l = p.getTotalLength(); p.style.strokeDasharray = l; p.style.strokeDashoffset = REDUCED ? 0 : l; p._l = l; });
  if (!REDUCED) watch('.draw', .2, function (e) {
    var ps = $$('path', e.target);
    ps.forEach(function (p, i) { clearTimeout(p._t); p.style.animation = 'none'; p.style.strokeDashoffset = p._l; if (e.isIntersecting) p._t = setTimeout(function () { p.style.animation = 'draw ' + (ps.length === 1 ? 1.5 : 1) + 's ease forwards'; }, i * 350 + (e.target.classList.contains('white') ? 3400 * !played : 0)); });
  });
  // text running along the ribbon
  $$('.ribbon').forEach(function (svg) {
    var tp = $('textPath', svg), off = -50, on = false, last = null;
    function step(t) { if (!on) { last = null; return; } if (last !== null) { off += (t - last) * .003; if (off > 0) off -= 50; tp.setAttribute('startOffset', off + '%'); } last = t; requestAnimationFrame(step); }
    watch2(svg, function (v) { if (v && !on && !REDUCED) { on = true; requestAnimationFrame(step); } else if (!v) on = false; });
  });
  function watch2(el, fn) { if (w.IntersectionObserver) new IntersectionObserver(function (es) { fn(es[0].isIntersecting); }, { threshold: .05 }).observe(el); }

  /* ---------- hero switch ---------- */
  var sw = $('.hero .switch');
  if (sw) {
    var bs = $$('button', sw), state = 0, busy = false, cta = $('.hero__cta');
    var setCta = function () { $$('.lbl', cta).forEach(function (s) { s.textContent = w.innerWidth < 551 ? (state ? 'Δες τα sorbetto' : 'Δες τα gelato') : s.dataset.t; }); cta.href = state ? 'category/sorbetto.html' : 'category/gelato.html'; };
    setCta(); w.addEventListener('resize', setCta);
    bs.forEach(function (b, i) {
      b.addEventListener('click', function () {
        if (i === state || busy) return; busy = true; state = i;
        bs.forEach(function (x, j) { x.classList.toggle('on', j === i); x.setAttribute('aria-pressed', j === i); });
        sw.classList.toggle('b', i === 1); hero.classList.add('sw');
        setTimeout(function () {
          $$('.hero__bg i').forEach(function (x, j) { x.classList.toggle('on', j === i); });
          $$('.hero__pic img').forEach(function (x, j) { x.classList.toggle('on', j === i); });
          hero.classList.remove('sw'); setCta(); busy = false;
        }, 400);
      });
    });
  }
  var sw2 = $('.switch--alt');
  if (sw2) $$('button', sw2).forEach(function (b, i) {
    b.addEventListener('click', function () {
      sw2.classList.toggle('b', i === 1);
      $$('button', sw2).forEach(function (x, j) { x.classList.toggle('on', j === i); });
      $$('.prod .grid').forEach(function (g, j) { g.hidden = j !== i; }); onScroll();
    });
  });

  /* ---------- floating labels ---------- */
  $$('.form-bar label, .vf').forEach(function (l) { var f = $('input,select', l); if (!f) return; var s = function () { l.classList.toggle('has', !!f.value); l.classList.remove('err'); }; f.addEventListener('input', s); f.addEventListener('change', s); s(); });

  /* ---------- spotlight pills ---------- */
  $$('.spot').forEach(function (a) {
    var i = $('i', a);
    a.addEventListener('mousemove', function (e) { i.style.setProperty('--x', e.clientX - a.getBoundingClientRect().left + 'px'); i.style.setProperty('--s', 40); });
    a.addEventListener('mouseleave', function () { i.style.setProperty('--s', 0); });
  });

  /* ---------- header overlays ---------- */
  var mt, panels = $$('.mega__panel');
  var mopen = function (k) { if (!isDesk()) return; clearTimeout(mt); panels.forEach(function (p) { p.classList.toggle('on', p.dataset.p === k); }); $$('.nav a[data-mega]').forEach(function (a) { a.classList.toggle('is-on', a.dataset.mega === k); }); body.classList.add('mega-open'); };
  var mclose = function () { mt = setTimeout(function () { body.classList.remove('mega-open'); $$('.nav a').forEach(function (a) { a.classList.remove('is-on'); }); }, 80); };
  $$('.nav a[data-mega]').forEach(function (a) { a.addEventListener('mouseenter', function () { mopen(a.dataset.mega); }); a.addEventListener('focus', function () { if (a.matches(':focus-visible')) mopen(a.dataset.mega); }); });
  var mega = $('.mega'), header = $('.header');
  mega.addEventListener('mouseenter', function () { clearTimeout(mt); }); mega.addEventListener('mouseleave', mclose); header.addEventListener('mouseleave', mclose);
  var megaPlain = $('.nav a:not([data-mega])'); if (megaPlain) megaPlain.addEventListener('mouseenter', mclose);

  var lastFocus;
  function open(c, f) { lastFocus = d.activeElement; body.classList.add(c); if (f) setTimeout(function () { f.focus(); }, 350); }
  function close(c) { if (!body.classList.contains(c)) return; body.classList.remove(c); if (lastFocus) lastFocus.focus({ preventScroll: true }); }
  var sIn = $('.search input'), sRes = $('.search__res'), sAll = $('.search__all');
  $$('[data-open]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); var k = b.dataset.open; open(k + '-open', k === 'search' ? sIn : null); if (k === 'cart') renderCart(); }); });
  $$('[data-close]').forEach(function (b) { b.addEventListener('click', function () { close(b.dataset.close + '-open'); }); });
  $('.shade').addEventListener('click', function () { ['search-open', 'cart-open', 'filt-open'].forEach(close); });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape') { ['search-open', 'cart-open', 'menu-open', 'filt-open', 'mega-open'].forEach(close); } });
  var norm = function (s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
  var P = w.PRODUCTS || [];
  var rng = function (p) { var v = p.packs.map(function (k) { return k[1]; }); return v.length > 1 ? euro(v[0]) + ' – ' + euro(v[v.length - 1]) : euro(v[0]); };
  sIn.addEventListener('input', function () {
    var q = norm(sIn.value.trim()), r = q.length < 2 ? [] : P.filter(function (p) { return norm(p.name + ' ' + p.catName + ' ' + p.key).indexOf(q) > -1; });
    sRes.innerHTML = r.slice(0, 4).map(function (p) { return '<a href="' + BASE + 'product/' + p.slug + '.html"><i><img src="' + BASE + 'assets/img/' + p.img + '" alt=""></i>' + p.name + '<small>' + rng(p) + '</small></a>'; }).join('');
    sAll.hidden = q.length < 2;
    sAll.textContent = r.length ? 'Δες όλα τα αποτελέσματα… (' + r.length + ')' : 'Κανένα αποτέλεσμα – δες όλα τα προϊόντα';
    sAll.href = BASE + 'products.html' + (r.length ? '?q=' + encodeURIComponent(sIn.value.trim()) : '');
  });

  /* ---------- cart ---------- */
  var cart = store.get('frivolo-cart', []);
  function save() { store.set('frivolo-cart', cart); var n = cart.reduce(function (a, c) { return a + c.q; }, 0); $$('.count').forEach(function (c) { c.textContent = n; c.hidden = !n; }); }
  function addItem(slug, pack, q) {
    var p = P.filter(function (x) { return x.slug === slug; })[0]; if (!p) return;
    var k = p.packs.filter(function (x) { return x[0] === pack; })[0] || p.packs[0];
    var it = cart.filter(function (c) { return c.s === slug && c.p === k[0]; })[0];
    if (it) it.q += q; else cart.push({ s: slug, p: k[0], q: q });
    save(); renderCart(); open('cart-open');
  }
  var emptyHTML = '<div class="cart__empty">' + ($('#empty-art') ? $('#empty-art').innerHTML : '') + '<p>Το καλάθι σου είναι άδειο</p><a class="btn-dark" href="' + BASE + 'products.html">Ανακάλυψε τις γεύσεις</a></div>';
  function renderCart() {
    var sum = 0;
    var rows = cart.map(function (c, i) {
      var p = P.filter(function (x) { return x.slug === c.s; })[0]; if (!p) return '';
      var k = p.packs.filter(function (x) { return x[0] === c.p; })[0] || p.packs[0]; sum += k[1] * c.q;
      return '<div class="cart__item" data-i="' + i + '"><i><img src="' + BASE + 'assets/img/' + p.img + '" alt=""></i><div><b>' + p.name + '</b><small>' + c.p + '</small><br><span class="qty-mini"><button data-q="-1" aria-label="Λιγότερα">−</button>' + c.q + '<button data-q="1" aria-label="Περισσότερα">+</button></span></div><div style="text-align:right"><b class="price">' + euro(k[1] * c.q) + '</b><button class="rm">Αφαίρεση</button></div></div>';
    }).join('');
    $$('[data-cart]').forEach(function (el) {
      el.innerHTML = rows ? '<div class="cart__list">' + rows + '</div><div class="cart__f"><div><span>Σύνολο</span><span>' + euro(sum) + '</span></div>' + (el.dataset.cart === 'side' ? '<a class="btn-solid" href="' + BASE + 'cart.html">Ολοκλήρωση παραγγελίας</a>' : '<button class="btn-solid" data-order>Ολοκλήρωση παραγγελίας</button>') + '</div>' : emptyHTML;
      el.classList.toggle('cartpg__t', el.dataset.cart === 'page' && !!rows);
    });
  }
  d.addEventListener('click', function (e) {
    var it = e.target.closest('.cart__item');
    if (it) { var i = +it.dataset.i, q = e.target.closest('[data-q]'); if (q) { cart[i].q += +q.dataset.q; if (cart[i].q < 1) cart.splice(i, 1); save(); renderCart(); } else if (e.target.closest('.rm')) { cart.splice(i, 1); save(); renderCart(); } }
    var a = e.target.closest('[data-add]'); if (a) { e.preventDefault(); addItem(a.dataset.add, '', 1); }
    if (e.target.closest('[data-order]')) { e.target.closest('[data-order]').textContent = 'Demo – δεν πραγματοποιείται χρέωση'; }
  });
  save(); renderCart();

  /* ---------- product buy box (synced with sticky bar) ---------- */
  $$('[data-buy]').forEach(function (b) {
    var slug = b.dataset.buy;
    $$('.packs button', b).forEach(function (x) { x.addEventListener('click', function () { $$('[data-buy] .packs button').forEach(function (y) { y.classList.toggle('on', y.dataset.k === x.dataset.k); }); $$('[data-buy] .add').forEach(function (y) { y.classList.remove('off'); }); $$('[data-buy] .price').forEach(function (y) { y.textContent = x.dataset.v; }); }); });
    $$('.qty button', b).forEach(function (x, i) { x.addEventListener('click', function () { var inp = $('.qty input', b); var v = Math.max(1, (+inp.value || 1) + (i ? 1 : -1)); $$('[data-buy] .qty input').forEach(function (y) { y.value = v; }); }); });
    $('.add', b).addEventListener('click', function () {
      var on = $('.packs button.on', b);
      if (!on && $('.packs button', b)) { $('.packs', b).animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], 300); return; }
      addItem(slug, on ? on.dataset.k : '', +$('.qty input', b).value || 1);
    });
  });

  /* ---------- tabs, accordion ---------- */
  $$('.tabs').forEach(function (t) { var bt = $$('.tabs__c button', t), ps = $$('.tabs__p', t), hl = $('.hl', t); bt.forEach(function (b, i) { b.addEventListener('click', function () { hl.style.transform = 'translateX(' + i * 100 + '%)'; ps.forEach(function (p, j) { p.classList.toggle('on', i === j); bt[j].setAttribute('aria-selected', i === j); }); }); }); });
  $$('.acc').forEach(function (a) {
    $$('.acc__q', a).forEach(function (q) {
      q.addEventListener('click', function () {
        var it = q.parentNode, was = it.classList.contains('on');
        $$('.acc__i.on', a).forEach(function (o) { o.classList.remove('on'); $('.acc__a', o).style.height = 0; $('.acc__q', o).setAttribute('aria-expanded', false); });
        if (!was) { it.classList.add('on'); q.setAttribute('aria-expanded', true); var c = $('.acc__a', it); c.style.height = c.firstElementChild.offsetHeight + 'px'; }
      });
    });
  });

  /* ---------- product carousel ---------- */
  $$('.car-wrap').forEach(function (cw) {
    var c = $('.carousel', cw), ul = $('ul', c), li = $$('li', ul), idx = 0, dx = 0, x0 = null, y0 = 0, lock = false, moved = false;
    var vis = function () { return w.innerWidth < 670 ? 1 : (isDesk() ? 3.5 : 2); };
    var max = function () { return Math.max(0, Math.ceil(li.length - vis())); };
    var sw1 = function () { return li[0].offsetWidth + (isDesk() ? 50 : 30); };
    function upd() { idx = clamp(idx, 0, max()); ul.style.transition = ''; ul.style.transform = 'translateX(' + -idx * sw1() + 'px)'; li.forEach(function (l, i) { l.classList.toggle('faded', i === Math.floor(idx + vis())); }); }
    upd(); w.addEventListener('resize', upd);
    $('.car-next', cw).addEventListener('click', function () { idx = idx >= max() ? 0 : idx + 1; upd(); });
    c.addEventListener('pointerdown', function (e) { if (e.button) return; x0 = e.clientX; y0 = e.clientY; lock = moved = false; dx = 0; });
    w.addEventListener('pointermove', function (e) { if (x0 === null) return; dx = e.clientX - x0; if (!lock) { if (Math.abs(dx) < 10) { if (Math.abs(e.clientY - y0) > 14) x0 = null; return; } lock = moved = true; ul.classList.add('drag'); } ul.style.transition = 'none'; ul.style.transform = 'translateX(' + (-idx * sw1() + dx) + 'px)'; });
    var up = function () { if (x0 === null) return; x0 = null; if (!lock) return; setTimeout(function () { ul.classList.remove('drag'); }, 120); if (Math.abs(dx) > (isDesk() ? 20 : 40)) { if (dx < 0) idx = idx < max() ? idx + 1 : 0; else idx = idx > 0 ? idx - 1 : max(); } upd(); };
    w.addEventListener('pointerup', up); w.addEventListener('pointercancel', up);
    c.addEventListener('dragstart', function (e) { e.preventDefault(); });
    c.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  });

  /* ---------- reviews slider ---------- */
  $$('.rev').forEach(function (r) {
    var t = $('.rev__track', r), n = t.children.length, i = 0;
    function go(k) { var v = isDesk() ? 3 : 1, mx = n - v; i = k < 0 ? mx : k > mx ? 0 : k; t.style.transform = 'translateX(' + -i * (t.children[0].offsetWidth + (isDesk() ? 42 : 0)) + 'px)'; }
    $('.p', r).addEventListener('click', function () { go(i - 1); }); $('.n', r).addEventListener('click', function () { go(i + 1); });
    var timer = REDUCED ? 0 : setInterval(function () { go(i + 1); }, 6000);
    r.addEventListener('mouseenter', function () { clearInterval(timer); });
    w.addEventListener('resize', function () { go(i); });
  });

  /* ---------- shop filters ---------- */
  var shop = $('.shop');
  if (shop) {
    var cards = $$('.shop .grid .card-li'), grid = $('.shop .grid'), more = $('.more'), PAGE = 12, shown = PAGE, orig = cards.slice();
    var qs = new URLSearchParams(location.search), q0 = norm(qs.get('q') || '');
    $$('.tog', shop).forEach(function (t) { t.addEventListener('click', function () { t.classList.toggle('on'); t.setAttribute('aria-expanded', t.classList.contains('on')); }); });
    $$('.tagsel button', shop).forEach(function (b) { b.addEventListener('click', function () { b.classList.toggle('on'); shown = PAGE; apply(); }); });
    $$('.shop__side input', shop).forEach(function (c) { c.addEventListener('click', function () { if (c.type === 'radio') { if (c._w) { c.checked = false; c._w = false; } else { $$('input[name="' + c.name + '"]', shop).forEach(function (o) { o._w = false; }); c._w = true; } } shown = PAGE; apply(); }); });
    var sort = $('.sortsel select'); sort.addEventListener('change', apply);
    if (more) more.addEventListener('click', function () { shown += PAGE; apply(); });
    function apply() {
      var f = {}; $$('.shop__side input:checked', shop).forEach(function (c) { (f[c.dataset.f] = f[c.dataset.f] || []).push(c.value); });
      var pk = $$('.tagsel button.on', shop).map(function (b) { return b.textContent; });
      var list = orig.filter(function (c) {
        for (var k in f) { var vals = (c.dataset[k] || '').split('|'); if (!f[k].some(function (v) { return vals.indexOf(v) > -1; })) return false; }
        if (pk.length && !pk.some(function (v) { return c.dataset.pk.split('|').indexOf(v) > -1; })) return false;
        return !q0 || norm(c.dataset.n).indexOf(q0) > -1;
      });
      var s = sort.value;
      if (s === 'asc' || s === 'desc') list.sort(function (a, b) { return (a.dataset.pr - b.dataset.pr) * (s === 'asc' ? 1 : -1); });
      if (s === 'name') list.sort(function (a, b) { return a.dataset.n.localeCompare(b.dataset.n, 'el'); });
      orig.forEach(function (c) { c.hidden = true; });
      list.forEach(function (c, i) { grid.appendChild(c); c.hidden = i >= shown; });
      if (more) more.style.display = list.length > shown ? '' : 'none';
      var nr = $('.nores', shop); nr.hidden = !!list.length; grid.appendChild(nr);
      onScroll();
    }
    apply();
    var fb = $('.filt-btn'); if (fb) fb.addEventListener('click', function () { body.classList.toggle('filt-open'); });
  }

  /* ---------- finder → calculator ---------- */
  var calc = $('#calc');
  if (calc) {
    var cf = $('form', calc), res = $('.calc__r', calc), list2 = $('.calc__p', calc);
    var run2 = function () {
      var v = Object.fromEntries(new FormData(cf));
      if (!+v.guests || !v.mood) return;
      var g = { light: 90, normal: 130, feast: 180 }[v.mood], type = v.type || 'gelato';
      var kid = +v.kids || 0, total = Math.round((+v.guests * g + kid * g * .7) / 10) * 10;
      var tubs = Math.max(1, Math.ceil(total / 500));
      $('b', res).textContent = total >= 1000 ? (total / 1000).toFixed(2).replace('.', ',') + ' kg' : total + ' g';
      $('p', res).innerHTML = 'Προτεινόμενη συσκευασία: <strong>' + (total <= 250 ? '1 × 250ml' : tubs + ' × 500ml') + '</strong>';
      res.hidden = false; list2.hidden = false;
      $$('.card-li', list2).forEach(function (c) { c.hidden = type !== 'both' && c.dataset.type !== type; });
      onScroll(); scrollToY(res.getBoundingClientRect().top + w.scrollY - 120);
    };
    cf.addEventListener('submit', function (e) { e.preventDefault(); run2(); });
    var ps2 = new URLSearchParams(location.search), any = false;
    ['guests', 'kids', 'mood', 'type'].forEach(function (k) { if (ps2.get(k)) { any = true; cf.elements[k].value = ps2.get(k); cf.elements[k].dispatchEvent(new Event('change')); } });
    if (any) w.addEventListener('load', function () { setTimeout(run2, 900); });
  }
  var ff = $('.finder form');
  if (ff) ff.addEventListener('submit', function (e) { e.preventDefault(); leave('calculator.html?' + new URLSearchParams(new FormData(ff)).toString()); });

  /* ---------- recipe wizard ---------- */
  var wiz = $('.wiz');
  if (wiz) {
    var pages = $$('.wiz__p', wiz), dots = $$('.wiz__s span', wiz), at = 0;
    var show = function (i) { at = i; pages.forEach(function (p, j) { p.classList.toggle('on', j === i); }); dots.forEach(function (x, j) { x.classList.toggle('on', j <= i); }); if (i === 4) summary(); var y = wiz.getBoundingClientRect().top + w.scrollY - 130; scrollToY(y); };
    var valid = function () {
      var ok = true;
      $$('.vf [required]', pages[at]).forEach(function (f) { var bad = !f.value || (f.type === 'email' && !/^\S+@\S+\.\S+$/.test(f.value)); f.parentNode.classList.toggle('err', bad); if (bad) ok = false; });
      var need = pages[at].dataset.min; if (need && $$('input:checked', pages[at]).length < +need) { ok = false; $('.hint', pages[at]).animate([{ color: '#c2305e' }, { color: '' }], 1500); }
      return ok;
    };
    $$('[data-max]', wiz).forEach(function (p) { p.addEventListener('change', function () { var n = $$('input:checked', p).length; $$('input', p).forEach(function (c) { c.disabled = !c.checked && n >= +p.dataset.max; }); }); });
    $$('.wiz__n', wiz).forEach(function (b) { b.addEventListener('click', function () { if (valid()) show(at + 1); }); });
    $$('.wiz__pr', wiz).forEach(function (b) { b.addEventListener('click', function () { show(at - 1); }); });
    var summary = function () {
      var g = function (i) { return $$('input:checked', pages[i]).map(function (c) { return c.value; }).join(', ') || '—'; };
      var esc = function (s) { var x = d.createElement('i'); x.textContent = s; return x.innerHTML; };
      $('.sumry', wiz).innerHTML = [['Όνομα μίγματος', $('[name=bname]', wiz).value], ['Άτομα', $('[name=bguests]', wiz).value], ['Βάση', g(1)], ['Γεύσεις', g(2)], ['Toppings', g(3)]].map(function (r) { return '<div><span>' + r[0] + '</span><b>' + esc(r[1]) + '</b></div>'; }).join('');
    };
    wiz.addEventListener('submit', function (e) { e.preventDefault(); if (!valid()) return; $('.wiz__a', pages[4]).hidden = true; $('.ok', pages[4]).hidden = false; });
  }

  /* ---------- contact / account (demo, nothing is sent) ---------- */
  $$('form[data-demo]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault(); var ok = true;
      $$('.fld', f).forEach(function (l) { var i = $('input,textarea', l); if (!i.required) return; var bad = !i.value.trim() || (i.type === 'email' && !/^\S+@\S+\.\S+$/.test(i.value)); l.classList.toggle('err', bad); if (bad) ok = false; });
      var t = $('[name=terms]', f); if (t && !t.checked) { ok = false; t.parentNode.style.color = '#c2305e'; }
      if (ok) { $('.ok', f).hidden = false; }
    });
  });

  /* ---------- video ---------- */
  $$('.film--v').forEach(function (f) { var v = $('video', f); $('.play', f).addEventListener('click', function () { v.controls = true; v.play(); f.classList.add('playing'); }); });

  /* ---------- coupon bar ---------- */
  var cp = $('.coupon');
  if (cp) {
    setTimeout(function () { var off = false; try { off = sessionStorage.getItem('frivolo-cp'); } catch (e) { /* ignore */ } if (!off) cp.classList.add('on'); }, 3000);
    $('.cl', cp).addEventListener('click', function () { cp.classList.remove('on'); try { sessionStorage.setItem('frivolo-cp', '1'); } catch (e) { /* ignore */ } });
    $('code', cp).addEventListener('click', function () { var c = this; if (navigator.clipboard) navigator.clipboard.writeText(c.textContent).catch(function () {}); c.style.background = '#ff9f45'; });
  }

  /* ---------- cursor ---------- */
  var cu = $('.cursor');
  if (cu && isDesk() && !REDUCED && w.matchMedia('(hover:hover)').matches) {
    var p0 = store.get('frivolo-cur', { x: 0, y: 0 }), tx = p0.x, ty = p0.y, cx = tx, cy = ty, cr = null;
    cu.style.left = cx + 'px'; cu.style.top = cy + 'px';
    var cm = function () { cx += (tx - cx) / 6; cy += (ty - cy) / 6; cu.style.left = cx + 'px'; cu.style.top = cy + 'px'; cr = Math.abs(tx - cx) + Math.abs(ty - cy) > .2 ? requestAnimationFrame(cm) : null; };
    d.addEventListener('mousemove', function (e) { tx = e.clientX; ty = e.clientY; if (cr === null) cr = requestAnimationFrame(cm); }, { passive: true });
    w.addEventListener('pagehide', function () { store.set('frivolo-cur', { x: tx, y: ty }); });
    d.addEventListener('mouseover', function (e) {
      var t = e.target; cu.className = 'cursor';
      if (t.closest('.carousel')) cu.classList.add('drag');
      else if (t.closest('.logo,.tools .ico,.magic,.play,.map')) cu.classList.add('magic');
      else if (t.closest('a,button,select,label')) cu.classList.add('hov');
    }, { passive: true });
  }
  onScroll();
})();
