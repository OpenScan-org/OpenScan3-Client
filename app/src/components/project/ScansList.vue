<template>
  <div class="col-12">
    <div class="scans-nested q-pa-md">
      <q-item class="q-mb-sm scans-header" dense>
        <q-item-section avatar>
          <q-checkbox
            size="sm"
            :model-value="allScansSelected"
            :indeterminate="isPartialSelection"
            :disable="!scans.length"
            @update:model-value="toggleSelectAll"
          />
        </q-item-section>
        <q-item-section>
          <div class="text-subtitle2 text-grey-7">Scans</div>
        </q-item-section>
        <q-item-section side>
          <div class="row items-center q-gutter-xs">
            <q-btn
              v-if="selectedScansSet.size > 0"
              flat
              round
              dense
              color="negative"
              icon="delete"
              @click="requestDeleteSelected"
            >
              <q-tooltip>Delete {{ selectedScansSet.size }} selected scan(s)</q-tooltip>
            </q-btn>
            <q-btn
              v-if="selectedScansSet.size > 0"
              flat
              round
              dense
              color="primary"
              icon="download"
              @click="requestDownloadSelected"
            >
              <q-tooltip>Download {{ selectedScansSet.size }} selected scan(s)</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="more_vert">
              <q-menu>
                <q-list dense style="min-width: 150px">
                  <q-item clickable v-close-popup @click="inverse_scan_selection" :disable="!scans.length">
                    <q-item-section>Inverse selection</q-item-section>
                  </q-item>
                  <q-separator />
                  <q-item clickable v-close-popup @click="requestDeleteErrored" :disable="erroredCount === 0">
                    <q-item-section :class="erroredCount > 0 ? 'text-negative' : ''">
                      Delete errored ({{ erroredCount }})
                    </q-item-section>
                  </q-item>
                  <q-item clickable v-close-popup @click="requestDeleteCancelled" :disable="cancelledCount === 0">
                    <q-item-section :class="cancelledCount > 0 ? 'text-negative' : ''">
                      Delete cancelled ({{ cancelledCount }})
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </div>
        </q-item-section>
      </q-item>
      <q-list separator dense>
        <q-item
          v-for="scan in scans"
          :key="scan.index"
          class="items-start"
        >
          <q-item-section avatar>
            <q-checkbox
              size="sm"
              :model-value="selectedScansSet.has(scan.index)"
              @update:model-value="(checked) => toggle_scan_selection(scan.index, checked)"
              @click.stop
            />
          </q-item-section>
        <q-item-section>
          <div class="row items-center q-gutter-sm">
            <div class="text-body1">Scan #{{ scan.index }}</div>
            <q-badge :color="get_status_color(scan.status)" :label="scan.status ?? 'unknown'" />
            <q-badge v-if="scan.settings?.focus_stacks > 1" :color="scan.stacking_task_status?.status === 'completed' ? 'green' : 'grey'" :label="scan.stacking_task_status?.status === 'completed' ? 'stacked' : 'stackable'" />
          </div>
          <div v-if="get_scan_photos_info(scan)" class="text-caption text-grey-8">
            {{ get_scan_photos_info(scan) }}
          </div>
          <div class="text-caption text-grey-8">
            Created: {{ format_date(scan.created) }}<span v-if="scan.duration && scan.duration > 0"> • Duration: {{ format_duration(scan.duration) }}</span>
          </div>
          <div class="row items-center q-gutter-x-sm text-caption text-grey-8">
            <div v-if="scan.camera_name">
              Camera: {{ scan.camera_name }}
            </div>
            <div class="cursor-pointer text-primary" @click.stop="toggleSettings(scan.index)">
              {{ isExpanded(scan.index) ? 'Hide Settings' : 'Show Settings' }}
            </div>
            <div class="text-grey-5">•</div>
            <div class="cursor-pointer text-primary" @click.stop="createScanFromSettings(scan)">
              New Scan with this Settings
            </div>
          </div>
          
          <q-slide-transition>
            <div v-show="isExpanded(scan.index)" class="row q-mt-sm q-col-gutter-md">
              <div class="col-12 col-md-6">
                <div class="text-caption text-weight-bold q-mb-xs">Scan Settings</div>
                <div class="text-caption text-grey-8 bg-grey-2 q-pa-sm rounded-borders" style="white-space: pre-wrap; word-break: break-all;">
                  <div v-for="(value, key) in scan.settings" :key="key">
                    <span class="text-weight-medium">{{ key }}:</span> {{ value }}
                  </div>
                </div>
              </div>
              <div class="col-12 col-md-6" v-if="scan.camera_settings">
                <div class="text-caption text-weight-bold q-mb-xs">Camera Settings</div>
                <div class="text-caption text-grey-8 bg-grey-2 q-pa-sm rounded-borders" style="white-space: pre-wrap; word-break: break-all;">
                  <div v-for="(value, key) in scan.camera_settings" :key="key">
                    <span class="text-weight-medium">{{ key }}:</span> {{ value }}
                  </div>
                </div>
              </div>
            </div>
          </q-slide-transition>

          <div v-if="scan.description" :class="'text-caption text-grey-8'">
            Description: {{ scan.description }}
          </div>
        </q-item-section>
          <q-item-section side class="q-pa-none">
            <div class="row items-center no-wrap q-gutter-xs">
              <q-btn flat round icon="pause" v-if="scan.status === 'running'" @click.stop="pause_scan(scan.index)">
                <q-tooltip>Pause scan</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                icon="play_arrow"
                v-if="scan.status === 'paused' || scan.status === 'interrupted'"
                @click.stop="resume_scan(scan.index)"
              >
                <q-tooltip>Resume scan</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                icon="cancel"
                v-if="['pending', 'running', 'paused'].includes(scan.status ?? '')"
                @click.stop="cancel_scan(scan.index)"
                color="negative"
              >
                <q-tooltip>Cancel scan</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                icon="layers"
                :disable="!(scan.status === 'completed' && scan.settings?.focus_stacks > 1 && scan.stacking_task_status?.status !== 'completed')"
                :color="scan.status === 'completed' && scan.settings?.focus_stacks > 1 && scan.stacking_task_status?.status !== 'completed' ? 'primary' : 'grey-5'"
                @click.stop="stack_scan(scan.index)"
              >
                <q-tooltip>Start focus stacking</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                icon="download"
                :color="scan.status === 'completed' ? 'primary' : 'grey-5'"
                :disable="scan.status !== 'completed'"
                @click.stop="download_scan(scan.index)"
              >
                <q-tooltip>Download scan</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                icon="delete"
                :color="['pending', 'running'].includes(scan.status ?? '') ? 'grey-5' : 'negative'"
                :disable="['pending', 'running'].includes(scan.status ?? '')"
                @click.stop="delete_scan(scan.index)"
              >
                <q-tooltip>Delete scan</q-tooltip>
              </q-btn>
            </div>
          </q-item-section>
        </q-item>
      </q-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { computed, ref } from 'vue'
