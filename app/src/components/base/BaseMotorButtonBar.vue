<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useDeviceStore } from 'src/stores/device'
import { useFrontendSettingsStore } from 'src/stores/frontendSettings'
import type { MovementStepLevel } from 'src/stores/frontendSettings'
import { apiClient, getApiSdk } from 'src/services/apiClient'
import homePositionClassicImage from 'src/assets/setup-wizard/home-position-classic.jpg'
import homePositionMiniImage from 'src/assets/setup-wizard/home-position-mini.jpg'
import BaseButtonIconPrimary from './BaseButtonIconPrimary.vue'
import BaseButtonIconSecondary from './BaseButtonIconSecondary.vue'
import BaseMotorManualCalibration from './BaseMotorManualCalibration.vue'
import BaseDialog from './BaseDialog.vue'

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

const MIN_ABSOLUTE_ANGLE = 0
const MAX_ABSOLUTE_ANGLE = 360

const $q = useQuasar()
const deviceStore = useDeviceStore()
const frontendSettingsStore = useFrontendSettingsStore()
const apiSdk = () => getApiSdk()
const moveBusy = ref(false)
const absoluteMoveBusy = ref(false)
const calibrateBusy = ref(false)
const manualCalibrationDialogVisible = ref(false)
const selectedStepLevel = ref<MovementStepLevel>('fine')
const absoluteAngle = ref<number | null>(null)
const absoluteAngleInputRef = ref<{ focus: () => void } | null>(null)

const baseStep = computed(() => Math.abs(props.stepDegrees))
const configuredMotorSteps = computed(() => {
  if (props.motorName === 'turntable' || props.motorName === 'rotor') {
    return frontendSettingsStore.movementStepSettings[props.motorName]
  }
  return null
})
const stepLevelOptions = computed(() => {
  const configuredSteps = configuredMotorSteps.value ?? {
    fine: baseStep.value,
    medium: baseStep.value * 2,
    coarse: baseStep.value * 5
  }

  return [
    { value: 'fine' as const, label: 'Fine', degrees: configuredSteps.fine },
    { value: 'medium' as const, label: 'Medium', degrees: configuredSteps.medium },
    { value: 'coarse' as const, label: 'Coarse', degrees: configuredSteps.coarse }
  ]
})
const selectedStepOption = computed(
  () =>
    stepLevelOptions.value.find((option) => option.value === selectedStepLevel.value) ??
    stepLevelOptions.value[0]
)
const normalizedStep = computed(() => selectedStepOption.value.degrees)
const motorDisplayName = computed(() => {
  if (props.motorName === 'turntable') return 'Turntable'
  if (props.motorName === 'rotor') return 'Rotor'
  return props.motorName.charAt(0).toUpperCase() + props.motorName.slice(1)
})

const motorStatus = computed(() => deviceStore.device?.motors?.[props.motorName] ?? null)
const currentMotorAngle = computed(() =>
  motorStatus.value ? Math.round(motorStatus.value.angle) : null
)
const motorCalibrated = computed(() => Boolean(motorStatus.value?.calibrated))
const deviceModel = computed(() => deviceStore.device?.model ?? null)
const isMiniLikeModel = computed(() => {
  const model = deviceModel.value?.toLowerCase() ?? ''
  return model.includes('mini') || model.includes('midi')
})
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
const canManualCalibrate = computed(() => props.showCalibrate && !motorEndstop.value)
const calibrateTooltip = computed(() =>
  props.calibrateTooltip ??
  (canCalibrate.value
    ? `Calibrate ${props.motorName} via endstop to re-establish the home position.`
    : `Manually align ${props.motorName} and set its current position.`)
)

const canMoveToAbsoluteAngle = computed(
  () =>
    absoluteAngle.value !== null &&
    Number.isFinite(absoluteAngle.value) &&
    absoluteAngle.value >= MIN_ABSOLUTE_ANGLE &&
    absoluteAngle.value <= MAX_ABSOLUTE_ANGLE
)
const disableMoveButtons = computed(
  () => props.disable || moveBusy.value || absoluteMoveBusy.value
)
const disableCalibrateButton = computed(
  () => props.disable || calibrateBusy.value || absoluteMoveBusy.value
)

