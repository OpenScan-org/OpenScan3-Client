<template>
  <div class="q-pa-sm">
    <template v-if="!isConnected">
      <div class="q-pa-sm">
        <q-skeleton type="rect" height="80px" class="q-mb-sm" />
        <q-skeleton type="rect" height="80px" class="q-mb-sm" />
        <q-skeleton type="rect" height="80px" />
      </div>
    </template>

    <template v-else>
      <div v-if="tasks.length === 0 && cloudProjectsList.length === 0" class="text-caption text-grey-7 q-pa-sm">
        No tasks.
      </div>

      <template v-if="tasks.length > 0">
        <q-expansion-item
          v-if="activeTasks.length > 0"
          default-opened
          dense
          header-class="text-caption text-weight-bold text-grey-7"
          :label="`Active (${activeTasks.length})`"
        >
          <div class="q-gutter-y-sm q-pa-xs">
            <div
              v-for="entry in activeTasks"
              :key="entry.task.id"
              class="task-drawer-entry"
              :class="{ 'task-drawer-entry--dependent': entry.indented }"
            >
              <TaskDrawerItem :task="entry.task" />
            </div>
          </div>
        </q-expansion-item>

        <q-expansion-item
          v-if="completedTasks.length > 0"
          dense
          header-class="text-caption text-weight-bold text-grey-7"
          :label="`Completed (${completedTasks.length})`"
        >
          <div class="q-gutter-y-sm q-pa-xs">
            <div
              v-for="entry in completedTasks"
              :key="entry.task.id"
              class="task-drawer-entry"
              :class="{ 'task-drawer-entry--dependent': entry.indented }"
            >
              <TaskDrawerItem
                :task="entry.task"
                dismissable
                @dismiss="taskStore.dismissTask(entry.task.id)"
              />
            </div>
          </div>
        </q-expansion-item>

        <q-expansion-item
          v-if="failedTasks.length > 0"
          dense
          header-class="text-caption text-weight-bold text-grey-7"
          :label="`Cancelled / Error (${failedTasks.length})`"
        >
          <div class="q-gutter-y-sm q-pa-xs">
            <div
              v-for="entry in failedTasks"
              :key="entry.task.id"
              class="task-drawer-entry"
              :class="{ 'task-drawer-entry--dependent': entry.indented }"
            >
              <TaskDrawerItem
                :task="entry.task"
                dismissable
                @dismiss="taskStore.dismissTask(entry.task.id)"
              />
            </div>
          </div>
          <div class="q-mt-sm q-px-xs">
            <q-btn
              flat
              dense
              no-caps
              size="sm"
              label="Dismiss all"
              icon="done_all"
              color="grey-6"
              @click="dismissAllFailedTasks"
            />
          </div>
        </q-expansion-item>
      </template>

      <template v-if="isCloudEnabled && visibleCloudProjects.length > 0">
        <q-separator class="q-my-sm" />
        <q-expansion-item
          default-opened
          dense
          header-class="text-caption text-weight-bold text-grey-7"
          :label="`OpenScan Cloud (${visibleCloudProjects.length})`"
        >
          <div class="q-gutter-y-sm q-pa-xs">
            <CloudProjectCard
              v-for="project in visibleCloudProjects"
              :key="project.project?.name ?? project.remote_project_name ?? Math.random()"
              :status="project"
              dismissable
              @dismiss="handleDismissCloudProject(project.project?.name)"
            />
          </div>
        </q-expansion-item>
      </template>

      <template v-if="dismissedTasks.length > 0">
        <q-separator class="q-my-sm" />
        <q-expansion-item
          dense
          header-class="text-caption text-grey-7"
          :label="`Dismissed (${dismissedTasks.length})`"
        >
          <div class="q-gutter-y-sm q-mt-sm q-px-xs">
            <div v-for="task in dismissedTasks" :key="task.id" class="row items-center justify-between">
              <div class="text-caption text-grey-6">{{ getTaskTitle(task) }}</div>
              <div class="row items-center q-gutter-xs no-wrap">
                <q-btn
                  flat
                  dense
                  round
                  size="xs"
                  icon="restore"
                  color="grey-6"
                  @click="taskStore.restoreTask(task.id)"
                >
                  <q-tooltip>Restore task</q-tooltip>
                </q-btn>
                <q-btn
                  flat
                  dense
                  round
                  size="xs"
                  icon="delete_forever"
                  color="grey-6"
                  @click="taskStore.cleanupTask(task.id)"
                >
                  <q-tooltip>Cleanup task</q-tooltip>
                </q-btn>
              </div>
            </div>
          </div>
          <div class="q-mt-sm q-px-xs">
            <q-btn
              flat
              dense
              no-caps
              size="sm"
              label="Cleanup all"
              icon="delete_forever"
              color="grey-6"
              @click="taskStore.cleanupAllDismissed()"
            />
          </div>
        </q-expansion-item>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useTaskStore } from 'src/stores/tasks'
