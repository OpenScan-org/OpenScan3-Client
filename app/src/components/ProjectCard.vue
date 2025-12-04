<template>
    <div :class="detail ? 'col-12' : 'col-6'">
        <q-card class="project-card">
            <q-card-section class="row items-start justify-between">
                <div>
                    <div class="text-h6">{{ project.name }}</div>
                    <div class="text-body2 text-grey-7">{{ project.description || 'No description' }}</div>
                </div>
                <div class="text-subtitle2 text-grey-7">{{ displayDate }}</div>
            </q-card-section>
            <q-card-section class="row justify-center q-gutter-sm">
                <q-btn color="grey-5" disable unelevated label="Cloud process project" v-if="!project.uploaded"></q-btn>
                <q-btn color="primary" unelevated label="Download project" @click="confirm_download"></q-btn>
                <q-btn color="negative" unelevated label="Delete project" @click="confirm_delete"></q-btn>
                <q-btn color="positive" unelevated label="Add Scan" @click="add_scan"></q-btn>
            </q-card-section>
            <q-separator />
            <ScansList
                v-if="detail"
                :scans="projectScans"
                :project_name="project.name"
                :selected-scans="selectedScans"
                @update:selected-scans="setSelectedScans"
                @delete:scan="handleDeleteScan"
                @pause:scan="handlePauseScan"
                @resume:scan="handleResumeScan"
                @cancel:scan="handleCancelScan"
                @stack:scan="handleStackScan"
                @select:scan="handleSelectScan"
                @bulk:delete-selected="handleBulkDeleteSelected"
                @bulk:delete-status="handleBulkDeleteByStatus"
                @bulk:download-selected="handleBulkDownloadSelected"
            />
        </q-card>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { apiClient, API_BASE_URL } from 'src/services/apiClient'
import { deleteProject, uploadProjectToCloud, deleteScan, pauseScan, resumeScan, cancelScan, startFocusStacking, type Project, type Scan } from 'src/generated/api'
import ScansList from './ScansList.vue'

const $q = useQuasar()
const router = useRouter()

interface ProjectProp {
    project: Project
    detail?: boolean
    projectScans?: Scan[]
}

const handleBulkDeleteSelected = (data: { project_name: string; scan_indices: number[] }) => {
    if (!data.scan_indices.length) {
        return
    }
    $q.dialog({
        title: 'Delete selected scans',
        message: `Delete ${data.scan_indices.length} selected scan${data.scan_indices.length === 1 ? '' : 's'}?`,
        cancel: true,
        persistent: true
    }).onOk(async () => {
        try {
            await Promise.all(
                data.scan_indices.map((scan_index) =>
                    deleteScan({ path: { project_name: data.project_name, scan_index }, client: apiClient })
                )
            )
            emit('reload')
            setSelectedScans([])
            $q.notify({ type: 'positive', message: 'Selected scans deleted.' })
        } catch (error) {
            $q.notify({ type: 'negative', message: 'Could not delete selected scans.' })
        }
    })
}

const handleBulkDeleteByStatus = (data: { project_name: string; scan_indices: number[]; status: string }) => {
    if (!data.scan_indices.length) {
        return
    }
    const statusLabel = data.status === 'cancelled' ? 'cancelled' : 'errored'
    $q.dialog({
        title: `Delete ${statusLabel} scans`,
        message: `Delete ${data.scan_indices.length} ${statusLabel} scan${data.scan_indices.length === 1 ? '' : 's'}?`,
        cancel: true,
        persistent: true
    }).onOk(async () => {
        try {
            await Promise.all(
                data.scan_indices.map((scan_index) =>
                    deleteScan({ path: { project_name: data.project_name, scan_index }, client: apiClient })
                )
            )
            emit('reload')
            setSelectedScans((prev) => prev.filter((index) => !data.scan_indices.includes(index)))
            $q.notify({ type: 'positive', message: `${statusLabel[0]?.toUpperCase() ?? ''}${statusLabel.slice(1)} scans deleted.` })
        } catch (error) {
            $q.notify({ type: 'negative', message: `Could not delete ${statusLabel} scans.` })
        }
    })
}

const handleBulkDownloadSelected = (data: { project_name: string; scan_indices: number[] }) => {
    if (!data.scan_indices.length) {
        return
    }
    try {
        const params = new URLSearchParams()
        data.scan_indices.forEach((index) => params.append('scan_indices', index.toString()))
        const downloadUrl = `${API_BASE_URL}projects/${encodeURIComponent(data.project_name)}/scans/zip?${params.toString()}`
        window.open(downloadUrl, '_blank')
        $q.notify({ type: 'positive', message: 'Scan download started.' })
    } catch (error) {
        $q.notify({ type: 'negative', message: 'Could not download selected scans.' })
    }
}

