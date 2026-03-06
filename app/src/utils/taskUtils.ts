import type { Task } from 'src/generated/api'

const SCAN_TASK_TYPE = 'scan_task'

type ScanTaskArgs = {
  project_name?: string
  index?: number
}

const getScanIdentifier = (task: Task): string | null => {
  if (task.task_type !== SCAN_TASK_TYPE) {
    return null
  }

  const args = Array.isArray(task.run_args) ? (task.run_args[0] as ScanTaskArgs) : null
  if (!args || typeof args.project_name !== 'string' || typeof args.index !== 'number') {
    return null
  }

  return `${args.project_name}::${args.index}`
}

const getTaskTimestamp = (task: Task): number => {
  const source = task.started_at ?? task.created_at
  if (!source) {
    return 0
  }
  const value = new Date(source).getTime()
  return Number.isNaN(value) ? 0 : value
}

type ScanTaskTimestampMap = Map<string, number>

export const buildLatestScanTaskTimestamps = (tasks: Task[]): ScanTaskTimestampMap => {
  const latest = new Map<string, number>()

  for (const task of tasks) {
    if (task.task_type !== SCAN_TASK_TYPE) {
      continue
    }
    const scanId = getScanIdentifier(task)
    if (!scanId) {
      continue
    }
    const timestamp = getTaskTimestamp(task)
    const previous = latest.get(scanId) ?? Number.NEGATIVE_INFINITY
    if (timestamp >= previous) {
      latest.set(scanId, timestamp)
    }
  }

  return latest
}

export const isLatestEntryForScan = (task: Task, timestamps: ScanTaskTimestampMap): boolean => {
  if (task.task_type !== SCAN_TASK_TYPE) {
    return true
  }

  const scanId = getScanIdentifier(task)
  if (!scanId) {
    return true
  }

  const timestamp = getTaskTimestamp(task)
  const latest = timestamps.get(scanId)
  if (latest === undefined) {
    return true
  }

  return timestamp >= latest
}

const sortByMostRecent = (a: Task, b: Task) => getTaskTimestamp(b) - getTaskTimestamp(a)

export const filterLatestScanTasks = (tasks: Task[]): Task[] => {
  const timestamps = buildLatestScanTaskTimestamps(tasks)
  return tasks.filter((task) => {
    if (task.task_type !== SCAN_TASK_TYPE) {
      return true
    }
    return isLatestEntryForScan(task, timestamps)
  })
}

const findLatestTaskIdByStatus = (tasks: Task[], statuses: Task['status'][]): string | null => {
  const matching = tasks
    .filter((task) => task.task_type === SCAN_TASK_TYPE && statuses.includes(task.status as Task['status']))
    .sort(sortByMostRecent)
  return matching[0]?.id ?? null
}

export const pickActiveScanTaskId = (tasks: Task[]): string | null => {
  const latestTasks = filterLatestScanTasks(tasks)

  return (
    findLatestTaskIdByStatus(latestTasks, ['running']) ??
    findLatestTaskIdByStatus(latestTasks, ['pending']) ??
    findLatestTaskIdByStatus(latestTasks, ['paused']) ??
    null
  )
}
