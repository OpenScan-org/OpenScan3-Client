<template>
  <div class="row q-col-gutter-sm">
    <div class="col-12 col-md-4">
      <BaseSectionGroup>
        <ScanQualitySection
          v-model:points="points"
          :points-tooltip="scanSettingDescription('points')"
        />

        <ScanAdvancedSection
          v-model:imageFormat="imageFormat"
          :image-formats="imageFormats"
          v-model:pathMethod="pathMethod"
          :path-methods="pathMethods"
          :path-method-disabled="pathMethodDisabled"
          :path-method-disabled-message="pathMethodDisabledMessage"
          v-model:minTheta="minTheta"
          v-model:maxTheta="maxTheta"
          v-model:minPhi="minPhi"
          v-model:maxPhi="maxPhi"
          v-model:optimizePath="optimizePath"
          v-model:optimizationAlgorithm="optimizationAlgorithm"
          :image-format-description="scanSettingDescription('image_format')"
          :path-method-description="scanSettingDescription('path_method')"
          :min-theta-description="scanSettingDescription('min_theta')"
          :max-theta-description="scanSettingDescription('max_theta')"
          :min-phi-description="scanSettingDescription('min_phi')"
          :max-phi-description="scanSettingDescription('max_phi')"
          :optimize-path-description="scanSettingDescription('optimize_path')"
          :optimization-algorithm-description="scanSettingDescription('optimization_algorithm')"
        />
      </BaseSectionGroup>
    </div>

    <div class="col-12 col-md-4">
      <ScanFocusSection
        v-model:focusMode="focusModeModel"
        v-model:manualFocusValue="manualFocusValue"
        v-model:focusStacks="focusStacks"
        v-model:focusRange="focusRange"
        :camera-name="cameraName"
        :camera-label="camera?.label ?? cameraName ?? ''"
        :af-description="cameraSettingDescription('AF')"
        :manual-focus-description="cameraSettingDescription('manual_focus')"
        :focus-stacks-description="scanSettingDescription('focus_stacks')"
        :focus-range-description="scanSettingDescription('focus_range')"
        @manual-focus-input="handleManualFocusInput"
      />
    </div>

    <ScanPictureQualitySection
      ref="scanPictureQualitySectionRef"
      :camera="camera"
      :camera-options="cameraOptions"
      v-model:selected-camera-name="selectedCameraNameModel"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { debounce } from 'quasar'

import BaseSectionGroup from 'components/base/BaseSectionGroup.vue'
import ScanQualitySection from 'components/scan/ScanQualitySection.vue'
import ScanFocusSection from 'components/scan/ScanFocusSection.vue'
import ScanAdvancedSection from 'components/scan/ScanAdvancedSection.vue'
import ScanPictureQualitySection from 'components/scan/ScanPictureQualitySection.vue'
import { type CameraSettings as CameraSettingsModel, type ScanSetting } from 'src/generated/api'
import { apiClient, getApiSdk } from 'src/services/apiClient'
import { useDeviceStore } from 'src/stores/device'
import { fieldDescriptions, getFieldDescription } from 'src/generated/api/fieldDescriptions'
import { fieldDefaults } from 'src/generated/api/fieldDefaults'

type CameraOption = { label: string; value: string; orientationFlag?: number | null }

const props = defineProps<{
  cameraName?: string | null
  camera?: {
    label: string
    value: string
    orientationFlag?: number | null
  } | null
  cameraOptions?: CameraOption[]
  selectedCameraName?: string
}>()

const emit = defineEmits<{
  (e: 'update:selectedCameraName', value: string): void
  (e: 'update:photoCount', value: number): void
  (e: 'scan-settings-change', value: ScanSetting): void
  (e: 'focus-mode-change', value: FocusMode): void
}>()

const deviceStore = useDeviceStore()
const apiSdk = () => getApiSdk()
void deviceStore.ensureConnected()

