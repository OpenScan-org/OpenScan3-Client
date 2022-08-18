<template>
    <q-card class="projects-card">
        <q-card-section>
            <div class="row">
                <div class="col-2">
                    <div class="text-h6">Projects</div>
                </div>
                <div class="col-10">
                    <q-btn flat round icon="refresh" @click="$emit('update:projects')" />
                </div>
            </div>
        </q-card-section>
        <q-card-section>
            <div class="row q-col-gutter-md">
                <project-card v-for="project in projects" :key="project.name" v-bind="{ project: project }"
                    @delete:project="$emit('delete:project', project.name)"
                    @upload:project="$emit('upload:project', project.name)" />
            </div>
        </q-card-section>
    </q-card>
</template>

<script setup lang="ts">
import { Project } from './models';
import ProjectCard from './ProjectCard.vue'

interface ProjectsProp {
    projects: Project[]
}

defineProps<ProjectsProp>()
const emit = defineEmits(['delete:project', 'upload:project', 'update:projects'])

</script>