import { useCloudProjectsStore } from 'src/stores/cloudProjects'
import { useApiConfigStore } from 'src/stores/apiConfig'
import { isTaskActive, getTaskTitle } from 'src/utils/taskDisplayUtils'
import type { Task } from 'src/generated/api'
import TaskDrawerItem from './TaskDrawerItem.vue'
import CloudProjectCard from './CloudProjectCard.vue'

const taskStore = useTaskStore()
const { tasks, dismissedTasks, status } = storeToRefs(taskStore)

const cloudProjectsStore = useCloudProjectsStore()
const apiConfigStore = useApiConfigStore()
const isCloudEnabled = computed(() => apiConfigStore.cloudEnabled)
const cloudProjectsList = computed(() =>
  Object.values(cloudProjectsStore.visibleEntries).map((entry) => entry.data)
)
const visibleCloudProjects = computed(() =>
  cloudProjectsList.value.filter((project) => project.project?.uploaded !== false)
)

onMounted(() => {
  void cloudProjectsStore.fetchAll(true)
})

const isConnected = computed(() => status.value === 'open')

function handleDismissCloudProject(projectName?: string | null) {
  if (!projectName) {
    return
  }
  cloudProjectsStore.dismiss(projectName)
}

const sortByTime = (a: Task, b: Task) => {
  const aTime = new Date(a.started_at ?? a.created_at ?? 0).getTime()
  const bTime = new Date(b.started_at ?? b.created_at ?? 0).getTime()
  return bTime - aTime
}

type ActiveTaskEntry = {
  task: Task
  indented: boolean
}

const activeTaskPriority = (task: Task) => {
  if (task.status === 'running') return 0
  if (task.status === 'paused') return 1
  return 2
}

const compareActiveTasks = (a: Task, b: Task) =>
  activeTaskPriority(a) - activeTaskPriority(b) || sortByTime(a, b)

const groupTasksByDependencies = (source: Task[], compare: (a: Task, b: Task) => number): ActiveTaskEntry[] => {
  const groupedTasks = source.filter((task): task is Task & { id: string } => typeof task.id === 'string')
  const tasksById = new Map(groupedTasks.map((task) => [task.id, task]))
  const childrenByParentId = new Map<string, typeof groupedTasks>()

  for (const task of groupedTasks) {
    if (!task.depends_on || !tasksById.has(task.depends_on)) {
      continue
    }

    const children = childrenByParentId.get(task.depends_on) ?? []
    children.push(task)
    childrenByParentId.set(task.depends_on, children)
  }

  const roots = groupedTasks
    .filter((task) => !task.depends_on || !tasksById.has(task.depends_on))
    .sort(compare)
  const ordered: ActiveTaskEntry[] = []
  const visited = new Set<string>()

  const appendTask = (task: Task & { id: string }, indented: boolean) => {
    if (visited.has(task.id)) {
      return
    }

    visited.add(task.id)
    ordered.push({ task, indented })

    const children = childrenByParentId.get(task.id) ?? []
    children.sort(compare).forEach((child) => appendTask(child, true))
  }

  roots.forEach((task) => appendTask(task, false))

  // Keep malformed or cyclic dependency data visible instead of dropping it.
  groupedTasks
    .filter((task) => !visited.has(task.id))
    .sort(compare)
    .forEach((task) => appendTask(task, false))

  return ordered
}

const activeTasks = computed<ActiveTaskEntry[]>(() =>
  groupTasksByDependencies(
    tasks.value.filter((task) => isTaskActive(task)),
    compareActiveTasks
  )
)

const completedTasks = computed(() =>
  groupTasksByDependencies(
    tasks.value.filter((task) => task.status === 'completed'),
    sortByTime
  )
)

const failedTasks = computed(() =>
  groupTasksByDependencies(
    tasks.value.filter((task) => task.status === 'cancelled' || task.status === 'error' || task.status === 'interrupted'),
    sortByTime
  )
)

function dismissAllFailedTasks() {
  for (const entry of [...failedTasks.value]) {
    taskStore.dismissTask(entry.task.id)
  }
}
</script>

<style scoped>
.task-drawer-entry--dependent {
  margin-left: 8px;
}
</style>
