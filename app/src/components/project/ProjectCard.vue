<template>
    <div :class="detail ? 'col-12' : 'col-6'">
        <q-card class="project-card">
            <q-card-section>
                <div class="project-header-grid">
                    <q-img
                        :src="thumbnailUrl"
                        class="project-header-thumbnail"
                        ratio="1"
                        fit="cover"
                    />
                    <div class="project-header-content">
                        <div class="row items-start justify-between">
                            <div class="row items-center q-gutter-x-sm">
                                <div class="text-h6">{{ project.name }}</div>
                                <q-btn flat round dense color="negative" icon="delete" size="sm" @click="confirm_delete">
                                    <q-tooltip>Delete this project</q-tooltip>
                                </q-btn>
                            </div>
                            <div class="text-subtitle2 text-grey-7">{{ displayDate }}</div>
                        </div>
                        <div v-if="project.description" class="text-body2 text-grey-7 q-mt-sm">
                            {{ project.description }}
                        </div>
                        <div
                            class="project-header-actions"
                            :class="{ 'project-header-actions--single-column': !projectTotalSizeLabel }"
                        >
                            <div v-if="projectTotalSizeLabel" class="text-caption text-grey-7 project-total-size">
                                Total size: {{ projectTotalSizeLabel }}
                            </div>
                            <div class="project-action-buttons row items-center q-gutter-sm justify-center">
                                <template v-if="apiConfigStore.cloudEnabled">
                                    <BaseButtonSecondary
                                        v-if="!project.uploaded"
                                        unelevated
                                        icon="cloud_upload"
                                        label="Cloud Reconstruction"
                                        :loading="cloudUploadLoading"
                                        :disable="cloudUploadLoading || cloudReconstructionBlocked"
                                        @click="confirm_upload"
                                    >
                                        <q-tooltip>{{ cloudReconstructionTooltip }}</q-tooltip>
                                    </BaseButtonSecondary>
                                    <BaseButtonSecondary
                                        v-else-if="!project.downloaded"
                                        unelevated
                                        icon="cloud_sync"
                                        label="Fetch model"
                                        :loading="cloudFetchLoading"
                                        :disable="cloudFetchLoading"
                                        @click="confirm_fetch_model"
                                    >
                                        <q-tooltip>Fetch the reconstructed model from the cloud.</q-tooltip>
                                    </BaseButtonSecondary>
                                    <BaseButtonSecondary
                                        v-else
                                        unelevated
                                        icon="download"
                                        label="model"
                                        @click="download_model"
                                    >
                                        <q-tooltip>Download the reconstructed model archive</q-tooltip>
                                    </BaseButtonSecondary>
                                </template>
                                <BaseButtonPrimary
                                    unelevated
                                    icon="cloud_download"
                                    label="Download"
                                    :disable="projectActionsBlocked"
                                    @click="confirm_download"
                                >
                                    <q-tooltip>{{ projectActionsTooltip }}</q-tooltip>
                                </BaseButtonPrimary>
                                <BaseButtonPrimary
                                    color="positive"
                                    unelevated
                                    icon="add"
                                    label="Add Scan"
                                    :disable="projectActionsBlocked"
                                    @click="add_scan"
                                >
                                    <q-tooltip>{{ addScanTooltip }}</q-tooltip>
                                </BaseButtonPrimary>
                            </div>
                        </div>
                    </div>
                </div>
            </q-card-section>
            <q-separator />
            <ScansList
                v-if="detail"
                :scans="projectScansNormalized"
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

