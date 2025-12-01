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
                <q-btn color="primary" unelevated label="Upload project" v-if="!project.uploaded" @click="confirm_upload"></q-btn>
                <q-btn color="primary" unelevated label="Download project" @click="confirm_download"></q-btn>
                <q-btn color="primary" unelevated label="Delete project" @click="confirm_delete"></q-btn>
                <q-btn color="primary" unelevated label="Add Scan" @click="add_scan"></q-btn>
            </q-card-section>
            <q-separator />
            <ScansList v-if="detail" :scans="projectScans" :project_name="project.name" @delete:scan="handleDeleteScan" @pause:scan="handlePauseScan" @resume:scan="handleResumeScan" @cancel:scan="handleCancelScan" @stack:scan="handleStackScan" @select:scan="handleSelectScan" />
        </q-card>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { apiClient } from 'src/services/apiClient'
import { deleteProject, uploadProjectToCloud, deleteScan, pauseScan, resumeScan, cancelScan, startFocusStacking, type Project, type Scan } from 'src/generated/api'
import ScansList from './ScansList.vue'

const $q = useQuasar()
const router = useRouter()

interface ProjectProp {
    project: Project
    detail?: boolean
    projectScans?: Scan[]
}

const props = defineProps<ProjectProp>()
const emit = defineEmits(['delete:project', 'upload:project', 'delete:scan', 'pause:scan', 'select:scan'])

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
    $q.dialog({
        title: 'Confirm Download',
        message: `Do you want to download ${props.project.name}?`,
        cancel: true,
        persistent: true
    }).onOk(async () => {
        try {
            // Placeholder for download logic
            $q.notify({ type: 'positive', message: 'Download not implemented yet.' })
        } catch (error) {
            $q.notify({ type: 'negative', message: 'Could not download project.' })
        }
    })
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
