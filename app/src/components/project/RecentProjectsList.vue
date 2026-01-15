<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectsStore } from 'src/stores/projects'
import BaseList from 'src/components/base/BaseList.vue'
import BaseListItem from 'src/components/base/BaseListItem.vue'
import BaseButtonIconSecondary from 'src/components/base/BaseButtonIconSecondary.vue'
import BaseButtonIconPrimary from 'src/components/base/BaseButtonIconPrimary.vue'
import type { Project } from 'src/generated/api'

const router = useRouter()
const projectsStore = useProjectsStore()
const expandedDescriptions = ref<Record<string, boolean>>({})

const goToProjectView = (projectName: string) => {
  router.push({ path: '/projects', query: { project: projectName } })
}

const startNewScan = (projectName: string) => {
  router.push({ path: '/scan', query: { project: projectName } })
}

const createProjectAndStartScan = () => {
  router.push({ path: '/scan' })
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

const isDescriptionExpanded = (projectName: string) =>
  expandedDescriptions.value[projectName] === true

const shouldShowExpand = (description?: string) =>
  !!description && description.length > 140

const toggleDescription = (projectName: string) => {
  expandedDescriptions.value[projectName] = !isDescriptionExpanded(projectName)
}

const handleListItemClick = (project: Project) => {
  if (!shouldShowExpand(project.description)) {
    return
  }

  toggleDescription(project.name)
}

watch(
  () => projectsStore.recentProjects.map(project => project.name),
  names => {
    const next: Record<string, boolean> = {}
    names.forEach(name => {
      next[name] = expandedDescriptions.value[name] ?? false
    })
    expandedDescriptions.value = next
  },
  { immediate: true }
)
</script>

<template>
  <q-card class="recent-projects-card" flat bordered>
    <q-card-section>
      <div class="text-h6">
        {{ projectsStore.recentProjects.length > 0 ? 'Recent Projects' : 'No recent projects' }}
      </div>
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
          :caption="project.description || undefined"
          :meta="getLastActivityDate(project)"
          @click="handleListItemClick(project)"
        >
          <template #caption>
            <div v-if="project.description" class="description-wrapper">
              <q-item-label
                caption
                :class="{
                  'project-description': true,
                  'project-description--clamped':
                    shouldShowExpand(project.description) && !isDescriptionExpanded(project.name)
                }"
              >
                {{ project.description }}
              </q-item-label>

            </div>
          </template>

          <template #icon>
            <q-item-section avatar>
              <q-btn
                flat
                dense
                round
                color="primary"
                icon="folder"
                @click.stop="goToProjectView(project.name)"
              >
                <q-tooltip>Open project view</q-tooltip>
              </q-btn>
            </q-item-section>
          </template>

          <template #actions>
            <q-item-section side top>
              <BaseButtonIconSecondary
                icon="add"
                size="sm"
                dense
                @click.stop="startNewScan(project.name)"
              >
                <q-tooltip>Start new scan</q-tooltip>
              </BaseButtonIconSecondary>
            </q-item-section>
          </template>
        </BaseListItem>
      </BaseList>
      
      <div v-else class="empty-state text-center q-pa-lg">
        <div class="text-h6 text-dark q-mb-xs">No projects</div>
        <div class="text-body2 text-grey-7 q-mb-md">
          Create your first project and start a scan to see it here.
        </div>
        <BaseButtonIconPrimary
          icon="add"
          size="lg"
          @click="createProjectAndStartScan"
        >
          <q-tooltip>Create new project and start scan</q-tooltip>
        </BaseButtonIconPrimary>
      </div>
    </q-card-section>
  </q-card>
</template>

<style scoped>
.recent-projects-card {
  background-color: rgba(255, 255, 255, 0.95);
  min-height: 200px;
}

.description-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.project-description {
  white-space: normal;
}

.project-description--clamped {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.description-toggle {
  align-self: flex-start;
}
</style>
