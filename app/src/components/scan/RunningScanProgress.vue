<template>
  <BaseSection :title="scanTitle" :subtitle="scanSettingsDescription">
    <div class="column items-center q-gutter-md">
      <q-circular-progress
        :value="placeholderProgress"
        :angle="180"
        size="220px"
        :thickness="0.18"
        color="primary"
        track-color="grey-3"
        class="placeholder-progress"
      >
        <div class="placeholder-progress__center">
          <div class="text-h6">{{ placeholderProgressLabel }}</div>
          <div class="text-caption text-grey-7">Placeholder</div>
        </div>
      </q-circular-progress>

      <div class="row justify-center q-gutter-sm q-mt-sm">
        <BaseButtonSecondary v-if="task.status === 'running'" icon="pause" label="Pause" @click="pause" />
        <BaseButtonSecondary
          v-if="task.status === 'paused' || task.status === 'interrupted'"
          icon="play_arrow"
          label="Resume"
          @click="resume"
        />
        <BaseButtonSecondary
          v-if="task.status !== 'completed' && task.status !== 'cancelled' && task.status !== 'error'"
          icon="cancel"
          label="Cancel"
          color="negative"
          @click="cancel"
        />
        <BaseButtonPrimary
          v-if="task.status === 'completed' || task.status === 'cancelled' || task.status === 'error'"
          icon="folder_open"
          label="Go to Project"
          @click="goToProject"
        />
        <BaseButtonSecondary
          v-if="task.status === 'completed' || task.status === 'cancelled' || task.status === 'error'"
          icon="close"
          label="Close"
          @click="close"
        />
      </div>
    </div>
  </BaseSection>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { Task } from 'src/generated/api'
import BaseButtonSecondary from 'components/base/BaseButtonSecondary.vue'
import BaseSection from 'components/base/BaseSection.vue'
import { useTaskStore } from 'src/stores/tasks'
import BaseButtonPrimary from "components/base/BaseButtonPrimary.vue";

const props = defineProps<{
  taskId: string
  initialTask?: Task | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const taskStore = useTaskStore()
const router = useRouter()
void taskStore.ensureConnected()

const task = computed(() => (taskStore.taskById(props.taskId) ?? props.initialTask)!)

const scanArgs = computed(() => {
  return (task.value.run_args as unknown as any[])[0] as any
})

const scanProjectName = computed(() => scanArgs.value.project_name as string)
const scanIndex = computed(() => scanArgs.value.index as number)

const scanTitle = computed(() => {
  return `Scan #${scanIndex.value} for ${scanProjectName.value}`
})

const scanSettingsDescription = computed(() => {
  const settings = scanArgs.value.settings as any
  const focusRange = settings.focus_range ?? ['n/a', 'n/a']
  const focusRangeLabel = `${focusRange[0]}-${focusRange[1]}`
  return [
    `Path method: ${settings.path_method}`,
    `Points: ${settings.points}`,
    `Image format: ${settings.image_format}`,
    `Min theta: ${settings.min_theta}`,
    `Max theta: ${settings.max_theta}`,
    `Optimize path: ${settings.optimize_path ? 'yes' : 'no'}`,
    `Optimization: ${settings.optimization_algorithm}`,
    `Focus stacks: ${settings.focus_stacks}`,
    `Focus range: ${focusRangeLabel}`
  ].join(' | ')
})

const progressCurrent = computed(() => task.value.progress?.current ?? 0)
const progressTotal = computed(() => task.value.progress?.total ?? 0)

const placeholderProgress = ref(0)
const placeholderTarget = ref(0)
const placeholderProgressLabel = computed(() => `${Math.round(placeholderTarget.value)}%`)
let placeholderTimer: ReturnType<typeof setInterval> | null = null

const startPlaceholder = () => {
  if (placeholderTimer) {
    return
  }
  placeholderTimer = setInterval(() => {
    const diff = placeholderTarget.value - placeholderProgress.value
    if (diff <= 0) {
      clearInterval(placeholderTimer!)
      placeholderTimer = null
      return
    }
    placeholderProgress.value += Math.min(diff, 1)
  }, 50)
}

const stopPlaceholder = () => {
  if (!placeholderTimer) {
    return
  }
  clearInterval(placeholderTimer)
  placeholderTimer = null
}

const pause = async () => {
  await taskStore.pause(props.taskId)
}

const resume = async () => {
  await taskStore.resume(props.taskId)
}

const cancel = async () => {
  await taskStore.cancel(props.taskId)
}

const close = () => {
  emit('close')
}

const goToProject = () => {
  void router.push({
    path: '/projects',
    query: { project: scanProjectName.value }
  })
}

const ensureTaskLoaded = async () => {
  await taskStore.ensureConnected()
  await taskStore.ensureTaskLoaded(props.taskId)
}

watch(
  () => props.taskId,
  async () => {
    await ensureTaskLoaded()
  }
)

onMounted(async () => {
  await ensureTaskLoaded()
})

onBeforeUnmount(() => {
  stopPlaceholder()
})

watch(
  () => task.value?.status,
  (status) => {
    if (status === 'paused' || status === 'interrupted') {
      placeholderProgress.value = placeholderTarget.value
      stopPlaceholder()
      return
    }
    if (status === 'completed' || status === 'cancelled' || status === 'error') {
      placeholderProgress.value = placeholderTarget.value
      stopPlaceholder()
      return
    }
    startPlaceholder()
  },
  { immediate: true }
)

watch(
  [progressCurrent, progressTotal],
  () => {
    if (progressTotal.value <= 0) {
      placeholderTarget.value = 0
      placeholderProgress.value = 0
      return
    }

    placeholderTarget.value = Math.max(0, Math.min(100, (progressCurrent.value / progressTotal.value) * 100))

    if (placeholderProgress.value > placeholderTarget.value) {
      placeholderProgress.value = placeholderTarget.value
    }

    const status = task.value.status
    if (status === 'paused' || status === 'interrupted' || status === 'completed' || status === 'cancelled' || status === 'error') {
      placeholderProgress.value = placeholderTarget.value
      stopPlaceholder()
      return
    }
    startPlaceholder()
  },
  { immediate: true }
)
</script>

<style scoped>
.placeholder-progress {
  position: relative;
}

.placeholder-progress__center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  text-align: center;
}
</style>
