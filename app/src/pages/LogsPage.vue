<template>
  <BasePage content-class="col-12 col-lg-10">
    <BaseSection
      title="Logs"
      description="Only backend logs are shown here. Frontend logs are available in the browser console."
    >
      <template v-if="showDisconnectedSkeleton">
        <div class="row q-col-gutter-md items-end">
          <div class="col-12 col-md-3">
            <q-skeleton type="rect" height="40px" />
          </div>
          <div class="col-12 col-md-3">
            <q-skeleton type="rect" height="40px" />
          </div>
          <div class="col-12 col-md-2">
            <q-skeleton type="rect" height="40px" />
          </div>
          <div class="col-12 col-md-4">
            <q-skeleton type="rect" height="40px" />
          </div>
        </div>

        <div class="row q-mt-md">
          <div class="col-12">
            <q-card flat bordered>
              <q-card-section class="q-pa-md">
                <q-skeleton type="rect" height="60vh" />
              </q-card-section>
            </q-card>
          </div>
        </div>

        <q-separator class="q-mt-md q-mb-md" />

        <div class="row q-col-gutter-sm justify-end">
          <div class="col-12 col-md-auto">
            <q-skeleton type="QBtn" />
          </div>
          <div class="col-12 col-md-auto">
            <q-skeleton type="QBtn" />
          </div>
          <div class="col-12 col-md-auto">
            <q-skeleton type="QBtn" />
          </div>
          <div class="col-12 col-md-auto">
            <q-skeleton type="QBtn" />
          </div>
        </div>
      </template>

      <template v-else>
        <div class="row q-col-gutter-md items-end">
          <div class="col-12 col-md-3">
            <BaseSelect
              v-model="logsCtx.format"
              label="Format"
              :options="formatOptions"
              emit-value
              map-options
            />
          </div>
          <div class="col-12 col-md-3">
            <BaseSelect
              v-model="selectedLogLevel"
              label="Log level"
              :options="logLevelOptions"
              emit-value
              map-options
            />
          </div>
          <div class="col-12 col-md-2">
            <q-input v-model.number="logsCtx.lines" type="number" label="Lines" outlined dense />
          </div>
          <div class="col-12 col-md-4">
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
            </div>
          </div>
        </div>

        <LogsViewer
          ref="logsViewer"
          class="q-mt-md"
          v-model:log-level="selectedLogLevel"
          :logs-text="logsCtx.logsText"
          :format="logsCtx.format"
          :show-level-filter="false"
          :show-copy-button="false"
          height="60vh"
        />

        <q-separator class="q-mt-md q-mb-md" />

        <div class="row q-col-gutter-sm justify-end">
          <div class="col-12 col-md-auto">
            <BaseButtonSecondary icon="refresh" label="Refresh" :loading="logsCtx.loading" @click="loadLogs" />
          </div>
          <div class="col-12 col-md-auto">
            <BaseButtonPrimary icon="download" label="Download logs" @click="downloadLogs" />
          </div>
          <div class="col-12 col-md-auto">
            <BaseButtonSecondary icon="content_copy" label="Copy logs" :disable="!logsCtx.logsText" @click="copyLogs" />
          </div>
          <div class="col-12 col-md-auto">
            <BaseButtonSecondary icon="feedback" label="Submit feedback" @click="openFeedbackDialog" />
          </div>
        </div>
      </template>
    </BaseSection>

    <q-dialog v-if="!showDisconnectedSkeleton" v-model="feedbackDialog">
      <q-card style="min-width: 480px; max-width: 90vw">
        <q-card-section class="q-pb-xs">
          <div class="text-h6">Submit feedback</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-input
            v-model="feedbackText"
            type="textarea"
            autogrow
            outlined
            label="Message"
          />
        </q-card-section>
        <q-separator />
        <q-card-actions align="right" class="row q-col-gutter-sm">
          <div class="col-12 col-md-auto">
            <BaseButtonSecondary label="Cancel" @click="feedbackDialog = false" />
          </div>
          <div class="col-12 col-md-auto">
            <BaseButtonPrimary label="Open email" icon="email" @click="submitFeedback" />
          </div>
        </q-card-actions>
      </q-card>
    </q-dialog>
  </BasePage>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BaseButtonPrimary from 'components/base/BaseButtonPrimary.vue'
import BaseButtonSecondary from 'components/base/BaseButtonSecondary.vue'
import BasePage from 'components/base/BasePage.vue'
import BaseSection from 'components/base/BaseSection.vue'
import BaseSelect from 'components/base/BaseSelect.vue'
import LogsViewer from 'components/common/LogsViewer.vue'
import { buildApiUrl } from 'src/services/apiClient'
import { useDeviceStore } from 'src/stores/device'
import { useLogsStore } from 'src/stores/logs'

type LogLevelFilter = 'all' | 'trace' | 'debug' | 'info' | 'warning' | 'error' | 'critical'

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

const logsStore = useLogsStore()
const deviceStore = useDeviceStore()
const showDisconnectedSkeleton = computed(() => deviceStore.hasConnectionIssue)
const logsKey = 'logs-page'
const logsViewer = ref<{ copyVisibleLogs: () => Promise<void> } | null>(null)
const selectedLogLevel = ref<LogLevelFilter>('all')
const logsCtx = computed(() =>
  logsStore.ensureContext(logsKey, {
    format: 'text',
    lines: 500,
    autoRefresh: false,
    pollIntervalSeconds: 2
  })
)

const loadLogs = async () => {
  await logsStore.load(logsKey)
}

const downloadLogs = () => {
  window.open(buildApiUrl('logs/archive'), '_blank')
}

const copyLogs = async () => {
  await logsViewer.value?.copyVisibleLogs()
}

const feedbackDialog = ref(false)
const feedbackText = ref('')

const openFeedbackDialog = () => {
  feedbackDialog.value = true
}

const submitFeedback = () => {
  const subject = 'OpenScan3 alpha feedback'
  const body = `${feedbackText.value}\n\nPlease attach the logs archive from the Logs page if needed.`
  window.location.href = `mailto:cloud+feedback@openscan.eu?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  feedbackDialog.value = false
}

watch(
  [() => logsCtx.value.format, () => logsCtx.value.lines],
  () => {
    void loadLogs()
  }
)

watch(
  () => logsCtx.value.autoRefresh,
  (value) => {
    if (value) {
      logsStore.startPolling(logsKey)
      return
    }
    logsStore.stopPolling(logsKey)
  }
)

watch(
  () => logsCtx.value.pollIntervalSeconds,
  () => {
    if (logsCtx.value.autoRefresh) {
      logsStore.startPolling(logsKey)
    }
  }
)

onMounted(() => {
  void loadLogs()
  if (logsCtx.value.autoRefresh) {
    logsStore.startPolling(logsKey)
  }
})

onBeforeUnmount(() => {
  logsStore.stopPolling(logsKey)
})
</script>
