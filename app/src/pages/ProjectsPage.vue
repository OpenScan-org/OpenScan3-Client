<template>
  <q-page padding>
    <div class="row q-col-gutter-lg">
      <div v-if="!isMobile" class="col-12 col-md-4 col-lg-3">
        <ProjectsList
          :projects="projects"
          :selected-project-name="selectedProjectName"
          @select:project="selectProject"
          @create:project="createProject"
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
                :projects="projects"
                :selected-project-name="selectedProjectName"
                @select:project="selectProject"
                @create:project="createProject"
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
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { apiClient } from 'src/services/apiClient'
import { getProjects, newProject, type Project, type Scan } from 'src/generated/api'
import ProjectsList from 'src/components/ProjectsList.vue'
import ProjectCard from 'src/components/ProjectCard.vue'

const $q = useQuasar()

const projects = ref<Project[]>([])
const selectedProjectName = ref<string | null>(null)
const projectsListOpen = ref(false)
const isMobile = computed(() => $q.screen.lt.md)

const selectedProject = computed(() =>
  projects.value.find((project) => project.name === selectedProjectName.value) ?? null
)

const projectScans = computed<Scan[]>(() => {
  if (!selectedProject.value) {
    return []
  }

  return Object.values(selectedProject.value.scans).sort((a, b) => a.index - b.index)
})

const selectProject = (name: string) => {
  selectedProjectName.value = name
  if (isMobile.value) {
    projectsListOpen.value = false
  }
}

const createProject = async (data: { name: string; description?: string }) => {
  try {
    await newProject({
      path: { project_name: data.name },
      query: data.description ? { project_description: data.description } : undefined,
      client: apiClient
    })
    await loadProjects()
    selectedProjectName.value = data.name
    $q.notify({ type: 'positive', message: 'Project created.' })
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Could not create project.' })
  }
}

const loadProjects = async () => {
  console.log('Loading projects...')
  try {
    const data = await getProjects({ client: apiClient })
    const list: Project[] = Object.values(data ?? {})
    console.log('Loaded projects:', list)
    projects.value = list
    if (list.length && !selectedProjectName.value) {
      selectedProjectName.value = list[0].name
    }
  } catch (error) {
    console.error('Error loading projects:', error)
    $q.notify({ type: 'negative', message: 'Could not load projects.' })
  }
}

// Setup initial load
onMounted(() => {
  loadProjects()
})
</script>
