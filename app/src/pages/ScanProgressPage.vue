<template>
  <q-page class="q-pa-md">
    <template v-if="showDisconnectedSkeleton">
      <div class="row q-col-gutter-md">
        <div class="col-12 col-md-6">
          <q-card flat bordered class="q-pa-lg q-gutter-y-sm">
            <q-skeleton type="text" width="50%" />
            <q-skeleton type="text" width="70%" />
            <q-skeleton type="circle" size="220px" class="self-center" />
            <div class="row q-col-gutter-sm q-mt-sm">
              <div class="col-6" v-for="index in 2" :key="`primary-${index}`">
                <q-skeleton type="QBtn" />
              </div>
              <div class="col-6" v-for="index in 2" :key="`secondary-${index}`">
                <q-skeleton type="QBtn" />
              </div>
            </div>
          </q-card>
        </div>
        <div class="col-12 col-md-6">
          <q-card flat bordered class="q-pa-lg q-gutter-y-sm">
            <q-skeleton v-for="index in 6" :key="`details-${index}`" type="text" width="100%" />
            <q-skeleton type="rect" height="160px" />
          </q-card>
        </div>
      </div>
    </template>
    <template v-else>
      <RunningScanProgress v-if="resolvedTask" :task-id="resolvedTask.id as string" :initial-task="resolvedTask" @close="onClose" />
      <RunningScanDetails v-if="resolvedTask" :task-id="resolvedTask.id as string" :initial-task="resolvedTask" />
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import RunningScanDetails from 'components/scan/RunningScanDetails.vue'
import RunningScanProgress from 'components/scan/RunningScanProgress.vue'
import { useDeviceStore } from 'src/stores/device'
import { useTaskStore } from 'src/stores/tasks'

const route = useRoute()
const router = useRouter()
const taskStore = useTaskStore()
const deviceStore = useDeviceStore()

const routeTaskId = computed(() => route.params.taskId as string | undefined)

const activeScanTaskId = computed(() => taskStore.activeScanTaskId)

const resolvedTaskId = computed(() => routeTaskId.value ?? activeScanTaskId.value)
const resolvedTask = computed(() => (resolvedTaskId.value ? taskStore.taskById(resolvedTaskId.value) : null))
const showDisconnectedSkeleton = computed(() => deviceStore.hasConnectionIssue)

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
