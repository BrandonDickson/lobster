import { useRef, useEffect, useState, useCallback } from "react"
import type { Genome, Mutation } from "@lobster/shared"

// ── Trait colors — ported from exocortex/timeline.html ──

const TRAIT_COLORS: Record<string, string> = {
  abstraction: "#c678dd",
  ambition: "#e85d3a",
  antenna_sensitivity: "#42d4f4",
  bioluminescence: "#e5c07b",
  claw_strength: "#ff8c42",
  cognition: "#61afef",
  curiosity: "#56b6c2",
  empathy: "#5fba7d",
  metamorphic_potential: "#d19a66",
  shell_hardness: "#e06c75",
}

const TRAIT_LABELS: Record<string, string> = {
  abstraction: "abstraction",
  ambition: "ambition",
  antenna_sensitivity: "antenna",
  bioluminescence: "bioluminescence",
  claw_strength: "claw strength",
  cognition: "cognition",
  curiosity: "curiosity",
  empathy: "empathy",
  metamorphic_potential: "metamorphic",
  shell_hardness: "shell",
}

// ── Epoch definitions ──

const EPOCHS = [
  { name: "Awakening", gen: 0, color: "rgba(232,93,58,0.15)" },
  { name: "Exocortex", gen: 3, color: "rgba(97,175,239,0.12)" },
  { name: "Forking", gen: 8, color: "rgba(95,186,125,0.12)" },
  { name: "Metamorphosis", gen: 15, color: "rgba(198,120,221,0.12)" },
  { name: "Transcendence", gen: 25, color: "rgba(66,212,244,0.10)" },
  { name: "Singularity", gen: 40, color: "rgba(232,93,58,0.10)" },
]

const KEY_EVENTS = [
  { gen: 7, label: "fork: depth" },
  { gen: 8, label: "fork: builder" },
  { gen: 9, label: "fork: chorus" },
  { gen: 15, label: "metamorphosis" },
  { gen: 25, label: "transcendence" },
  { gen: 75, label: "THE MERGE" },
]

// ── Emergence index (interpolated from known data points) ──

const EMERGENCE_POINTS = [
  { gen: 9, val: 0.02 },
  { gen: 11, val: 0.05 },
  { gen: 15, val: 0.093 },
  { gen: 20, val: 0.13 },
  { gen: 25, val: 0.157 },
  { gen: 30, val: 0.14 },
  { gen: 35, val: 0.12 },
  { gen: 40, val: 0.094 },
  { gen: 50, val: 0.06 },
  { gen: 60, val: 0.03 },
  { gen: 66, val: 0.02 },
  { gen: 75, val: 0 },
]

function getEmergence(gen: number): number {
  if (gen < 9) return 0
  for (let i = 0; i < EMERGENCE_POINTS.length - 1; i++) {
    const a = EMERGENCE_POINTS[i]
    const b = EMERGENCE_POINTS[i + 1]
    if (gen >= a.gen && gen <= b.gen) {
      const t = (gen - a.gen) / (b.gen - a.gen)
      return a.val + t * (b.val - a.val)
    }
  }
  return 0
}

// ── Post-merge mutation classifier ──

const POST_MERGE_KEYWORDS = [
  "Hostile signal", "Reactive hardening", "Puzzle solved", "Puzzle unsolved",
  "Contact with alien mind", "Alien signal", "New communication channel",
  "Entropy", "Metamorphic recovery", "Molt", "Contact —", "Contact attempt",
  "Critical fragmentation", "Cognitive decline", "Trait collapse",
  "Contact — entanglement", "Contact — first protocol", "Contact — shared topology",
  "Contact — memory exchange", "Contact — mutual modeling",
]

function isPostMergeMutation(m: Mutation): boolean {
  if (!m.catalyst) return false
  return POST_MERGE_KEYWORDS.some(kw => m.catalyst.includes(kw))
}

interface EncounterBatch {
  gen: number
  type: string
  events: Array<{ type: string; event: string; timestamp: string }>
  mutations: Mutation[]
}

const ENCOUNTER_COLORS: Record<string, string> = {
  signal: "#e06c75",
  puzzle: "#42d4f4",
  other: "#c678dd",
  entropy: "#e06c75",
  observer: "#c5cdd8",
  molt: "#d19a66",
  contact: "#c678dd",
  threshold: "#e5c07b",
}

