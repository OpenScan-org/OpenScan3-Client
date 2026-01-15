<template>
  <q-card flat bordered class="task-card q-pa-md">
    <div class="row items-center justify-between q-mb-sm task-card__header">
      <div class="row items-center q-gutter-sm">
        <q-icon name="task" color="grey-7" />
        <div class="text-subtitle2 text-grey-7">Tasks</div>
        <q-badge color="grey-5" :label="tasks.length" />
      </div>
      <q-badge :color="connectionBadgeColor" :label="connectionLabel" />
    </div>

    <q-card-section class="q-pa-none q-mb-md text-caption text-grey-8">
      Total: {{ tasks.length }} • Running: {{ runningTasks.length }}
      <span v-if="error"> • Error: {{ error }}</span>
    </q-card-section>

    <q-card-section v-if="tasks.length === 0" class="q-pa-none">
      <div class="text-caption text-grey-7">No tasks available.</div>
    </q-card-section>

    <q-list v-else separator dense bordered>
      <q-item v-for="task in tasks" :key="task.id">
        <q-item-section>
          <div class="row items-center q-gutter-xs">
            <div class="text-body2">{{ getTaskTitle(task) }}</div>
            <q-badge :color="getTaskStatusColor(task.status)" :label="task.status ?? 'unknown'" />
          </div>
          <div class="text-caption text-grey-8">
            {{ getTaskSubtitle(task) }}
          </div>
          <div v-if="getTaskProjectName(task)" class="text-caption">
            Project
            <RouterLink :to="getProjectRoute(getTaskProjectName(task)!)" class="task-card__project-link">
              {{ getTaskProjectName(task) }}
            </RouterLink>
          </div>
        </q-item-section>
        <q-item-section side class="text-caption text-grey-8 text-right">
          <div v-if="task.progress?.current !== undefined && task.progress?.total !== undefined">
            {{ task.progress.current }} / {{ task.progress.total }}
          </div>
          <div v-else>{{ getTaskStatusIcon(task.status) }}</div>
        </q-item-section>
      </q-item>
    </q-list>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useTaskStore } from 'src/stores/tasks'
import type { Task, TaskStatus } from 'src/generated/api'
import { RouterLink } from 'vue-router'

const taskStore = useTaskStore()
void taskStore.ensureConnected()

const { tasks, status, error, runningTasks } = storeToRefs(taskStore)

const connectionLabel = computed(() => {
  switch (status.value) {
    case 'open':
      return 'connected'
    case 'connecting':
      return 'connecting'
    case 'error':
      return 'error'
    case 'closed':
      return 'disconnected'
    default:
      return 'idle'
  }
})

const connectionBadgeColor = computed(() => {
  switch (status.value) {
    case 'open':
      return 'positive'
    case 'connecting':
      return 'warning'
    case 'error':
      return 'negative'
    default:
      return 'grey-6'
  }
})

const getTaskStatusColor = (taskStatus?: TaskStatus) => {
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

const getTaskStatusIcon = (taskStatus?: TaskStatus) => {
  switch (taskStatus) {
    case 'pending':
      return '⏳'
    case 'running':
      return '▶'
    case 'completed':
      return '✓'
    case 'paused':
      return 'Ⅱ'
    case 'error':
      return '!'
    case 'cancelled':
      return '✕'
    case 'interrupted':
      return '…'
    default:
      return '–'
  }
}

const scanMetaCache: Record<string, { project_name?: string; index?: number } | null> = {}

const getTaskTitle = (task: Task) => {
  if (task.task_type === 'scan_task') {
    const scanArgs = getCachedScanArgs(task)
    if (typeof scanArgs?.index === 'number') {
      return `Scan #${scanArgs.index}`
    }
    return 'Scan task'
  }

  if (task.task_type) {
    return humanizeTaskType(task.task_type)
  }

  if (task.name) {
    return humanizeTaskType(task.name)
  }

  return 'Task'
}

const getTaskSubtitle = (task: Task) => {
  if (task.error) {
    return task.error
  }

  if (task.progress?.message) {
    return task.progress.message
  }

  return humanizeTaskType(task.task_type ?? task.name ?? 'Task')
}

const getTaskProjectName = (task: Task) => getCachedScanArgs(task)?.project_name ?? null

const getCachedScanArgs = (task: Task) => {
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

const extractScanArgs = (task: Task) => {
  const maybeArgs = task.run_args ?? []
  for (const entry of maybeArgs) {
    if (entry && typeof entry === 'object' && 'project_name' in entry) {
      return entry as { project_name?: string; index?: number }
    }
  }

  if (task.run_kwargs && typeof task.run_kwargs === 'object' && 'project_name' in task.run_kwargs) {
    return task.run_kwargs as { project_name?: string; index?: number }
  }

  return null
}

const humanizeTaskType = (value: string) => {
  return value
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

const getProjectRoute = (projectName: string) => ({
  path: '/projects',
  query: { project: projectName }
})
</script>

<style scoped>
.task-card {
  background: #f7f7f8;
  border-left: 3px solid var(--q-primary);
  border-radius: 4px;
}

.task-card__header {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.task-card__project-link {
  color: var(--q-primary);
  text-decoration: none;
}
</style>