const pathMethods = [
  { label: 'Fibonacci', value: 'fibonacci' },
  { label: 'Spiral', value: 'spiral' }
]

const pathMethodDisabled = true
const pathMethodDisabledMessage = 'Only the Fibonacci scan path is supported right now.'

const imageFormats = ['jpeg', 'dng', 'rgb_array', 'yuv_array']

const pathMethod = ref(pathMethods[0])
const points = ref(130)
const imageFormat = ref(imageFormats[0])
const minTheta = ref<number>(12.0)
const maxTheta = ref<number>(125.0)
const minPhi = ref<number | null>(null)
const maxPhi = ref<number | null>(null)
const optimizePath = ref(true)
const optimizationAlgorithm = ref('nearest_neighbor')
const focusStacks = ref<number>(2)
const enableFocusStacking = ref(false)
const focusRange = ref({ min: 10.0, max: 15.0 })

type FocusMode = 'autofocus' | 'manual' | 'stacking'

const afValue = ref(false)
const manualFocusValue = ref<number>(0)
const focusMode = ref<FocusMode>('autofocus')
const FOCUS_SETTING_SYNC_GUARD_MS = 1800
const FOCUS_MODE_SYNC_GUARD_MS = 1200
const MANUAL_FOCUS_MATCH_EPSILON = 0.051
const lastManualFocusLocalInputAt = ref(0)
const pendingManualFocusValue = ref<number | null>(null)
const lastAFLocalInputAt = ref(0)
const pendingAFValue = ref<boolean | null>(null)
const lastFocusModeLocalInputAt = ref(0)
const pendingFocusMode = ref<FocusMode | null>(null)

const manualFocusMatches = (left: number, right: number) =>
  Math.abs(left - right) <= MANUAL_FOCUS_MATCH_EPSILON

const markManualFocusLocalInput = (value: number) => {
  lastManualFocusLocalInputAt.value = Date.now()
  pendingManualFocusValue.value = value
}

const markAFLocalInput = (value: boolean) => {
  lastAFLocalInputAt.value = Date.now()
  pendingAFValue.value = value
}

const markFocusModeLocalInput = (value: FocusMode) => {
  lastFocusModeLocalInputAt.value = Date.now()
  pendingFocusMode.value = value
}

const canApplyRemoteManualFocus = (value: number) => {
  const pending = pendingManualFocusValue.value
  if (pending === null) {
    const withinGuardWindow = Date.now() - lastManualFocusLocalInputAt.value < FOCUS_SETTING_SYNC_GUARD_MS
    if (withinGuardWindow && !manualFocusMatches(value, manualFocusValue.value)) {
      return false
    }
    return true
  }

  if (manualFocusMatches(value, pending)) {
    pendingManualFocusValue.value = null
    return true
  }

  const withinGuardWindow = Date.now() - lastManualFocusLocalInputAt.value < FOCUS_SETTING_SYNC_GUARD_MS
  if (withinGuardWindow) {
    return false
  }

  pendingManualFocusValue.value = null
  return true
}

const canApplyRemoteAF = (value: boolean) => {
  const pending = pendingAFValue.value
  if (pending === null) {
    const withinGuardWindow = Date.now() - lastAFLocalInputAt.value < FOCUS_SETTING_SYNC_GUARD_MS
    if (withinGuardWindow && value !== afValue.value) {
      return false
    }
    return true
  }

  if (value === pending) {
    pendingAFValue.value = null
    return true
  }

  const withinGuardWindow = Date.now() - lastAFLocalInputAt.value < FOCUS_SETTING_SYNC_GUARD_MS
  if (withinGuardWindow) {
    return false
  }

  pendingAFValue.value = null
  return true
}