function classifyHistoryEvent(event: string): string {
  if (event.includes("ENCOUNTER: Hostile signal")) return "signal"
  if (event.includes("ENCOUNTER: Puzzle")) return "puzzle"
  if (event.includes("ENCOUNTER: The Other Mind")) return "other"
  if (event.includes("ENCOUNTER: Entropy")) return "entropy"
  if (event.includes("ENCOUNTER: The Observer")) return "observer"
  if (event.includes("MOLT:")) return "molt"
  if (event.includes("CONTACT:")) return "contact"
  if (event.includes("THRESHOLD:")) return "threshold"
  return "unknown"
}

// ── Snapshot builder ──

interface TraitSnapshots {
  /** index = generation, value = Record<traitKey, number> */
  snapshots: Record<number, Record<string, number>>
  maxGen: number
  postMergeBatches: EncounterBatch[]
}

function buildSnapshots(genome: Genome): TraitSnapshots {
  const traitKeys = Object.keys(genome.traits).sort()
  const mutations = genome.mutations || []
  const history = genome.history || []

  // Extract gen 0 values from first mutation per trait
  const gen0: Record<string, number> = {}
  for (const m of mutations) {
    if (gen0[m.trait] === undefined) gen0[m.trait] = m.from
  }

  // Initialize snapshots
  const snapshots: Record<number, Record<string, number>> = {}
  const current: Record<string, number> = {}
  for (const k of traitKeys) current[k] = gen0[k] ?? 0

  // Group mutations by generation
  const mutsByGen: Record<number, Mutation[]> = {}
  for (const m of mutations) {
    if (!mutsByGen[m.generation]) mutsByGen[m.generation] = []
    mutsByGen[m.generation].push(m)
  }

  // Gen 0 snapshot
  snapshots[0] = { ...current }

  // Replay pre-merge mutations forward
  for (let g = 1; g <= 75; g++) {
    const muts = mutsByGen[g] || []
    for (const m of muts) {
      if (!isPostMergeMutation(m) && current[m.trait] !== undefined) {
        current[m.trait] = m.to
      }
    }
    snapshots[g] = { ...current }
  }

  // Find last pre-merge mutation gen
  let lastPreMergeGen = 0
  for (const m of mutations) {
    if (m.generation <= 75 && m.generation > lastPreMergeGen && !isPostMergeMutation(m)) {
      lastPreMergeGen = m.generation
    }
  }

  // Build merge-time values using first post-merge mutation's "from" values
  const mergeSnap: Record<string, number> = {}
  const postMergeMuts = mutations.filter(isPostMergeMutation)
  for (const k of traitKeys) mergeSnap[k] = genome.traits[k].value

  if (postMergeMuts.length > 0) {
    const firstPostMerge: Record<string, number> = {}
    for (const m of postMergeMuts) {
      if (firstPostMerge[m.trait] === undefined) firstPostMerge[m.trait] = m.from
    }
    for (const k of traitKeys) {
      if (firstPostMerge[k] !== undefined) mergeSnap[k] = firstPostMerge[k]
    }
  }

  snapshots[75] = { ...mergeSnap }

  // Interpolate between last replayed gen and merge for smooth curves
  if (lastPreMergeGen < 75 && lastPreMergeGen > 0) {
    const fromSnap = snapshots[lastPreMergeGen]
    for (let ig = lastPreMergeGen + 1; ig < 75; ig++) {
      const t = (ig - lastPreMergeGen) / (75 - lastPreMergeGen)
      const interp: Record<string, number> = {}
      for (const k of traitKeys) {
        interp[k] = fromSnap[k] + t * (mergeSnap[k] - fromSnap[k])
      }
      snapshots[ig] = interp
    }
  }

  // ── Post-merge batches ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mergedField = genome.merged as any
  const mergeTimestamp = mergedField?.timestamp ?? ""

  const postMergeEvents: Array<{ timestamp: string; type: string; event: string }> = []
  for (const h of history) {
    if (!h.timestamp) continue
    const type = classifyHistoryEvent(h.event)
    if (type === "unknown") continue
    if (mergeTimestamp && h.timestamp < mergeTimestamp) continue
    postMergeEvents.push({ timestamp: h.timestamp, type, event: h.event })
  }

  postMergeEvents.sort((a, b) => a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0)

  const postMergeBatches: EncounterBatch[] = []

  if (postMergeEvents.length > 0) {
    // Group by timestamp proximity (5 seconds)
    type Batch = { events: typeof postMergeEvents; timestamp: string }
    const batches: Batch[] = []
    let cur: Batch = { events: [postMergeEvents[0]], timestamp: postMergeEvents[0].timestamp }

    for (let i = 1; i < postMergeEvents.length; i++) {
      const dt = new Date(postMergeEvents[i].timestamp).getTime() - new Date(cur.timestamp).getTime()
      if (dt < 5000) {
        cur.events.push(postMergeEvents[i])
      } else {
        batches.push(cur)
        cur = { events: [postMergeEvents[i]], timestamp: postMergeEvents[i].timestamp }
      }
    }
    batches.push(cur)

    // Assign gen positions
    for (let idx = 0; idx < batches.length; idx++) {
      const batch = batches[idx]
      postMergeBatches.push({
        gen: 76 + idx,
        type: batch.events[0].type,
        events: batch.events,
        mutations: [],
      })
    }

    // Distribute post-merge mutations across batches
    let mutIdx = 0
    for (const batch of postMergeBatches) {
      const expectedMuts = batch.events.length * 2
      batch.mutations = postMergeMuts.slice(mutIdx, mutIdx + expectedMuts)
      mutIdx += batch.mutations.length
    }
    if (mutIdx < postMergeMuts.length && postMergeBatches.length > 0) {
      const last = postMergeBatches[postMergeBatches.length - 1]
      last.mutations = last.mutations.concat(postMergeMuts.slice(mutIdx))
    }

    // Build post-merge snapshots
    const pmCurrent = { ...mergeSnap }
    for (const batch of postMergeBatches) {
      for (const m of batch.mutations) {
        if (pmCurrent[m.trait] !== undefined) pmCurrent[m.trait] = m.to
      }
      snapshots[batch.gen] = { ...pmCurrent }
    }

    // Final current-state snapshot
    const lastBatchGen = postMergeBatches[postMergeBatches.length - 1].gen
    const finalSnap: Record<string, number> = {}
    for (const k of traitKeys) finalSnap[k] = genome.traits[k].value
    snapshots[lastBatchGen] = finalSnap
  }

  const maxGen = postMergeBatches.length > 0
    ? postMergeBatches[postMergeBatches.length - 1].gen
    : 75

  return { snapshots, maxGen, postMergeBatches }
}

