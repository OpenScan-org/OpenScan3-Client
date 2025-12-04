<template>
  <q-card class="q-mb-lg">
    <q-card-section>
      <div class="text-subtitle1">Project bulk actions</div>
    </q-card-section>
    <q-separator inset />
    <q-card-section>
      <div class="row q-col-gutter-sm">
        <div class="col-12 col-sm-6">
          <q-btn
            color="negative"
            class="full-width"
            unelevated
            :disable="!selectedCount || working"
            :label="selectedCount ? `Delete ${selectedCount} selected` : 'Delete selected projects'"
            @click="confirmDeleteSelected"
          />
        </div>
        <div class="col-12 col-sm-6">
          <q-btn
            class="full-width"
            unelevated
            :disable="!zeroScanCount || working"
            :label="`Delete ${zeroScanCount} empty project${zeroScanCount === 1 ? '' : 's'}`"
            @click="confirmDeleteEmpty"
          />
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'
import { deleteProject, type Project } from 'src/generated/api'
import { apiClient } from 'src/services/apiClient'

interface Props {
  projects: Project[]
  selectedProjects?: string[]
}

const props = defineProps<Props>()
const emit = defineEmits(['deleted'])
const $q = useQuasar()
const working = ref(false)

const zeroScanProjects = computed(() => props.projects.filter((project) => !project.scans || Object.keys(project.scans).length === 0))
const zeroScanCount = computed(() => zeroScanProjects.value.length)
const selectedSet = computed(() => new Set(props.selectedProjects ?? []))
const selectedProjectList = computed(() => props.projects.filter((project) => selectedSet.value.has(project.name)))
const selectedCount = computed(() => selectedProjectList.value.length)

const deleteProjects = async (projectsToDelete: Project[]) => {
  if (!projectsToDelete.length) {
    return
  }
  working.value = true
  try {
    for (const project of projectsToDelete) {
      await deleteProject({ path: { project_name: project.name }, client: apiClient })
    }
    $q.notify({ type: 'positive', message: `Deleted ${projectsToDelete.length} project${projectsToDelete.length === 1 ? '' : 's'}.` })
    emit('deleted')
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Could not complete bulk delete.' })
  } finally {
    working.value = false
  }
}

const confirmDeleteAll = () => {
  $q.dialog({
    title: 'Delete all projects',
    message: `This will delete ${props.projects.length} project${props.projects.length === 1 ? '' : 's'}. Continue?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    await deleteProjects(props.projects)
  })
}

const confirmDeleteEmpty = () => {
  $q.dialog({
    title: 'Delete empty projects',
    message: `Delete ${zeroScanCount.value} project${zeroScanCount.value === 1 ? '' : 's'} without scans?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    await deleteProjects(zeroScanProjects.value)
  })
}

const confirmDeleteSelected = () => {
  if (!selectedCount.value) {
    return
  }
  $q.dialog({
    title: 'Delete selected projects',
    message: `Delete ${selectedCount.value} selected project${selectedCount.value === 1 ? '' : 's'}?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    await deleteProjects(selectedProjectList.value)
  })
}
</script>
