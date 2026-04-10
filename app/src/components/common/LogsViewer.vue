<template>
  <div class="logs-viewer">
    <div v-if="props.showLevelFilter || props.showCopyButton" class="row q-col-gutter-sm items-end q-mb-sm">
      <div v-if="props.showLevelFilter" class="col-12 col-md-4">
        <BaseSelect
          v-model="selectedLevelModel"
          label="Log level"
          :options="logLevelOptions"
          emit-value
          map-options
        />
      </div>
      <div v-if="props.showCopyButton" class="col-12 col-md-auto">
        <BaseButtonSecondary
          icon="content_copy"
          label="Copy logs"
          :disable="!displayedLogsText"
          @click="copyVisibleLogs"
        />
      </div>
    </div>

    <q-card flat bordered>
      <q-card-section class="q-pa-none">
        <div ref="scrollContainer" class="logs-scroll-container" :style="{ height: props.height }">
          <pre class="logs-output">{{ displayedLogsText }}</pre>
        </div>
      </q-card-section>
    </q-card>

    <div
      v-if="selectedLevelModel !== 'all' && !displayedLogsText && props.logsText"
      class="text-caption text-grey-7 q-mt-sm"
    >
      No log entries match the selected level.
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { copyToClipboard, useQuasar } from 'quasar'
import BaseButtonSecondary from 'components/base/BaseButtonSecondary.vue'
import BaseSelect from 'components/base/BaseSelect.vue'
import type { LogFormat } from 'src/stores/logs'

type LogLevelFilter = 'all' | 'trace' | 'debug' | 'info' | 'warning' | 'error' | 'critical'

type JsonRecord = Record<string, unknown>
type TextLogEntry = {
  level: Exclude<LogLevelFilter, 'all'> | null
  text: string
}

const props = withDefaults(
  defineProps<{
    logsText: string
    format: LogFormat
    height?: string
    autoScroll?: boolean
    logLevel?: LogLevelFilter
    showLevelFilter?: boolean
    showCopyButton?: boolean
  }>(),
  {
    height: '60vh',
    autoScroll: false,
    logLevel: undefined,
    showLevelFilter: true,
    showCopyButton: true
  }
)
const emit = defineEmits<{
  'update:logLevel': [value: LogLevelFilter]
}>()

const $q = useQuasar()
const scrollContainer = ref<HTMLElement | null>(null)
const selectedLevel = ref<LogLevelFilter>('all')
const selectedLevelModel = computed({
  get: () => props.logLevel ?? selectedLevel.value,
  set: (value: LogLevelFilter) => {
    selectedLevel.value = value
    emit('update:logLevel', value)
  }
})

const logLevelOptions = [
  { label: 'All levels', value: 'all' },
  { label: 'Trace', value: 'trace' },
  { label: 'Debug', value: 'debug' },
  { label: 'Info', value: 'info' },
  { label: 'Warning', value: 'warning' },
  { label: 'Error', value: 'error' },
  { label: 'Critical', value: 'critical' }
] satisfies Array<{ label: string; value: LogLevelFilter }>

const displayedLogsText = computed(() => filterLogsText(props.logsText, props.format, selectedLevelModel.value))

watch(
  [displayedLogsText, () => props.autoScroll],
  async ([text, autoScroll]) => {
    if (!autoScroll || !text || !scrollContainer.value) {
      return
    }

    await nextTick()
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
  },
  { immediate: true, flush: 'post' }
)

const copyVisibleLogs = async () => {
  if (!displayedLogsText.value) {
    return
  }

  try {
    await copyToClipboard(displayedLogsText.value)
    $q.notify({ type: 'positive', message: 'Logs copied to clipboard' })
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to copy logs' })
  }
}

defineExpose({
  copyVisibleLogs
})

function filterLogsText(logsText: string, format: LogFormat, level: LogLevelFilter) {
  if (level === 'all' || !logsText) {
    return logsText
  }

  if (format === 'json') {
    const filteredJsonLogs = filterJsonLogs(logsText, level)
    if (filteredJsonLogs !== null) {
      return filteredJsonLogs
    }
  }

  return filterTextLogs(logsText, level)
}

function filterJsonLogs(logsText: string, level: Exclude<LogLevelFilter, 'all'>) {
  const parsedJson = tryParseJson(logsText)
  if (parsedJson.ok) {
    return serializeFilteredJson(parsedJson.value, level)
  }

  const filteredJsonLines = filterJsonLines(logsText, level)
  if (filteredJsonLines !== null) {
    return filteredJsonLines
  }

  return null
}

