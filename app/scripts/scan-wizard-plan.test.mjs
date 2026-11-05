import assert from 'node:assert/strict'
import test from 'node:test'
import { buildScanWizardPlan, getFocusRecommendation, readScanAnalysis, selectStackingOption, QUALITY_POLICY } from '../src/utils/scanWizardPlan.ts'

const analysis = focus => readScanAnalysis({ analysis_type: 'scan_analysis', focus_analysis: focus })
const region = (autofocus, weight = 1) => ({ weight, autofocus, manual: { 0: 0.7, 4: 1 } })
const view = regions => ({ turntable_offset: 0, autofocus_position: 2, regions })
const option = (count, mean, worst, extra = {}) => ({
  focus_stacks: count, focus_range: [0, 4], coverage: mean, worst_coverage: worst,
  gain: mean - 0.6, estimated: true, ...extra
})
const focus = (options = [], positions = [view({ 0: region(0.6) })]) =>
  getFocusRecommendation(analysis({ positions, stacking_options: options }))
const options = [
  option(2, 0.90, 0.82),
  option(3, 0.95, 0.89),
  option(4, 0.97, 0.91),
  option(8, 0.98, 0.92),
  option(10, 0.9806, 0.9206)
]

test('four AF levels stay within the 300-position rig limit', () => {
  const recommendation = focus([], [view({ 0: region(1) })])
  const plans = [0, 1, 2, 3].map(level => buildScanWizardPlan(level, recommendation))
  assert.deepEqual(plans.map(plan => plan.totalPhotos), [130, 200, 250, 300])
  assert.ok(plans.every(plan => plan.focusStacks === 1 && plan.focusRange === null))
  assert.ok(QUALITY_POLICY.every(policy => policy.afPoints <= 300 && policy.stackingPoints <= 300))
})

test('quality levels trade stack cost against mean and worst-view sharpness', () => {
  const recommendation = focus(options)
  assert.equal(recommendation.mode, 'stacking')
  const plans = [0, 1, 2, 3].map(level => buildScanWizardPlan(level, recommendation))
  assert.deepEqual(plans.map(plan => plan.focusStacks), [2, 3, 4, 8])
  assert.deepEqual(plans.map(plan => plan.points), [90, 130, 150, 300])
  assert.deepEqual(plans.map(plan => plan.totalPhotos), [180, 390, 600, 2400])
  assert.ok(plans.every(plan => plan.estimated && plan.focusRange[0] === 0))
})

test('tiny extra gains do not force the largest stack, even in Ultra', () => {
  assert.equal(selectStackingOption(3, focus(options)).focus_stacks, 8)
})

test('Ultra can use ten calculated planes for 3000 photos when the benefit exists', () => {
  const recommendation = focus([...options.slice(0, 4), option(10, 1, 1)])
  const plan = buildScanWizardPlan(3, recommendation)
  assert.equal(plan.points, 300)
  assert.equal(plan.focusStacks, 10)
  assert.equal(plan.totalPhotos, 3000)
})

test('AF scores retain crop weights and give sampled views equal weight', () => {
  const recommendation = focus([], [
    view({ 0: region(0.5, 0.8), 1: region(1, 0.2) }),
    view({ 0: region(1) })
  ])
  assert.ok(Math.abs(recommendation.autofocus.coverage - 0.8) < 1e-9)
  assert.ok(Math.abs(recommendation.autofocus.worstCoverage - 0.6) < 1e-9)
})

test('good AF avoids spending stacks on negligible sharpness improvements', () => {
  const recommendation = focus([option(4, 0.9905, 0.9905)], [view({ 0: region(0.99) })])
  assert.equal(recommendation.mode, 'autofocus')
  for (const level of [0, 1, 2, 3]) assert.equal(buildScanWizardPlan(level, recommendation).focusStacks, 1)
})

test('stacks can improve the worst view even if the mean gain is zero', () => {
  const recommendation = focus([option(2, 0.75, 0.7, { gain: 0 })], [
    view({ 0: region(0.5) }), view({ 0: region(1) })
  ])
  assert.equal(buildScanWizardPlan(1, recommendation).focusStacks, 2)
})

test('incomplete AF remains unknown, while valid options with null gain are usable', () => {
  const recommendation = focus([option(2, 0.9, 0.8, { gain: null })], [
    view({ 0: region(0.7, 0.5), 1: region(null, 0.5) })
  ])
  assert.equal(recommendation.autofocus, null)
  assert.equal(recommendation.mode, 'stacking')
  assert.equal(buildScanWizardPlan(0, recommendation).focusStacks, 2)
})

test('missing or legacy measurements keep the wizard usable with explained AF fallback', () => {
  for (const input of [null, {}, { positions: [], stacking_options: [] }, { status: 'more_data_needed' }]) {
    const recommendation = getFocusRecommendation(analysis(input))
    assert.equal(recommendation.mode, 'unknown')
    assert.ok(recommendation.reason)
    for (const level of [0, 1, 2, 3]) {
      const plan = buildScanWizardPlan(level, recommendation)
      assert.equal(plan.focusStacks, 1)
      assert.equal(plan.focusScores, null)
    }
  }
})

test('malformed options never reach a scan request', () => {
  for (const invalid of [
    { focus_range: [-1, 4] }, { focus_range: [4, 4] }, { focus_range: [4, 16] },
    { focus_stacks: 11 }, { focus_stacks: 2.5 }, { coverage: NaN },
    { worst_coverage: 1 }, { gain: undefined }, { estimated: undefined }
  ]) {
    const recommendation = focus([option(2, 0.9, 0.8, invalid)])
    assert.equal(recommendation.options.length, 0)
    assert.equal(buildScanWizardPlan(3, recommendation).focusStacks, 1)
  }
})

test('option order cannot change selected plans or reduce photo counts at higher quality', () => {
  const forward = focus(options)
  const reversed = focus([...options].reverse())
  const plans = [0, 1, 2, 3].map(level => buildScanWizardPlan(level, forward))
  for (const level of [0, 1, 2, 3]) assert.deepEqual(buildScanWizardPlan(level, reversed), plans[level])
  for (let level = 1; level < plans.length; level++) assert.ok(plans[level].totalPhotos >= plans[level - 1].totalPhotos)
})

test('unrelated and missing task results are not scan analyses', () => {
  for (const value of [null, [], {}, { analysis_type: 'other' }]) assert.equal(readScanAnalysis(value), null)
})
