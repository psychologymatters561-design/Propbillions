# PropBillions website

The new propbillions.com: a real estate advisory site built around one idea, **read the paperwork before you sign**, and one product, **Neev Check**.

Live preview: https://psychologymatters561-design.github.io/Propbillions/

## What is here

| Path | What |
| --- | --- |
| `docs/audit.md` | Phase 1: audit of the current site (pages, projects, speed, what is broken, benchmarks) |
| `docs/strategy.md` | Phase 2: fears, Neev Check, honest psychology, sourced big picture |
| `docs/storyboard.md` | Phase 3: Ghar ka Raasta, the scroll film, by device |
| `docs/handover.md` | Every "to confirm", missing permission and account the client must own |
| `src/data/*.json` | All content: projects, rates (with sources), sources, team, locations, Neev Check |
| `src/lib/` | Shared logic used in browser and server: all-in cost, EMI, rent vs buy, lead validation |
| `functions/api/lead.ts` | Lead API (Cloudflare Pages Function): validation, spam block, rate limit, alerts, consent-gated conversions |
| `tests/` | Unit tests (`npm test`) and browser checks (`tests/e2e/`) |
| `assets/source/` | Original images from the current site, with a rights manifest |
| `public/film/` | The journey film (desktop 12 MB, tablet 6 MB); phones get stills |

## Run it

```
npm install
npm run dev            # local
npm test               # unit tests
npm run build          # static site in dist/
node scripts/copy-gate.mjs dist                       # no em dashes, no stock phrases
node tests/e2e/devices.mjs http://localhost:4321/Propbillions   # needs `npm run preview`
```

For the real domain: `SITE_URL=https://propbillions.com BASE_PATH=/ npm run build`.

Stack: Astro 5, GSAP with ScrollTrigger, Lenis (motion code only on pages that use it), self-hosted Instrument Serif, Manrope, JetBrains Mono and Tiro Devanagari Hindi, Decap CMS at `/admin`.
