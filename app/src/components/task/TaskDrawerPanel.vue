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
      <div v-if="tasks.length === 0" class="text-caption text-grey-7 q-pa-sm">
        No tasks.
      </div>

      <template v-else>
        <q-expansion-item
          v-if="activeTasks.length > 0"
          default-opened
          dense
          header-class="text-caption text-weight-bold text-grey-7"
          :label="`Active (${activeTasks.length})`"
        >
          <div class="q-gutter-y-sm q-pa-xs">
            <TaskDrawerItem
              v-for="task in activeTasks"
              :key="task.id"
              :task="task"
            />
          </div>
        </q-expansion-item>

        <q-expansion-item
          v-if="completedTasks.length > 0"
          dense
          header-class="text-caption text-weight-bold text-grey-7"
          :label="`Completed (${completedTasks.length})`"
        >
          <div class="q-gutter-y-sm q-pa-xs">
            <TaskDrawerItem
              v-for="task in completedTasks"
              :key="task.id"
              :task="task"
              dismissable
              @dismiss="taskStore.dismissTask(task.id)"
            />
          </div>
        </q-expansion-item>

        <q-expansion-item
          v-if="failedTasks.length > 0"
          dense
          header-class="text-caption text-weight-bold text-grey-7"
          :label="`Cancelled / Error (${failedTasks.length})`"
        >
          <div class="q-gutter-y-sm q-pa-xs">
            <TaskDrawerItem
              v-for="task in failedTasks"
              :key="task.id"
              :task="task"
              dismissable
              @dismiss="taskStore.dismissTask(task.id)"
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
            </div>
          </div>
          <div class="q-mt-sm q-px-xs">
            <q-btn
              flat
              dense
              no-caps
              size="sm"
              label="Clear all"
              icon="delete"
              color="grey-6"
              @click="taskStore.clearDismissed()"
            />
          </div>
        </q-expansion-item>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useTaskStore } from 'src/stores/tasks'
import { isTaskActive, getTaskTitle } from 'src/utils/taskDisplayUtils'
import type { Task } from 'src/generated/api'
import TaskDrawerItem from './TaskDrawerItem.vue'

const taskStore = useTaskStore()
const { tasks, dismissedTasks, status } = storeToRefs(taskStore)

const isConnected = computed(() => status.value === 'open')

const sortByTime = (a: Task, b: Task) => {
  const aTime = new Date(a.started_at ?? a.created_at ?? 0).getTime()
  const bTime = new Date(b.started_at ?? b.created_at ?? 0).getTime()
  return bTime - aTime
}

const activeTasks = computed(() =>
  tasks.value.filter((t) => isTaskActive(t)).sort(sortByTime)
)

const completedTasks = computed(() =>
  tasks.value.filter((t) => t.status === 'completed').sort(sortByTime)
)

const failedTasks = computed(() =>
  tasks.value.filter((t) => t.status === 'cancelled' || t.status === 'error' || t.status === 'interrupted').sort(sortByTime)
)
</script>
