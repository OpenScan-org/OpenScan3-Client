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
          v-model:minTheta="minTheta"
          v-model:maxTheta="maxTheta"
          v-model:optimizePath="optimizePath"
          v-model:optimizationAlgorithm="optimizationAlgorithm"
          :image-format-description="scanSettingDescription('image_format')"
          :path-method-description="scanSettingDescription('path_method')"
          :min-theta-description="scanSettingDescription('min_theta')"
          :max-theta-description="scanSettingDescription('max_theta')"
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
        :af-description="cameraSettingDescription('AF')"
        :manual-focus-description="cameraSettingDescription('manual_focus')"
        :focus-stacks-description="scanSettingDescription('focus_stacks')"
        :focus-range-description="scanSettingDescription('focus_range')"
        @manual-focus-input="debouncedPersistManualFocus"
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
import { updateCameraNameSettings, type CameraSettings as CameraSettingsModel, type ScanSetting } from 'src/generated/api'
import { apiClient } from 'src/services/apiClient'
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
}>()

const deviceStore = useDeviceStore()
void deviceStore.ensureConnected()

const pathMethods = [
  { label: 'Fibonacci', value: 'fibonacci' },
  { label: 'Spiral', value: 'spiral' }
]

const imageFormats = ['jpeg', 'dng', 'rgb_array', 'yuv_array']

const pathMethod = ref(pathMethods[0])
const points = ref(130)
const imageFormat = ref(imageFormats[0])
const minTheta = ref<number>(12.0)
const maxTheta = ref<number>(125.0)
const optimizePath = ref(true)
const optimizationAlgorithm = ref('nearest_neighbor')
const focusStacks = ref<number>(2)
const enableFocusStacking = ref(false)
const focusRange = ref({ min: 10.0, max: 15.0 })

type FocusMode = 'autofocus' | 'manual' | 'stacking'

const afValue = ref(false)
const manualFocusValue = ref<number>(0)
const focusMode = ref<FocusMode>('autofocus')
const focusModeModel = computed({
  get: () => focusMode.value,
  set: (mode: FocusMode) => {
    if (!mode) {
      return
    }

    focusMode.value = mode

    const shouldEnableStacking = mode === 'stacking'
    if (enableFocusStacking.value !== shouldEnableStacking) {
      enableFocusStacking.value = shouldEnableStacking
    }

    const shouldEnableAF = mode === 'autofocus'
    if (shouldEnableAF !== afValue.value) {
      afValue.value = shouldEnableAF
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
      afValue.value = false
      manualFocusValue.value = 0
    } else {
      afValue.value = settings.AF ?? false
      manualFocusValue.value = settings.manual_focus ?? 0
    }

    if (afValue.value) {
      focusMode.value = 'autofocus'
    } else if (enableFocusStacking.value) {
      focusMode.value = 'stacking'
    } else {
      focusMode.value = 'manual'
    }
  },
  { immediate: true }
)

watch(
  photoCount,
  (value) => {
    emit('update:photoCount', value)
  },
  { immediate: true }
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
    await updateCameraNameSettings({
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
    await updateCameraNameSettings({
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

const scanPictureQualitySectionRef = ref<InstanceType<typeof ScanPictureQualitySection> | null>(null)

const resetToDefaults = () => {
  const scanDefaults = fieldDefaults.ScanSetting
  const cameraDefaults = fieldDefaults.CameraSettings

  // Reset Scan Settings
  if (scanDefaults.points !== undefined) points.value = scanDefaults.points
  if (scanDefaults.min_theta !== undefined) minTheta.value = scanDefaults.min_theta
  if (scanDefaults.max_theta !== undefined) maxTheta.value = scanDefaults.max_theta
  if (scanDefaults.optimize_path !== undefined) optimizePath.value = scanDefaults.optimize_path
  if (scanDefaults.optimization_algorithm !== undefined) optimizationAlgorithm.value = scanDefaults.optimization_algorithm
  
  if (scanDefaults.focus_stacks !== undefined) focusStacks.value = scanDefaults.focus_stacks
  if (scanDefaults.focus_range && Array.isArray(scanDefaults.focus_range) && scanDefaults.focus_range.length === 2) {
    focusRange.value = { min: scanDefaults.focus_range[0], max: scanDefaults.focus_range[1] }
  }

  // Reset Camera Settings (Focus)
  if (cameraDefaults.AF !== undefined) {
    afValue.value = cameraDefaults.AF
    void persistAF(cameraDefaults.AF)
  }
  if (cameraDefaults.manual_focus !== undefined) {
    manualFocusValue.value = cameraDefaults.manual_focus
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

const getScanSettings = () => {
  const settings: ScanSetting = {
    path_method: pathMethod.value.value as 'fibonacci' | 'spiral',
    points: points.value,
    image_format: imageFormat.value as 'jpeg' | 'dng' | 'rgb_array' | 'yuv_array'
  }

  if (minTheta.value !== undefined) settings.min_theta = minTheta.value
  if (maxTheta.value !== undefined) settings.max_theta = maxTheta.value
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
  if (scanSettings.optimize_path !== undefined) optimizePath.value = scanSettings.optimize_path
  if (scanSettings.optimization_algorithm !== undefined) optimizationAlgorithm.value = scanSettings.optimization_algorithm
  
  if (scanSettings.focus_stacks !== undefined) focusStacks.value = scanSettings.focus_stacks
  if (scanSettings.focus_range && Array.isArray(scanSettings.focus_range) && scanSettings.focus_range.length === 2) {
    focusRange.value = { min: scanSettings.focus_range[0], max: scanSettings.focus_range[1] }
  }

  // Apply Camera Settings (Focus)
  if (cameraSettings) {
    if (cameraSettings.AF !== undefined && cameraSettings.AF !== null) {
      afValue.value = cameraSettings.AF
    }
    if (cameraSettings.manual_focus !== undefined && cameraSettings.manual_focus !== null) {
      manualFocusValue.value = cameraSettings.manual_focus
    }

    // Determine Focus Mode
    if (afValue.value) {
      focusMode.value = 'autofocus'
    } else if (scanSettings.focus_stacks && scanSettings.focus_stacks > 1) {
      // If stack count is > 1, prefer stacking mode if AF is off
      focusMode.value = 'stacking'
      enableFocusStacking.value = true
    } else {
      focusMode.value = 'manual'
      enableFocusStacking.value = false
    }
    scanPictureQualitySectionRef.value?.applyCameraSettings(cameraSettings)
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
