export type WizardCrop = { x: number; y: number; width: number; height: number }
export type CropEdge = 'top' | 'right' | 'bottom' | 'left'
export const MIN_CROP_SIZE = 0.01

// Work in oriented image coordinates so dragging and keyboard resizing use
// the same bounds regardless of preview size or camera rotation.
export function resizeWizardCrop(box: WizardCrop, edge: CropEdge, point: { x: number; y: number }): WizardCrop {
  const right = box.x + box.width
  const bottom = box.y + box.height
  switch (edge) {
    case 'left': {
      const x = Math.min(right - MIN_CROP_SIZE, Math.max(0, point.x))
      return { ...box, x, width: right - x }
    }
    case 'right': return { ...box, width: Math.max(MIN_CROP_SIZE, Math.min(1, point.x) - box.x) }
    case 'top': {
      const y = Math.min(bottom - MIN_CROP_SIZE, Math.max(0, point.y))
      return { ...box, y, height: bottom - y }
    }
    case 'bottom': return { ...box, height: Math.max(MIN_CROP_SIZE, Math.min(1, point.y) - box.y) }
  }
}
