<template>
  <div class="row q-col-gutter-sm">
    <div class="col-12 col-md-4">
      <ScanQualitySection
        v-model:points="points"
        :points-tooltip="scanSettingDescription('points')"
      />

      <div class="q-mt-sm">
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
      </div>
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
      :camera="camera"
      :camera-options="cameraOptions"
      v-model:selected-camera-name="selectedCameraNameModel"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { debounce } from 'quasar'

import ScanQualitySection from 'components/scan/ScanQualitySection.vue'
import ScanFocusSection from 'components/scan/ScanFocusSection.vue'
import ScanAdvancedSection from 'components/scan/ScanAdvancedSection.vue'
import ScanPictureQualitySection from 'components/scan/ScanPictureQualitySection.vue'
import { updateCameraNameSettings, type CameraSettings as CameraSettingsModel, type ScanSetting } from 'src/generated/api'
import { apiClient } from 'src/services/apiClient'
import { useDeviceStore } from 'src/stores/device'
import { fieldDescriptions, getFieldDescription } from 'src/generated/api/fieldDescriptions'

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

const getPhotoCount = () => photoCount.value

defineExpose({ getScanSettings, getPhotoCount })
</script>
