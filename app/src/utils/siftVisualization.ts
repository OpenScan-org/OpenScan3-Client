import type { SiftAnalysis } from '../generated/api/next/types.gen'

export type SiftGridMetric = 'feature_counts' | 'matchable_feature_counts'
export function buildSiftGrids(sift: SiftAnalysis | null | undefined, metric: SiftGridMetric) {
  const distribution = sift?.spatial_distribution
  const rows = distribution?.grid_size?.rows ?? 0
  const columns = distribution?.grid_size?.columns ?? 0
  if (!Number.isInteger(rows) || !Number.isInteger(columns) || rows <= 0 || columns <= 0 || rows > 32 || columns > 32) return []
  const thresholdKey = metric === 'feature_counts' ? 'min_feature_per_cell' : 'min_matchable_feature_per_cell'
  const threshold = sift?.quality?.thresholds?.[thresholdKey]
  const grids = (['first', 'second'] as const).map((key, index) => {
    const matrix = distribution?.[key]?.[metric]
    const cells = Array.from({ length: rows * columns }, (_, cell) => {
      const row = Math.floor(cell / columns)
      const column = cell % columns
      const value = matrix?.[row]?.[column]
      const count = typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
      return { row, column, count }
    })
    return { key, label: index === 0 ? 'First view' : 'Rotated view', columns, cells }
  })
  // Both views use the same scale; missing measurements remain distinct from 0.
  const max = Math.max(1, ...grids.flatMap(grid => grid.cells.map(cell => cell.count ?? 0)))
  return grids.map(grid => ({ ...grid, cells: grid.cells.map(cell => ({
    ...cell,
    level: cell.count === null ? 'missing' : cell.count === 0 ? 'empty' :
      typeof threshold === 'number' && cell.count < threshold ? 'low' :
        cell.count / max < 0.33 ? 'light' : cell.count / max < 0.66 ? 'medium' : 'high'
  })) }))
}
