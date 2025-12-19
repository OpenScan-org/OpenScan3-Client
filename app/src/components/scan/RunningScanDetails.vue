<template>
  <BaseSection title="Task" description="This view shows live task state and backend logs for debugging.">
    <div class="row q-col-gutter-md">
      <div v-if="task?.error" class="col-12">
        <q-banner rounded class="bg-negative text-white">
          {{ task.error }}
        </q-banner>
      </div>

      <div class="col-12">
        <div class="row items-center q-col-gutter-sm">
          <div class="col-auto">
            <q-badge :color="statusColor" :label="task?.status" />
          </div>
          <div class="col">
            <div class="text-body2">
              {{ task?.name }}
              <span> | {{ task?.task_type }}</span>
            </div>
            <div class="text-caption text-grey-7">Task id: {{ task?.id }}</div>
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
        <q-expansion-item v-model="logsExpanded" icon="terminal" label="Live logs">
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
        <q-expansion-item v-model="rawExpanded" icon="info" label="Task details (raw)">
          <pre class="logs-output">{{ taskJson }}</pre>
        </q-expansion-item>
      </div>
    </div>
  </BaseSection>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { Task } from 'src/generated/api'
import BaseButtonSecondary from 'components/base/BaseButtonSecondary.vue'
import BaseSection from 'components/base/BaseSection.vue'
import BaseSelect from 'components/base/BaseSelect.vue'
import { useLogsStore } from 'src/stores/logs'
import { useTaskStore } from 'src/stores/tasks'

const props = defineProps<{
  taskId: string
  initialTask?: Task | null
}>()

const taskStore = useTaskStore()
const task = computed(() => taskStore.taskById(props.taskId) ?? props.initialTask ?? null)

const statusColor = computed(() => {
  switch (task.value?.status) {
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

const progressCurrent = computed(() => task.value?.progress?.current ?? 0)
const progressTotal = computed(() => task.value?.progress?.total ?? 0)
const progressMessage = computed(() => task.value?.progress?.message ?? null)
const progressValue = computed(() => (progressTotal.value > 0 ? progressCurrent.value / progressTotal.value : 0))

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

const taskJson = computed(() => JSON.stringify(task.value, null, 2))

const logsStore = useLogsStore()
const logsExpanded = ref(false)
const rawExpanded = ref(false)

const logsKey = computed(() => `scan-overlay:${props.taskId}`)
const logsCtx = computed(() =>
  logsStore.ensureContext(logsKey.value, {
    format: 'text',
    lines: 500,
    autoRefresh: true,
    pollIntervalSeconds: 1
  })
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

watch(
  logsExpanded,
  (open) => {
    if (open) {
      void loadLogs()
      if (logsCtx.value.autoRefresh) {
        logsStore.startPolling(logsKey.value)
      }
      return
    }

    logsStore.stopPolling(logsKey.value)
  },
  { immediate: true }
)

watch(
  () => logsCtx.value.autoRefresh,
  (value) => {
    if (!logsExpanded.value) {
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
    if (logsExpanded.value && logsCtx.value.autoRefresh) {
      logsStore.startPolling(logsKey.value)
    }
  }
)

watch(
  [() => logsCtx.value.format, () => logsCtx.value.lines],
  () => {
    if (logsExpanded.value) {
      void loadLogs()
    }
  }
)

onBeforeUnmount(() => {
  logsStore.stopPolling(logsKey.value)
})
</script>

<style scoped>
.logs-output {
  margin: 0;
  padding: 12px;
  white-space: pre;
  font-family: monospace;
  font-size: 12px;
}
</style>
