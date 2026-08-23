---
target: /influencer/dashboard
total_score: 21
max_score: 32
na_heuristics: 5,10
p0_count: 0
p1_count: 4
timestamp: 2026-08-15T16-03-05Z
slug: apps-web-src-pages-influencer-dashboardpage-tsx
---
Method: dual-agent (A: abf23d8e1f71f1eb9 · B: aadc61aeff1e30929)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Empty-state hero glyph (em-dash, 20% opacity) is visually near-identical to the loading skeleton it follows |
| 2 | Match Between System / Real World | 3 | "Sua leitura" costs a first-time beat but resolves via the sentence beneath it |
| 3 | User Control and Freedom | 3 | Read-only summary, nav always reachable, no traps |
| 4 | Consistency and Standards | 4 | DESIGN.md tokens executed exactly as documented under live inspection |
| 5 | Error Prevention | n/a | No user input or destructive action on this read-only screen |
| 6 | Recognition Rather Than Recall | 2 | Rewards reachable only via one small in-page link, absent from primary nav |
| 7 | Flexibility and Efficiency of Use | 2 | No skip-to-content; 7 keyboard stops before page content |
| 8 | Aesthetic and Minimalist Design | 4 | Genuinely minimal, matches "Cronômetro Minimalista" intent live |
| 9 | Error Recovery | 1 | Query failures render as "Nenhuma candidatura ainda." with no distinct error/retry state |
| 10 | Help and Documentation | n/a | Simple Operate-mode summary; no complex feature needs contextual docs |
| **Total** | | **21/32** | **Acceptable (66%)** |

## Design Specificity Verdict

**LLM assessment:** Specific, not generic-template. The single light "placa" with crop-marks, strict lime budget, tabular-nums count-up on a literal conversion metric, "Sua leitura" framing, and domain-true Portuguese copy are load-bearing and tied to TAYRO's actual brand voice and Bia's casual relationship to the product. Live inspection confirms DESIGN.md's tokens are executed exactly as documented, not just aspirational.

