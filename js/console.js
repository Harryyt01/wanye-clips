/* Wayne.clips v5 — JARVIS-style command console.
   A REAL parser: every command executes a real action on the page (scroll, filter,
   set the estimator, open/focus the booking form, print real facts). No fake AI,
   no canned chat lines. History with ArrowUp / ArrowDown. */
(function () {
  'use strict';
  var input = document.getElementById('consoleInput');
  var log = document.getElementById('consoleLog');
  if (!input || !log) return;

  var history = [];
  var hIndex = -1;

  function line(text, cls) {
    var div = document.createElement('div');
    if (cls) div.className = cls;
    div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }
  function echo(cmd) { line('shu@wayne:~$ ' + cmd, 'cmd'); }

  var HELP = [
    'Available commands:',
    '  help                 — show this list',
    '  work                 — jump to the work gallery',
    '  services             — jump to all 10 services',
    '  pricing              — jump to pricing + estimator',
    '  estimate <n>         — set the estimator (1–20 clips), e.g. estimate 5',
    '  filter <all|shorts|promo|structure> — filter the work gallery',
    '  book                 — jump to the booking form',
    '  contact              — show how to reach Shu',
    '  status               — show real facts: packages, delivery, revision',
    '  clear                — clear this console'
  ];

  function scrollToId(id) {
    var el = document.getElementById(id);
    if (!el) { line('ERR: section #' + id + ' not found', 'err'); return; }
    if (window.__v5ScrollTo) window.__v5ScrollTo(el);
    else el.scrollIntoView({ behavior: 'smooth' });
  }

  function run(raw) {
    var cmd = (raw || '').trim();
    if (!cmd) return;
    echo(cmd);
    history.push(cmd);
    hIndex = history.length;
    var parts = cmd.toLowerCase().split(/\s+/);
    var verb = parts[0];
    var arg = parts[1];

    if (verb === 'help') {
      HELP.forEach(function (l) { line(l, 'dim'); });
    } else if (verb === 'work') {
      scrollToId('work');
      line('→ Work gallery: 4 real samples + 3 sample structures.', 'ok');
    } else if (verb === 'services') {
      scrollToId('services');
      line('→ Services: 10 services listed — clipping, podcast→Shorts, streams, promo, editing, YouTube production, AI video, design, social creatives, branding.', 'ok');
    } else if (verb === 'pricing') {
      scrollToId('pricing');
      line('→ Pricing: 1 clip $10 · 5 clips $40 · 10 clips $90. Crypto (USDT) recommended, PayPal / Razorpay / Payoneer.', 'ok');
    } else if (verb === 'estimate') {
      var n = parseInt(arg, 10);
      if (!arg || isNaN(n)) {
        line('ERR: estimate needs a number 1–20. Example: estimate 5', 'err');
      } else if (window.__v5SetEstimate) {
        var total = window.__v5SetEstimate(n);
        var clamped = Math.max(1, Math.min(20, Math.round(n)));
        scrollToId('pricing');
        line('→ Estimator set to ' + clamped + ' clip' + (clamped === 1 ? '' : 's') + ' = $' + total + ' ($' + (total / clamped).toFixed(2) + ' / clip).', 'ok');
      } else {
        line('ERR: estimator is not available on this page load.', 'err');
      }
    } else if (verb === 'filter') {
      var valid = ['all', 'shorts', 'promo', 'structure'];
      if (valid.indexOf(arg) === -1) {
        line('ERR: filter needs one of: all, shorts, promo, structure. Example: filter shorts', 'err');
      } else {
        if (window.__v5ApplyFilter) window.__v5ApplyFilter(arg);
        scrollToId('work');
        line('→ Gallery filtered: ' + arg + '.', 'ok');
      }
    } else if (verb === 'book') {
      scrollToId('book');
      var name = document.getElementById('fName');
      if (name) setTimeout(function () { name.focus({ preventScroll: true }); }, 650);
      line('→ Booking form ready. Fill in name + video link, then “Open in email”.', 'ok');
    } else if (verb === 'contact') {
      line('→ Email: rajayt01@gmail.com · YouTube: @zunixaura · Instagram: @shu.vyn', 'ok');
      line('  Available to creators in the US, UK, Canada, Australia & Europe.', 'dim');
    } else if (verb === 'status') {
      line('WAYNE.OS STATUS — real facts only:', 'ok');
      line('  packages: 1 clip $10 · 5 clips $40 · 10 clips $90', 'dim');
      line('  delivery: 48h standard · 1 revision per clip', 'dim');
      line('  samples: 4 real (Trillionaire, Miami Crime RP, make.fun, ForgeGUI)', 'dim');
      line('  payment: USDT (recommended) · PayPal · Razorpay · Payoneer — instructions shared after you choose a method', 'dim');
      line('  contact: rajayt01@gmail.com', 'dim');
    } else if (verb === 'clear') {
      log.innerHTML = '';
    } else {
      line('ERR: unknown command "' + verb + '". Type help for the full list.', 'err');
    }
  }

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      run(input.value);
      input.value = '';
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length && hIndex > 0) { hIndex--; input.value = history[hIndex]; }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (hIndex < history.length - 1) { hIndex++; input.value = history[hIndex]; }
      else { hIndex = history.length; input.value = ''; }
    }
  });

  /* Boot line — real, not a greeting from a fake assistant. */
  line('WAYNE.OS console ready. Type help for commands.', 'dim');
  window.__v5ConsoleRun = run;
})();
