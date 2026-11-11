import assert from 'node:assert/strict'
import test from 'node:test'
import { createPinia, setActivePinia } from 'pinia'
import { useScanTemplateStore } from '../src/stores/scanTemplate.ts'
import { buildWizardScanSettings } from '../src/utils/scanWizardPlan.ts'

const defaults = {
  path_method: 'fibonacci', image_format: 'jpeg', min_theta: 12, max_theta: 125,
  min_phi: 0, max_phi: 360, optimize_path: true, optimization_algorithm: 'nearest_neighbor',
  pause_before_capture_ms: 200, focus_range: [10, 15], focus_stacks: 1, points: 130
}

test('stacking handoff retains all scan parameters and processing preference', () => {
  setActivePinia(createPinia())
  const store = useScanTemplateStore()
  const plan = { points: 150, focusStacks: 4, focusRange: [2, 5], totalPhotos: 600 }
  store.setTemplate(buildWizardScanSettings(plan, defaults), { AF: false }, { autoStartFocusStacking: true })
  assert.deepEqual(store.scanSettings, { ...defaults, points: 150, focus_stacks: 4, focus_range: [2, 5] })
  assert.deepEqual(store.cameraSettings, { AF: false })
  assert.equal(store.autoStartFocusStacking, true)
  assert.equal(store.hasTemplate(), true)
  plan.focusRange[0] = 0
  assert.deepEqual(store.scanSettings.focus_range, [2, 5])
})

test('AF handoff removes any inherited stacking range and preserves unchecked processing', () => {
  setActivePinia(createPinia())
  const store = useScanTemplateStore()
  store.setTemplate(buildWizardScanSettings({ points: 200, focusStacks: 1, focusRange: null }, defaults), { AF: true }, { autoStartFocusStacking: false })
  assert.equal(store.scanSettings.points, 200)
  assert.equal(store.scanSettings.focus_stacks, 1)
  assert.equal(store.scanSettings.focus_range, undefined)
  assert.equal(store.cameraSettings.AF, true)
  assert.equal(store.autoStartFocusStacking, false)
})

test('consuming or replacing a wizard template does not leak its processing preference', () => {
  setActivePinia(createPinia())
  const store = useScanTemplateStore()
  store.setTemplate(defaults, { AF: false }, { autoStartFocusStacking: true })
  store.setTemplate(defaults, { AF: true })
  assert.equal(store.autoStartFocusStacking, null)
  store.clearTemplate()
  assert.equal(store.hasTemplate(), false)
  assert.equal(store.cameraSettings, null)
  assert.equal(store.autoStartFocusStacking, null)
})
