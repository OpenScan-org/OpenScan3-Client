export type DisplayOrientation = 'landscape' | 'portrait'

const orientationInfo: Record<number, { transform: string; rotation: number }> = {
  1: { transform: 'none', rotation: 0 },
  2: { transform: 'scaleX(-1)', rotation: 0 },
  3: { transform: 'rotate(180deg)', rotation: 180 },
  4: { transform: 'scaleY(-1)', rotation: 0 },
  5: { transform: 'rotate(90deg) scaleX(-1)', rotation: 90 },
  6: { transform: 'rotate(90deg)', rotation: 90 },
  7: { transform: 'rotate(270deg) scaleX(-1)', rotation: 270 },
  8: { transform: 'rotate(270deg)', rotation: 270 }
}

function getOrientationInfo(flag?: number | null) {
  if (!flag || !orientationInfo[flag]) {
    return orientationInfo[1]
  }
  return orientationInfo[flag]
}

export function getOrientationTransform(flag?: number | null) {
  return getOrientationInfo(flag).transform
}

export function getDisplayOrientation(flag?: number | null): DisplayOrientation {
  const rotation = getOrientationInfo(flag).rotation % 180
  return rotation === 90 ? 'portrait' : 'landscape'
}

export function getOrientationRotation(flag?: number | null): 0 | 90 | 180 | 270 {
  return (getOrientationInfo(flag).rotation % 360) as 0 | 90 | 180 | 270
}
