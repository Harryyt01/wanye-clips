/* Wayne.clips v5 — main.js: nav, mobile menu, Lenis + GSAP wiring, gallery filter,
   estimator (v4 price math), booking form (validate + mailto + copy + draft save),
   tilt + magnetic buttons, scroll proxy for the 3D scene.
   Every block is guarded: if a CDN lib fails to load, the page still works. */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;

  /* Shared scroll state for the 3D scene: 0 (hero top) .. 1 (hero scrolled past). */
  window.__v5Scroll = 0;
  window.__v5Lenis = null;

  /* ---------- Smooth scroll (Lenis) ---------- */
  var lenis = null;
  try {
    if (typeof Lenis !== 'undefined' && !reduced) {
      /* syncTouch MUST stay false: with it on, Lenis hijacks touch scrolling and
         routes every swipe through the rAF-driven smoothed scroll. On a phone
         the 3D hero keeps the main thread busy, so swipes felt dead — the page
         barely moved. With native touch scrolling, swipes stay instant even
         when a frame is slow; Lenis still tracks native scroll for
         ScrollTrigger, and anchor links still use lenis.scrollTo. */
      lenis = new Lenis({ syncTouch: false });
      window.__v5Lenis = lenis;
      if (typeof gsap !== 'undefined') {
        lenis.on('scroll', function () { if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.update(); });
        gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
        gsap.ticker.lagSmoothing(0);
      } else {
        (function raf(time) { lenis.raf(time); requestAnimationFrame(raf); })(0);
      }
    }
  } catch (err) { lenis = null; window.__v5Lenis = null; }

  function scrollToEl(el) {
    if (!el) return;
    if (lenis) { lenis.scrollTo(el, { offset: -70 }); }
    else { el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); }
  }
  window.__v5ScrollTo = scrollToEl;

  /* Anchor links route through Lenis when present. */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length < 2) { e.preventDefault(); if (lenis) lenis.scrollTo(0); else window.scrollTo(0, 0); return; }
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      scrollToEl(target);
    });
  });

  /* ---------- Nav: scroll state + active section + mobile menu ---------- */
  var nav = document.getElementById('nav');
  var menuBtn = document.getElementById('menuBtn');
  var navLinks = document.getElementById('navLinks');
  function closeMenu() {
    if (!navLinks) return;
    navLinks.classList.remove('open');
    if (menuBtn) { menuBtn.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.setAttribute('aria-label', 'Open menu'); }
  }
  window.__v5CloseMenu = closeMenu;
  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', function () {
      var open = navLinks.classList.toggle('open');
      menuBtn.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    navLinks.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeMenu); });
  }
  window.addEventListener('scroll', function () {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 10);
    var hero = document.querySelector('.hero');
    if (hero) {
      var h = hero.offsetHeight || 1;
      window.__v5Scroll = Math.min(1, Math.max(0, window.scrollY / (h * 0.9)));
    }
  }, { passive: true });

  var sectionIds = ['work', 'services', 'pricing', 'process', 'faq'];
  var linkById = {};
  if (navLinks) navLinks.querySelectorAll('a').forEach(function (a) { linkById[a.getAttribute('href').slice(1)] = a; });
  if ('IntersectionObserver' in window) {
    var secObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          Object.keys(linkById).forEach(function (k) { linkById[k].classList.remove('active'); });
          var link = linkById[en.target.id];
          if (link) link.classList.add('active');
        }
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    sectionIds.forEach(function (id) { var s = document.getElementById(id); if (s) secObs.observe(s); });
  }

  /* ---------- Gallery filter ---------- */
  function applyFilter(f) {
    document.querySelectorAll('#filters .filter').forEach(function (b) {
      b.classList.toggle('active', b.dataset.filter === f);
    });
    document.querySelectorAll('#gallery .card').forEach(function (card) {
      card.style.display = (f === 'all' || card.dataset.cat === f) ? '' : 'none';
    });
    return f;
  }
  window.__v5ApplyFilter = applyFilter;
  document.querySelectorAll('#filters .filter').forEach(function (btn) {
    btn.addEventListener('click', function () { applyFilter(btn.dataset.filter); });
  });

  /* ---------- Estimator — SAME price math as v4 ---------- */
  var slider = document.getElementById('clips');
  var countEl = document.getElementById('clipCount');
  var totalEl = document.getElementById('estTotal');
  var perEl = document.getElementById('estPer');
  function price(n) { if (n === 1) return 10; if (n === 5) return 40; if (n === 10) return 90; return n <= 5 ? n * 8 : n * 9; }
  window.__v5Price = price;
  function updateEstimator() {
    if (!slider) return;
    var n = +slider.value;
    var t = price(n);
    countEl.textContent = n;
    totalEl.textContent = '$' + t;
    var per = (t / n).toFixed(2);
    var note = per + ' / clip · ~48h delivery';
    if (n === 1) note = per + ' / clip · single test clip · ~48h delivery';
    if (n === 5) note = per + ' / clip · matches 5-clip package · ~48h delivery';
    if (n === 10) note = per + ' / clip · matches 10-clip package · ~48h delivery';
    perEl.textContent = note;
  }
  window.__v5SetEstimate = function (n) {
    if (!slider) return null;
    n = Math.max(1, Math.min(20, Math.round(n)));
    slider.value = n;
    updateEstimator();
    return price(n);
  };
  if (slider) { slider.addEventListener('input', updateEstimator); updateEstimator(); }

  /* ---------- Booking form: validate + mailto + copy + localStorage draft ---------- */
  var form = document.getElementById('briefForm');
  var fName = document.getElementById('fName');
  var fPkg = document.getElementById('fPkg');
  var fType = document.getElementById('fType');
  var fLink = document.getElementById('fLink');
  var fNote = document.getElementById('fNote');
  var formError = document.getElementById('formError');
  var formOk = document.getElementById('formOk');
  var DRAFT_KEY = 'wayneclips-draft-v5';
  function showError(msg) {
    if (formError) { formError.textContent = msg; formError.hidden = false; }
    if (formOk) formOk.hidden = true;
  }
  function showOk(msg) {
    if (formOk) { formOk.textContent = msg; formOk.hidden = false; }
    if (formError) formError.hidden = true;
  }
  function buildBody() {
    return 'Hi Shu,\n\nName / channel: ' + fName.value.trim() +
      '\nPackage: ' + fPkg.value +
      '\nContent type: ' + fType.value +
      '\nVideo link(s): ' + fLink.value.trim() +
      '\nNotes: ' + fNote.value.trim();
  }
  function validate() {
    var ok = true;
    var firstBad = null;
    [fName, fLink].forEach(function (el) { el.classList.remove('invalid'); });
    if (!fName.value.trim()) { fName.classList.add('invalid'); ok = false; firstBad = firstBad || fName; }
    var link = fLink.value.trim();
    if (!/^https?:\/\/.+\..+/.test(link)) { fLink.classList.add('invalid'); ok = false; firstBad = firstBad || fLink; }
    if (!ok) {
      showError(!fName.value.trim()
        ? 'Please add your name / channel so I know who the brief is from.'
        : 'Please add a valid video link starting with http:// or https://');
      if (firstBad) firstBad.focus();
    }
    return ok;
  }
  window.__v5ValidateForm = validate;
  if (form) {
    /* Restore draft */
    try {
      var draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (draft) {
        if (draft.name) fName.value = draft.name;
        if (draft.pkg) fPkg.value = draft.pkg;
        if (draft.type) fType.value = draft.type;
        if (draft.link) fLink.value = draft.link;
        if (draft.note) fNote.value = draft.note;
      }
    } catch (err) { /* storage unavailable — form still works */ }
    var saveTimer = null;
    [fName, fPkg, fType, fLink, fNote].forEach(function (el) {
      el.addEventListener('input', function () {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(function () {
          try {
            localStorage.setItem(DRAFT_KEY, JSON.stringify({
              name: fName.value, pkg: fPkg.value, type: fType.value,
              link: fLink.value, note: fNote.value
            }));
          } catch (err) { /* ignore */ }
        }, 300);
      });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate()) return;
      var subject = 'Clipping brief — ' + fPkg.value;
      window.location.href = 'mailto:rajayt01@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(buildBody());
      showOk('Opening your email app with the brief ready to send. No payment is taken here — I reply with a confirmed quote and start date.');
    });
    var copyBtn = document.getElementById('copyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var text = 'Hi Shu — I would like to book ' + fPkg.value +
          ' for my ' + fType.value + '. Video link: ' + fLink.value.trim() +
          (fNote.value.trim() ? (' Notes: ' + fNote.value.trim()) : '') +
          ' — ' + (fName.value.trim() || '—');
        function done() { copyBtn.textContent = 'Copied ✓'; setTimeout(function () { copyBtn.textContent = 'Copy booking email'; }, 2500); }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
        } else { fallbackCopy(text); done(); }
        function fallbackCopy(t) {
          var ta = document.createElement('textarea');
          ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); } catch (err) { /* ignore */ }
          document.body.removeChild(ta);
        }
      });
    }
  }

  /* ---------- 3D tilt cards (fine pointers only) ---------- */
  if (finePointer && !reduced) {
    document.querySelectorAll('.tilt').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(900px) rotateY(' + (x * 7).toFixed(2) + 'deg) rotateX(' + (-y * 7).toFixed(2) + 'deg) translateY(-4px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------- Magnetic buttons (fine pointers only) ---------- */
  if (finePointer && !reduced) {
    document.querySelectorAll('.magnetic').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = e.clientX - r.left - r.width / 2;
        var y = e.clientY - r.top - r.height / 2;
        el.style.transform = 'translate(' + (x * 0.18).toFixed(1) + 'px,' + (y * 0.25).toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------- GSAP: hero intro + scroll reveals + pinned hero journey ----------
     Content stays fully visible if GSAP/ScrollTrigger fail to load: the
     [data-reveal] / hero animations only run when the libs are present. */
  try {
    if (typeof gsap === 'undefined' || reduced) return;
    gsap.from('.hero h1 .line > span', { yPercent: 110, duration: 1, ease: 'power4.out', stagger: 0.12, delay: 0.1 });
    gsap.from('[data-hero]', { y: 24, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1, delay: 0.45 });
    if (typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
      gsap.utils.toArray('[data-reveal]').forEach(function (el) {
        gsap.from(el, {
          y: 44, opacity: 0, duration: 0.9, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true }
        });
      });
      /* Pinned hero -> work journey: ScrollTrigger owns INPUT (progress on a
         plain proxy); the Three.js render loop owns OUTPUT (camera dolly). */
      var journey = { progress: 0 };
      window.__v5Journey = journey;
      gsap.to(journey, {
        progress: 1, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 }
      });
      gsap.to('.hero .hero-copy', {
        y: -60, opacity: 0.25, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
      });
      window.addEventListener('load', function () { ScrollTrigger.refresh(); });
    }
  } catch (err) { /* reveals are enhancement only */ }
})();
