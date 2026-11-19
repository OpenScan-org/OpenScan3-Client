import assert from 'node:assert/strict'
import test from 'node:test'
import { resizeWizardCrop, MIN_CROP_SIZE } from '../src/utils/wizardCrop.ts'

const box = { x: 0.2, y: 0.3, width: 0.5, height: 0.4 }
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`)

test('dragging a horizontal edge keeps the opposite edge and vertical extent fixed', () => {
  const left = resizeWizardCrop(box, 'left', { x: 0.1, y: 0 })
  close(left.x, 0.1)
  close(left.width, 0.6)
  close(left.x + left.width, box.x + box.width)
  assert.equal(left.y, box.y)
  assert.equal(left.height, box.height)
  const right = resizeWizardCrop(box, 'right', { x: 0.9, y: 1 })
  close(right.width, 0.7)
  assert.equal(right.x, box.x)
  assert.equal(right.y, box.y)
  assert.equal(right.height, box.height)
})

test('dragging a vertical edge keeps the opposite edge and horizontal extent fixed', () => {
  const top = resizeWizardCrop(box, 'top', { x: 0, y: 0.1 })
  close(top.y, 0.1)
  close(top.height, 0.6)
  close(top.y + top.height, box.y + box.height)
  assert.equal(top.x, box.x)
  assert.equal(top.width, box.width)
  const bottom = resizeWizardCrop(box, 'bottom', { x: 1, y: 0.9 })
  close(bottom.height, 0.6)
  assert.equal(bottom.y, box.y)
  assert.equal(bottom.x, box.x)
  assert.equal(bottom.width, box.width)
})

test('edges cannot leave the preview or cross their opposite edge', () => {
  for (const edge of ['left', 'right', 'top', 'bottom']) {
    for (const value of [-10, 10]) {
      const result = resizeWizardCrop(box, edge, { x: value, y: value })
      assert.ok(result.x >= 0 && result.y >= 0)
      assert.ok(result.width >= MIN_CROP_SIZE - 1e-9 && result.height >= MIN_CROP_SIZE - 1e-9)
      assert.ok(result.x + result.width <= 1 + 1e-9 && result.y + result.height <= 1 + 1e-9)
    }
  }
})

test('repeated resizing preserves normalized API geometry without mutating the starting crop', () => {
  const original = { ...box }
  let result = resizeWizardCrop(box, 'left', { x: 0, y: 0 })
  result = resizeWizardCrop(result, 'top', { x: 0, y: 0 })
  result = resizeWizardCrop(result, 'right', { x: 1, y: 0 })
  result = resizeWizardCrop(result, 'bottom', { x: 0, y: 1 })
  assert.deepEqual(result, { x: 0, y: 0, width: 1, height: 1 })
  assert.deepEqual(box, original)
})