import { type Scan } from 'src/generated/api'
import { getApiBaseUrl } from 'src/services/apiClient'
import { useTaskStore } from 'src/stores/tasks'
import { useScanTemplateStore } from 'src/stores/scanTemplate'

interface ScansListProp {
  scans: Scan[]
  selected_scan_index?: number
  project_name: string
  selectedScans?: number[]
}

const props = defineProps<ScansListProp>()
const emit = defineEmits(['select:scan', 'delete:scan', 'pause:scan', 'resume:scan', 'download:scan', 'stack:scan', 'cancel:scan', 'create:scan', 'update:selected-scans', 'bulk:delete-selected', 'bulk:delete-status', 'bulk:download-selected'])
const taskStore = useTaskStore()
const scanTemplateStore = useScanTemplateStore()
const router = useRouter()

const scans = computed<Scan[]>(() => {
  return props.scans.map((scan) => {
    const taskId = scan.task_id
    if (!taskId) {
      return scan
    }

    const task = taskStore.taskById(taskId)
    if (!task?.status) {
      return scan
    }

    return { ...scan, status: task.status }
  })
})

const selectedScansSet = computed(() => new Set(props.selectedScans ?? []))
const allScansSelected = computed(() => props.scans.length > 0 && selectedScansSet.value.size === props.scans.length)
const isPartialSelection = computed(() => selectedScansSet.value.size > 0 && !allScansSelected.value)

const erroredStatuses = new Set(['failed', 'error'])
const erroredCount = computed(() => scans.value.filter((scan) => erroredStatuses.has(scan.status ?? '')).length)
const cancelledCount = computed(() => scans.value.filter((scan) => scan.status === 'cancelled').length)

const expandedScanIndices = ref(new Set<number>())
const toggleSettings = (index: number) => {
  const next = new Set(expandedScanIndices.value)
  if (next.has(index)) {
    next.delete(index)
  } else {
    next.add(index)
  }
  expandedScanIndices.value = next
}
const isExpanded = (index: number) => expandedScanIndices.value.has(index)

