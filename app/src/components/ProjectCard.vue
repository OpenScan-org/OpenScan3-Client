<template>
    <div class="col-6">
        <q-card class="project-card">
            <q-card-section class="bg-primary text-white">
                <div class="text-h6">{{ project.name }}</div>
                <div class="text-subtitle2">{{ project.date }}</div>
            </q-card-section>
            <q-separator />
            <q-card-actions align="right">
                <!-- <q-btn color="primary" flat @click="show_project">View</q-btn> -->
                <q-btn color="primary" flat v-if="!project.uploaded" @click="confirm_upload">Upload</q-btn>
                <!-- <q-btn color="primary" flat v-else>Download</q-btn> -->
                <q-btn color="red" flat @click="confirm_delete">Delete</q-btn>
            </q-card-actions>
        </q-card>
    </div>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import { Project } from './models';

const $q = useQuasar()

interface ProjectProp {
    project: Project
}

const props = defineProps<ProjectProp>()
const emit = defineEmits(['delete:project', 'upload:project'])

const confirm_delete = () => {
    $q.dialog({
        title: 'Confirm',
        message: `Do you want to delete ${props.project.name}?`,
        cancel: true,
        persistent: true
    }).onOk(() => {
        emit('delete:project', props.project.name)
    })
}

const confirm_upload = () => {
    $q.dialog({
        title: 'Confirm',
        message: `Do you want to upload ${props.project.name} to OpenScan Cloud?`,
        cancel: true,
        persistent: true
    }).onOk(() => {
        emit('upload:project', props.project.name)
    })
}

// const show_project = () => {
    
// }

</script>