<template>
  <div class="col-12">
    <div class="scans-nested q-pa-md">
      <div class="row items-center justify-between q-mb-sm scans-header">
        <div class="row items-center">
          <q-checkbox
            dense
            :model-value="allScansSelected"
            :indeterminate="isPartialSelection"
            :disable="!scans.length"
            @update:model-value="toggleSelectAll"
            class="q-mr-sm"
          />
          <div class="text-subtitle2 text-grey-7">Scans</div>
        </div>
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
                  <q-item-section :class="cancelledCount > 0 ? 'text-grey-7' : ''">
                    Delete cancelled ({{ cancelledCount }})
                  </q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </div>
      </div>
      <q-list separator dense>
        <q-item
          v-for="scan in scans"
          :key="scan.index"
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
            Created: {{ format_date(scan.created) }}<span v-if="scan.duration && scan.duration > 0"> • Duration: {{ format_duration(scan.duration) }}</span><span v-if="scan.last_updated"> • Last Updated: {{ format_date(scan.last_updated) }}</span>
          </div>
          <div v-if="scan.camera_name" :class="'text-caption text-grey-8'">
            Camera: {{ scan.camera_name }}
          </div>
          <div v-if="scan.description" :class="'text-caption text-grey-8'">
            Description: {{ scan.description }}
          </div>
        </q-item-section>
          <q-item-section side class="q-pa-none">
            <div class="row items-center no-wrap q-gutter-xs">
              <q-btn flat round icon="pause" v-if="scan.status === 'running'" @click.stop="pause_scan(scan.index)" />
              <q-btn flat round icon="play_arrow" v-if="scan.status === 'paused' || scan.status === 'interrupted'" @click.stop="resume_scan(scan.index)" />
              <q-btn flat round icon="cancel" v-if="['pending', 'running', 'paused'].includes(scan.status ?? '')" @click.stop="cancel_scan(scan.index)" color="negative" />
              <q-btn
                flat
                round
                icon="layers"
                :disable="!(scan.status === 'completed' && scan.settings?.focus_stacks > 1 && scan.stacking_task_status?.status !== 'completed')"
                :color="scan.status === 'completed' && scan.settings?.focus_stacks > 1 && scan.stacking_task_status?.status !== 'completed' ? 'primary' : 'grey-5'"
                @click.stop="stack_scan(scan.index)"
              />
              <q-btn
                flat
                round
                icon="download"
                :color="scan.status === 'completed' ? 'primary' : 'grey-5'"
                :disable="scan.status !== 'completed'"
                @click.stop="download_scan(scan.index)"
              />
              <q-btn
                flat
                round
                icon="delete"
                :color="['pending', 'running'].includes(scan.status ?? '') ? 'grey-5' : 'negative'"
                :disable="['pending', 'running'].includes(scan.status ?? '')"
                @click.stop="delete_scan(scan.index)"
              />
            </div>
          </q-item-section>
        </q-item>
      </q-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { type Scan } from 'src/generated/api'
import { getApiBaseUrl } from 'src/services/apiClient'
import { useTaskStore } from 'src/stores/tasks'

interface ScansListProp {
  scans: Scan[]
  selected_scan_index?: number
  project_name: string
  selectedScans?: number[]
}

const props = defineProps<ScansListProp>()
const emit = defineEmits(['select:scan', 'delete:scan', 'pause:scan', 'resume:scan', 'download:scan', 'stack:scan', 'cancel:scan', 'create:scan', 'update:selected-scans', 'bulk:delete-selected', 'bulk:delete-status', 'bulk:download-selected'])
const taskStore = useTaskStore()

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
  return `Positions: ${scan.settings.points} • Focus Stacks: ${scan.settings.focus_stacks} • Photos: ${photos}`
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