<style scoped>
 .project-header-grid {
     display: grid;
     grid-template-columns: 128px minmax(0, 1fr);
     column-gap: 16px;
     align-items: start;
 }

 .project-header-thumbnail {
     width: 128px;
     height: 128px;
     border-radius: 12px;
     overflow: hidden;
 }

 .project-header-content {
     min-height: 128px;
     display: flex;
     flex-direction: column;
     min-width: 0;
 }

 .project-header-actions {
     margin-top: auto;
     display: grid;
     grid-template-columns: auto minmax(0, 1fr);
     align-items: center;
     column-gap: 12px;
     row-gap: 8px;
     width: 100%;
 }

 .project-header-actions--single-column {
     grid-template-columns: minmax(0, 1fr);
 }

 .project-action-buttons {
     width: 100%;
 }

 .project-total-size {
     font-weight: 500;
     margin-right: 8px;
 }
</style>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { apiClient, getApiBaseUrl } from 'src/services/apiClient'
import { useApiConfigStore } from 'src/stores/apiConfig'
import {
    deleteProject,
    uploadProjectToCloud,
    deleteScan,
    pauseScan,
    resumeScan,
    cancelScan,
    startFocusStacking,
    downloadProjectFromCloud,
    type Project,
    type Scan
} from 'src/generated/api'
import { useCloudResetGuard } from 'src/composables/useCloudResetGuard'
import { formatBytes } from 'src/utils/formatBytes'
import { useTaskStore } from 'src/stores/tasks'
import BaseButtonPrimary from 'src/components/base/BaseButtonPrimary.vue'
import BaseButtonSecondary from 'src/components/base/BaseButtonSecondary.vue'
import ScansList from './ScansList.vue'

const $q = useQuasar()
const router = useRouter()
const apiConfigStore = useApiConfigStore()
const taskStore = useTaskStore()

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
        } catch (error) {
            console.error('Could not delete selected scans.', error)
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
            selectedScans.value = selectedScans.value.filter((index) => !data.scan_indices.includes(index))
        } catch (error) {
            console.error(`Could not delete ${statusLabel} scans.`, error)
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
        const downloadUrl = `${getApiBaseUrl()}projects/${encodeURIComponent(data.project_name)}/scans/zip?${params.toString()}`
        window.open(downloadUrl, '_blank')
    } catch (error) {
        console.error('Could not download selected scans.', error)
    }
}

const props = defineProps<ProjectProp>()
const emit = defineEmits([
    'reload',
    'delete:project',
    'upload:project',
    'delete:scan',
    'pause:scan',
    'select:scan'
])
const selectedScans = ref<number[]>([])

const cloudUploadLoading = ref(false)
const cloudFetchLoading = ref(false)
const { cloudResetLoading, promptCloudReset } = useCloudResetGuard()

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

const projectScansNormalized = computed<Scan[]>(() => {
    const scansSource = props.projectScans ?? Object.values(props.project.scans || {})
    return scansSource
        .map((scan) => {
            const next: Scan = { ...scan }
            const task = scan.task_id ? taskStore.taskById(scan.task_id) : null
            if (task?.status) {
                next.status = task.status
            }
            return next
        })
        .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
})

const projectTotalSizeLabel = computed(() => {
    const totalBytes = projectScansNormalized.value.reduce(
        (sum, scan) => sum + (scan.total_size_bytes ?? 0),
        0
    )
    return totalBytes > 0 ? formatBytes(totalBytes) : null
})

const thumbnailUrl = computed(() => {
    return `${getApiBaseUrl()}projects/${encodeURIComponent(props.project.name)}/thumbnail`
})

const cloudReconstructionBlocked = computed(() => {
    const inProgressStatuses = new Set(['pending', 'running', 'paused', 'interrupted'])
    return projectScansNormalized.value.some((scan) => inProgressStatuses.has(scan.status ?? ''))
})

const cloudReconstructionTooltip = computed(() => {
    if (cloudReconstructionBlocked.value) {
        return 'Cloud reconstruction is disabled while a scan is running or paused.'
    }
    return 'Upload this project to the cloud.'
})

const projectActionsBlocked = computed(() => cloudReconstructionBlocked.value)

const projectActionsTooltip = computed(() => {
    if (projectActionsBlocked.value) {
        return 'Project download is disabled while a scan is running or paused.'
    }
    return 'Download the project archive'
})