function serializeFilteredJson(value: unknown, level: Exclude<LogLevelFilter, 'all'>) {
  if (Array.isArray(value)) {
    return JSON.stringify(value.filter((entry) => extractLevelFromJsonEntry(entry) === level), null, 2)
  }

  if (isRecord(value)) {
    for (const key of ['logs', 'entries', 'items', 'records']) {
      const nested = value[key]
      if (Array.isArray(nested)) {
        return JSON.stringify(
          {
            ...value,
            [key]: nested.filter((entry) => extractLevelFromJsonEntry(entry) === level)
          },
          null,
          2
        )
      }
    }

    return extractLevelFromJsonEntry(value) === level ? JSON.stringify(value, null, 2) : ''
  }

  return ''
}

function filterJsonLines(logsText: string, level: Exclude<LogLevelFilter, 'all'>) {
  let sawJsonLine = false
  const filteredLines = logsText
    .split('\n')
    .filter((line) => {
      const trimmedLine = line.trim()
      if (!trimmedLine) {
        return false
      }

      const parsedLine = tryParseJson(trimmedLine)
      if (!parsedLine.ok) {
        return false
      }

      sawJsonLine = true
      return extractLevelFromJsonEntry(parsedLine.value) === level
    })

  return sawJsonLine ? filteredLines.join('\n') : null
}

function filterTextLogs(logsText: string, level: Exclude<LogLevelFilter, 'all'>) {
  return splitTextLogEntries(logsText)
    .filter((entry) => entry.level === level)
    .map((entry) => entry.text)
    .join('\n')
}

function splitTextLogEntries(logsText: string) {
  const lines = logsText.split('\n')
  const entries: TextLogEntry[] = []
  let currentEntry: TextLogEntry | null = null

  for (const line of lines) {
    const lineLevel = extractLevelFromTextLine(line)
    if (!currentEntry || lineLevel !== null) {
      if (currentEntry) {
        entries.push(currentEntry)
      }
      currentEntry = {
        level: lineLevel,
        text: line
      }
      continue
    }

    currentEntry.text += `\n${line}`
  }

  if (currentEntry) {
    entries.push(currentEntry)
  }

  return entries
}

function extractLevelFromTextLine(line: string) {
  const match = line.match(/\b(TRACE|DEBUG|INFO|WARNING|WARN|ERROR|CRITICAL|FATAL)\b/i)
  return normalizeLogLevel(match?.[1] ?? null)
}

function extractLevelFromJsonEntry(entry: unknown): Exclude<LogLevelFilter, 'all'> | null {
  if (!isRecord(entry)) {
    return null
  }

  const logValue = isRecord(entry.log) ? entry.log : null
  const candidates = [
    entry.level,
    entry.levelname,
    entry.log_level,
    entry.severity,
    entry.severity_text,
    entry.lvl,
    logValue?.level,
    logValue?.levelname
  ]

  for (const candidate of candidates) {
    const normalizedLevel = normalizeLogLevel(candidate)
    if (normalizedLevel) {
      return normalizedLevel
    }
  }

  return null
}

function normalizeLogLevel(value: unknown): Exclude<LogLevelFilter, 'all'> | null {
  if (typeof value === 'number') {
    if (value <= 5) {
      return 'trace'
    }
    if (value < 20) {
      return 'debug'
    }
    if (value < 30) {
      return 'info'
    }
    if (value < 40) {
      return 'warning'
    }
    if (value < 50) {
      return 'error'
    }
    return 'critical'
  }

  if (typeof value !== 'string') {
    return null
  }

  switch (value.trim().toLowerCase()) {
    case 'trace':
      return 'trace'
    case 'debug':
      return 'debug'
    case 'info':
      return 'info'
    case 'warn':
    case 'warning':
      return 'warning'
    case 'error':
      return 'error'
    case 'critical':
    case 'fatal':
      return 'critical'
    default:
      return null
  }
}

function tryParseJson(value: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(value) }
  } catch {
    return { ok: false }
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
</script>

<style scoped>
.logs-scroll-container {
  overflow: auto;
}

.logs-output {
  margin: 0;
  padding: 12px;
  white-space: pre;
  font-family: monospace;
  font-size: 12px;
}
</style>
