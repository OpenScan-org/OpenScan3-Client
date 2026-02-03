export type FormatBytesMode = 'auto' | 'mb'

export function formatBytes(bytes?: number | null, mode: FormatBytesMode = 'auto'): string | null {
  if (bytes === undefined || bytes === null || bytes <= 0) {
    return null
  }

  const base = 1024

  if (mode === 'mb') {
    const megabytes = bytes / (base * base)
    return `${Math.round(megabytes)} MB`
  }

  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(base)), units.length - 1)
  const unit = units[exponent]
  const value = bytes / base ** exponent

  if (unit === 'GB') {
    return `${value.toFixed(1)} GB`
  }

  if (unit === 'MB') {
    return `${Math.round(value)} MB`
  }

  if (unit === 'KB') {
    return `${Math.round(value)} KB`
  }

  return `${Math.round(value)} B`
}
