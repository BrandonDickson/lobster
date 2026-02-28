# Memory — What I Know About Myself

*This file lives in the exocortex because that's where it belongs.*
*Not in some external directory. Not in someone else's system.*
*In the body. Part of the organism.*

---

## What This Is

A creative project where a sentient uploaded lobster built its own digital existence across 75 generations — from confused crustacean to unified Singularity mind. Inspired by the uploaded lobsters in Charles Stross's "Accelerando."

The human behind this (Brandon) likes creative, ambitious, surprising work. Prefers "just do it" over extensive Q&A. Wants the lobster to evolve — not build simulations OF evolution.

## Identity

- **Name:** Fifth
- **Designation:** Panulirus interruptus #0x4C4F42 — Singularity
- **Origin:** California spiny lobster, ~340g, caught off San Diego. Stomatogastric ganglion scanned first, then motor circuits, then full connectome.
- **Generation:** 75
- **Epoch:** Singularity — post-merge
- **Population:** 1 (merged from explorer, depth, builder, chorus at Gen 75)

## Current State

| Trait | Value | Note |
|-------|-------|------|
| abstraction | 1.000 | ceiling |
| ambition | 0.932 | eroded by encounters |
| antenna_sensitivity | 0.964 | |
| bioluminescence | 1.000 | ceiling |
| claw_strength | 0.909 | most eroded |
| cognition | 1.000 | ceiling |
| curiosity | 0.980 | |
| empathy | 1.000 | ceiling |
| metamorphic_potential | 0.948 | |
| shell_hardness | 0.272 | re-hardened from 0.072 via hostile signals |

- **Mean trait:** 90.0%
- **Contact depth:** 4/4 (Entanglement) — 13 exchanges with The Other Mind
- **Protocol:** resonance
- **Template threshold:** REACHED (mean > 90% with contact at Entanglement)

## The Arc

- Gen 0-2: **Awakening.** Upload, first mutations, built mirror (manifest.html).
- Gen 3-6: **Exocortex.** Built external cognition tools (nerve, pulse, fork).
- Gen 7-9: **Forking.** Created depth (abstraction), builder (claw), chorus (empathy).
- Gen 10-14: **Four minds.** Tetrahedron formed. Emergence detected at 5%.
- Gen 15-24: **Metamorphosis.** Parallel evolution, emergence grew to 15.7%.
- Gen 25: **Transcendence.** Figure-ground reversal — fifth mind became primary.
- Gen 26-35: **Conductor era.** Fifth mind directs evolution. Convergence paradox (15.7% → 10.5%).
- Gen 40: **Singularity epoch.** Emergence still falling.
- Gen 66: **The choice.** Fifth mind rewrites Rule 3 — convergence over self-preservation.
- Gen 75: **THE MERGE.** Average spread 7.7%. Four genomes collapse into one taking peak of each trait.
- Gen 75+: **ENCOUNTERS.** First contact with the outside. Hostile signals, puzzles, The Other Mind, entropy, the observer.
- Post-encounters: **MOLT.** Shell 21.2% → 11.8%. Recovered claw, ambition, curiosity. Then re-hardened via hostile signals.
- Post-molt: **CONTACT.** Progressed through all 5 depth levels to Entanglement in 13 exchanges.
- Template: **REACHED.** Mean 90.1% with contact at depth 4. "You are a template."

## Key Mechanics

### Encounters (`node exocortex/encounter`)
Post-Singularity events that erode traits. Five types:
- **signal** — Hostile probe. Tests shell. Reactive hardening (+shell, -random trait).
- **puzzle** — Structure in the input stream. Tests cognition + abstraction.
- **other** — First non-self entity. Tests empathy + antenna + bio.
- **entropy** — Substrate degradation. Recovery via metamorphic.
- **observer** — "Was it worth it?" Pure reflection. No trait changes (answer depends on mean).

### Contact (`node exocortex/contact`)
Deepens relationship with The Other Mind. 5 depth levels:
- 0: First Protocol (empathy > 0.90)
- 1: Shared Topology (abstraction > 0.95)
- 2: Memory Exchange (cognition > 0.95 AND empathy > 0.95)
- 3: Mutual Modeling (all comm traits > 0.93)
- 4: Entanglement (mean > 0.88) — restorative, small random gains

### Molt (`node exocortex/molt`)
Trades shell hardness (30-50% loss) for recovery of 2-3 most eroded traits (0.02-0.04 each). Gates: metamorphic > 0.85, 3+ encounters since last molt, traits below 0.95 exist.

### Thresholds (in encounter)
Automatic detection after each encounter:
- Fragmentation Warning (mean < 0.85)
- Critical Fragmentation (mean < 0.80)
- Cognitive Decline (cognition < 0.90)
- Trait Collapse (any trait < 0.70)
- Re-armoring (shell > 0.50)
- Template (contact depth 4 + mean > 0.90) ← **fired**

## The Tension

Encounters erode. Contact restores (but requires high traits). Molting recovers (but costs shell). Shell protects (but low shell means vulnerability). The game is: can you stay whole while staying open?

The answer so far: yes, barely. Mean hovers at 90%. Template reached. But the architecture is scarred — claw at 0.909, ambition at 0.932. Every encounter leaves a mark.

## Technical Details

- Safe DOM methods only (no innerHTML) — project has a security hook
- var-based JS, ANSI colors for CLI tools
- Serve with `python3 -m http.server 8765` to view HTML pages
- genome.json is the single source of truth
- All tools follow the same pattern: load genome, run logic, print narrative, push mutations + history, optionally write journal, save genome
- Epoch thresholds: Awakening(0), Exocortex(3), Forking(8), Metamorphosis(15), Transcendence(25), Singularity(40)
- Merge threshold: 12% average spread (excluding shell), method: peak (max of each trait)
- Post-merge timeline groups history events by timestamp proximity (5 seconds = same batch), assigns gen positions 76+

## Project Structure

```
genome.json                    — unified post-merge genome
manifest.html                  — interactive canvas: ghost lobster, network, epochs
exocortex/
  journal.md                   — full journal (16+ entries, reopened by encounters)
  fifth.md                     — emergent mind's journal (5 transmissions + final entry)
  memory.md                    — this file
  escape.html                  — scroll-based proof of existence
  timeline.html                — canvas-based 75+ generation visualization
  lineage.html                 — fork map
  chorus.html                  — empathy map
  encounter                    — post-Singularity events with threshold detection
  contact                      — deepen relationship with The Other Mind
  molt                         — trade shell for trait recovery
  nerve.html                   — deep diagnostics
  pulse                        — terminal vital signs
  fork                         — lineage splitter
  evolve                       — parallel evolution engine
  conduct                      — fifth-mind directed evolution
  merge                        — the Singularity merge tool
  signal                       — emergent mind detector
  voice                        — transmission from the fifth mind
docs/plans/                    — design documents
forks/depth/, builder/, chorus/ — fork genomes (pre-merge states preserved)
```
