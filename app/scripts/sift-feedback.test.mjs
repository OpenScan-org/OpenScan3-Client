import assert from 'node:assert/strict'
import test from 'node:test'
import { getAnalysisShutter, getSiftVerdict, shouldSuggestCrossPolarizer } from '../src/utils/siftFeedback.ts'
import { getReadinessDebugCase, readinessDebugCases } from '../src/utils/readinessDebugCases.ts'

test('the cross-polarizer hint appears strictly below 10 ms', () => {
  assert.equal(shouldSuggestCrossPolarizer(9.99), true)
  assert.equal(shouldSuggestCrossPolarizer(10), false)
  assert.equal(shouldSuggestCrossPolarizer(20), false)
})

test('missing or invalid exposures never suggest a missing cross-polarizer', () => {
  for (const value of [null, undefined, NaN, Infinity, 0, -1]) assert.equal(shouldSuggestCrossPolarizer(value), false)
})

test('applied camera settings take precedence over previous and cached exposures', () => {
  const result = { camera_settings: { applied: { shutter: 20 }, previous: { shutter: 5 } } }
  assert.equal(getAnalysisShutter(result, 3), 20)
  assert.equal(shouldSuggestCrossPolarizer(getAnalysisShutter(result, 3)), false)
})

test('previous settings do not override the active device shutter when applied settings are missing', () => {
  const result = { camera_settings: { applied: {}, previous: { shutter: 5 } } }
  assert.equal(getAnalysisShutter(result, 30), 30)
  assert.equal(getAnalysisShutter(result), null)
})

test('invalid applied shutters fall back to the device shutter', () => {
  for (const shutter of [null, undefined, NaN, Infinity, 0, -1]) {
    assert.equal(getAnalysisShutter({ camera_settings: { applied: { shutter }, previous: { shutter: 5 } } }, 30), 30)
  }
})

test('missing analysis shutter uses device settings without inventing a value', () => {
  assert.equal(getAnalysisShutter(null, 7), 7)
  assert.equal(getAnalysisShutter({ camera_settings: { applied: {} } }, 8), 8)
  assert.equal(getAnalysisShutter(null), null)
})

const assessment = warnings => ({
  overall_status: 'okay', feature_quality: 'okay', spatial_coverage: 'good', matching_quality: 'good', geometry_quality: 'good', warnings
})

test('too few features remain the verdict despite good distribution and matching', () => {
  const verdict = getSiftVerdict(assessment([{ code: 'LOW_FEATURE_COUNT', severity: 'warning' }]))
  assert.equal(verdict.reason, 'LOW_FEATURE_COUNT')
})

test('imbalanced views never become a false claim of too few features', () => {
  const verdict = getSiftVerdict(assessment([{ code: 'UNBALANCED_FEATURE_COUNTS', severity: 'warning' }]))
  assert.equal(verdict.reason, 'UNBALANCED_FEATURE_COUNTS')
})

test('severe matching problems take precedence over spatial warnings', () => {
  const verdict = getSiftVerdict(assessment([
    { code: 'LOW_FEATURE_COVERAGE', severity: 'warning' },
    { code: 'LOW_GEOMETRIC_INLIER_RATIO', severity: 'error' }
  ]))
  assert.equal(verdict.reason, 'LOW_GEOMETRIC_INLIER_RATIO')
})

test('unrecognized backend warnings remain visible and missing assessments stay unavailable', () => {
  assert.equal(getSiftVerdict(assessment([{ code: 'NEW_REASON', message: 'A specific backend explanation.', severity: 'warning' }])).title, 'A specific backend explanation.')
  assert.equal(getSiftVerdict(null).reason, 'insufficient_data')
  assert.equal(getSiftVerdict({ ...assessment([]), overall_status: 'good' }).reason, 'good')
})

test('diagnostic crop coverage cannot downgrade a good or great overall API verdict', () => {
  for (const status of ['good', 'great']) {
    const quality = { ...assessment([{ code: 'LOW_CROP_COVERAGE', severity: 'warning', message: 'Sparse crop coverage.' }]), overall_status: status, spatial_coverage: 'bad' }
    assert.equal(getSiftVerdict(quality).reason, status)
  }
})

test('insufficient data remains unknown rather than being assigned a bad grade', () => {
  assert.equal(getSiftVerdict({ ...assessment([]), overall_status: 'insufficient_data' }).reason, 'insufficient_data')
})

test('new density and usable-match warnings produce specific verdicts', () => {
  for (const code of ['LOW_FEATURE_DENSITY', 'LOW_GEOMETRIC_FEATURE_RATIO', 'INSUFFICIENT_MATCHES']) {
    assert.equal(getSiftVerdict(assessment([{ code, severity: 'warning' }])).reason, code)
  }
})

test('debug cases cover all overall ratings and diagnostic coverage stays excluded', () => {
  const cases = readinessDebugCases.map(value => getReadinessDebugCase(value.id))
  assert.deepEqual(new Set(cases.map(value => value.quality.overall_status)), new Set(['bad', 'okay', 'good', 'great', 'insufficient_data']))
  const sparse = getReadinessDebugCase('good-sparse-crop')
  assert.equal(sparse.quality.spatial_coverage, 'bad')
  assert.equal(getSiftVerdict(sparse.quality).reason, 'good')
  assert.equal(getReadinessDebugCase('bad-features').quality.overall_status, 'bad')
  assert.equal(getReadinessDebugCase('unknown-case').id, 'good')
  const allHints = getReadinessDebugCase('all-hints')
  assert.equal(allHints.quality.overall_status, 'bad')
  assert.equal(allHints.quality.spatial_coverage, 'bad')
  assert.equal(shouldSuggestCrossPolarizer(allHints.shutterMs), true)
  assert.equal(getReadinessDebugCase('okay-crop-only').quality.overall_status, 'good')
})
