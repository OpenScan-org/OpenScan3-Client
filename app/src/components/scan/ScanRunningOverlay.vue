<template>
  <div class="column q-gutter-md">
    <BaseSection :title="scanTitle" :subtitle="scanSettingsDescription" :description="scanSubtitle">
      <div class="column items-center q-gutter-md">
        <q-circular-progress
          :value="placeholderProgress"
          :angle="180"
          size="220px"
          :thickness="0.18"
          color="primary"
          track-color="grey-3"
          class="placeholder-progress"
        >
          <div class="placeholder-progress__center">
            <div class="text-h6">{{ placeholderProgressLabel }}</div>
            <div class="text-caption text-grey-7">Placeholder</div>
          </div>
        </q-circular-progress>

        <div class="row justify-center q-gutter-sm q-mt-sm">
          <BaseButtonSecondary v-if="task.status === 'running'" icon="pause" label="Pause" @click="pause" />
          <BaseButtonSecondary
            v-if="task.status === 'paused' || task.status === 'interrupted'"
            icon="play_arrow"
            label="Resume"
            @click="resume"
          />
          <BaseButtonSecondary
            v-if="task.status !== 'completed' && task.status !== 'cancelled' && task.status !== 'error'"
            icon="cancel"
            label="Cancel"
            color="negative"
            @click="cancel"
          />
          <BaseButtonSecondary
            v-if="task.status === 'completed' || task.status === 'cancelled' || task.status === 'error'"
            icon="close"
            label="Close"
            @click="close"
          />
        </div>
      </div>
    </BaseSection>

    <BaseSection title="Task" description="This view shows live task state and backend logs for debugging.">
      <div class="row q-col-gutter-md">
        <div v-if="task.error" class="col-12">
          <q-banner rounded class="bg-negative text-white">
            {{ task.error }}
          </q-banner>
        </div>

        <div class="col-12">
          <div class="row items-center q-col-gutter-sm">
            <div class="col-auto">
              <q-badge :color="statusColor" :label="task.status" />
            </div>
            <div class="col">
              <div class="text-body2">
                {{ task.name }}
                <span> | {{ task.task_type }}</span>
              </div>
              <div class="text-caption text-grey-7">Task id: {{ task.id }}</div>
            </div>
          </div>
        </div>

        <div class="col-12">
          <q-linear-progress :value="progressValue" color="primary" />
          <div class="text-caption text-grey-7 q-mt-xs">
            <span>Progress: {{ progressCurrent }} / {{ progressTotal }}</span>
            <span v-if="progressMessage"> | {{ progressMessage }}</span>
            <span v-if="etaLabel"> | ETA: {{ etaLabel }}</span>
          </div>
        </div>

        <div class="col-12">
          <q-expansion-item icon="terminal" label="Live logs" @show="onLogsShown" @hide="onLogsHidden">
            <div class="row q-col-gutter-md items-end q-pt-sm">
              <div class="col-12 col-md-4">
                <BaseSelect
                  v-model="logsCtx.format"
                  label="Format"
                  :options="formatOptions"
                  emit-value
                  map-options
                />
              </div>
              <div class="col-12 col-md-2">
                <q-input v-model.number="logsCtx.lines" type="number" label="Lines" outlined dense />
              </div>
              <div class="col-12 col-md-6">
                <div class="row items-center q-col-gutter-sm">
                  <div class="col">
                    <q-toggle v-model="logsCtx.autoRefresh" label="Auto refresh" left-label />
                  </div>
                  <div class="col">
                    <q-input
                      v-model.number="logsCtx.pollIntervalSeconds"
                      type="number"
                      label="Interval (s)"
                      outlined
                      dense
                      :disable="!logsCtx.autoRefresh"
                    />
                  </div>
                  <div class="col">
                    <q-toggle v-model="autoScroll" label="Auto scroll" left-label />
                  </div>
                </div>
              </div>
            </div>

            <div class="row q-mt-md">
              <div class="col-12">
                <q-card flat bordered>
                  <q-card-section class="q-pa-none">
                    <div ref="logsContainer" style="height: 50vh; overflow: auto">
                      <pre class="logs-output">{{ logsCtx.logsText }}</pre>
                    </div>
                  </q-card-section>
                </q-card>
              </div>
            </div>

            <div class="row q-col-gutter-sm q-mt-sm justify-end">
              <div class="col-12 col-md-auto">
                <BaseButtonSecondary icon="refresh" label="Refresh" :loading="logsCtx.loading" @click="loadLogs" />
              </div>
              <div class="col-12 col-md-auto">
                <BaseButtonSecondary icon="open_in_new" label="Open Logs page" to="/logs" />
              </div>
            </div>
          </q-expansion-item>
        </div>

        <div class="col-12">
          <q-expansion-item icon="info" label="Task details (raw)">
            <pre class="logs-output">{{ taskJson }}</pre>
          </q-expansion-item>
        </div>
      </div>
    </BaseSection>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Task } from 'src/generated/api'
