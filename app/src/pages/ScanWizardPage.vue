<template>
  <BasePage class="scan-wizard-page" :center-content="false">
    <div class="scan-wizard-page__content">
      <BaseWizard
        v-model="activeStepId"
        :steps="steps"
        finish-label="Continue to scan settings"
        title="Scan wizard"
        subtitle="We'll guide you through the most important scan settings."
        @finish="continueToScanSettings"
      >
        <template #default="{ step }">
          <BaseSection
            v-if="step.id === 'project'"
            title="Choose a project"
            description="Your scan will be saved in this project. Select an existing project or create a new one."
          >
            <div class="project-selection q-gutter-y-md">
              <SelectWithButton
                v-model="selectedProjectName"
                :options="projectOptions"
                label="Project"
                emit-value
                map-options
                button-icon="add"
                button-aria-label="Create new project"
                button-tooltip="Create new project"
                @button-click="showCreateProjectDialog = true"
              />

              <div class="text-caption text-grey-7">
                {{ projectHint }}
              </div>

              <div v-if="projectsStore.loading" class="project-list-skeleton q-gutter-y-sm">
                <q-skeleton v-for="index in 3" :key="index" type="rect" height="56px" />
              </div>

              <BaseBanner v-else-if="projectsStore.error" background-class="bg-red-2" text-class="text-negative">
                {{ projectsStore.error }}
                <template #action>
                  <BaseButtonSecondary label="Retry" @click="loadProjects" />
                </template>
              </BaseBanner>

              <div v-else-if="projectsStore.projects.length" class="project-list-wrapper">
                <div class="text-subtitle2 q-mb-sm">Your projects</div>
                <BaseList>
                  <BaseListItem
                    v-for="project in projectsStore.projects"
                    :key="project.name"
                    :title="project.name"
                    :caption="project.description || `${getScanCount(project)} scan${getScanCount(project) === 1 ? '' : 's'}`"
                    icon="folder"
                    :selected="project.name === selectedProjectName"
                    @click="selectedProjectName = project.name"
                  >
                    <template #actions>
                      <q-item-section side>
                        <q-icon
                          v-if="project.name === selectedProjectName"
                          name="check_circle"
                          color="primary"
                        />
                      </q-item-section>
                    </template>
                  </BaseListItem>
                </BaseList>
              </div>

              <div v-else class="empty-project-state text-center q-pa-lg">
                <q-icon name="create_new_folder" color="primary" size="48px" />
                <div class="text-subtitle1 q-mt-sm">Create your first project</div>
                <div class="text-body2 text-grey-7 q-mb-md">
                  Projects keep scans and reconstructed models together.
                </div>
                <BaseButtonPrimary
                  icon="add"
                  label="Create project"
                  @click="showCreateProjectDialog = true"
                />
              </div>
            </div>
          </BaseSection>
        </template>

        <template #navigation="{ isLastStep, goNext }">
          <div class="row items-center justify-end q-mt-md q-px-md q-pb-md">
            <BaseButtonPrimary
              :label="isLastStep ? 'Continue to scan settings' : 'Next'"
              :disable="!selectedProjectName"
              @click="isLastStep ? continueToScanSettings() : goNext()"
            />
          </div>
        </template>
      </BaseWizard>
    </div>

    <CreateProjectDialog
      v-model="showCreateProjectDialog"
      @create-project="createProject"
    />
  </BasePage>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'

import BaseBanner from 'components/base/BaseBanner.vue'
import BaseButtonPrimary from 'components/base/BaseButtonPrimary.vue'
import BaseButtonSecondary from 'components/base/BaseButtonSecondary.vue'
import BaseList from 'components/base/BaseList.vue'
import BaseListItem from 'components/base/BaseListItem.vue'
import BasePage from 'components/base/BasePage.vue'
import BaseSection from 'components/base/BaseSection.vue'
import BaseWizard from 'components/base/BaseWizard.vue'
import CreateProjectDialog from 'components/project/CreateProjectDialog.vue'
import SelectWithButton from 'components/common/SelectWithButton.vue'
import type { Project } from 'src/generated/api'
import { useProjectsStore } from 'src/stores/projects'

const steps = [
  { id: 'project', label: 'Project', caption: 'Choose where to save the scan.' }
]

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const projectsStore = useProjectsStore()

const activeStepId = ref(steps[0].id)
const selectedProjectName = ref(typeof route.query.project === 'string' ? route.query.project : '')
const showCreateProjectDialog = ref(false)

const projectOptions = computed(() => projectsStore.projectNames)
const selectedProject = computed(() =>
  projectsStore.projects.find(project => project.name === selectedProjectName.value) ?? null
)
const projectHint = computed(() => {
  if (selectedProject.value) {
    return `Selected project: ${selectedProject.value.name}`
  }
  return projectsStore.projects.length
    ? 'Select a project from the list or use the dropdown above.'
    : 'Create a project to continue.'
})

const getScanCount = (project: Project) => Object.keys(project.scans ?? {}).length

const loadProjects = async () => {
  await projectsStore.fetchProjects()

  if (
    selectedProjectName.value &&
    !projectsStore.projects.some(project => project.name === selectedProjectName.value)
  ) {
    selectedProjectName.value = ''
  }
}

const createProject = async (data: { name: string; description?: string }) => {
  try {
    const project = await projectsStore.createProject(data.name, data.description)
    selectedProjectName.value = project.name
  } catch (error) {
    console.error('Could not create project from scan wizard.', error)
    $q.notify({ type: 'negative', message: 'Could not create the project' })
  }
}

const continueToScanSettings = () => {
  if (!selectedProjectName.value) {
    return
  }

  void router.push({
    path: '/scan',
    query: { project: selectedProjectName.value }
  })
}

onMounted(() => {
  void loadProjects()
})
</script>

<style scoped>
.scan-wizard-page__content {
  width: min(100%, 760px);
  margin: 0 auto;
  padding: 32px 24px 48px;
}

.project-list-wrapper {
  max-height: 420px;
  overflow-y: auto;
}

.project-list-skeleton :deep(.q-skeleton) {
  border-radius: 4px;
}

.empty-project-state {
  border: 1px dashed rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

@media (max-width: 599px) {
  .scan-wizard-page__content {
    padding: 20px 12px 32px;
  }
}
</style>
