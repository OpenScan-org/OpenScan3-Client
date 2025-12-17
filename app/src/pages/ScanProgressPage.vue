<template>
  <q-page class="q-pa-md">
    <ScanRunningOverlay
      v-if="resolvedTask"
      :task-id="resolvedTaskId"
      :project-name="resolvedProjectName"
      :camera-name="resolvedCameraName"
      :initial-task="resolvedTask"
      @close="onClose"
    />
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ScanRunningOverlay from 'components/scan/ScanRunningOverlay.vue'
import { useTaskStore } from 'src/stores/tasks'

const route = useRoute()
const router = useRouter()
const taskStore = useTaskStore()

const routeTaskId = computed(() => route.params.taskId as string | undefined)

const activeScanTaskId = computed(() => {
  const tasks = taskStore.taskList

  const running = tasks.find((task) => task.task_type === 'scan_task' && task.status === 'running')
  if (running?.id) {
    return running.id
  }

  const pendingCandidates = tasks
    .filter((task) => task.task_type === 'scan_task' && task.status === 'pending')
    .slice()
    .sort((a, b) => {
      const aTime = new Date(a.started_at ?? a.created_at ?? 0).getTime()
      const bTime = new Date(b.started_at ?? b.created_at ?? 0).getTime()
      return bTime - aTime
    })

  if (pendingCandidates[0]?.id) {
    return pendingCandidates[0].id
  }

  const pausedCandidates = tasks
    .filter((task) => task.task_type === 'scan_task' && (task.status === 'paused' || task.status === 'interrupted'))
    .slice()
    .sort((a, b) => {
      const aTime = new Date(a.started_at ?? a.created_at ?? 0).getTime()
      const bTime = new Date(b.started_at ?? b.created_at ?? 0).getTime()
      return bTime - aTime
    })

  return pausedCandidates[0]?.id ?? null
})

const resolvedTaskId = computed(() => routeTaskId.value ?? activeScanTaskId.value)
const resolvedTask = computed(() => (resolvedTaskId.value ? taskStore.taskById(resolvedTaskId.value) : null))

const resolvedProjectName = computed(() => {
  const task = resolvedTask.value
  const args = (task?.run_args as unknown as any[]) ?? []
  const firstArg = args[0] as any
  return (firstArg?.project_name as string) ?? 'Unknown project'
})

const resolvedCameraName = computed(() => {
  const task = resolvedTask.value
  const args = (task?.run_args as unknown as any[]) ?? []
  const firstArg = args[0] as any
  return (firstArg?.camera_name as string) ?? undefined
})

const ensureTask = async () => {
  await taskStore.ensureConnected()

  if (!routeTaskId.value) {
    if (activeScanTaskId.value) {
      await router.replace(`/scan/progress/${activeScanTaskId.value}`)
      return
    }

    await router.replace('/scan')
    return
  }

  await taskStore.ensureTaskLoaded(routeTaskId.value)
}

const onClose = async () => {
  await router.push('/scan')
}

onMounted(async () => {
  await ensureTask()
})

watch(routeTaskId, async () => {
  await ensureTask()
})
</script>
