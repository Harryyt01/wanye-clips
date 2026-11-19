# Wayne.clips v5 — STUDIO OS

Premium futuristic rebuild of the Wayne.clips studio site (Shu Wayne), built
19 Nov 2026 from `~/workspace/income/wayne-clips-v5-research-2026-11-19.md`.
Static site, no build step. **Do not publish yet — v5 is built, not deployed.**

## What changed vs v4

- **Clip Orbit hero (Three.js 0.160.0):** 4 floating 9:16 glass frames textured
  with the REAL sample thumbnails orbit a glowing core, with ~1,200 CPU
  particles (spring-home + pointer-repel + click-burst). Pointer parallax +
  scroll-dolly camera driven by a ScrollTrigger proxy (render loop owns output).
  The Trillionaire frame uses a generated gradient + title treatment — no
  invented thumbnail.
- **Aurora GLSL background:** full-page fixed canvas, 2-octave FBM, amber/coral
  cosine palette, pointer swirl, 30 fps cap, CSS gradient fallback.
- **JARVIS-style command console:** a real parser in the hero — `help`, `work`,
  `services`, `pricing`, `estimate <n>`, `filter <all|shorts|promo|structure>`,
  `book`, `contact`, `status`, `clear`. Every command executes a real action on
  the page. History with ↑/↓. No fake AI, no canned chat.
- **Lenis smooth scroll + GSAP reveals + pinned hero→work camera journey.**
- **Services expanded 4 → 10** (the 4 detailed v4 cards stay; 6 honest short
  cards added: video editing, YouTube production, AI video generation, graphic
  design & thumbnails, social media creatives, branding).
- **Working mobile menu** (v4 had none — links were hidden on mobile), sticky
  nav with scroll state + active section, magnetic buttons, HUD chrome
  (corner brackets, status readouts, radar sweep).
- **Type:** Space Grotesk display + Inter body + JetBrains Mono HUD.
- **Booking form:** validation (name + valid `http(s)` link required), mailto,
  copy button, localStorage draft save.

## What was preserved from v4 (verbatim)

Hero copy, about copy, all 4 real samples + 3 sample-structure cards, why
cards (6), pricing ($10 / $40 / $90 + exact bullets + pay chips), estimator
price math (1→$10, 5→$40, 10→$90, ≤5→n×$8, else n×$9), process steps,
8-item delivery checklist, FAQ (6), footer, SEO/JSON-LD, payment copy.
No invented clients/testimonials/stats. **No wallet address anywhere.**

## Files

```
index.html          structure + all copy
css/style.css       design system
js/main.js          nav, filters, estimator, form, Lenis + GSAP wiring
js/scene.js         Three.js Clip Orbit hero + particles
js/aurora.js        GLSL aurora background (raw WebGL)
js/console.js       command console parser
docs/screenshots/   verification screenshots
```

Libraries via CDN: Three.js 0.160.0 (importmap, jsDelivr), GSAP 3.12.5 +
ScrollTrigger, Lenis 1.1.14, Google Fonts (Space Grotesk / Inter / JetBrains
Mono).

## Graceful degradation

If any CDN fails (or WebGL is unavailable), the page still works: all content
is visible, filters / estimator / form / console / menu all run on plain JS,
and the 3D + aurora layers simply disappear. `prefers-reduced-motion` renders
one static 3D frame and kills the loops.

## Local testing

```sh
cd wanye-clips-site-v5
python3 -m http.server 8130
# open http://localhost:8130/
```

## Publish (when approved)

` samples/` and `og.png` in this directory are **symlinks to
`../wanye-clips-site/` for local testing only — do not copy them**. Publish
only `index.html` + `css/` + `js/` + `README.md` + `docs/screenshots/` to the
repo root of `Harryyt01/wanye-clips` (the `samples/` and `og.png` already live
there, and all paths are relative so they resolve identically). The live URL
must not change: https://harryyt01.github.io/wanye-clips/

## Verification

See `docs/screenshots/` — desktop hero, work/showreel section, mobile 390px.
Verified with headless Chrome: zero console errors, all 4 videos present,
filters, estimator math at 1/5/10/20, form validation, every console command,
mobile menu, no horizontal overflow, hero 3D renders (and the degraded
no-CDN path renders all content with no errors).