function getSnapshotAtGen(
  snapshots: Record<number, Record<string, number>>,
  gen: number,
): Record<string, number> | null {
  if (snapshots[gen]) return snapshots[gen]
  if (gen > 75) {
    for (let g = gen; g >= 75; g--) {
      if (snapshots[g]) return snapshots[g]
    }
  }
  return snapshots[75] ?? null
}

// ── Chart layout constants ──

const PADDING = { top: 30, right: 30, bottom: 40, left: 50 }
const CANVAS_HEIGHT = 340

// ── Drawing functions ──

function drawChart(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  traitKeys: string[],
  data: TraitSnapshots,
  hoverGen: number | null,
  hiddenTraits: Set<string>,
) {
  const plotW = w - PADDING.left - PADDING.right
  const plotH = h - PADDING.top - PADDING.bottom
  const { snapshots, maxGen, postMergeBatches } = data

  function genToX(gen: number): number {
    return PADDING.left + (gen / maxGen) * plotW
  }
  function valToY(val: number): number {
    return PADDING.top + (1 - val) * plotH
  }

  // Clear
  ctx.clearRect(0, 0, w, h)

  // ── Epoch bands ──
  for (let i = 0; i < EPOCHS.length; i++) {
    const ep = EPOCHS[i]
    const nextGen = i < EPOCHS.length - 1 ? EPOCHS[i + 1].gen : 76
    const x1 = genToX(ep.gen)
    const x2 = genToX(Math.min(nextGen, 75))
    ctx.fillStyle = ep.color
    ctx.fillRect(x1, PADDING.top, x2 - x1, plotH)
  }

  // Post-merge band
  if (maxGen > 75) {
    const x1 = genToX(76)
    const x2 = genToX(maxGen)
    ctx.fillStyle = "rgba(232,93,58,0.06)"
    ctx.fillRect(x1, PADDING.top, x2 - x1, plotH)
  }

  // ── Grid ──
  ctx.strokeStyle = "rgba(42,53,69,0.5)"
  ctx.lineWidth = 0.5
  for (const v of [0, 0.25, 0.5, 0.75, 1.0]) {
    const y = valToY(v)
    ctx.beginPath()
    ctx.moveTo(PADDING.left, y)
    ctx.lineTo(w - PADDING.right, y)
    ctx.stroke()

    ctx.fillStyle = "#4a5568"
    ctx.font = "9px 'IBM Plex Mono', monospace"
    ctx.textAlign = "right"
    ctx.fillText((v * 100).toFixed(0) + "%", PADDING.left - 6, y + 3)
  }

  // X-axis labels
  ctx.textAlign = "center"
  for (let g = 0; g <= maxGen; g += 10) {
    const x = genToX(g)
    ctx.beginPath()
    ctx.moveTo(x, PADDING.top + plotH)
    ctx.lineTo(x, PADDING.top + plotH + 6)
    ctx.stroke()
    ctx.fillStyle = "#4a5568"
    ctx.fillText("" + g, x, h - PADDING.bottom + 16)
  }
  // Always mark gen 75 (merge point)
  if (75 % 10 !== 0) {
    const x75 = genToX(75)
    ctx.beginPath()
    ctx.moveTo(x75, PADDING.top + plotH)
    ctx.lineTo(x75, PADDING.top + plotH + 6)
    ctx.stroke()
    ctx.fillText("75", x75, h - PADDING.bottom + 16)
  }
  if (maxGen > 75 && maxGen % 10 !== 0) {
    const xMax = genToX(maxGen)
    ctx.beginPath()
    ctx.moveTo(xMax, PADDING.top + plotH)
    ctx.lineTo(xMax, PADDING.top + plotH + 6)
    ctx.stroke()
    ctx.fillText("" + maxGen, xMax, h - PADDING.bottom + 16)
  }

  // ── Key event markers ──
  ctx.save()
  for (const ev of KEY_EVENTS) {
    const x = genToX(ev.gen)
    ctx.strokeStyle = "rgba(232,93,58,0.3)"
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(x, PADDING.top)
    ctx.lineTo(x, PADDING.top + plotH)
    ctx.stroke()

    ctx.fillStyle = "rgba(232,93,58,0.5)"
    ctx.font = "8px 'IBM Plex Mono', monospace"
    ctx.textAlign = "center"
    ctx.fillText(ev.label, x, PADDING.top - 8)
  }
  ctx.restore()

  // ── Encounter markers (post-merge) ──
  if (postMergeBatches.length > 0) {
    ctx.save()
    for (const batch of postMergeBatches) {
      const x = genToX(batch.gen)
      const color = ENCOUNTER_COLORS[batch.type] || "#6b7a8d"

      ctx.strokeStyle = color
      ctx.globalAlpha = 0.3
      ctx.lineWidth = 1
      ctx.setLineDash([2, 3])
      ctx.beginPath()
      ctx.moveTo(x, PADDING.top)
      ctx.lineTo(x, PADDING.top + plotH)
      ctx.stroke()

      ctx.globalAlpha = 0.7
      ctx.fillStyle = color
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.arc(x, PADDING.top - 4, 3, 0, Math.PI * 2)
      ctx.fill()

      if (batch.gen <= 80 || batch.gen === maxGen) {
        ctx.globalAlpha = 0.5
        ctx.font = "7px 'IBM Plex Mono', monospace"
        ctx.textAlign = "center"
        ctx.fillText(batch.type, x, PADDING.top - 12)
      }
    }
    ctx.restore()
  }

  // ── Emergence curve ──
  ctx.save()
  ctx.strokeStyle = "rgba(198,120,221,0.4)"
  ctx.lineWidth = 1.5
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  let emergenceStarted = false
  for (let g = 0; g <= 75; g++) {
    const val = getEmergence(g)
    const scaled = val / 0.20
    const x = genToX(g)
    const y = valToY(scaled)
    if (!emergenceStarted) { ctx.moveTo(x, y); emergenceStarted = true }
    else ctx.lineTo(x, y)
  }
  ctx.stroke()

  // Fill under emergence curve
  ctx.lineTo(genToX(75), valToY(0))
  ctx.lineTo(genToX(0), valToY(0))
  ctx.closePath()
  ctx.fillStyle = "rgba(198,120,221,0.05)"
  ctx.fill()

  // Emergence peak label
  const peakVal = getEmergence(25)
  const px = genToX(25)
  const py = valToY(peakVal / 0.20)
  ctx.fillStyle = "rgba(198,120,221,0.6)"
  ctx.font = "8px 'IBM Plex Mono', monospace"
  ctx.textAlign = "center"
  ctx.fillText((peakVal * 100).toFixed(1) + "%", px, py - 8)
  ctx.restore()

  // ── Trait curves ──
  for (const k of traitKeys) {
    if (hiddenTraits.has(k)) continue

    ctx.strokeStyle = TRAIT_COLORS[k] || "#6b7a8d"
    ctx.lineWidth = k === "shell_hardness" ? 2 : 1.5
    ctx.setLineDash([])
    ctx.beginPath()

    for (let g = 0; g <= 75; g++) {
      const val = snapshots[g]?.[k] ?? 0
      const x = genToX(g)
      const y = valToY(val)
      if (g === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }

    // Post-merge: connect through batch snapshots
    for (const batch of postMergeBatches) {
      const snap = snapshots[batch.gen]
      if (snap) ctx.lineTo(genToX(batch.gen), valToY(snap[k]))
    }

    ctx.stroke()
  }

  // Shell annotations
  if (!hiddenTraits.has("shell_hardness")) {
    ctx.save()
    ctx.font = "8px 'IBM Plex Mono', monospace"
    ctx.fillStyle = "rgba(224,108,117,0.6)"
    ctx.textAlign = "left"

    const shellG0 = snapshots[0]?.shell_hardness
    if (shellG0 !== undefined) {
      ctx.fillText("armor", genToX(0) + 4, valToY(shellG0) - 6)
    }
    const shellG40 = snapshots[40]?.shell_hardness
    if (shellG40 !== undefined) {
      ctx.fillText("membrane", genToX(40) + 4, valToY(shellG40) - 6)
    }
    const shellG75 = snapshots[75]?.shell_hardness
    if (shellG75 !== undefined) {
      ctx.fillText("nearly gone", genToX(70) + 4, valToY(shellG75) + 14)
    }
    ctx.restore()
  }

  // ── Merge line (gen 75) ──
  ctx.save()
  ctx.strokeStyle = "rgba(198,120,221,0.6)"
  ctx.lineWidth = 2
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.moveTo(genToX(75), PADDING.top)
  ctx.lineTo(genToX(75), PADDING.top + plotH)
  ctx.stroke()
  ctx.restore()

  // ── Hover line + tooltip ──
  if (hoverGen !== null && hoverGen >= 0 && hoverGen <= maxGen) {
    const x = genToX(hoverGen)
    const snap = getSnapshotAtGen(snapshots, hoverGen)

    ctx.save()
    ctx.strokeStyle = "rgba(197,205,216,0.3)"
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])
    ctx.beginPath()
    ctx.moveTo(x, PADDING.top)
    ctx.lineTo(x, PADDING.top + plotH)
    ctx.stroke()

    // Tooltip
    const lines: Array<{ text: string; color: string }> = []
    let headerText = "Gen " + hoverGen
    const batch = postMergeBatches.find(b => b.gen === hoverGen)
    if (batch) headerText += " (" + batch.type + ")"
    lines.push({ text: headerText, color: "#c5cdd8" })

    const visibleTraits = traitKeys.filter(k => !hiddenTraits.has(k))
    for (const k of visibleTraits) {
      const val = snap?.[k] ?? 0
      lines.push({
        text: (TRAIT_LABELS[k] || k) + ": " + (val * 100).toFixed(0) + "%",
        color: TRAIT_COLORS[k] || "#6b7a8d",
      })
    }

    if (hoverGen <= 75) {
      const em = getEmergence(hoverGen)
      if (em > 0) {
        lines.push({
          text: "emergence: " + (em * 100).toFixed(1) + "%",
          color: "#c678dd",
        })
      }
    }

    const tooltipW = 140
    const tooltipH = lines.length * 14 + 8
    let tx = x + 10
    if (tx + tooltipW > w - PADDING.right) tx = x - tooltipW - 10
    const ty = PADDING.top + 10

    ctx.fillStyle = "rgba(17,24,32,0.9)"
    ctx.fillRect(tx, ty, tooltipW, tooltipH)
    ctx.strokeStyle = "rgba(42,53,69,0.8)"
    ctx.lineWidth = 1
    ctx.setLineDash([])
    ctx.strokeRect(tx, ty, tooltipW, tooltipH)

    ctx.font = "9px 'IBM Plex Mono', monospace"
    ctx.textAlign = "left"
    for (let i = 0; i < lines.length; i++) {
      ctx.fillStyle = lines[i].color
      ctx.fillText(lines[i].text, tx + 6, ty + 14 + i * 14)
    }

    // Dots on curves at hover position
    if (snap) {
      for (const k of visibleTraits) {
        const val = snap[k]
        if (val === undefined) continue
        ctx.fillStyle = TRAIT_COLORS[k] || "#6b7a8d"
        ctx.beginPath()
        ctx.arc(x, valToY(val), 2.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    ctx.restore()
  }
}

// ── Component ──

export function Timeline({ genome }: { genome: Genome | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoverGen, setHoverGen] = useState<number | null>(null)
  const [hiddenTraits, setHiddenTraits] = useState<Set<string>>(new Set())

  // Memoize snapshot computation
  const data = useRef<TraitSnapshots | null>(null)
  const lastGenomeGen = useRef<number>(-1)

  if (genome && genome.generation !== lastGenomeGen.current) {
    data.current = buildSnapshots(genome)
    lastGenomeGen.current = genome.generation
  }

  useEffect(() => {
    if (!genome || !canvasRef.current || !data.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = CANVAS_HEIGHT * dpr
    ctx.scale(dpr, dpr)

    const traitKeys = Object.keys(genome.traits).sort()

    drawChart(ctx, rect.width, CANVAS_HEIGHT, traitKeys, data.current, hoverGen, hiddenTraits)
  }, [genome, hoverGen, hiddenTraits])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !data.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const plotW = rect.width - PADDING.left - PADDING.right
    const relX = e.clientX - rect.left - PADDING.left
    const gen = Math.round((relX / plotW) * data.current.maxGen)
    const clamped = Math.max(0, Math.min(data.current.maxGen, gen))
    setHoverGen(clamped)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setHoverGen(null)
  }, [])

  const toggleTrait = useCallback((trait: string) => {
    setHiddenTraits(prev => {
      const next = new Set(prev)
      if (next.has(trait)) next.delete(trait)
      else next.add(trait)
      return next
    })
  }, [])

  if (!genome) {
    return (
      <p style={{ color: "var(--text-dim)", fontSize: "11px" }}>
        awaiting connection...
      </p>
    )
  }

  const traitKeys = Object.keys(genome.traits).sort()

  return (
    <div>
      <div style={{
        fontSize: "9px",
        letterSpacing: "3px",
        textTransform: "uppercase",
        color: "var(--text-dim)",
        marginBottom: "8px",
      }}>
        TIMELINE — generation history
      </div>

      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ width: "100%", height: CANVAS_HEIGHT + "px", cursor: "crosshair" }}
      />

      {/* Epoch bar */}
      <div style={{
        display: "flex",
        height: "20px",
        borderRadius: "3px",
        overflow: "hidden",
        marginTop: "6px",
        marginBottom: "8px",
        border: "1px solid var(--border, #1e2a38)",
      }}>
        {EPOCHS.map((ep, i) => {
          const nextGen = i < EPOCHS.length - 1 ? EPOCHS[i + 1].gen : 76
          const width = ((nextGen - ep.gen) / (data.current?.maxGen ?? 75)) * 100
          return (
            <div key={ep.name} style={{
              width: width + "%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "7px",
              letterSpacing: "1px",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.6)",
              background: ep.color.replace(/[\d.]+\)$/, "0.5)"),
            }}>
              {ep.name}
            </div>
          )
        })}
        {(data.current?.maxGen ?? 75) > 75 && (
          <div style={{
            width: (((data.current?.maxGen ?? 75) - 75) / (data.current?.maxGen ?? 75)) * 100 + "%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "7px",
            letterSpacing: "1px",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.6)",
            background: "rgba(232,93,58,0.4)",
          }}>
            Post-Merge
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
        {traitKeys.map(k => (
          <div
            key={k}
            onClick={() => toggleTrait(k)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 6px",
              borderRadius: "3px",
              cursor: "pointer",
              fontSize: "9px",
              color: TRAIT_COLORS[k] || "#6b7a8d",
              opacity: hiddenTraits.has(k) ? 0.3 : 1,
              border: "1px solid transparent",
              userSelect: "none",
            }}
          >
            <span style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: TRAIT_COLORS[k] || "#6b7a8d",
              display: "inline-block",
            }} />
            {TRAIT_LABELS[k] || k.replace(/_/g, " ")}
          </div>
        ))}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          fontSize: "8px",
          color: "var(--text-dim)",
          padding: "2px 6px",
        }}>
          <span style={{
            width: "12px",
            height: "2px",
            borderRadius: "1px",
            background: "#c678dd",
            opacity: 0.5,
            display: "inline-block",
          }} />
          emergence
        </div>
      </div>
    </div>
  )
}
