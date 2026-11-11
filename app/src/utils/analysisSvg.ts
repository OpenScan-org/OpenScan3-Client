const xml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

export function createAnalysisSvg(input: {
  imageDataUrl: string; width: number; height: number; orientationFlag?: number | null
  capturedAt: string; summary: string; data: unknown
}): string {
  const { width: w, height: h } = input
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) throw new Error('Invalid photo dimensions.')
  if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/=\r\n]+$/.test(input.imageDataUrl)) throw new Error('Expected an embedded JPEG photo.')
  const flag = input.orientationFlag ?? 1
  const matrices: Record<number, number[]> = {
    1: [1, 0, 0, 1, 0, 0], 2: [-1, 0, 0, 1, w, 0], 3: [-1, 0, 0, -1, w, h], 4: [1, 0, 0, -1, 0, h],
    5: [0, 1, 1, 0, 0, 0], 6: [0, 1, -1, 0, h, 0], 7: [0, -1, -1, 0, h, w], 8: [0, -1, 1, 0, 0, w]
  }
  const rotated = flag >= 5 && flag <= 8
  const scale = 1000 / (rotated ? h : w)
  const imageHeight = (rotated ? w : h) * scale
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1048" height="${imageHeight + 160}" viewBox="0 0 1048 ${imageHeight + 160}">
  <title>OpenScan scan analysis</title>
  <desc>Photo captured at export with complete analysis JSON embedded in metadata.</desc>
  <metadata id="openscan-analysis">${xml(JSON.stringify(input.data, null, 2))}</metadata>
  <rect width="100%" height="100%" fill="#fff"/>
  <g font-family="sans-serif" fill="#263238">
    <text x="24" y="38" font-size="24" font-weight="bold">OpenScan scan analysis</text>
    <text x="24" y="69" font-size="16">${xml(input.summary)}</text>
    <text x="24" y="98" font-size="13">New photo captured at export: ${xml(input.capturedAt)}</text>
  </g>
  <g transform="translate(24 120) scale(${scale})">
    <image width="${w}" height="${h}" transform="matrix(${(matrices[flag] ?? matrices[1]).join(' ')})" href="${input.imageDataUrl}"/>
  </g>
  <text x="24" y="${imageHeight + 146}" font-family="sans-serif" font-size="12" fill="#607d8b">Original JSON is stored in metadata#openscan-analysis. Share this SVG as a file to retain the data.</text>
</svg>`
}