const canApplyRemoteFocusMode = (value: FocusMode) => {
  const pending = pendingFocusMode.value
  if (pending === null) {
    const withinGuardWindow = Date.now() - lastFocusModeLocalInputAt.value < FOCUS_MODE_SYNC_GUARD_MS
    if (withinGuardWindow && value !== focusMode.value) {
      return false
    }
    return true
  }

  if (value === pending) {
    pendingFocusMode.value = null
    return true
  }

  const withinGuardWindow = Date.now() - lastFocusModeLocalInputAt.value < FOCUS_MODE_SYNC_GUARD_MS
  if (withinGuardWindow) {
    return false
  }

  pendingFocusMode.value = null
  return true
}

const focusModeModel = computed({
  get: () => focusMode.value,
  set: (mode: FocusMode) => {
    if (!mode) {
      return
    }

    if (mode === 'autofocus') {
      // Avoid delayed manual_focus writes from flipping state right after tab switch.
      debouncedPersistManualFocus.cancel()
    }

    focusMode.value = mode
    markFocusModeLocalInput(mode)

    const shouldEnableStacking = mode === 'stacking'
    if (enableFocusStacking.value !== shouldEnableStacking) {
      enableFocusStacking.value = shouldEnableStacking
    }

    const shouldEnableAF = mode === 'autofocus'
    if (shouldEnableAF !== afValue.value) {
      afValue.value = shouldEnableAF
      markAFLocalInput(shouldEnableAF)
      void persistAF(shouldEnableAF)
    }
  }
})

const cameraSettings = computed<CameraSettingsModel | null>(() =>
  props.cameraName ? deviceStore.getCamera(props.cameraName)?.settings ?? null : null
)

const cameraOptions = computed<CameraOption[]>(() => props.cameraOptions ?? [])

const selectedCameraNameModel = computed({
  get: () => props.selectedCameraName ?? '',
  set: value => emit('update:selectedCameraName', value)
})

const photoCount = computed(() => points.value * (enableFocusStacking.value ? focusStacks.value : 1))

watch(
  cameraSettings,
  (settings) => {
    if (!settings) {
      pendingAFValue.value = null
      afValue.value = false
      pendingManualFocusValue.value = null
      manualFocusValue.value = 0
    } else {
      const remoteAF = settings.AF ?? false
      if (canApplyRemoteAF(remoteAF)) {
        afValue.value = remoteAF
      }
      const remoteManualFocus = settings.manual_focus ?? 0
      if (canApplyRemoteManualFocus(remoteManualFocus)) {
        manualFocusValue.value = remoteManualFocus
      }
    }

    const remoteDerivedFocusMode: FocusMode = afValue.value
      ? 'autofocus'
      : (enableFocusStacking.value ? 'stacking' : 'manual')

    if (canApplyRemoteFocusMode(remoteDerivedFocusMode)) {
      focusMode.value = remoteDerivedFocusMode
    }
  },
  { immediate: true }
)

watch(
  () => props.cameraName,
  () => {
    pendingAFValue.value = null
    lastAFLocalInputAt.value = 0
    pendingManualFocusValue.value = null
    lastManualFocusLocalInputAt.value = 0
    pendingFocusMode.value = null
    lastFocusModeLocalInputAt.value = 0
  }
)

watch(
  photoCount,
  (value) => {
    emit('update:photoCount', value)
  },
  { immediate: true }
)

watch(
  focusMode,
  (value) => {
    emit('focus-mode-change', value)
  },
  { immediate: true }
)

const emitScanSettingsChange = () => {
  emit('scan-settings-change', getScanSettings())
}

watch(
  [
    pathMethod,
    points,
    imageFormat,
    minTheta,
    maxTheta,
    minPhi,
    maxPhi,
    optimizePath,
    optimizationAlgorithm,
    focusStacks,
    enableFocusStacking,
    focusRange
  ],
  () => {
    emitScanSettingsChange()
  },
  { deep: true, immediate: true }
)

type ScanSettingField = keyof (typeof fieldDescriptions)['ScanSetting']
const scanSettingDescription = (field: ScanSettingField) => getFieldDescription('ScanSetting', field)
type CameraSettingField = keyof (typeof fieldDescriptions)['CameraSettings']
const cameraSettingDescription = (field: CameraSettingField) => getFieldDescription('CameraSettings', field)

