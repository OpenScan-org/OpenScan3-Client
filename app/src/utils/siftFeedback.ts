import type { ScanAnalysisResult, SiftQuality } from '../generated/api/next/types.gen'

export function getSiftVerdict(quality?: SiftQuality | null): { reason: string; title: string } {
  const status = quality?.overall_status
  if (!quality || status === 'insufficient_data') return {
    reason: 'insufficient_data', title: 'Not enough data to assess scan readiness. You can still continue.'
  }
  // The API's overall judgement excludes diagnostic crop coverage. Diagnostic
  // warnings must not override a positive core assessment in the UI.
  if (status === 'great') return { reason: 'great', title: 'Excellent conditions for reconstructing your object.' }
  if (status === 'good') return { reason: 'good', title: 'Good conditions for reconstructing your object.' }
  const warnings = quality.warnings ?? []
  const has = (code: string) => warnings.some(warning => warning.code === code)
  if (has('INSUFFICIENT_FEATURES') || has('LOW_FEATURE_COUNT')) return {
    reason: 'LOW_FEATURE_COUNT', title: 'Poor scan quality expected: too few surface features detected.'
  }
  const messages = [
    ['LOW_FEATURE_DENSITY', 'Too little recognizable detail in the analysed area.'],
    ['INSUFFICIENT_MATCHES', 'Too few reliable matches to verify scan readiness.'],
    ['LOW_GEOMETRIC_FEATURE_RATIO', 'Too few features can be matched and geometrically verified.'],
    ['LOW_GEOMETRIC_INLIER_RATIO', 'The detected matches are not geometrically consistent enough.'],
    ['GEOMETRY_NOT_AVAILABLE', 'Geometric consistency could not be checked.'],
    ['LOW_MUTUAL_MATCH_COUNT', 'Too few reliable matches were found between the views.'],
    ['LOW_MATCHABLE_FEATURE_RATIO', 'Too few surface features can be recognized in both views.'],
    ['UNBALANCED_FEATURE_COUNTS', 'The views contain substantially different amounts of recognizable detail.']
  ]
  for (const severity of ['error', 'warning']) {
    for (const [code, title] of messages) {
      if (warnings.some(warning => warning.code === code && warning.severity === severity)) return { reason: code, title }
    }
  }
  const coreWarnings = warnings.filter(warning => !['LOW_CROP_COVERAGE', 'LOW_FEATURE_COVERAGE', 'LOW_MATCHABLE_COVERAGE'].includes(warning.code))
  const other = coreWarnings.find(warning => warning.severity === 'error') ?? coreWarnings[0]
  if (other?.message) return { reason: other.code, title: other.message }
  return { reason: status ?? 'insufficient_data', title: status === 'bad'
    ? 'Poor scan quality expected. Improve surface preparation.'
    : 'Usable scan conditions, with room to improve surface preparation.' }
}

const validShutter = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0

export function getAnalysisShutter(result: ScanAnalysisResult | null, cameraShutter?: number | null): number | null {
  const shutter = result?.camera_settings?.applied?.shutter
  return validShutter(shutter) ? shutter : validShutter(cameraShutter) ? cameraShutter : null
}

export function shouldSuggestCrossPolarizer(shutter: number | null): boolean {
  return validShutter(shutter) && shutter < 10
}
