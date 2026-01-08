<template>
  <div class="col-12">
    <q-card>
      <q-card-section>
        <div class="row items-center justify-between q-mb-sm">
          <div class="text-h5">Projects</div>
          <q-btn color="primary" unelevated label="New Project" @click="showCreateDialog = true" />
        </div>
        <q-separator class="q-mt-sm q-mb-sm" />
        <div class="row items-center">
          <q-checkbox
            size="sm"
            class="q-ml-xs"
            :model-value="allProjectsSelected"
            :indeterminate="isPartialSelection"
            :disable="!props.projects.length"
            @update:model-value="toggleSelectAll"
          >
            <q-tooltip>Select all</q-tooltip>
          </q-checkbox>

          <q-separator vertical class="q-mx-md" v-if="selectedProjectsSet.size > 0" />

          <q-btn
            v-if="selectedProjectsSet.size > 0"
            flat
            round
            dense
            color="negative"
            icon="delete"
            @click="confirmDeleteSelected"
          >
            <q-tooltip>Delete {{ selectedProjectsSet.size }} selected project(s)</q-tooltip>
          </q-btn>

          <q-space />

          <div class="row q-gutter-sm">
            <q-btn flat round dense icon="sort_by_alpha" @click="toggleNameSort" :color="sortBy.field === 'name' ? 'primary' : ''">
              <q-icon name="arrow_upward" v-if="sortBy.field === 'name' && sortBy.order === 'asc'" size="xs" class="q-ml-xs" />
              <q-icon name="arrow_downward" v-if="sortBy.field === 'name' && sortBy.order === 'desc'" size="xs" class="q-ml-xs" />
              <q-tooltip>Sort by name</q-tooltip>
            </q-btn>

            <q-btn flat round dense icon="schedule" @click="toggleDateSort" :color="sortBy.field === 'date' ? 'primary' : ''">
              <q-icon name="arrow_upward" v-if="sortBy.field === 'date' && sortBy.order === 'asc'" size="xs" class="q-ml-xs" />
              <q-icon name="arrow_downward" v-if="sortBy.field === 'date' && sortBy.order === 'desc'" size="xs" class="q-ml-xs" />
              <q-tooltip>Sort by date</q-tooltip>
            </q-btn>
          </div>

          <q-space />

          <q-btn flat round dense icon="more_vert" class="q-ml-sm">
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
        </div>
      </q-card-section>
      <q-separator />
      <q-list separator>
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
    </q-card>
    <CreateProjectDialog
      v-model="showCreateDialog"
      @create-project="create_new_project"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'
import { deleteProject, type Project } from 'src/generated/api'
import { apiClient } from 'src/services/apiClient'
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
      await deleteProject({ path: { project_name: project.name }, client: apiClient })
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