const props = defineProps<ProjectProp>()
const emit = defineEmits(['delete:project', 'upload:project', 'delete:scan', 'pause:scan', 'select:scan'])
const selectedScans = ref<number[]>([])

const setSelectedScans = (value: number[]) => {
    selectedScans.value = value
}

const displayDate = computed(() => {
    if (!props.project.created) {
        return '–'
    }

    const date = new Date(props.project.created)
    return Number.isNaN(date.getTime()) ? props.project.created : date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})

const confirm_delete = () => {
    $q.dialog({
        title: 'Confirm',
        message: `Do you want to delete ${props.project.name}?`,
        cancel: true,
        persistent: true
    }).onOk(async () => {
        try {
            await deleteProject({ path: { project_name: props.project.name }, client: apiClient })
            emit('reload')
            $q.notify({ type: 'positive', message: 'Project deleted.' })
        } catch (error) {
            $q.notify({ type: 'negative', message: 'Could not delete project.' })
        }
    })
}

const confirm_upload = () => {
    $q.dialog({
        title: 'Confirm Upload',
        message: `Do you want to upload ${props.project.name} to the cloud?`,
        cancel: true,
        persistent: true
    }).onOk(async () => {
        try {
            await uploadProjectToCloud({ path: { project_name: props.project.name }, client: apiClient })
            emit('reload')
            $q.notify({ type: 'positive', message: 'Project uploaded.' })
        } catch (error) {
            $q.notify({ type: 'negative', message: 'Could not upload project.' })
        }
    })
}

const confirm_download = () => {
    try {
        const downloadUrl = `${API_BASE_URL}projects/${encodeURIComponent(props.project.name)}/zip`
        window.open(downloadUrl, '_blank')
        $q.notify({ type: 'positive', message: 'Download started.' })
    } catch (error) {
        $q.notify({ type: 'negative', message: 'Could not download project.' })
    }
}

const add_scan = () => {
    router.push({ path: '/scan', query: { project: props.project.name } })
}

const handleDeleteScan = async (data: { project_name: string; scan_index: number }) => {
    $q.dialog({
        title: 'Confirm Deletion',
        message: 'Are you sure you want to delete this scan?',
        ok: 'Yes',
        cancel: 'No'
    }).onOk(async () => {
        try {
            await deleteScan({ path: { project_name: data.project_name, scan_index: data.scan_index }, client: apiClient })
            emit('reload')
            $q.notify({ type: 'positive', message: 'Scan deleted.' })
        } catch (error) {
            $q.notify({ type: 'negative', message: 'Could not delete scan.' })
        }
    })
}

const handlePauseScan = async (data: { project_name: string; scan_index: number }) => {
    try {
        await pauseScan({ path: { project_name: data.project_name, scan_index: data.scan_index }, client: apiClient })
        emit('reload')
        $q.notify({ type: 'positive', message: 'Scan paused.' })
    } catch (error) {
        $q.notify({ type: 'negative', message: 'Could not pause scan.' })
    }
}

const handleResumeScan = async (data: { project_name: string; scan_index: number; camera_name: string }) => {
    try {
        await resumeScan({ path: { project_name: data.project_name, scan_index: data.scan_index }, query: { camera_name: data.camera_name }, client: apiClient })
        emit('reload')
        $q.notify({ type: 'positive', message: 'Scan resumed.' })
    } catch (error) {
        $q.notify({ type: 'negative', message: 'Could not resume scan.' })
    }
}

const handleCancelScan = async (data: { project_name: string; scan_index: number }) => {
    try {
        await cancelScan({ path: { project_name: data.project_name, scan_index: data.scan_index }, client: apiClient })
        emit('reload')
        $q.notify({ type: 'positive', message: 'Scan cancelled.' })
    } catch (error) {
        $q.notify({ type: 'negative', message: 'Could not cancel scan.' })
    }
}

const handleStackScan = async (data: { project_name: string; scan_index: number }) => {
    try {
        await startFocusStacking({ path: { project_name: data.project_name, scan_index: data.scan_index }, client: apiClient })
        emit('reload')
        $q.notify({ type: 'positive', message: 'Focus stacking started.' })
    } catch (error) {
        $q.notify({ type: 'negative', message: 'Could not start focus stacking.' })
    }
}

const handleSelectScan = (scan_index: number) => {
    // Placeholder for selecting a scan, e.g., show scan details or navigate to scan page
    console.log('Selected scan:', scan_index)
}

</script>
