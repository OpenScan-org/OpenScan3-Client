<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useDeviceStore } from 'src/stores/device'
import { apiClient, getApiSdk } from 'src/services/apiClient'
import BaseButtonIconPrimary from './BaseButtonIconPrimary.vue'
import BaseButtonIconSecondary from './BaseButtonIconSecondary.vue'

const props = withDefaults(
  defineProps<{
    motorName: string
    stepDegrees?: number
    negativeIcon?: string
    positiveIcon?: string
    disable?: boolean
    showCalibrate?: boolean
    calibrateIcon?: string
    negativeTooltip?: string
    positiveTooltip?: string
    calibrateTooltip?: string
    refreshAfterMove?: boolean
  }>(),
  {
    stepDegrees: 10,
    negativeIcon: 'keyboard_arrow_left',
    positiveIcon: 'keyboard_arrow_right',
    disable: false,
    showCalibrate: true,
    calibrateIcon: 'restart_alt',
    refreshAfterMove: false
  }
)

const emit = defineEmits<{
  (e: 'moved', payload: { degrees: number }): void
  (e: 'calibrated'): void
  (e: 'busy-change', payload: boolean): void
}>()

const $q = useQuasar()
const deviceStore = useDeviceStore()
const apiSdk = () => getApiSdk()
const moveBusy = ref(false)
const calibrateBusy = ref(false)

const normalizedStep = computed(() => Math.abs(props.stepDegrees))

const motorStatus = computed(() => deviceStore.device?.motors?.[props.motorName] ?? null)
const motorCalibrated = computed(() => Boolean(motorStatus.value?.calibrated))
const motorEndstop = computed(() => {
  const directEndstop = (motorStatus.value as { endstop?: { assigned_motor?: string } | null } | null)?.endstop
  if (directEndstop?.assigned_motor === props.motorName) {
    return directEndstop
  }

  const endstops = deviceStore.device?.endstops ?? null
  if (!endstops) {
    return null
  }
  return Object.values(endstops).find((endstop) => endstop?.settings?.motor_name === props.motorName) ?? null
})

const canCalibrate = computed(() => props.showCalibrate && Boolean(motorEndstop.value))
const calibrateTooltip = computed(() =>
  props.calibrateTooltip ??
  (canCalibrate.value
    ? `Calibrate ${props.motorName} via endstop to re-establish the home position.`
    : `No endstop configured for ${props.motorName}. Configure one before running calibration.`)
)

const disableMoveButtons = computed(() => props.disable || moveBusy.value)
const disableCalibrateButton = computed(
  () => props.disable || calibrateBusy.value || !canCalibrate.value
)

const busy = computed(() => moveBusy.value || calibrateBusy.value)

watch(
  busy,
  (value) => {
    emit('busy-change', value)
  },
  { immediate: true }
)

async function handleMove(direction: 'negative' | 'positive') {
  if (disableMoveButtons.value) {
    return
  }

  const delta = direction === 'negative' ? -normalizedStep.value : normalizedStep.value
  moveBusy.value = true
  try {
    await deviceStore.ensureConnected()
    await apiSdk().moveMotorByDegree({
      client: apiClient,
      path: { motor_name: props.motorName },
      body: { degrees: delta }
    })
    if (props.refreshAfterMove) {
      await deviceStore.refreshFromRest()
    }
    emit('moved', { degrees: delta })
  } catch (error) {
    console.error('Failed to move motor', props.motorName, error)
  } finally {
    moveBusy.value = false
  }
}

async function handleCalibrate() {
  if (disableCalibrateButton.value) {
    return
  }
  const { proceed, force } = await resolveCalibrationIntent()
  if (!proceed) {
    return
  }
  calibrateBusy.value = true
  try {
    await deviceStore.ensureConnected()
    await apiSdk().motorEndstopCalibration({
      client: apiClient,
      path: { motor_name: props.motorName },
      query: force ? { force: true } : undefined
    })
    await deviceStore.refreshFromRest()
    emit('calibrated')
  } catch (error) {
    console.error('Failed to calibrate motor via endstop', props.motorName, error)
  } finally {
    calibrateBusy.value = false
  }
}

function resolveCalibrationIntent() {
  if (!motorCalibrated.value) {
    return Promise.resolve({ proceed: true, force: false })
  }

  return new Promise<{ proceed: boolean; force: boolean }>((resolve) => {
    $q.dialog({
      title: 'Motor already calibrated',
      message: `${props.motorName} already reports a completed calibration. Force a new endstop calibration anyway?`,
      ok: 'Force calibration',
      cancel: true,
      persistent: true
    })
      .onOk(() => resolve({ proceed: true, force: true }))
      .onCancel(() => resolve({ proceed: false, force: false }))
      .onDismiss(() => resolve({ proceed: false, force: false }))
  })
}
</script>

<template>
  <BaseButtonIconPrimary
    :icon="props.negativeIcon"
    size="sm"
    :disable="disableMoveButtons"
    @click="handleMove('negative')"
  >
    <q-tooltip anchor="bottom middle" self="top middle">
      {{ props.negativeTooltip || `Move ${props.motorName} by -${normalizedStep}°` }}
    </q-tooltip>
  </BaseButtonIconPrimary>
  <BaseButtonIconPrimary
    :icon="props.positiveIcon"
    size="sm"
    :disable="disableMoveButtons"
    @click="handleMove('positive')"
  >
    <q-tooltip anchor="bottom middle" self="top middle">
      {{ props.positiveTooltip || `Move ${props.motorName} by +${normalizedStep}°` }}
    </q-tooltip>
  </BaseButtonIconPrimary>
  <BaseButtonIconSecondary
    v-if="props.showCalibrate"
    class="base-motor-button-bar__calibrate"
    :icon="props.calibrateIcon"
    size="sm"
    :loading="calibrateBusy"
    :disable="disableCalibrateButton"
    @click="handleCalibrate"
  >
    <q-tooltip anchor="bottom middle" self="top middle">
      {{ calibrateTooltip }}
    </q-tooltip>
  </BaseButtonIconSecondary>
</template>
