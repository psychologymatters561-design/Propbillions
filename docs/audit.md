# Phase 1: Audit of propbillions.com

Audited 5 November 2026. Raw evidence lives in `audit-raw/` (crawl JSON, raw HTML, screenshots, speed runs). Usable images are in `assets/source/` with `assets/source/manifest.json`.

## How it was done (and what blocked us)

| Route | Result |
| --- | --- |
| This build sandbox, direct | Blocked by the sandbox network policy (not the client's firewall). |
| GitHub Actions runner, curl | Works: HTTP 200, 21 KB, 0.5 s. Host 162.210.70.175, nameservers `ns1/ns2.md-96.webhostbox.net` (shared hosting). |
| GitHub Actions runner, headless Chrome | Timed out after 60 s. The server appears to drop automated browsers from that network. |
| Internet Archive | No snapshots of propbillions.com exist. |
| Higgsfield cloud sandbox, Playwright Chromium | Works. Full crawl: 27 URLs, 67 images, screenshots, timings. This is the source for everything below. |
| Lighthouse | Run on benchmarks from GitHub. A Lighthouse install on the client crawl was declined, so client speed was measured with the same Chromium using Lighthouse's mobile throttling (4x CPU, 1.6 Mbps, 150 ms). |

## Every page

`/` (festival intro), `/home`, `/about`, `/projects` (+ 9 filter URLs), `/gallery`, `/blog`, `/blog/10-things-to-consider-before-buying-your-first-home`, `/careers`, `/careers/sales-professional-1789975626`, `/contact-us`, six project pages, and `/contact` (404, linked from somewhere on the site).

## Every project (as published)

| Project | Where | Type | Stage shown | RERA on page | Price on page |
| --- | --- | --- | --- | --- | --- |
| Heaven in the Forest (FLR Developers LLP, from the banner) | Near Kainchi Dham, Uttarakhand | 18 furnished apartments and villas | Under construction | None | ₹45 L (1 BHK), ₹85 L (2 BHK villa), ₹1.10 Cr (3 BHK villa) |
| London Mart (Mart Promoters Pvt. Ltd.) | Plot C-3, Sector 16B, Greater Noida West | Retail high street | Under construction | UPRERAPRJ15269 (Phase 1, dated 23.02.2018) | On request |
| Tech Park, Knowledge Park 5 | Plot 200, KP-5, Greater Noida West | IT/ITES plots | Under construction | None | On request |
| Godrej The Plaza | Plot GH-01/A, Godrej Woods, Sector 43, Noida | Retail shops | "Verify current stage" | None | On request |
| Godrej Golf Links (AR Landcraft LLP with Godrej Properties) | Plot REP-1, Sector 27, Greater Noida | Villas, apartments | "Verify current phase" | None | "around ₹2.88 Cr" from online listings |
| Risland Sky Mansion (Risland India) | Chhattarpur, South Delhi | 3/4 BHK, 5 BHK penthouses | "Ready to move, verify" | DLRERA2018P0014 "cited by some sources" | ₹5.1 Cr / ₹7.6 Cr / ₹18 Cr "in some listings" |

"Heaven in the Forest" is a **project**, not a tagline. The festival intro uses it as the site's headline.

## Contact details and legal text found

- Phones: +91 98118 85521, +91 99996 56345 (London Mart page also shows +91 82859 87545).
- Email: info@propbillions.com, sales@propbillions.com. The footer says **info@propbillions.in** (different domain).
- Address, contact page: B-13, UG Floor, Tower T-3, NX One, Tech Zone 4, Greater Noida West 201306.
- Address, footer: PropBillions Pvt Ltd, Tech Zone IV, Amrapali Dream Valley, Greater Noida 201318. **Two different addresses.**
- London Mart page: "Corporate Office 504, Arunachal Building, Barakhamba Road, New Delhi". Unclear whose office this is.
- Hours: contact page "Mon to Sun, Wednesday off"; footer "Mon to Sat, Wed off". **Conflict.**
- Founded 2026. Founders: Sarvesh Chauhan, Fareed Ahmad. Team shown: Shahnawaz Khan, Muskan Malik, Amit Kumar.
- Privacy Policy and Terms are linked in the footer. The crawler found no page behind them.
- **No RERA agent registration number anywhere.**

## What works

- Project pages are server-rendered: Google can read 7,500 to 9,800 characters of text on each.
- Project copy is careful in places ("Rental income and capital appreciation are not guaranteed").
- Heaven in the Forest publishes real prices, a payment plan and real site photos.

## What is broken

1. **The intro loader shows "NaN%"** from about 1 second onward (confirmed on desktop and phone).
2. **The root URL is the festival intro.** Google sees 275 characters on `propbillions.com`: a Diwali greeting and "Skip Intro". The real home page is `/home`.
3. **A Diwali lead pop-up covers the phone screen** as soon as the intro ends.
4. On phones, most of the home page renders **blank** in a full-page capture: content waits for scroll animations.
5. A 404 resource error on every page; 403 on two banner images; `/contact` is a 404.
6. No meta descriptions, no canonical tags, no structured data on any page.
7. Typos in headings and labels: "PropBillion", "Probillions Gallery", "COMMERICAL", "Wide Raod", "Heavan". The alt text on Sarvesh Chauhan's photo says "fareed ahmad".
8. The site says "Noida, Greater Noida, Ghaziabad". There is **no Ghaziabad project**; there are projects in South Delhi and Uttarakhand.
9. "Upcoming High-Yield Projects" and "rental income potential" lines sit close to promising returns.
10. London Mart copy says "world-class" and cites a "proposed metro station"; July 2026 reports say the Knowledge Park 5 leg is not in the current first stretch.

## First 5 seconds on a phone

| Time | What a visitor sees |
| --- | --- |
| 0.5 s | Diwali intro, "Heaven In The Forest", loader at 0% |
| 1 to 5 s | Same screen, loader reads **NaN%** |
| 8 s | Real home page appears, then a full-screen Diwali form pop-up |

A first-time visitor sees no project, no price, no proof and a broken number before anything useful.

## Speed (measured)

| Page | Device | LCP | CLS | Weight | Requests |
| --- | --- | --- | --- | --- | --- |
| `/` | Phone (throttled) | 12.7 s | 0.002 | 8.6 MB | 41 |
| `/home` | Phone (throttled) | **13.6 s** | **0.163** | 8.3 MB | 31 |
| `/projects/london-mart` | Phone (throttled) | 4.7 s | 0 | 0.8 MB | 19 |
| `/home` | Desktop | 2.0 s | 0.065 | **20 MB** | 31 |

Heaviest files: `mountains-drone.mp4` 12 MB (loaded on phones too), a 4.5 MB PNG banner, a 6000 px AVIF (2 MB), a 4.4 MB JPG on About. Budget for the rebuild: phone LCP under 2.5 s, CLS under 0.1.

## Missing trust signals

RERA numbers on 4 of 6 projects; agent registration; one consistent address; how PropBillions is paid; named reviews; any count of deals or families helped; a privacy notice behind the forms (the pop-up says "We'll only use your details to contact you" and nothing more).

## Benchmarks

Anarock returned 403 to automated visits; Square Yards and Housing.com blocked the screenshot browser but Lighthouse got through.

| Site | Phone perf score | Phone LCP | Weight | First screen |
| --- | --- | --- | --- | --- |
| Square Yards | 52 | 4.9 s | 2.1 MB | "India's Largest Real Estate Platform", Google rating 4.7 from 18k reviews, search box, chat pop-up |
| Housing.com | 29 | 11.5 s | 4.0 MB | "Trusted place to find a home", "80K+ verified", search box, app banner |
| Anarock | blocked | | | |

**What they do better:** proof in the first screen with a number and a source (18k Google reviews), one obvious first action (search), clear category tabs.

**What they all do the same:** a search box as the hero, a superlative claim ("largest", "trusted"), volume as the value ("80K+ listings"), pop-ups and app banners, heavy phone pages, and no visible method for how a project is judged or how the firm is paid.

**So we do it differently:** a method instead of volume (Neev Check), the fee stated plainly, warnings shown even on projects we sell, no pop-ups, and a phone page that is fast.
