<template>
  <q-page padding class="projects-page">
    <BlurredSnapshotBackground :src="projectBackgroundUrl" alt="Project thumbnail background" />
    <template v-if="showDisconnectedSkeleton">
      <div class="row q-col-gutter-lg">
        <div class="col-12 col-md-4 col-lg-3">
          <q-card flat bordered class="q-pa-md">
            <div class="q-gutter-y-sm">
              <q-skeleton type="text" width="40%" />
              <q-skeleton type="text" width="60%" />
              <q-skeleton type="rect" height="24px" v-for="index in 5" :key="`list-${index}`" />
              <q-skeleton type="QBtn" class="q-mt-sm" />
            </div>
          </q-card>
        </div>
        <div class="col-12 col-md-8 col-lg-9">
          <q-card flat bordered class="q-pa-md">
            <div class="q-gutter-y-sm">
              <q-skeleton type="text" width="30%" />
              <q-skeleton type="text" width="50%" />
              <q-skeleton type="rect" height="180px" />
              <q-skeleton type="text" width="45%" />
              <q-skeleton type="rect" height="48px" />
            </div>
          </q-card>
        </div>
      </div>
    </template>
    <template v-else>
      <div class="row q-col-gutter-lg">
        <div v-if="!isMobile" class="col-12 col-md-4 col-lg-3">
          <ProjectsList
            :projects="projectsStore.projects"
            :selected-project-name="selectedProjectName"
            :sort-state="sortState"
            :selected-projects="selectedProjects"
            @select:project="selectProject"
            @create:project="createProject"
            @update:sort="updateSortState"
            @update:selected-projects="setSelectedProjects"
            @bulk:deleted="handleBulkDeleted"
          />
        </div>
        <div class="col-12 col-md-8 col-lg-9">
          <div v-if="isMobile" class="q-mb-md">
            <q-btn
              outline
              color="primary"
              icon="folder"
              label="Projects"
              class="full-width"
              @click="projectsListOpen = !projectsListOpen"
            />
            <q-slide-transition>
              <div v-show="projectsListOpen" class="q-mt-md">
                <ProjectsList
                  :projects="projectsStore.projects"
                  :selected-project-name="selectedProjectName"
                  :sort-state="sortState"
                  :selected-projects="selectedProjects"
                  @select:project="selectProject"
                  @create:project="createProject"
                  @update:sort="updateSortState"
                  @update:selected-projects="setSelectedProjects"
                  @bulk:deleted="handleBulkDeleted"
                />
              </div>
            </q-slide-transition>
          </div>
          <ProjectCard
            v-if="selectedProject"
            :project="selectedProject"
            :detail="true"
            :project-scans="projectScans"
            @reload="loadProjects"
          />
        </div>
      </div>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { apiClient, getApiBaseUrl } from 'src/services/apiClient'
import { newProject, type Project, type Scan } from 'src/generated/api'
import ProjectsList from 'src/components/project/ProjectsList.vue'
import ProjectCard from 'src/components/project/ProjectCard.vue'
import { useProjectsStore } from 'src/stores/projects'
import { useDeviceStore } from 'src/stores/device'
import BlurredSnapshotBackground from 'components/background/BlurredSnapshotBackground.vue'
const $q = useQuasar()
const projectsStore = useProjectsStore()
const route = useRoute()
const router = useRouter()
const deviceStore = useDeviceStore()

const getProjectFromRoute = () => (typeof route.query.project === 'string' ? route.query.project : null)

const SORT_STORAGE_KEY = 'openscan.projectSort'

type SortField = 'name' | 'date'
type SortOrder = 'asc' | 'desc'
type SortState = { field: SortField; order: SortOrder }

const DEFAULT_SORT: SortState = { field: 'name', order: 'asc' }

const readStoredSort = (): SortState => {
  try {
    const raw = localStorage.getItem(SORT_STORAGE_KEY)
    if (!raw) {
      return DEFAULT_SORT
    }
    const parsed = JSON.parse(raw) as Partial<SortState>
    if (parsed.field === 'date' || parsed.field === 'name') {
      if (parsed.order === 'asc' || parsed.order === 'desc') {
        return parsed as SortState
      }
    }
    return DEFAULT_SORT
  } catch {
    return DEFAULT_SORT
  }
}

const writeStoredSort = (value: SortState) => {
  try {
    localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(value))
  } catch { /* ignore storage errors */ }
}

const selectedProjectName = ref<string | null>(getProjectFromRoute())
const sortState = ref<SortState>(readStoredSort())
const projectsListOpen = ref(false)
const isMobile = computed(() => $q.screen.lt.md)
const selectedProjects = ref<string[]>([])
const showDisconnectedSkeleton = computed(() => deviceStore.hasConnectionIssue)

const selectedProject = computed(() =>
  projectsStore.projects.find((project) => project.name === selectedProjectName.value) ?? null
)

const projectBackgroundUrl = computed(() =>
  selectedProject.value
    ? `${getApiBaseUrl()}projects/${encodeURIComponent(selectedProject.value.name)}/thumbnail`
    : null
)

const projectScans = computed<Scan[]>(() => {
  if (!selectedProject.value) {
    return []
  }

  return Object.values(selectedProject.value.scans).sort((a, b) => a.index - b.index)
})

const updateRouteProject = (name: string | null) => {
  const currentQuery = { ...route.query }
  const currentValue = typeof currentQuery.project === 'string' ? currentQuery.project : null

  if (name && currentValue === name) {
    return
  }

  if (name) {
    currentQuery.project = name
    void router.replace({ query: currentQuery })
    return
  }

  if ('project' in currentQuery) {
    delete currentQuery.project
    void router.replace({ query: currentQuery })
  }
}

const selectProject = (name: string) => {
  selectedProjectName.value = name
  updateRouteProject(name)
  if (isMobile.value) {
    projectsListOpen.value = false
  }
}

const createProject = async (data: { name: string; description?: string }) => {
  try {
    await projectsStore.createProject(data.name, data.description)
    selectedProjectName.value = data.name
    updateRouteProject(data.name)
  } catch (error) {
    console.error('Could not create project.', error)
  }
}

const loadProjects = async () => {
  await projectsStore.fetchProjects()
  // prune selected projects that no longer exist
  selectedProjects.value = selectedProjects.value.filter((name) =>
    projectsStore.projects.some((project) => project.name === name)
  )
  const routeProject = getProjectFromRoute()
  if (routeProject && projectsStore.projects.some((project) => project.name === routeProject)) {
    selectedProjectName.value = routeProject
    return
  }

  const currentSelection = selectedProjectName.value
  const stillExists =
    currentSelection && projectsStore.projects.some((project) => project.name === currentSelection)

  if (!stillExists) {
    selectedProjectName.value = null
  }

}

const updateSortState = (value: SortState) => {
  sortState.value = value
  writeStoredSort(value)
}

const setSelectedProjects = (names: string[]) => {
  selectedProjects.value = names
}

const handleBulkDeleted = async () => {
  selectedProjects.value = []
  await loadProjects()
}

// Setup initial load
onMounted(() => {
  loadProjects()
})

watch(
  () => route.query.project,
  (projectParam) => {
    const value = typeof projectParam === 'string' ? projectParam : null
    if (value !== selectedProjectName.value) {
      selectedProjectName.value = value
    }
  }
)
</script>

<style scoped>
.projects-page {
  position: relative;
  overflow: hidden;
}
</style>
