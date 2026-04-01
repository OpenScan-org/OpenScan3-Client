<template>
  <div class="col-12 projects-list-container">
    <BaseSection title="Projects">
      <template #header-action>
        <q-btn color="primary" unelevated round dense icon="add" size="sm" @click="showCreateDialog = true">
          <q-tooltip>New Project</q-tooltip>
        </q-btn>
      </template>
      <template #default>
        <div class="projects-list-toolbar">
          <q-item class="projects-toolbar-row q-mb-xs" dense>
            <q-item-section side class="project-list-checkbox projects-toolbar-checkbox">
              <q-checkbox
                size="xs"
                :model-value="allProjectsSelected"
                :indeterminate="isPartialSelection"
                :disable="!props.projects.length"
                @update:model-value="toggleSelectAll"
              >
                <q-tooltip>Select all</q-tooltip>
              </q-checkbox>
            </q-item-section>

            <q-item-section class="projects-toolbar-sort">
              <div class="projects-toolbar-sort-button" :class="{ 'is-active': sortBy.field === 'name' }">
                <q-btn
                  flat
                  round
                  dense
                  icon="sort_by_alpha"
                  size="sm"
                  @click="toggleNameSort"
                  :color="sortBy.field === 'name' ? 'primary' : ''"
                >
                  <q-tooltip>Sort by name</q-tooltip>
                </q-btn>
                <div class="projects-toolbar-sort-indicator" :class="{ 'is-visible': sortBy.field === 'name' }">
                  <q-icon
                    v-if="sortBy.field === 'name'"
                    :name="sortBy.order === 'asc' ? 'arrow_upward' : 'arrow_downward'"
                    size="xs"
                    :color="sortBy.field === 'name' ? 'primary' : 'grey-7'"
                  />
                </div>
              </div>

              <div class="projects-toolbar-sort-button" :class="{ 'is-active': sortBy.field === 'date' }">
                <q-btn
                  flat
                  round
                  dense
                  icon="schedule"
                  size="sm"
                  @click="toggleDateSort"
                  :color="sortBy.field === 'date' ? 'primary' : ''"
                >
                  <q-tooltip>Sort by date</q-tooltip>
                </q-btn>
                <div class="projects-toolbar-sort-indicator" :class="{ 'is-visible': sortBy.field === 'date' }">
                  <q-icon
                    v-if="sortBy.field === 'date'"
                    :name="sortBy.order === 'asc' ? 'arrow_upward' : 'arrow_downward'"
                    size="xs"
                    :color="sortBy.field === 'date' ? 'primary' : 'grey-7'"
                  />
                </div>
              </div>
            </q-item-section>

            <q-item-section side class="projects-toolbar-actions">
              <q-btn
                v-if="selectedProjectsSet.size > 0"
                flat
                round
                dense
                size="xs"
                color="negative"
                icon="delete"
                @click="confirmDeleteSelected"
              >
                <q-tooltip>Delete {{ selectedProjectsSet.size }} selected project(s)</q-tooltip>
              </q-btn>

              <q-btn flat round dense icon="more_vert" size="sm">
                <q-menu>
                  <q-list dense style="min-width: 150px">
                    <q-item clickable v-close-popup @click="inverse_project_selection" :disable="!props.projects.length">
                      <q-item-section>Inverse selection</q-item-section>
                    </q-item>
                    <q-separator />
                    <q-item clickable v-close-popup @click="confirmDeleteEmpty" :disable="zeroScanCount === 0">
                      <q-item-section :class="zeroScanCount > 0 ? 'text-negative' : ''">
                        Delete empty projects ({{ zeroScanCount }})
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </q-item-section>
          </q-item>
        </div>
        <div class="projects-list-edge-to-edge">
          <q-separator class="q-mb-xs" />
          <q-list separator dense class="projects-list">
            <ProjectListItem
              v-for="project in sortedProjects"
              :key="project.name"
              :project="project"
              :is-selected="project.name === selected_project_name"
              :bulk-selected="selectedProjectsSet.has(project.name)"
              @select="select_project"
              @toggle:bulk-select="(checked) => toggle_project_bulk(project.name, checked)"
            />
          </q-list>
        </div>
      </template>
    </BaseSection>
    <CreateProjectDialog
      v-model="showCreateDialog"
      @create-project="create_new_project"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'
import { type Project } from 'src/generated/api'
import { apiClient, getApiSdk } from 'src/services/apiClient'
import BaseSection from 'src/components/base/BaseSection.vue'
import CreateProjectDialog from './CreateProjectDialog.vue'
import ProjectListItem from './ProjectListItem.vue'

type SortField = 'name' | 'date'
type SortOrder = 'asc' | 'desc'
type SortState = { field: SortField; order: SortOrder }

const DEFAULT_SORT: SortState = { field: 'name', order: 'asc' }

interface Props {
  projects: Project[]
  selectedProjectName?: string | null
  sortState?: SortState
  selectedProjects?: string[]
}

const props = defineProps<Props>()
const $q = useQuasar()
const apiSdk = () => getApiSdk()
const working = ref(false)

