import type { SiftQuality } from '../generated/api/next/types.gen'

type Grade = SiftQuality['overall_status']
type Case = { id: string; label: string; feature: Grade; matching: Grade; geometry: Grade; spatial?: Grade; shutterMs?: number; code?: string; message?: string }
export const readinessDebugCases: Case[] = [
  { id: 'great', label: 'Great: all categories', feature: 'great', matching: 'great', geometry: 'great' },
  { id: 'good', label: 'Good: ready to scan', feature: 'good', matching: 'good', geometry: 'great' },
  { id: 'okay-density', label: 'Okay: low feature density', feature: 'okay', matching: 'good', geometry: 'great', code: 'LOW_FEATURE_DENSITY', message: 'Feature density is below the good threshold.' },
  { id: 'bad-features', label: 'Bad: too few features', feature: 'bad', matching: 'insufficient_data', geometry: 'insufficient_data', code: 'INSUFFICIENT_FEATURES', message: 'Too few features for a reliable assessment.' },
  { id: 'bad-matching', label: 'Bad: detail is good, usable matches are weak', feature: 'great', matching: 'bad', geometry: 'good', code: 'LOW_GEOMETRIC_FEATURE_RATIO', message: 'Too few sampled features survive matching and geometric verification.' },
  { id: 'bad-geometry', label: 'Bad: geometrically inconsistent matches', feature: 'great', matching: 'good', geometry: 'bad', code: 'LOW_GEOMETRIC_INLIER_RATIO', message: 'Too many matches are geometrically inconsistent.' },
  { id: 'good-sparse-crop', label: 'Good: poor crop distribution is diagnostic only', feature: 'good', matching: 'good', geometry: 'good', spatial: 'bad', code: 'LOW_CROP_COVERAGE', message: 'Geometrically verified features cover only part of the crop.' },
  { id: 'okay-crop-only', label: 'Good: crop coverage could be improved', feature: 'good', matching: 'good', geometry: 'good', spatial: 'okay', code: 'LOW_CROP_COVERAGE', message: 'Crop coverage could be improved.' },
  { id: 'all-hints', label: 'All hints: surface preparation, crop and polarizer', feature: 'bad', matching: 'bad', geometry: 'bad', spatial: 'bad', shutterMs: 8, code: 'INSUFFICIENT_FEATURES', message: 'Too few features for a reliable assessment.' },
  { id: 'insufficient', label: 'Not enough data', feature: 'insufficient_data', matching: 'insufficient_data', geometry: 'insufficient_data', code: 'GEOMETRY_NOT_AVAILABLE', message: 'No usable geometric model was returned.' }
]

export function getReadinessDebugCase(id: string) {
  const example = readinessDebugCases.find(value => value.id === id) ?? readinessDebugCases[1]
  const grades = [example.feature, example.matching, example.geometry]
  const rank: Grade[] = ['bad', 'insufficient_data', 'okay', 'good', 'great']
  const overall = rank.find(grade => grades.includes(grade))!
  const quality: SiftQuality = {
    overall_status: overall, feature_quality: example.feature, matching_quality: example.matching,
    geometry_quality: example.geometry, spatial_coverage: example.spatial ?? overall,
    metrics: {}, thresholds: {}, warnings: example.code ? [{
      code: example.code, message: example.message!, severity: overall === 'bad' ? 'error' : 'warning'
    }] : []
  }
  return { id: example.id, label: example.label, shutterMs: example.shutterMs ?? 20, quality }
}
