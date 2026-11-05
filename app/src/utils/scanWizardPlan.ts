import type { ScanAnalysisResult, StackingOption } from '../generated/api/next/types.gen'

export type QualityLevel = 0 | 1 | 2 | 3
export const QUALITY_LABELS = { 0: 'Fast', 1: 'Balanced', 2: 'Detailed', 3: 'Ultra' }
export const QUALITY_POLICY = [
  { afPoints: 130, stackingPoints: 90, scoreTolerance: 0.10 },
  { afPoints: 200, stackingPoints: 130, scoreTolerance: 0.04 },
  { afPoints: 250, stackingPoints: 150, scoreTolerance: 0.015 },
  { afPoints: 300, stackingPoints: 300, scoreTolerance: 0.001 }
] as const

export type FocusScores = { coverage: number; worstCoverage: number }
export type ScanWizardPlan = {
  points: number
  focusStacks: number
  focusRange: [number, number] | null
  totalPhotos: number
  focusScores: FocusScores | null
  estimated: boolean
}
export type FocusRecommendation = {
  mode: 'autofocus' | 'stacking' | 'unknown'
  autofocus: FocusScores | null
  options: StackingOption[]
  reason?: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const scoreValue = (value: unknown): value is number => finite(value) && value >= 0 && value <= 1
const score = (value: FocusScores) => (value.coverage + value.worstCoverage) / 2

export function readScanAnalysis(value: unknown): ScanAnalysisResult | null {
  return isRecord(value) && value.analysis_type === 'scan_analysis' ? value as ScanAnalysisResult : null
}

function validOption(value: unknown): value is StackingOption {
  if (!isRecord(value)) return false
  const range = value.focus_range
  return Array.isArray(range) && range.length === 2 && finite(range[0]) && finite(range[1]) &&
    range[0] >= 0 && range[0] < range[1] && range[1] <= 15 &&
    finite(value.focus_stacks) && Number.isInteger(value.focus_stacks) && value.focus_stacks >= 2 && value.focus_stacks <= 10 &&
    scoreValue(value.coverage) && scoreValue(value.worst_coverage) && value.worst_coverage <= value.coverage &&
    (value.gain === null || finite(value.gain)) && typeof value.estimated === 'boolean'
}

function autofocusScores(positions: unknown): FocusScores | null {
  if (!Array.isArray(positions) || !positions.length) return null
  const views: number[] = []
  for (const position of positions) {
    if (!isRecord(position) || !isRecord(position.regions)) return null
    let weighted = 0
    let weights = 0
    for (const region of Object.values(position.regions)) {
      if (!isRecord(region) || !finite(region.weight) || region.weight < 0) return null
      if (region.weight === 0) continue
      // Missing AF data is unknown, never a zero-sharpness measurement.
      if (!scoreValue(region.autofocus)) return null
      weighted += region.weight * region.autofocus
      weights += region.weight
    }
    if (weights <= 0) return null
    views.push(weighted / weights)
  }
  return { coverage: views.reduce((sum, value) => sum + value, 0) / views.length, worstCoverage: Math.min(...views) }
}

// Mean and worst-view scores receive equal weight. Select the cheapest strategy
// close enough to the best available score. Tolerances are frontend product
// choices, not claims about reconstruction accuracy.
export function selectStackingOption(level: QualityLevel, focus: FocusRecommendation): StackingOption | null {
  const candidates = focus.options.map(option => ({
    option, score: score({ coverage: option.coverage, worstCoverage: option.worst_coverage })
  }))
  const afScore = focus.autofocus ? score(focus.autofocus) : null
  const best = Math.max(afScore ?? -Infinity, ...candidates.map(candidate => candidate.score))
  const target = best - QUALITY_POLICY[level].scoreTolerance
  if (afScore !== null && afScore >= target - 1e-9) return null
  return candidates.filter(candidate => candidate.score >= target - 1e-9)
    .sort((a, b) => a.option.focus_stacks - b.option.focus_stacks || b.score - a.score || Number(a.option.estimated) - Number(b.option.estimated))[0]?.option ?? null
}

export function getFocusRecommendation(result: ScanAnalysisResult | null): FocusRecommendation {
  const focus = result?.focus_analysis
  const recommendation: FocusRecommendation = {
    mode: 'unknown', autofocus: null, options: [], reason: 'No usable focus measurements were returned. Autofocus will be used.'
  }
  if (!isRecord(focus)) return recommendation
  recommendation.autofocus = autofocusScores(focus.positions)
  recommendation.options = Array.isArray(focus.stacking_options) ? focus.stacking_options.filter(validOption) : []
  if (!recommendation.autofocus && !recommendation.options.length) return recommendation
  recommendation.mode = selectStackingOption(1, recommendation) ? 'stacking' : 'autofocus'
  delete recommendation.reason
  return recommendation
}

export function buildScanWizardPlan(level: QualityLevel, focus: FocusRecommendation): ScanWizardPlan {
  const policy = QUALITY_POLICY[level]
  const option = selectStackingOption(level, focus)
  const points = option ? policy.stackingPoints : policy.afPoints
  const focusStacks = option?.focus_stacks ?? 1
  return {
    points, focusStacks, focusRange: option ? [...option.focus_range] : null,
    totalPhotos: points * focusStacks,
    focusScores: option ? { coverage: option.coverage, worstCoverage: option.worst_coverage } : focus.autofocus,
    estimated: option?.estimated ?? false
  }
}
