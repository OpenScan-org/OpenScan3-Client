<template>
  <div class="col-12">
    <div class="scans-nested q-pa-md">
      <div class="row items-center justify-between q-mb-sm scans-header">
        <div class="row items-center">
          <q-icon name="folder_open" color="grey-7" class="q-mr-sm" />
          <div class="text-subtitle2 text-grey-7">Scans</div>
        </div>
      </div>
      <q-list separator dense>
        <q-item
          v-for="scan in scans"
          :key="scan.index"
        >
        <q-item-section>
          <div class="row items-center q-gutter-sm">
            <div class="text-body1">Scan #{{ scan.index }}</div>
            <q-badge :color="get_status_color(scan.status)" :label="scan.status ?? 'unknown'" />
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
              <q-btn flat round icon="layers" @click.stop="stack_scan(scan.index)" />
              <q-btn flat round icon="download" @click.stop="download_scan(scan.index)" />
              <q-btn flat round icon="delete" @click.stop="delete_scan(scan.index)" />
            </div>
          </q-item-section>
        </q-item>
      </q-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type Scan } from 'src/generated/api'

interface ScansListProp {
  scans: Scan[]
  selected_scan_index?: number
  project_name: string
}

const props = defineProps<ScansListProp>()
const emit = defineEmits(['select:scan', 'delete:scan', 'pause:scan', 'download:scan', 'stack:scan', 'create:scan'])

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

const download_scan = (index: number) => {
  emit('download:scan', { project_name: props.project_name, scan_index: index })
}

const stack_scan = (index: number) => {
  emit('stack:scan', { project_name: props.project_name, scan_index: index })
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
