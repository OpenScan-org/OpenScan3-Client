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
            dense
            label="Select all"
            :model-value="allProjectsSelected"
            :indeterminate="isPartialSelection"
            :disable="!props.projects.length"
            @update:model-value="toggleSelectAll"
          />
          <q-space />
          <q-btn flat icon="sort_by_alpha" @click="toggleNameSort" :color="sortBy.field === 'name' ? 'primary' : ''">
            <q-icon name="arrow_upward" v-if="sortBy.field === 'name' && sortBy.order === 'asc'" size="sm" class="q-ml-xs" />
            <q-icon name="arrow_downward" v-if="sortBy.field === 'name' && sortBy.order === 'desc'" size="sm" class="q-ml-xs" />
          </q-btn>
          <q-space />
          <q-btn flat icon="schedule" @click="toggleDateSort" :color="sortBy.field === 'date' ? 'primary' : ''">
            <q-icon name="arrow_upward" v-if="sortBy.field === 'date' && sortBy.order === 'asc'" size="sm" class="q-ml-xs" />
            <q-icon name="arrow_downward" v-if="sortBy.field === 'date' && sortBy.order === 'desc'" size="sm" class="q-ml-xs" />
          </q-btn>
        </div>
      </q-card-section>
      <q-separator />
      <q-list>
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
      <q-card-section class="row q-gutter-sm justify-start">
        <q-btn
          outline
          dense
          color="primary"
          label="Inverse selection"
          :disable="!props.projects.length"
          @click="inverse_project_selection"
        />
      </q-card-section>
    </q-card>
    <ProjectBulkActions
      class="q-mt-lg"
      :projects="props.projects"
      :selected-projects="props.selectedProjects"
      @deleted="handleBulkDeleted"
    />
    <CreateProjectDialog
      v-model="showCreateDialog"
      @create-project="create_new_project"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { type Project } from 'src/generated/api'
import CreateProjectDialog from './CreateProjectDialog.vue'
import ProjectListItem from './ProjectListItem.vue'
import ProjectBulkActions from './ProjectBulkActions.vue'

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

const download_project = (name: string) => {
  emit('download:project', name)
}

const delete_project = (name: string) => {
  emit('delete:project', name)
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

const handleBulkDeleted = () => {
  emit('update:selected-projects', [])
  emit('bulk:deleted')
}
</script>