const busy = computed(() => moveBusy.value || absoluteMoveBusy.value || calibrateBusy.value)
const manualCalibrationImageSrc = computed(() => {
  if (props.motorName !== 'rotor') {
    return null
  }
  const model = deviceModel.value?.toLowerCase() ?? ''
  if (isMiniLikeModel.value) return homePositionMiniImage
  if (!model) return null
  return homePositionClassicImage
})
const manualCalibrationHint = computed(() => {
  if (props.motorName !== 'rotor') {
    return `Use the buttons to align ${props.motorName}, then confirm the current position.`
  }
  const model = deviceModel.value?.toLowerCase() ?? ''
  if (!model) {
    return 'Use the buttons to align the rotor with the reference position, then confirm the current position.'
  }
  if (isMiniLikeModel.value) {
    return 'Ensure the camera unit is level, then confirm the current position.'
  }
  return 'Ensure the swing arm sits at 90° to floor, then confirm the current position.'
})
const manualCalibrationTargetAngle = computed(() => (props.motorName === 'rotor' ? 90 : 0))

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

async function handleMoveToAngle() {
  const targetAngle = absoluteAngle.value === null ? null : Math.round(absoluteAngle.value)
  if (
    !canMoveToAbsoluteAngle.value ||
    targetAngle === null ||
    props.disable ||
    moveBusy.value ||
    absoluteMoveBusy.value
  ) {
    return
  }

  absoluteAngle.value = targetAngle
  absoluteMoveBusy.value = true
  try {
    await deviceStore.ensureConnected()
    await apiSdk().moveMotorToAngle({
      client: apiClient,
      path: { motor_name: props.motorName },
      query: { degrees: targetAngle }
    })
    if (props.refreshAfterMove) {
      await deviceStore.refreshFromRest()
    }
    emit('moved', { degrees: targetAngle })
  } catch (error) {
    console.error('Failed to move motor to angle', props.motorName, targetAngle, error)
  } finally {
    absoluteMoveBusy.value = false
  }
}