const selected_project_name = computed({
  get: () => props.selectedProjectName,
  set: (value) => emit('select:project', value)
})
const showCreateDialog = ref(false)
const sortBy = computed<SortState>({
  get: () => props.sortState ?? DEFAULT_SORT,
  set: (value) => emit('update:sort', value)
})

const sortedProjects = computed(() => {
  return [...props.projects].sort((a, b) => {
    let comparison = 0
    if (sortBy.value.field === 'name') {
      comparison = a.name.localeCompare(b.name)
    } else {
      comparison = new Date(a.created).getTime() - new Date(b.created).getTime()
    }
    return sortBy.value.order === 'asc' ? comparison : -comparison
  })
})

const emit = defineEmits([
  'select:project',
  'delete:project',
  'download:project',
  'create:project',
  'update:sort',
  'update:selected-projects',
  'bulk:deleted'
])

const selectedProjectsSet = computed(() => new Set(props.selectedProjects ?? []))
const allProjectsSelected = computed(() => props.projects.length > 0 && selectedProjectsSet.value.size === props.projects.length)
const isPartialSelection = computed(() => selectedProjectsSet.value.size > 0 && !allProjectsSelected.value)

const zeroScanProjects = computed(() => props.projects.filter((project) => !project.scans || Object.keys(project.scans).length === 0))
const zeroScanCount = computed(() => zeroScanProjects.value.length)
const selectedProjectList = computed(() => props.projects.filter((project) => selectedProjectsSet.value.has(project.name)))
const selectedCount = computed(() => selectedProjectList.value.length)

const setSort = (value: SortState) => {
  sortBy.value = value
}

const toggleDateSort = () => {
  if (sortBy.value.field === 'date') {
    setSort({ field: 'date', order: sortBy.value.order === 'asc' ? 'desc' : 'asc' })
  } else {
    setSort({ field: 'date', order: 'asc' })
  }
}

const toggleNameSort = () => {
  if (sortBy.value.field === 'name') {
    setSort({ field: 'name', order: sortBy.value.order === 'asc' ? 'desc' : 'asc' })
  } else {
    setSort({ field: 'name', order: 'asc' })
  }
}

const select_project = (name: string) => {
  selected_project_name.value = name
  emit('select:project', name)
}

const create_new_project = (data: { name: string; description?: string }) => {
  emit('create:project', data)
}

const toggle_project_bulk = (name: string, checked: boolean) => {
  const next = new Set(selectedProjectsSet.value)
  if (checked) {
    next.add(name)
  } else {
    next.delete(name)
  }
  emit('update:selected-projects', Array.from(next))
}

const select_all_projects = () => {
  emit('update:selected-projects', props.projects.map((project) => project.name))
}

const inverse_project_selection = () => {
  const next = props.projects
    .filter((project) => !selectedProjectsSet.value.has(project.name))
    .map((project) => project.name)
  emit('update:selected-projects', next)
}

const toggleSelectAll = (checked: boolean) => {
  if (checked) {
    select_all_projects()
    return
  }
  emit('update:selected-projects', [])
}

const deleteProjects = async (projectsToDelete: Project[]) => {
  if (!projectsToDelete.length) {
    return
  }
  working.value = true
  try {
    for (const project of projectsToDelete) {
      await apiSdk().deleteProject({ path: { project_name: project.name }, client: apiClient })
    }
    emit('bulk:deleted')
  } catch (error) {
    console.error('Could not complete bulk delete.', error)
    $q.notify({ type: 'negative', message: 'Failed to delete some projects' })
  } finally {
    working.value = false
  }
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

<style scoped>
.projects-list-container {
  --project-list-gap: 4px;
}


.projects-list-toolbar,
.projects-list-edge-to-edge {
  margin-left: -16px;
  margin-right: -16px;
}

.projects-list-toolbar {
  padding-left: 0;
  padding-right: 0;
}

.projects-toolbar-row {
  width: 100%;
  column-gap: var(--project-list-gap);
  padding-left: var(--project-list-gap);
  padding-right: var(--project-list-gap);
  align-items: center;
}

.projects-toolbar-checkbox {
  display: flex;
  align-items: center;
  min-width: 32px;
  padding-right: var(--project-list-gap);
}

.projects-toolbar-checkbox :deep(.q-checkbox) {
  margin: 0;
}

.projects-toolbar-sort {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  column-gap: var(--project-list-gap);
}

.projects-toolbar-sort-button {
  display: flex;
  align-items: center;
  column-gap: 2px;
}

.projects-toolbar-sort-indicator {
  min-width: 14px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.projects-toolbar-sort-indicator:not(.is-visible) {
  visibility: hidden;
}

.projects-toolbar-actions {
  display: flex;
  align-items: center;
  column-gap: var(--project-list-gap);
}

.projects-list :deep(.q-item) {
  padding-left: var(--project-list-gap);
}

.projects-list :deep(.project-list-checkbox) {
  padding-right: var(--project-list-gap);
}
</style>
