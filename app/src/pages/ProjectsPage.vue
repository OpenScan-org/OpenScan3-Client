<template>
  <q-page padding>
    <div class="row q-col-gutter-lg">
      <div v-if="!isMobile" class="col-12 col-md-4 col-lg-3">
        <ProjectsList
          :projects="projectsStore.projects"
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
                :projects="projectsStore.projects"
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
import { newProject, type Project, type Scan } from 'src/generated/api'
import ProjectsList from 'src/components/ProjectsList.vue'
import ProjectCard from 'src/components/ProjectCard.vue'
import { useProjectsStore } from 'src/stores/projects'

const $q = useQuasar()

const projectsStore = useProjectsStore()

const selectedProjectName = ref<string | null>(null)
const projectsListOpen = ref(false)
const isMobile = computed(() => $q.screen.lt.md)

const selectedProject = computed(() =>
  projectsStore.projects.find((project) => project.name === selectedProjectName.value) ?? null
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
    await projectsStore.createProject(data.name, data.description)
    selectedProjectName.value = data.name
    $q.notify({ type: 'positive', message: 'Project created.' })
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Could not create project.' })
  }
}

const loadProjects = async () => {
  await projectsStore.fetchProjects()
  if (projectsStore.projects.length && !selectedProjectName.value) {
    selectedProjectName.value = projectsStore.projects[0].name
  }
}

// Setup initial load
onMounted(() => {
  loadProjects()
})
</script>