async function handleCalibrate() {
  if (disableCalibrateButton.value) {
    return
  }
  if (!canCalibrate.value && canManualCalibrate.value) {
    manualCalibrationDialogVisible.value = true
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

function handleManualCalibrated() {
  manualCalibrationDialogVisible.value = false
  emit('calibrated')
}

function selectStepLevel(level: MovementStepLevel) {
  selectedStepLevel.value = level
}

async function focusAbsoluteAngleInput() {
  absoluteAngle.value = null
  await nextTick()
  absoluteAngleInputRef.value?.focus()
}

function roundAbsoluteAngle() {
  if (absoluteAngle.value !== null && Number.isFinite(absoluteAngle.value)) {
    absoluteAngle.value = Math.round(absoluteAngle.value)
  }
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
  <BaseButtonIconSecondary
    class="base-motor-button-bar__step-level"
    size="sm"
    no-caps
    color="primary"
    :disable="disableMoveButtons"
    :aria-label="`Change movement step, currently ${normalizedStep} degrees`"
  >
    <svg
      class="base-motor-button-bar__angle-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        v-if="selectedStepLevel === 'fine'"
        d="M 4 19 H 20 M 4 19 L 17 12 M 9 19 A 5 5 0 0 0 8.4 16.6"
      />
      <path
        v-else-if="selectedStepLevel === 'medium'"
        d="M 4 19 H 20 M 4 19 L 12 7 M 9 19 A 5 5 0 0 0 6.7 14.8"
      />
      <path
        v-else
        d="M 4 19 H 20 M 4 19 L 1 6 M 9 19 A 5 5 0 0 0 2.3 14.8"
      />
    </svg>
    <q-menu anchor="bottom middle" self="top middle" @show="focusAbsoluteAngleInput">
      <q-list dense>
        <q-item
          v-for="option in stepLevelOptions"
          :key="option.value"
          v-close-popup
          clickable
          :active="selectedStepLevel === option.value"
          active-class="text-primary"
          @click="selectStepLevel(option.value)"
        >
          <q-item-section avatar>
            <svg
              class="base-motor-button-bar__angle-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                v-if="option.value === 'fine'"
                d="M 4 19 H 20 M 4 19 L 17 12 M 9 19 A 5 5 0 0 0 8.4 16.6"
              />
              <path
                v-else-if="option.value === 'medium'"
                d="M 4 19 H 20 M 4 19 L 12 7 M 9 19 A 5 5 0 0 0 6.7 14.8"
              />
              <path
                v-else
                d="M 4 19 H 20 M 4 19 L 1 6 M 9 19 A 5 5 0 0 0 2.3 14.8"
              />
            </svg>
          </q-item-section>
          <q-item-section>{{ option.label }}</q-item-section>
          <q-item-section side>{{ option.degrees }}°</q-item-section>
        </q-item>
      </q-list>
      <q-separator />
      <div class="base-motor-button-bar__absolute-angle q-pa-sm">
        <div class="base-motor-button-bar__absolute-angle-title text-caption text-grey-7">
          Set {{ motorDisplayName.toLowerCase() }} position to
        </div>
        <div class="base-motor-button-bar__absolute-angle-controls">
          <div class="base-motor-button-bar__absolute-angle-input">
            <q-input
              ref="absoluteAngleInputRef"
              v-model.number="absoluteAngle"
              type="number"
              dense
              outlined
              label="Angle"
              :min="MIN_ABSOLUTE_ANGLE"
              :max="MAX_ABSOLUTE_ANGLE"
              step="1"
              :disable="props.disable || absoluteMoveBusy"
              @blur="roundAbsoluteAngle"
              @keyup.enter="handleMoveToAngle"
            />
            <div
              v-if="currentMotorAngle !== null"
              class="base-motor-button-bar__current-angle text-caption text-grey-7"
            >
              Current angle: {{ currentMotorAngle }}°
            </div>
          </div>
          <BaseButtonIconSecondary
            icon="check"
            size="sm"
            :loading="absoluteMoveBusy"
            :disable="props.disable || absoluteMoveBusy || !canMoveToAbsoluteAngle"
            @click="handleMoveToAngle"
          >
            <q-tooltip anchor="bottom middle" self="top middle">
              Set {{ motorDisplayName }} position to entered angle
            </q-tooltip>
          </BaseButtonIconSecondary>
        </div>
      </div>
    </q-menu>
    <q-tooltip anchor="bottom middle" self="top middle">
      Current {{ motorDisplayName }} Movement Step: {{ normalizedStep }}° ({{ selectedStepOption.label }})
    </q-tooltip>
  </BaseButtonIconSecondary>
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
  <BaseDialog
    v-model="manualCalibrationDialogVisible"
    title="Manual Calibration"
    persistent
    width="min(92vw, 480px)"
    card-class="base-motor-button-bar__manual-dialog"
  >
      <q-card-section>
        <BaseMotorManualCalibration
          :motor-name="props.motorName"
          :target-angle="manualCalibrationTargetAngle"
          :disable="props.disable"
          :image-src="manualCalibrationImageSrc"
          :image-alt="`Position reference for ${props.motorName}`"
          :hint="manualCalibrationHint"
          confirm-label="Set current position"
          @calibrated="handleManualCalibrated"
        />
      </q-card-section>
  </BaseDialog>
</template>

<style scoped>
.base-motor-button-bar__manual-dialog {
  max-height: 90vh;
}

.base-motor-button-bar__step-level {
  width: 30px;
  min-width: 30px;
  padding: 0;
}

.base-motor-button-bar__angle-icon {
  display: block;
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.base-motor-button-bar__absolute-angle {
  min-width: 190px;
}

.base-motor-button-bar__absolute-angle-title {
  margin-bottom: 4px;
}

.base-motor-button-bar__absolute-angle-controls {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 8px;
}

.base-motor-button-bar__absolute-angle-input {
  flex: 0 0 72px;
  width: 72px;
}

.base-motor-button-bar__absolute-angle-input .q-input {
  width: 100%;
}

.base-motor-button-bar__current-angle {
  margin-top: 2px;
  white-space: nowrap;
}
</style>
