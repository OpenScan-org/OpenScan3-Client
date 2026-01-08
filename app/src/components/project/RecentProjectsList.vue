<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useProjectsStore } from 'src/stores/projects'
import BaseList from 'src/components/base/BaseList.vue'
import BaseListItem from 'src/components/base/BaseListItem.vue'
import type { Project } from 'src/generated/api'

const router = useRouter()
const projectsStore = useProjectsStore()

const openProject = (projectName: string) => {
  router.push({ path: '/scan', query: { project: projectName } })
}

const getLastActivityDate = (project: Project) => {
  const scanTimes = Object.values(project.scans || {}).map(s => {
    const t = s.last_updated ? new Date(s.last_updated).getTime() : 0
    return isNaN(t) ? 0 : t
  })
  const lastScanTime = Math.max(0, ...scanTimes)
  
  let projectCreatedTime = 0
  if (project.created) {
    const t = new Date(project.created).getTime()
    projectCreatedTime = isNaN(t) ? 0 : t
  }
  
  const time = Math.max(lastScanTime, projectCreatedTime)
  
  if (time === 0) return ''
  return new Date(time).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>

<template>
  <q-card class="recent-projects-card" flat bordered>
    <q-card-section>
      <div class="text-h6">Recent Projects</div>
    </q-card-section>
    
    <q-card-section class="q-pt-none">
      <div v-if="projectsStore.loading" class="row justify-center q-pa-md">
        <q-spinner color="primary" size="2em" />
      </div>
      
      <div v-else-if="projectsStore.error" class="text-negative q-pa-sm text-center">
        {{ projectsStore.error }}
      </div>
      
      <BaseList v-else-if="projectsStore.recentProjects.length > 0" :bordered="false" :padding="false">
        <BaseListItem
          v-for="project in projectsStore.recentProjects"
          :key="project.name"
          :title="project.name"
          :caption="project.description || 'No description'"
          :meta="getLastActivityDate(project)"
          icon="folder"
          @click="openProject(project.name)"
        />
      </BaseList>
      
      <div v-else class="text-grey-7 q-pa-md text-center">
        <q-icon name="folder_off" size="2em" class="q-mb-sm" />
        <div>No projects found</div>
      </div>
    </q-card-section>
  </q-card>
</template>

<style scoped>
.recent-projects-card {
  background-color: rgba(255, 255, 255, 0.95);
  min-height: 200px;
}
</style>
