<template>
  <div class="logs-workspace">
    <div class="row q-col-gutter-md items-end">
      <div class="col-12 col-md-3">
        <BaseSelect
          v-model="formatModel"
          label="Format"
          :options="formatOptions"
          emit-value
          map-options
        />
      </div>
      <div class="col-12 col-md-3">
        <BaseSelect
          v-model="logLevelModel"
          label="Log level"
          :options="logLevelOptions"
          emit-value
          map-options
        />
      </div>
      <div class="col-12 col-md-2">
        <q-input v-model.number="linesModel" type="number" label="Lines" outlined dense />
      </div>
      <div class="col-12 col-md-4">
        <div class="row items-center q-col-gutter-sm">
          <div class="col">
            <q-toggle v-model="autoRefreshModel" label="Auto refresh" left-label />
          </div>
          <div class="col">
            <q-input
              v-model.number="pollIntervalModel"
              type="number"
              label="Interval (s)"
              outlined
              dense
              :disable="!autoRefreshModel"
            />
          </div>
          <div v-if="props.showAutoScroll" class="col">
            <q-toggle v-model="autoScrollModel" label="Auto scroll" left-label />
          </div>
        </div>
      </div>
    </div>

    <LogsViewer
      ref="logsViewer"
      class="q-mt-md"
      v-model:log-level="logLevelModel"
      :logs-text="props.logsText"
      :format="formatModel"
      :show-level-filter="false"
      :show-copy-button="false"
      :height="props.height"
      :auto-scroll="autoScrollModel"
    />

    <q-separator class="q-mt-md q-mb-md" />

    <div class="row q-col-gutter-sm justify-end">
      <div class="col-12 col-md-auto">
        <BaseButtonSecondary icon="refresh" label="Refresh" :loading="props.loading" @click="emit('refresh')" />
      </div>
      <slot name="actions-before-copy" />
      <div class="col-12 col-md-auto">
        <BaseButtonSecondary icon="content_copy" label="Copy logs" :disable="!props.logsText" @click="copyLogs" />
      </div>
      <slot name="actions-after-copy" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseButtonSecondary from 'components/base/BaseButtonSecondary.vue'
import BaseSelect from 'components/base/BaseSelect.vue'
import LogsViewer from 'components/common/LogsViewer.vue'
import type { LogFormat } from 'src/stores/logs'

type LogLevelFilter = 'all' | 'trace' | 'debug' | 'info' | 'warning' | 'error' | 'critical'

const props = withDefaults(
  defineProps<{
    logsText: string
    format: LogFormat
    lines: number
    autoRefresh: boolean
    pollIntervalSeconds: number
    logLevel: LogLevelFilter
    loading?: boolean
    height?: string
    autoScroll?: boolean
    showAutoScroll?: boolean
  }>(),
  {
    loading: false,
    height: '60vh',
    autoScroll: false,
    showAutoScroll: false
  }
)

const emit = defineEmits<{
  'update:format': [value: LogFormat]
  'update:lines': [value: number]
  'update:autoRefresh': [value: boolean]
  'update:pollIntervalSeconds': [value: number]
  'update:logLevel': [value: LogLevelFilter]
  'update:autoScroll': [value: boolean]
  refresh: []
}>()

const logsViewer = ref<{ copyVisibleLogs: () => Promise<void> } | null>(null)

const formatModel = computed({
  get: () => props.format,
  set: (value: LogFormat) => emit('update:format', value)
})

const linesModel = computed({
  get: () => props.lines,
  set: (value: number) => emit('update:lines', value)
})

const autoRefreshModel = computed({
  get: () => props.autoRefresh,
  set: (value: boolean) => emit('update:autoRefresh', value)
})

const pollIntervalModel = computed({
  get: () => props.pollIntervalSeconds,
  set: (value: number) => emit('update:pollIntervalSeconds', value)
})

const logLevelModel = computed({
  get: () => props.logLevel,
  set: (value: LogLevelFilter) => emit('update:logLevel', value)
})

const autoScrollModel = computed({
  get: () => props.autoScroll,
  set: (value: boolean) => emit('update:autoScroll', value)
})

const formatOptions = [
  { label: 'Text log', value: 'text' },
  { label: 'Detailed JSON log', value: 'json' }
]

const logLevelOptions = [
  { label: 'All levels', value: 'all' },
  { label: 'Trace', value: 'trace' },
  { label: 'Debug', value: 'debug' },
  { label: 'Info', value: 'info' },
  { label: 'Warning', value: 'warning' },
  { label: 'Error', value: 'error' },
  { label: 'Critical', value: 'critical' }
] satisfies Array<{ label: string; value: LogLevelFilter }>

const copyLogs = async () => {
  await logsViewer.value?.copyVisibleLogs()
}
</script>
