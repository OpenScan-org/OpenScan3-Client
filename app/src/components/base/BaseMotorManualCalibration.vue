<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useDeviceStore } from 'src/stores/device'
import { apiClient, getApiSdk } from 'src/services/apiClient'
import BaseButtonPrimary from './BaseButtonPrimary.vue'
import BaseButtonSecondary from './BaseButtonSecondary.vue'

const props = withDefaults(
  defineProps<{
    motorName: string
    targetAngle?: number
    disable?: boolean
    imageSrc?: string | null
    imageAlt?: string
    hint?: string
    confirmLabel?: string
    showConfirmButton?: boolean
  }>(),
  {
    targetAngle: 90,
    disable: false,
    imageSrc: null,
    imageAlt: 'Motor position reference',
    hint: 'Use the buttons to align the motor, then confirm the current position.',
    confirmLabel: 'Set current position',
    showConfirmButton: true
  }
)

const emit = defineEmits<{
  (e: 'calibrated'): void
}>()

const $q = useQuasar()
const deviceStore = useDeviceStore()
const apiSdk = () => getApiSdk()
const moveAction = ref<string | null>(null)
const overrideBusy = ref(false)

const isControlDisabled = computed(
  () => props.disable || moveAction.value !== null || overrideBusy.value || deviceStore.status !== 'open'
)
const formattedTargetAngle = computed(() => `${props.targetAngle.toFixed(0)}°`)

async function handleMove(degrees: number, actionKey: string) {
  if (isControlDisabled.value) return

  moveAction.value = actionKey
  try {
    await deviceStore.ensureConnected()
    await apiSdk().moveMotorByDegree<true>({
      client: apiClient,
      throwOnError: true,
      path: { motor_name: props.motorName },
      body: { degrees }
    })
  } catch (error) {
    console.error('Failed to move motor during manual calibration', props.motorName, error)
    $q.notify({ type: 'negative', message: 'Failed to move motor' })
  } finally {
    moveAction.value = null
  }
}

async function confirmCalibration() {
  if (isControlDisabled.value) return false

  overrideBusy.value = true
  try {
    await deviceStore.ensureConnected()
    await apiSdk().overrideMotorAngle<true>({
      client: apiClient,
      throwOnError: true,
      path: { motor_name: props.motorName },
      query: { angle: props.targetAngle }
    })
    await deviceStore.refreshFromRest()
    emit('calibrated')
    return true
  } catch (error) {
    console.error('Failed to override motor angle', props.motorName, error)
    $q.notify({ type: 'negative', message: 'Manual calibration failed' })
    return false
  } finally {
    overrideBusy.value = false
  }
}

defineExpose({ confirmCalibration })
</script>

<template>
  <div class="base-motor-manual-calibration">
    <div v-if="props.imageSrc" class="base-motor-manual-calibration__visual">
      <img :src="props.imageSrc" :alt="props.imageAlt" class="base-motor-manual-calibration__image" />
    </div>

    <div>
      <div class="text-subtitle2 text-center q-mb-sm">Fine adjustments</div>
      <div class="base-motor-manual-calibration__row">
        <BaseButtonSecondary label="Up 5°" icon="north" :loading="moveAction === 'up-5'" :disable="isControlDisabled" @click="handleMove(-5, 'up-5')" />
        <BaseButtonSecondary label="Up 1°" icon="north" :loading="moveAction === 'up-1'" :disable="isControlDisabled" @click="handleMove(-1, 'up-1')" />
        <BaseButtonSecondary label="Down 1°" icon="south" :loading="moveAction === 'down-1'" :disable="isControlDisabled" @click="handleMove(1, 'down-1')" />
        <BaseButtonSecondary label="Down 5°" icon="south" :loading="moveAction === 'down-5'" :disable="isControlDisabled" @click="handleMove(5, 'down-5')" />
      </div>
      <div class="text-body2 text-center text-grey-7 q-mt-md">{{ props.hint }}</div>
    </div>

    <BaseButtonPrimary
      v-if="props.showConfirmButton"
      class="base-motor-manual-calibration__confirm"
      icon="done"
      :label="props.confirmLabel"
      :loading="overrideBusy"
      :disable="isControlDisabled"
      @click="confirmCalibration"
    >
      <q-tooltip>Set {{ props.motorName }} current position to {{ formattedTargetAngle }}.</q-tooltip>
    </BaseButtonPrimary>
  </div>
</template>

<style scoped>
.base-motor-manual-calibration {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.base-motor-manual-calibration__visual {
  display: flex;
  justify-content: center;
}

.base-motor-manual-calibration__image {
  display: block;
  width: 100%;
  max-width: 360px;
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.base-motor-manual-calibration__row {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
}

.base-motor-manual-calibration__confirm {
  align-self: stretch;
}
</style>
