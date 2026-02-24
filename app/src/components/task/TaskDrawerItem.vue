<template>
  <q-card flat bordered class="task-drawer-item">
    <q-card-section class="q-pa-sm">
      <div class="row items-center justify-between q-mb-xs">
        <div class="row items-center q-gutter-xs">
          <q-icon :name="statusIcon" :color="statusColor" size="xs" />
          <div class="text-body2 text-weight-medium">{{ title }}</div>
        </div>
        <div class="row items-center q-gutter-xs no-wrap">
          <q-badge :color="statusColor" :label="task.status ?? 'unknown'" />
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

      <div class="text-caption text-grey-8">{{ subtitle }}</div>

      <div v-if="projectName" class="text-caption">
        Project
        <RouterLink :to="projectRoute" class="text-primary" style="text-decoration: none">
          {{ projectName }}
        </RouterLink>
      </div>

      <q-linear-progress
        v-if="hasProgress"
        :value="progressFraction"
        :color="statusColor"
        track-color="grey-3"
        class="q-mt-sm"
        rounded
        size="8px"
      />

      <div v-if="hasProgress || displayEta !== null" class="row justify-between text-caption text-grey-7 q-mt-xs">
        <span v-if="hasProgress">{{ task.progress!.current }} / {{ task.progress!.total }}</span>
        <span v-if="displayEta !== null" :class="{ 'eta-flash': etaFlashing }">{{ displayEta }}</span>
      </div>

      <div v-if="showControls" class="row q-gutter-xs q-mt-sm">
        <q-btn
          v-if="canPause"
          flat
          dense
          size="sm"
          icon="pause"
          label="Pause"
          @click="taskStore.pause(task.id)"
        />
        <q-btn
          v-if="canResume"
          flat
          dense
          size="sm"
          icon="play_arrow"
          label="Resume"
          @click="taskStore.resume(task.id)"
        />
        <q-btn
          v-if="canCancel"
          flat
          dense
          size="sm"
          icon="stop"
          label="Cancel"
          color="negative"
          @click="taskStore.cancel(task.id)"
        />
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import type { Task } from 'src/generated/api'
import { useTaskStore } from 'src/stores/tasks'
import {
  getTaskTitle,
  getTaskSubtitle,
  getTaskProjectName,
  getProjectRoute,
  getTaskStatusColor,
  getTaskStatusIcon,
} from 'src/utils/taskDisplayUtils'

const props = withDefaults(defineProps<{ task: Task; dismissable?: boolean }>(), {
  dismissable: false
})

const emit = defineEmits<{ dismiss: [] }>()

const taskStore = useTaskStore()

const title = computed(() => getTaskTitle(props.task))
const subtitle = computed(() => getTaskSubtitle(props.task))
const projectName = computed(() => getTaskProjectName(props.task))
const projectRoute = computed(() => projectName.value ? getProjectRoute(projectName.value) : undefined)
const statusColor = computed(() => getTaskStatusColor(props.task.status))
const statusIcon = computed(() => getTaskStatusIcon(props.task.status))

const hasProgress = computed(() =>
  props.task.progress?.current !== undefined && props.task.progress?.total !== undefined
)

const progressFraction = computed(() => {
  const current = props.task.progress?.current ?? 0
  const total = props.task.progress?.total ?? 1
  return total > 0 ? current / total : 0
})

const hideEta = computed(() => {
  const s = props.task.status
  return s === 'cancelled' || s === 'completed' || s === 'error' || s === 'paused' || s === 'interrupted'
})

const serverEta = computed(() => {
  if (hideEta.value) return null
  return taskStore.etaSecondsById(props.task.id) ?? null
})

const countdownSeconds = ref<number | null>(null)
const etaFlashing = ref(false)
let countdownTimer: ReturnType<typeof setInterval> | null = null
let flashTimer: ReturnType<typeof setTimeout> | null = null

function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

function startCountdown() {
  stopCountdown()
  countdownTimer = setInterval(() => {
    if (countdownSeconds.value !== null && countdownSeconds.value > 0) {
      countdownSeconds.value -= 1
    } else {
      stopCountdown()
    }
  }, 1000)
}

watch(serverEta, (newVal, oldVal) => {
  if (newVal === null) {
    stopCountdown()
    countdownSeconds.value = null
    return
  }

  const hadValue = oldVal !== null && countdownSeconds.value !== null
  countdownSeconds.value = newVal

  if (hadValue) {
    etaFlashing.value = true
    if (flashTimer) clearTimeout(flashTimer)
    flashTimer = setTimeout(() => {
      etaFlashing.value = false
    }, 600)
  }

  startCountdown()
}, { immediate: true })

onUnmounted(() => {
  stopCountdown()
  if (flashTimer) clearTimeout(flashTimer)
})

const formatEta = (seconds: number) => {
  if (seconds < 60) return `~${seconds}s remaining`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) return `~${minutes}m ${remainingSeconds}s remaining`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `~${hours}h ${remainingMinutes}m remaining`
}

const displayEta = computed(() => {
  if (countdownSeconds.value === null) return null
  return formatEta(countdownSeconds.value)
})

const canPause = computed(() => props.task.status === 'running')
const canResume = computed(() => props.task.status === 'paused' || props.task.status === 'interrupted')
const canCancel = computed(() =>
  props.task.status === 'running' || props.task.status === 'paused' || props.task.status === 'pending'
)
const showControls = computed(() => canPause.value || canResume.value || canCancel.value)
</script>

<style scoped>
.task-drawer-item {
  border-left: 3px solid var(--q-primary);
}

.eta-flash {
  animation: eta-skeleton-flash 0.6s ease-in-out;
}

@keyframes eta-skeleton-flash {
  0% { opacity: 1; }
  30% { opacity: 0.2; background: #e0e0e0; border-radius: 2px; }
  100% { opacity: 1; }
}
</style>