const format_date = (value?: string) => {
  if (!value) {
    return '–'
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

const format_duration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return `${hours}h ${minutes}m ${secs}s`
}

const get_scan_photos_info = (scan: Scan) => {
  if (!scan.settings?.points || !scan.settings?.focus_stacks) {
    return null
  }
  const photos = scan.settings.points * scan.settings.focus_stacks
  if (photos <= 0) {
    return null
  }
  return `Photos: ${photos} (Positions: ${scan.settings.points}, Focus Stacks: ${scan.settings.focus_stacks})`
}

const get_status_icon = (status?: string) => {
  switch (status) {
    case 'pending': return 'schedule'
    case 'running': return 'play_arrow'
    case 'completed': return 'check_circle'
    case 'paused': return 'pause'
    case 'failed': return 'error'
    case 'cancelled': return 'cancel'
    default: return 'help'
  }
}

const get_status_color = (status?: string) => {
  switch (status) {
    case 'pending': return 'grey'
    case 'running': return 'blue'
    case 'completed': return 'green'
    case 'paused': return 'orange'
    case 'failed': return 'red'
    case 'cancelled': return 'grey'
    default: return 'grey'
  }
}

const createScanFromSettings = (scan: Scan) => {
  scanTemplateStore.setTemplate(scan.settings, scan.camera_settings)
  void router.push({ path: '/scan', query: { project: props.project_name, camera: scan.camera_name || undefined } })
}

const select_scan = (index: number) => {
  emit('select:scan', index)
}

const delete_scan = (index: number) => {
  emit('delete:scan', { project_name: props.project_name, scan_index: index })
}

const pause_scan = (index: number) => {
  emit('pause:scan', { project_name: props.project_name, scan_index: index })
}

const resume_scan = (index: number) => {
  const scan = scans.value.find((entry) => entry.index === index)
  emit('resume:scan', { project_name: props.project_name, scan_index: index, camera_name: scan?.camera_name || 'default' })
}

const download_scan = (index: number) => {
  try {
    const params = new URLSearchParams()
    params.append('scan_indices', index.toString())
    const downloadUrl = `${getApiBaseUrl()}projects/${encodeURIComponent(props.project_name)}/scans/zip?${params.toString()}`
    window.open(downloadUrl, '_blank')
    emit('download:scan', { project_name: props.project_name, scan_index: index })
  } catch (error) {
    console.error('Could not download scan.', error)
  }
}

const toggle_scan_selection = (index: number, checked: boolean) => {
  const next = new Set(selectedScansSet.value)
  if (checked) {
    next.add(index)
  } else {
    next.delete(index)
  }
  emit('update:selected-scans', Array.from(next))
}

const select_all_scans = () => {
  emit('update:selected-scans', scans.value.map((scan) => scan.index))
}

const toggleSelectAll = (checked: boolean) => {
  if (checked) {
    select_all_scans()
  } else {
    emit('update:selected-scans', [])
  }
}

const inverse_scan_selection = () => {
  const next = scans.value
    .filter((scan) => !selectedScansSet.value.has(scan.index))
    .map((scan) => scan.index)
  emit('update:selected-scans', next)
}

const requestDeleteSelected = () => {
  if (!selectedScansSet.value.size) {
    return
  }
  emit('bulk:delete-selected', { project_name: props.project_name, scan_indices: Array.from(selectedScansSet.value) })
}

const requestDeleteErrored = () => {
  const indices = scans.value.filter((scan) => erroredStatuses.has(scan.status ?? '')).map((scan) => scan.index)
  if (!indices.length) {
    return
  }
  emit('bulk:delete-status', { project_name: props.project_name, scan_indices: indices, status: 'error' })
}

const requestDeleteCancelled = () => {
  const indices = scans.value.filter((scan) => scan.status === 'cancelled').map((scan) => scan.index)
  if (!indices.length) {
    return
  }
  emit('bulk:delete-status', { project_name: props.project_name, scan_indices: indices, status: 'cancelled' })
}

const requestDownloadSelected = () => {
  if (!selectedScansSet.value.size) {
    return
  }
  emit('bulk:download-selected', { project_name: props.project_name, scan_indices: Array.from(selectedScansSet.value) })
}

const stack_scan = (index: number) => {
  emit('stack:scan', { project_name: props.project_name, scan_index: index })
}

const cancel_scan = (index: number) => {
  emit('cancel:scan', { project_name: props.project_name, scan_index: index })
}
</script>

<style scoped>
.scans-nested {
  background: #f7f7f8;
  border-left: 3px solid var(--q-primary);
  border-radius: 4px;
}

.scans-header {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
</style>
