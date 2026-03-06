<template>
  <q-card flat bordered class="task-drawer-item">
    <q-card-section class="q-pa-sm">
      <div class="row items-center justify-between q-mb-xs">
        <div class="row items-center q-gutter-xs">
          <q-icon name="cloud" :color="statusBadgeColor" size="xs" />
          <div class="text-body2 text-weight-medium">{{ projectName }}</div>
        </div>
        <div class="row items-center q-gutter-xs no-wrap">
          <q-badge :color="statusBadgeColor" :label="statusBadgeLabel" />
          <q-btn
            v-if="dismissable"
            flat
            dense
            round
            size="xs"
            icon="delete_sweep"
            color="grey-6"
            @click="emit('dismiss')"
          >
            <q-tooltip>Dismiss</q-tooltip>
          </q-btn>
        </div>
      </div>

      <div class="text-caption" :class="statusTextClass">
        {{ remoteStatusLabel ?? 'unknown' }}
      </div>

      <div v-if="taskSummary" class="text-caption text-grey-7">{{ taskSummary }}</div>

      <div v-if="projectName" class="text-caption">
        Project
        <RouterLink :to="projectRoute" class="text-primary" style="text-decoration: none">
          {{ projectName }}
        </RouterLink>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { CloudProjectStatus, TaskStatus } from 'src/generated/api'
import { getCloudRemoteStatus, isCloudModelReady } from 'src/stores/cloudProjects'
import { getTaskStatusColor, getProjectRoute } from 'src/utils/taskDisplayUtils'

const props = withDefaults(defineProps<{ status: CloudProjectStatus; dismissable?: boolean }>(), {
  dismissable: false
})

const emit = defineEmits<{ dismiss: [] }>()

const projectName = computed(() => props.status.project?.name ?? 'Unknown project')
const projectRoute = computed(() => getProjectRoute(projectName.value))
const remoteStatusLabel = computed(() => getCloudRemoteStatus(props.status))
const modelReady = computed(() => isCloudModelReady(props.status))

const derivedTaskStatus = computed<TaskStatus | undefined>(() => mapRemoteStatusToTaskStatus(remoteStatusLabel.value))

const statusBadgeColor = computed(() => getTaskStatusColor(derivedTaskStatus.value) ?? 'grey-5')
const statusBadgeLabel = computed(() => humanizeStatusLabel(derivedTaskStatus.value ?? null, remoteStatusLabel.value).toLowerCase())
const statusTextClass = computed(() => (modelReady.value ? 'text-positive' : 'text-orange-9'))

const taskSummary = computed(() => {
  const tasks = props.status.tasks ?? []
  if (!tasks.length) {
    return null
  }

  const latest = tasks[0]
  if (latest?.task_type && latest.status) {
    return `${latest.task_type.replace(/_/g, ' ')}: ${latest.status}`
  }

  return null
})

function mapRemoteStatusToTaskStatus(status: string | null): TaskStatus | undefined {
  if (!status) {
    return undefined
  }
  const normalized = status.trim().toLowerCase()
  if (normalized.includes('done') || normalized.includes('ready') || normalized.includes('complete')) {
    return 'completed'
  }
  if (normalized.includes('error') || normalized.includes('fail')) {
    return 'error'
  }
  if (normalized.includes('initialized') || normalized.includes('queued') || normalized.includes('pending')) {
    return 'pending'
  }
  if (normalized.includes('processing') || normalized.includes('running') || normalized.includes('start')) {
    return 'running'
  }
  return undefined
}

function humanizeStatusLabel(taskStatus: TaskStatus | null, fallback: string | null) {
  if (taskStatus) {
    return taskStatus
  }
  if (fallback) {
    return fallback
  }
  return 'unknown'
}
</script>