async function persistAF(value: boolean) {
  if (!props.cameraName) {
    return
  }

  try {
    await apiSdk().updateCameraNameSettings({
      client: apiClient,
      path: { name: props.cameraName },
      body: { AF: value }
    })
  } catch (error) {
    console.error('Failed to update autofocus', error)
  }
}

async function persistManualFocus(value: number) {
  if (!props.cameraName) {
    return
  }

  try {
    await apiSdk().updateCameraNameSettings({
      client: apiClient,
      path: { name: props.cameraName },
      body: { manual_focus: value }
    })
  } catch (error) {
    console.error('Failed to update manual focus', error)
  }
}

const debouncedPersistManualFocus = debounce((value: number) => {
  void persistManualFocus(value)
}, 300)

const handleManualFocusInput = (value: number) => {
  markManualFocusLocalInput(value)
  debouncedPersistManualFocus(value)
}

const scanPictureQualitySectionRef = ref<InstanceType<typeof ScanPictureQualitySection> | null>(null)

const resetToDefaults = () => {
  const scanDefaults = fieldDefaults.ScanSetting
  const cameraDefaults = fieldDefaults.CameraSettings

  // Reset Scan Settings
  if (scanDefaults.points !== undefined) points.value = scanDefaults.points
  if (scanDefaults.min_theta !== undefined) minTheta.value = scanDefaults.min_theta
  if (scanDefaults.max_theta !== undefined) maxTheta.value = scanDefaults.max_theta
  minPhi.value = null
  maxPhi.value = null
  if (scanDefaults.optimize_path !== undefined) optimizePath.value = scanDefaults.optimize_path
  if (scanDefaults.optimization_algorithm !== undefined) optimizationAlgorithm.value = scanDefaults.optimization_algorithm
  
  if (scanDefaults.focus_stacks !== undefined) focusStacks.value = scanDefaults.focus_stacks
  if (scanDefaults.focus_range && Array.isArray(scanDefaults.focus_range) && scanDefaults.focus_range.length === 2) {
    focusRange.value = { min: scanDefaults.focus_range[0], max: scanDefaults.focus_range[1] }
  }

  // Reset Camera Settings (Focus)
  if (cameraDefaults.AF !== undefined) {
    afValue.value = cameraDefaults.AF
    markAFLocalInput(cameraDefaults.AF)
    void persistAF(cameraDefaults.AF)
  }
  if (cameraDefaults.manual_focus !== undefined) {
    manualFocusValue.value = cameraDefaults.manual_focus
    markManualFocusLocalInput(cameraDefaults.manual_focus)
    void persistManualFocus(cameraDefaults.manual_focus)
  }

  // Update Focus Mode based on defaults
  if (cameraDefaults.AF) {
    focusMode.value = 'autofocus'
    enableFocusStacking.value = false
  } else {
    // If AF is off, check if stacking should be enabled by default
    const stackCount = scanDefaults.focus_stacks ?? 1
    if (stackCount > 1) {
      focusMode.value = 'stacking'
      enableFocusStacking.value = true
    } else {
      focusMode.value = 'manual'
      enableFocusStacking.value = false
    }
  }

  // Trigger child component reset
  scanPictureQualitySectionRef.value?.resetToDefaults()
}

