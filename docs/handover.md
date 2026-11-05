# Handover: what PropBillions must confirm, permit and own

Nothing on the site was invented. Every unknown shows a dashed "to confirm" marker on the page. This is the full list.

## A. Facts to confirm (each shows "to confirm" on the site today)

| # | What | Where it shows | Why it matters |
| --- | --- | --- | --- |
| 1 | **How PropBillions is paid** (developer brokerage, buyer fee, both) | About, Neev Check, footer link | Fear 3: "the agent is paid to push one project" |
| 2 | **RERA agent registration** for UP, Delhi and Uttarakhand | Footer, About, Disclaimer | Legal requirement on every page |
| 3 | Registered office: NX One, Tech Zone 4, GNW 201306 **or** Tech Zone IV, Amrapali Dream Valley, 201318 | Contact, About, structured data | Two addresses on the current site |
| 4 | Opening days: Mon to Sun (Wed off) or Mon to Sat (Wed off) | Contact | Two versions on the current site |
| 5 | Email domain: info@propbillions.com or info@propbillions.in | Footer of current site | Leads may go to the wrong inbox |
| 6 | **WhatsApp number for leads** | Forms, journey buttons | Until set, forms hand off to email |
| 7 | Roles of Shahnawaz Khan, Muskan Malik, Amit Kumar | Home, About | |
| 8 | RERA numbers: Heaven in the Forest, Tech Park KP-5, Godrej The Plaza, Godrej Golf Links (per phase); verify DLRERA2018P0014 for Risland Sky Mansion; verify UPRERAPRJ15269 on the portal | Project pages | Must show before any project is advertised |
| 9 | UP RERA project QR codes for London Mart, Tech Park, Godrej The Plaza, Godrej Golf Links | Project pages | UP RERA advertising rule |
| 10 | Possession dates for all six projects | Project cards, X-ray lens | |
| 11 | Carpet areas (is Heaven in the Forest's 570 sq ft carpet?; Risland areas) | Project pages | Fear 6 |
| 12 | Developer cost sheets for Godrej Golf Links and Risland (current prices come from online listings) | All-in boxes | Fear 2 |
| 13 | Developer of Tech Park KP-5; whose office is 504 Arunachal Building, Barakhamba Road | Project page | |
| 14 | Neev Check: advocate name, price, turnaround | Neev Check FAQ | Not a legal opinion until an advocate signs |
| 15 | Brochure PDFs per project | Brochure form | Brochure unlock by phone number |
| 16 | Privacy: processors, retention period, grievance officer | Privacy notice | DPDP Act, 2023 |
| 17 | Courts with jurisdiction | Terms | |
| 18 | Which NRI markets you serve | NRI guide | |
| 19 | Named reviews with written consent | Proof row (none shown now) | |
| 20 | Dates of the Heaven in the Forest site photos (files are dated 26 Sep 2026) | Project gallery | |

## B. Rates and sources to re-check on official portals before launch

- UP stamp duty and women's concession up to ₹1 Cr: igrsup.gov.in (sources used: Free Press Journal, Godrej Capital).
- Delhi: 6/4/5% and 1% + ₹100: revenue.delhi.gov.in.
- Uttarakhand registration fee cap (₹25,000 or ₹50,000; the tool uses ₹50,000): registration.uk.gov.in.
- GST on under-construction commercial units: 12% vs 18% after Sept 2025 (sources disagree).
- RERA portal links used on project pages: up-rera.in, rera.delhi.gov.in, ukrera.uk.gov.in.

## C. Permissions needed

| From | For |
| --- | --- |
| FLR Developers LLP | Heaven in the Forest banner and floor plans |
| Mart Promoters Pvt. Ltd. | London Mart render and floor plans |
| Godrej / AR Landcraft LLP | Godrej The Plaza and Godrej Golf Links renders |
| Risland India | Risland Sky Mansion render |
| Tech Park KP-5 developer | Facade renders and layout |
| Each team member | Their photo on the site |

All originals are in `assets/source/` with `manifest.json` (original URL, page, size, rights note). Nine images from the current site were not used (stock or unknown origin).

## D. Accounts the client must own

- **Domain** propbillions.com (nameservers today: ns1/ns2.md-96.webhostbox.net). To point it at the new site, add a CNAME or move DNS to Cloudflare.
- **Hosting.** Live today on GitHub Pages under the `psychologymatters561-design` account. For the lead API, move to Cloudflare Pages (free): `functions/api/lead.ts` deploys as is. Build with `SITE_URL=https://propbillions.com BASE_PATH=/ npm run build`.
- **Lead alerts.** Pick one, then set its variables on the host: Telegram bot (free, fastest), WhatsApp Cloud API (Meta verification and an approved template), Resend for email, or any CRM webhook. Bind a KV namespace named `LEADS` for storage and rate limits. Then set `PUBLIC_LEAD_ENDPOINT=/api/lead` and rebuild.
- **Ads.** Meta Pixel ID and Conversions API token; GA4 measurement ID and API secret. Sent server-side only with marketing consent.
- **CMS.** Decap at `/admin`: connect GitHub OAuth for the client's editors.
- **Higgsfield.** The film and key frames were generated on the account used for this build (about 144.5 credits). Raw key frames are in `assets/ai-keyframes/`.

## E. Definition of done: status

| Item | Status |
| --- | --- |
| Calculator and lead API unit tests | 29 passing |
| Device suite (iPhone, iPad, laptop, 1920, reduced motion) on the build | All passing; max CLS 0.065; no errors; no sideways scroll |
| Device suite against the live URL | See the PR and README; run `node tests/e2e/devices.mjs <live url>` |
| Real test lead to the sales phone within 60 s | **Not done.** Needs item A6 or a lead channel from section D. |
| Copy gate (no invented facts, stock phrases or em dashes) | Passing in CI on every build |
