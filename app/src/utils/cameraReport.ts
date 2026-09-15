import { buildApiUrl } from 'src/services/apiClient'

export async function downloadCameraReport() {
  const response = await fetch(buildApiUrl('develop/camera-report?format=text'), {
    cache: 'no-store'
  })
  if (!response.ok) {
    throw new Error(`Camera report request failed with status ${response.status}`)
  }

  const reportText = await response.text()
  const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `camera-report-${timestamp}.txt`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