function getScanSettings() {
  const settings: ScanSetting = {
    path_method: pathMethod.value.value as 'fibonacci' | 'spiral',
    points: points.value,
    image_format: imageFormat.value as 'jpeg' | 'dng' | 'rgb_array' | 'yuv_array'
  }

  if (minTheta.value !== undefined) settings.min_theta = minTheta.value
  if (maxTheta.value !== undefined) settings.max_theta = maxTheta.value
  if (minPhi.value !== null && minPhi.value !== undefined) settings.min_phi = minPhi.value
  if (maxPhi.value !== null && maxPhi.value !== undefined) settings.max_phi = maxPhi.value
  if (optimizePath.value) settings.optimize_path = optimizePath.value
  if (optimizationAlgorithm.value) settings.optimization_algorithm = optimizationAlgorithm.value
  if (enableFocusStacking.value) {
    if (focusStacks.value !== undefined) settings.focus_stacks = focusStacks.value
    if (focusRange.value.min !== 0 && focusRange.value.max !== 0) settings.focus_range = [focusRange.value.min, focusRange.value.max]
  }

  return settings
}

const applySettings = (scanSettings: ScanSetting, cameraSettings: CameraSettingsModel | null) => {
  // Apply Scan Settings
  if (scanSettings.points !== undefined) points.value = scanSettings.points
  
  if (scanSettings.path_method) {
    const found = pathMethods.find(p => p.value === scanSettings.path_method)
    if (found) pathMethod.value = found
  }
  
  if (scanSettings.image_format && imageFormats.includes(scanSettings.image_format)) {
    imageFormat.value = scanSettings.image_format
  }
  
  if (scanSettings.min_theta !== undefined) minTheta.value = scanSettings.min_theta
  if (scanSettings.max_theta !== undefined) maxTheta.value = scanSettings.max_theta
  minPhi.value = scanSettings.min_phi ?? null
  maxPhi.value = scanSettings.max_phi ?? null
  if (scanSettings.optimize_path !== undefined) optimizePath.value = scanSettings.optimize_path
  if (scanSettings.optimization_algorithm !== undefined) optimizationAlgorithm.value = scanSettings.optimization_algorithm
  
  if (scanSettings.focus_stacks !== undefined) focusStacks.value = scanSettings.focus_stacks
  if (scanSettings.focus_range && Array.isArray(scanSettings.focus_range) && scanSettings.focus_range.length === 2) {
    focusRange.value = { min: scanSettings.focus_range[0], max: scanSettings.focus_range[1] }
  }

  const stackingRequested = typeof focusStacks.value === 'number' && focusStacks.value > 1

  // Apply Camera Settings (Focus)
  if (cameraSettings) {
    if (cameraSettings.AF !== undefined && cameraSettings.AF !== null) {
      afValue.value = cameraSettings.AF
    }
    if (cameraSettings.manual_focus !== undefined && cameraSettings.manual_focus !== null) {
      manualFocusValue.value = cameraSettings.manual_focus
    }

    scanPictureQualitySectionRef.value?.applyCameraSettings(cameraSettings)
  }

  if (afValue.value) {
    focusMode.value = 'autofocus'
    enableFocusStacking.value = false
  } else if (stackingRequested) {
    focusMode.value = 'stacking'
    enableFocusStacking.value = true
  } else {
    focusMode.value = 'manual'
    enableFocusStacking.value = false
  }
}

const getPhotoCount = () => photoCount.value

const getCameraSettingsSnapshot = (): CameraSettingsModel => {
  const pictureSnapshot = scanPictureQualitySectionRef.value?.getCameraSettingsSnapshot() ?? {
    shutter: fieldDefaults.CameraSettings.shutter,
    saturation: fieldDefaults.CameraSettings.saturation,
    contrast: fieldDefaults.CameraSettings.contrast,
    gain: fieldDefaults.CameraSettings.gain,
    awbg_red: fieldDefaults.CameraSettings.awbg_red,
    awbg_blue: fieldDefaults.CameraSettings.awbg_blue,
    jpeg_quality: fieldDefaults.CameraSettings.jpeg_quality,
    orientation_flag: fieldDefaults.CameraSettings.orientation_flag
  }

  return {
    ...pictureSnapshot,
    AF: afValue.value,
    manual_focus: manualFocusValue.value
  }
}

defineExpose({ getScanSettings, getPhotoCount, applySettings, resetToDefaults, getCameraSettingsSnapshot })
</script>