import BaseButtonSecondary from 'components/base/BaseButtonSecondary.vue'
import BaseSection from 'components/base/BaseSection.vue'
import BaseSelect from 'components/base/BaseSelect.vue'
import { useTaskStore } from 'src/stores/tasks'
import { useLogsStore } from 'src/stores/logs'

const props = defineProps<{
  taskId: string
  projectName: string
  cameraName?: string
  initialTask?: Task | null
}>()

const emit = defineEmits<{
  (e: 'update:task', value: Task): void
  (e: 'close'): void
}>()

const taskStore = useTaskStore()
void taskStore.ensureConnected()

const logsStore = useLogsStore()
const logsVisible = ref(false)

const logsKey = computed(() => `scan-overlay:${props.taskId}`)
const logsCtx = computed(() =>
  logsStore.ensureContext(logsKey.value, {
    format: 'text',
    lines: 500,
    autoRefresh: true,
    pollIntervalSeconds: 1
  })
)

const task = computed(() => taskStore.taskById(props.taskId))

const scanArgs = computed(() => {
  return (task.value!.run_args as unknown as any[])[0] as any
})

const scanProjectName = computed(() => scanArgs.value.project_name as string)
const scanIndex = computed(() => scanArgs.value.index as number)

const scanTitle = computed(() => {
  return `Scan #${scanIndex.value} for ${scanProjectName.value}`
})

const scanSubtitle = computed(() => {
  return 'This view shows live scan state and controls.'
})

const scanSettingsDescription = computed(() => {
  const settings = scanArgs.value.settings as any
  return [
    `Path method: ${settings.path_method}`,
    `Points: ${settings.points}`,
    `Image format: ${settings.image_format}`,
    `Min theta: ${settings.min_theta}`,
    `Max theta: ${settings.max_theta}`,
    `Optimize path: ${settings.optimize_path ? 'yes' : 'no'}`,
    `Optimization: ${settings.optimization_algorithm}`,
    `Focus stacks: ${settings.focus_stacks}`,
    `Focus range: ${settings.focus_range[0]}-${settings.focus_range[1]}`
  ].join(' | ')
})

const statusColor = computed(() => {
  switch (task.value!.status) {
    case 'pending':
      return 'grey'
    case 'running':
      return 'primary'
    case 'paused':
      return 'orange'
    case 'completed':
      return 'green'
    case 'cancelled':
      return 'grey'
    case 'error':
      return 'negative'
    case 'interrupted':
      return 'orange'
    default:
      return 'grey'
  }
})

const progressCurrent = computed(() => task.value!.progress.current)
const progressTotal = computed(() => task.value!.progress.total)
const progressMessage = computed(() => task.value!.progress.message)

const progressValue = computed(() => {
  return progressCurrent.value / progressTotal.value
})

const taskJson = computed(() => JSON.stringify(task.value, null, 2))

const etaSeconds = computed(() => taskStore.etaSecondsById(props.taskId))

const etaLabel = computed(() => {
  const seconds = etaSeconds.value
  if (seconds === null) {
    return null
  }
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const paddedMinutes = String(minutes).padStart(2, '0')
  const paddedSeconds = String(secs).padStart(2, '0')
  return hours > 0 ? `${hours}:${paddedMinutes}:${paddedSeconds}` : `${minutes}:${paddedSeconds}`
})

const pause = async () => {
  await taskStore.pause(props.taskId)
}

const resume = async () => {
  await taskStore.resume(props.taskId)
}