const addScanTooltip = computed(() => {
    if (projectActionsBlocked.value) {
        return 'Adding scans is disabled while a scan is running or paused.'
    }
    return 'Create a new scan in this project'
})

const confirm_delete = () => {
    $q.dialog({
        title: 'Confirm',
        message: `Do you want to delete ${props.project.name}?`,
        cancel: true,
        persistent: true
    }).onOk(async () => {
        try {
            const activeStatuses = new Set(['pending', 'running', 'paused', 'interrupted'])
            const activeScans = Object.values(props.project.scans || {}).filter((scan) =>
                activeStatuses.has(scan.status ?? '')
            )
            if (activeScans.length) {
                await Promise.all(
                    activeScans.map((scan) =>
                        cancelScan({ path: { project_name: props.project.name, scan_index: scan.index }, client: apiClient })
                    )
                )
            }
            await deleteProject({ path: { project_name: props.project.name }, client: apiClient })
            emit('reload')
        } catch (error) {
            console.error('Could not delete project.', error)
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
            cloudUploadLoading.value = true
            await uploadProjectToCloud({ path: { project_name: props.project.name }, client: apiClient })
        } catch (error) {
            console.error('Could not upload project.', error)
        } finally {
            cloudUploadLoading.value = false
            emit('reload')
        }
    })
}

const confirm_fetch_model = async () => {
    try {
        cloudFetchLoading.value = true
        await downloadProjectFromCloud({ path: { project_name: props.project.name }, client: apiClient })
    } catch (error) {
        console.error('Could not fetch model from cloud.', error)
    } finally {
        cloudFetchLoading.value = false
        emit('reload')
    }
}

const confirm_download = () => {
    try {
        const downloadUrl = `${getApiBaseUrl()}projects/${encodeURIComponent(props.project.name)}/zip`
        window.open(downloadUrl, '_blank')
    } catch (error) {
        console.error('Could not download project.', error)
    }
}

const download_model = () => {
    try {
        const downloadUrl = `${getApiBaseUrl()}projects/${encodeURIComponent(props.project.name)}/model/zip`
        window.open(downloadUrl, '_blank')
    } catch (error) {
        console.error('Could not download project model.', error)
    }
}

const add_scan = () => {
    if (props.project.downloaded) {
        promptCloudReset(props.project.name, async () => {
            emit('reload')
            await router.push({ path: '/scan', query: { project: props.project.name } })
        })
        return
    }
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
        } catch (error) {
            console.error('Could not delete scan.', error)
        }
    })
}

const handlePauseScan = async (data: { project_name: string; scan_index: number }) => {
    try {
        await pauseScan({ path: { project_name: data.project_name, scan_index: data.scan_index }, client: apiClient })
        emit('reload')
    } catch (error) {
        console.error('Could not pause scan.', error)
    }
}

const handleResumeScan = async (data: { project_name: string; scan_index: number; camera_name: string }) => {
    try {
        await resumeScan({ path: { project_name: data.project_name, scan_index: data.scan_index }, query: { camera_name: data.camera_name }, client: apiClient })
        emit('reload')
    } catch (error) {
        console.error('Could not resume scan.', error)
    }
}

const handleCancelScan = async (data: { project_name: string; scan_index: number }) => {
    try {
        await cancelScan({ path: { project_name: data.project_name, scan_index: data.scan_index }, client: apiClient })
        emit('reload')
    } catch (error) {
        console.error('Could not cancel scan.', error)
    }
}

const handleStackScan = async (data: { project_name: string; scan_index: number }) => {
    try {
        await startFocusStacking({ path: { project_name: data.project_name, scan_index: data.scan_index }, client: apiClient })
        emit('reload')
    } catch (error) {
        console.error('Could not start focus stacking.', error)
    }
}

const handleSelectScan = (scan_index: number) => {
    // Placeholder for selecting a scan, e.g., show scan details or navigate to scan page
    console.log('Selected scan:', scan_index)
}

</script>
