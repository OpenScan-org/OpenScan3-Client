<template>
  <q-page padding>
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
        <div v-else class="text-secondary">Please choose a project.</div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { apiClient } from 'src/services/apiClient'
import { newProject, type Project, type Scan } from 'src/generated/api'
import ProjectsList from 'src/components/ProjectsList.vue'
import ProjectCard from 'src/components/ProjectCard.vue'
import { useProjectsStore } from 'src/stores/projects'
const $q = useQuasar()
const projectsStore = useProjectsStore()
const route = useRoute()
const router = useRouter()

const getProjectFromRoute = () => (typeof route.query.project === 'string' ? route.query.project : null)

const PROJECT_STORAGE_KEY = 'openscan.selectedProject'

const readStoredProject = () => {
  try {
    return localStorage.getItem(PROJECT_STORAGE_KEY)
  } catch {
    return null
  }
}

const writeStoredProject = (name: string | null) => {
  try {
    if (name) {
      localStorage.setItem(PROJECT_STORAGE_KEY, name)
    } else {
      localStorage.removeItem(PROJECT_STORAGE_KEY)
    }
  } catch {}
}

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
  } catch {}
}

const selectedProjectName = ref<string | null>(getProjectFromRoute() ?? readStoredProject())
const sortState = ref<SortState>(readStoredSort())
const projectsListOpen = ref(false)
const isMobile = computed(() => $q.screen.lt.md)
const selectedProjects = ref<string[]>([])

const selectedProject = computed(() =>
  projectsStore.projects.find((project) => project.name === selectedProjectName.value) ?? null
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
  writeStoredProject(name)
  if (isMobile.value) {
    projectsListOpen.value = false
  }
}

const createProject = async (data: { name: string; description?: string }) => {
  try {
    await projectsStore.createProject(data.name, data.description)
    selectedProjectName.value = data.name
    updateRouteProject(data.name)
    writeStoredProject(data.name)
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
    writeStoredProject(routeProject)
    return
  }

  const storedProject = readStoredProject()
  if (storedProject && projectsStore.projects.some((project) => project.name === storedProject)) {
    selectedProjectName.value = storedProject
    updateRouteProject(storedProject)
    return
  }

  if (projectsStore.projects.length && !selectedProjectName.value) {
    const fallback = projectsStore.projects[0].name
    selectedProjectName.value = fallback
    updateRouteProject(fallback)
    writeStoredProject(fallback)
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