**Deterministic scan:** 20 `design-system-font-size` findings (4 in DashboardPage.tsx, 16 across unrelated primitives DashboardPage doesn't even import). All 20 are likely false positives: DESIGN.md documents every flagged value in prose (the responsive 88px→72px hero rule, the suffix-size rule, the full text scale list) but never as a machine-readable `typography.scale` in the frontmatter, which is the only place the detector looks. This is a gap in DESIGN.md's frontmatter, not a real inconsistency in the built product.

**Visual overlays:** 8 anti-patterns surfaced live via the injected detector: 4 low-contrast findings (3.9–4.4:1 against a 4.5:1 AA floor, all on `muted-foreground`-class text), 2 undersized-functional-text findings (9px "Retirada"/"Recusada" status pills, below an 11px floor), and 2 flags (dark-glow + thin-border-wide-shadow) on the highlighted "a receber" stat. That last pair is a likely false positive: DESIGN.md's own "Regra do Efeito Único" explicitly permits border+glow on exactly one highlighted stat per screen, and this is that stat. Worth flagging anyway: the exception happens to pattern-match a known AI-slop signature (lone glowing accent on near-black), which is a coincidence worth being aware of even though it's a deliberate, documented choice.

## Overall Impression

The design system itself is executed with real discipline — this isn't a case of nice mockups and sloppy code, DESIGN.md's rules hold up under live, zoomed inspection. The gap is in the states around the happy path: what a first-time or zero-data creator sees, what a failed request looks like, and one place where the display math actively misrepresents the underlying number. The biggest opportunity is closing those state gaps, not touching the visual language.

## What's Working

1. The hero conversion-rate Plate is a genuinely specific, on-brand emotional payoff — turns a CRM stat into something that feels earned, tightly matched to the product's "histórico verificado" thesis.
2. Design-system discipline is real under live inspection: Plate marks, lime budget, mono scarcity, and SegmentBar geometry all match DESIGN.md exactly, cross-validated by both assessments.
3. Copy is human and status-specific ("0 das suas 2 candidaturas viraram parceria") rather than generic dashboard-speak, fitting Bia's casual, non-professional relationship to the product.

## Priority Issues

**[P1] SegmentBar shows a misleadingly full bar once a creator passes 7 applications.**
Why it matters: `DashboardPage.tsx:48-49` computes `barTotal = Math.min(totalApps, 7)` and `barFilled = Math.min(approvedApps, barTotal)`. A creator with 100 applications and 50 approved gets a correct "50%" headline number sitting directly above a bar rendered **fully filled** (`min(50,7)=7`). This also breaks DESIGN.md's own component rule ("total é sempre o número real do domínio... não um valor arredondado") and directly contradicts Product Principle 3 in PRODUCT.md ("nunca fabricar reputação... sem regra pública de cálculo") — the bar is fabricating a signal the number next to it contradicts, on the one screen whose entire job is to be trustworthy.
Fix: make the bar proportional to the real rate (or cap the segment count without capping what "filled" represents), not a raw 1:1 count capped at 7.
Suggested command: direct code fix (this is a logic bug, not a design-language issue) — no /impeccable command applies.

**[P1] Muted-foreground text fails WCAG AA contrast, confirmed by two independent methods.**
Why it matters: Assessment A computed `#75756E` on `#0A0A0A` at ≈4.27:1; Assessment B's live-injected detector independently found 4 instances at 3.9–4.4:1 against the required 4.5:1, on brand names and status labels. DESIGN.md documents this exact color as its own contrast floor ("nunca escurecer mais que isso") — the floor itself is already sub-AA before anyone darkens it further.
Fix: lighten `muted-foreground` (and the `#6E6E68` mono-index token, also flagged) by a few percent luminance across the board, and re-check every screen that inherited the same token, not just this one.
Suggested command: /impeccable audit

**[P1] A failed request is indistinguishable from "you have nothing yet."**
Why it matters: Neither `useMyApplications` nor `useMyRewards` is checked for `isError` in DashboardPage.tsx; `isLoading` only covers the initial fetch. On a failed request the page falls straight into "Nenhuma candidatura ainda." with no retry — a system failure is presented as the creator's own inactivity, worse on Casey's flaky mobile connection than anywhere else.
Fix: add a distinct error state with a retry action, separate from the genuine-empty state.
Suggested command: /impeccable harden

**[P1] Empty-state hero glyph reads as an unresolved loading skeleton.**
Why it matters: The `rate === null` branch renders an em-dash at `text-[72px]` and 20% opacity — live-zoomed screenshot confirms it's visually near-identical to the `Skeleton` component's loading rectangles shown seconds earlier. A first-time creator (Jordan) has no cue the page finished loading versus got stuck.
Fix: give the true empty state a visually distinct treatment from the loading skeleton — different shape, an icon, or explicit "sem dados ainda" label rather than a bare glyph.
Suggested command: /impeccable clarify

**[P2] Rewards — the most money-relevant number on the screen — is reachable from exactly one small link, absent from primary nav.**
Why it matters: `DashboardPage.tsx` wraps only the "a receber" StatBlock in a Link; InfluencerLayout's 5-item nav (Leitura/Abertos/Registro/Entregas/Perfil) has no Rewards entry. A creator who doesn't notice the lime-bordered box has no other path to what she's owed.
Fix: give Rewards equal billing in primary nav, or a persistently visible entry point.
Suggested command: /impeccable clarify

## Persona Red Flags

**Jordan (Confused First-Timer):** The empty-state em-dash reading as a stuck skeleton is a textbook Jordan failure — "is there something wrong, or is it just done?" — with nothing on screen to resolve the doubt.

**Casey (Distracted Mobile User):** Code inspection shows deliberate mobile accommodation (hero number scales 88px→72px below 340px per DESIGN.md; primary nav sits in a real thumb-zone bottom tab bar). The unresolved risk is specific to her: on a flaky mobile connection, the silent-failure-as-empty-state issue above means she may simply believe she has nothing pending when the request actually failed.

**Sam (Accessibility-Dependent User):** Two concrete, measured red flags: (1) sidebar-first tab order forces 7 keyboard stops before reaching page content, no skip link exists anywhere in InfluencerLayout; (2) muted-foreground contrast sits under AA (see Priority Issues), and two status-pill labels ("Retirada", "Recusada") render at 9px, below an 11px minimum-legible-text floor, confirmed live by the injected detector.

## Minor Observations

- No skip-to-content link anywhere in InfluencerLayout (contributes to the Sam red flag above; P2 on its own).
- "Retirada"/"Recusada" StatusPill labels render at 9px, under an 11px legibility floor — detector-confirmed live, not just a static-scan guess.
- The dark-glow/thin-border-shadow detector flags on the highlighted "a receber" stat are a likely false positive — DESIGN.md's own rule explicitly permits exactly this on exactly one stat per screen. Worth a one-line entry in `.impeccable/critique/ignore.md` if it keeps resurfacing on future runs.
- DESIGN.md's frontmatter has no `typography.scale` map, which is why 20 real, documented font-size values all surfaced as detector findings. Worth adding the scale to the frontmatter next time DESIGN.md is touched, purely to cut detector noise on future critiques — not a build defect.
- "Registro" names both the nav item and the dashboard's own section header for the same data, with no "ver todas" affordance inside the section itself.
- "a receber" merges PENDING and ISSUED reward statuses into one number; a creator with a reward already shipped sees the same bucket as one still awaiting approval.
- StatusPill's "Fechada" label for an approved application reads slightly transactional against the otherwise warm copy tone — consistent everywhere the component is used, not a bug, just worth knowing.

## Questions to Consider

- If a creator's rate is genuinely 0% for weeks, is leading with a giant "0%" every time she opens the app motivating or quietly punitive?
- Product Principle 3 forbids fabricating reputation without a public calculation rule — nowhere on this screen is "aprovadas ÷ total" spelled out. Does an unexplained hero percentage risk feeling like exactly the kind of score that principle exists to prevent?
- Rewards represents money or product actually owed — why does it not have equal billing with Entregas/Perfil in primary nav?
