# Phase 2: Strategy

## The position in one line

PropBillions reads the paperwork before you read the brochure, and tells you what it found, even on projects it sells.

Every other site in this market sells volume ("80K+ listings", "India's largest"). A nervous buyer does not need more options. They need someone to tell them which option is safe. That is a method, and a method can be named, shown and checked.

## 1. The seven fears, in the buyer's own words

| # | The fear | Where the site answers it |
| --- | --- | --- |
| 1 | "Possession will be delayed." | Neev Check group A and D (RERA dates, delivery history). London Mart's page says out loud: registered 2018, still under construction. |
| 2 | "There will be hidden charges." | All-in Cost tool; every project with a price shows brochure price next to all-in price. |
| 3 | "The agent is paid to push one project." | "How we are paid" on About, in the footer and on Neev Check. Warnings shown on our own listings. |
| 4 | "I'll buy in the wrong area." | Location pages with sourced infrastructure facts, and claims we refuse to repeat (the metro line). |
| 5 | "The title or approvals are not clean." | Neev Check groups B and C, marked "advocate" where legal. |
| 6 | "I'll pay for 1,800 sq ft and get 1,300." | Carpet vs super area check on every project; loading shown in the calculator. |
| 7 | "I won't be able to sell it later." | Resale liquidity and real rents (never promised) in group H. |

Rule: every section on every page answers at least one of these. If a section answers none, it is cut.

## 2. The hero product: Neev Check

*Neev* means foundation. 40 checks in 8 groups (registration, land and title, approvals, developer, the home itself, money, agreement, location and resale). Full list in `src/data/neev-check.json`.

Every result is one of four states, never a vague tick:

- **Clear**: checked, nothing to worry about, with source and date.
- **Ask about this**: something to raise before paying.
- **Stop**: do not pay until fixed.
- **Not checked yet**: honest gap.

Legal checks are marked "advocate". Until PropBillions confirms who signs them, the report says plainly that it is not a legal opinion.

The sample report uses a **fictional** project with real format, so no developer is named in an invented finding. Real project pages show only what public records already say, with sources.

## 3. Honest psychology

- **Loss aversion.** Show the real cost of a wrong choice in rupees: a 38% loading on a ₹1.45 Cr flat is about 500 sq ft paid for and not lived in. We use the buyer's own numbers in the calculator, never scare stories.
- **Anchoring.** Brochure price and all-in price side by side, every time a price exists. The brochure number is the anchor everyone else uses; we put the honest number next to it.
- **Specificity.** 570 sq ft, 18 homes, 10/40/25/25 payment plan, 15 June 2026. Vague words are banned; numbers come with a source.
- **Commitment ladder.** Calculator (no details asked) → WhatsApp shortlist → site visit → Neev Check → booking. Every page ends with the next small step, never a big one.
- **Proof.** Only real numbers and named people: founded 2026, five named team members, six projects. No review is shown until it is real and named.
- **Transparency.** How PropBillions is paid, in one sentence. Until the client confirms it, the site says "to confirm" in that exact spot rather than hiding the question.

## 4. The big picture, sourced

| Claim | Source | Used on |
| --- | --- | --- |
| Noida International Airport began commercial flights on 15 June 2026 | Business Today, News on AIR, Wego | Greater Noida, Noida, Golf Links |
| Aqua Line extension's first stretch now ends at Kisan Chowk (Sector 4), not Knowledge Park 5 | Business Today (July 2026), Swarajya (2024 DPR) | Greater Noida West, London Mart, Tech Park |
| Uttarakhand's 2025 land law: no agricultural land for outsiders in Nainital district; residential land capped at 250 sq m per family | ThePrint, Scroll | Heaven in the Forest, Uttarakhand |
| UP RERA: registration number prominent, UP RERA website and QR code on every ad | Housing.com News | Compliance on all UP project pages |

All links are stored in `src/data/sources.json` with the date checked, and printed next to the claim on the site.

## 5. What we will not say

No "high yield", no "guaranteed", no "dream home", no rental income figures, no "verified" without saying what was verified, no "Ghaziabad" until there is a Ghaziabad project.
