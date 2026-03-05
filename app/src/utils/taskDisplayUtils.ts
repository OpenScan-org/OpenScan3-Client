import type { Task, TaskStatus } from 'src/generated/api'

type ScanArgs = { project_name?: string; index?: number }

const scanMetaCache: Record<string, ScanArgs | null> = {}

export const getTaskStatusColor = (taskStatus?: TaskStatus) => {
  switch (taskStatus) {
    case 'pending':
      return 'grey'
    case 'running':
      return 'blue'
    case 'completed':
      return 'green'
    case 'paused':
      return 'orange'
    case 'error':
      return 'negative'
    case 'cancelled':
    case 'interrupted':
      return 'grey-6'
    default:
      return 'grey-5'
  }
}

export const getTaskStatusIcon = (taskStatus?: TaskStatus) => {
  switch (taskStatus) {
    case 'pending':
      return 'hourglass_empty'
    case 'running':
      return 'play_arrow'
    case 'completed':
      return 'check_circle'
    case 'paused':
      return 'pause_circle'
    case 'error':
      return 'error'
    case 'cancelled':
      return 'cancel'
    case 'interrupted':
      return 'pending'
    default:
      return 'help_outline'
  }
}

export const humanizeTaskType = (value: string) => {
  return value
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

const extractScanArgs = (task: Task): ScanArgs | null => {
  const maybeArgs = task.run_args ?? []

  for (const entry of maybeArgs) {
    if (entry && typeof entry === 'object' && 'project_name' in entry) {
      return entry as ScanArgs
    }
  }

  if (task.run_kwargs && typeof task.run_kwargs === 'object' && 'project_name' in task.run_kwargs) {
    return task.run_kwargs as ScanArgs
  }

  // positional args pattern: [project_name: string, index?: number, ...]
  if (maybeArgs.length >= 1 && typeof maybeArgs[0] === 'string') {
    const result: ScanArgs = { project_name: maybeArgs[0] as string }
    if (typeof maybeArgs[1] === 'number') {
      result.index = maybeArgs[1] as number
    }
    return result
  }

  return null
}

export const getCachedScanArgs = (task: Task): ScanArgs | null => {
  const extracted = extractScanArgs(task)
  if (extracted && task.id) {
    scanMetaCache[task.id] = extracted
    return extracted
  }

  if (task.id && scanMetaCache[task.id]) {
    return scanMetaCache[task.id]
  }

  return extracted
}

const TASK_TYPE_LABELS: Record<string, string> = {
  scan_task: 'Scan',
  focus_stacking_task: 'Focus Stacking',
  cloud_upload_task: 'Cloud Upload',
}

const CLOUD_UPLOAD_PROGRESS_BYTES_PATTERN = /\(\s*\d+\s*\/\s*\d+\s*bytes\)/gi

function cleanCloudUploadMessage(message: string): string | null {
  const sanitized = message.replace(CLOUD_UPLOAD_PROGRESS_BYTES_PATTERN, '').replace(/\s{2,}/g, ' ').trim()
  return sanitized.length > 0 ? sanitized : null
}

export const getTaskTitle = (task: Task) => {
  const label = task.task_type ? TASK_TYPE_LABELS[task.task_type] : null

  if (label) {
    const scanArgs = getCachedScanArgs(task)
    if (typeof scanArgs?.index === 'number') {
      return `${label} Scan #${scanArgs.index}`
    }
    return label
  }

  if (task.task_type) {
    return humanizeTaskType(task.task_type)
  }

  if (task.name) {
    return humanizeTaskType(task.name)
  }

  return 'Task'
}

export const getTaskSubtitle = (task: Task) => {
  if (task.error) {
    return task.error
  }

  if (task.progress?.message) {
    if (task.task_type === 'cloud_upload_task') {
      const sanitized = cleanCloudUploadMessage(task.progress.message)
      if (sanitized) {
        return sanitized
      }
    }
    return task.progress.message
  }

  return humanizeTaskType(task.task_type ?? task.name ?? 'Task')
}

export const getTaskProjectName = (task: Task) => getCachedScanArgs(task)?.project_name ?? null

export const getProjectRoute = (projectName: string) => ({
  path: '/projects',
  query: { project: projectName }
})

export const isTaskActive = (task: Task) =>
  task.status === 'running' || task.status === 'pending' || task.status === 'paused'
