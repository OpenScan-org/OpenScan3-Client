import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSiftGrids } from '../src/utils/siftVisualization.ts'

const sift = {
  spatial_distribution: {
    grid_size: { rows: 2, columns: 2 },
    first: { feature_counts: [[0, 1], [10, 100]], matchable_feature_counts: [[0, 1], [2, 4]] },
    second: { feature_counts: [[10, 20], [40, 80]], matchable_feature_counts: [[2, 4], [6, 8]] }
  },
  quality: { thresholds: { min_feature_per_cell: 5, min_matchable_feature_per_cell: 2 } }
}

test('both views share a colour scale and retain image row/column order', () => {
  const grids = buildSiftGrids(sift, 'feature_counts')
  assert.equal(grids.length, 2)
  assert.deepEqual(grids[0].cells.map(cell => cell.count), [0, 1, 10, 100])
  assert.deepEqual(grids[0].cells.map(cell => [cell.row, cell.column]), [[0, 0], [0, 1], [1, 0], [1, 1]])
  assert.equal(grids[0].cells[2].level, grids[1].cells[0].level)
  assert.equal(grids[0].cells[3].level, 'high')
  assert.equal(grids[1].cells[1].level, 'light')
})

test('the selected metric uses its own API threshold', () => {
  const grids = buildSiftGrids(sift, 'matchable_feature_counts')
  assert.deepEqual(grids[0].cells.map(cell => cell.count), [0, 1, 2, 4])
  assert.equal(grids[0].cells[0].level, 'empty')
  assert.equal(grids[0].cells[1].level, 'low')
  assert.notEqual(grids[0].cells[2].level, 'low')
})

test('missing and invalid measurements are never shown as zero features', () => {
  const value = globalThis.structuredClone(sift)
  value.spatial_distribution.first.feature_counts = [[0, null], [-1, NaN]]
  const cells = buildSiftGrids(value, 'feature_counts')[0].cells
  assert.equal(cells[0].level, 'empty')
  assert.ok(cells.slice(1).every(cell => cell.count === null && cell.level === 'missing'))
})

test('absent or invalid spatial geometry produces an unavailable map', () => {
  for (const value of [null, {}, { spatial_distribution: { grid_size: { rows: -1, columns: 4 } } }]) {
    assert.deepEqual(buildSiftGrids(value, 'feature_counts'), [])
  }
})