const cancel = async () => {
  await taskStore.cancel(props.taskId)
}

const close = () => {
  emit('close')
}

const placeholderProgress = ref(0)
const placeholderTarget = ref(0)
const placeholderProgressLabel = computed(() => `${Math.round(placeholderTarget.value)}%`)
let placeholderTimer: ReturnType<typeof setInterval> | null = null

const startPlaceholder = () => {
  if (placeholderTimer) {
    return
  }
  placeholderTimer = setInterval(() => {
    const diff = placeholderTarget.value - placeholderProgress.value
    if (diff <= 0) {
      clearInterval(placeholderTimer!)
      placeholderTimer = null
      return
    }
    placeholderProgress.value += Math.min(diff, 1)
  }, 50)
}

const stopPlaceholder = () => {
  if (!placeholderTimer) {
    return
  }
  clearInterval(placeholderTimer)
  placeholderTimer = null
}

watch(
  () => props.taskId,
  async () => {
    await taskStore.ensureTaskLoaded(props.taskId)
  }
)

watch(
  task,
  (value) => {
    if (value) {
      emit('update:task', value)
    }
  },
  { immediate: true }
)

onMounted(async () => {
  await taskStore.ensureTaskLoaded(props.taskId)
})

onBeforeUnmount(() => {
  stopPlaceholder()
  logsStore.stopPolling(logsKey.value)
})

watch(
  () => task.value!.status,
  (status) => {
    if (status === 'paused' || status === 'interrupted') {
      placeholderProgress.value = placeholderTarget.value
      stopPlaceholder()
      return
    }
    if (status === 'completed' || status === 'cancelled' || status === 'error') {
      placeholderProgress.value = placeholderTarget.value
      stopPlaceholder()
      return
    }
    startPlaceholder()
  },
  { immediate: true }
)

watch(
  [progressCurrent, progressTotal],
  () => {
    if (progressTotal.value <= 0) {
      placeholderTarget.value = 0
      placeholderProgress.value = 0
      return
    }

    placeholderTarget.value = Math.max(0, Math.min(100, (progressCurrent.value / progressTotal.value) * 100))

    if (placeholderProgress.value > placeholderTarget.value) {
      placeholderProgress.value = placeholderTarget.value
    }

    const status = task.value!.status
    if (status === 'paused' || status === 'interrupted' || status === 'completed' || status === 'cancelled' || status === 'error') {
      placeholderProgress.value = placeholderTarget.value
      stopPlaceholder()
      return
    }
    startPlaceholder()
  },
  { immediate: true }
)

const formatOptions = [
  { label: 'Text log', value: 'text' },
  { label: 'Detailed JSON log', value: 'json' }
]
const autoScroll = ref(true)
const logsContainer = ref<HTMLElement | null>(null)

const loadLogs = async () => {
  await logsStore.load(logsKey.value)
  if (autoScroll.value) {
    await nextTick()
    logsContainer.value!.scrollTop = logsContainer.value!.scrollHeight
  }
}

const onLogsShown = () => {
  logsVisible.value = true
  void loadLogs()
  if (logsCtx.value.autoRefresh) {
    logsStore.startPolling(logsKey.value)
  }
}

const onLogsHidden = () => {
  logsVisible.value = false
  logsStore.stopPolling(logsKey.value)
}

watch(
  () => logsCtx.value.autoRefresh,
  (value) => {
    if (!logsVisible.value) {
      return
    }
    if (value) {
      logsStore.startPolling(logsKey.value)
      return
    }
    logsStore.stopPolling(logsKey.value)
  }
)

watch(
  () => logsCtx.value.pollIntervalSeconds,
  () => {
    if (logsVisible.value && logsCtx.value.autoRefresh) {
      logsStore.startPolling(logsKey.value)
    }
  }
)

watch(
  [() => logsCtx.value.format, () => logsCtx.value.lines],
  () => {
    if (logsVisible.value) {
      void loadLogs()
    }
  }
)
</script>

<style scoped>
.placeholder-progress {
  position: relative;
}

.placeholder-progress__center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  text-align: center;
}

.logs-output {
  margin: 0;
  padding: 12px;
  white-space: pre;
  font-family: monospace;
  font-size: 12px;
}
</style>
