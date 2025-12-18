<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { debounce } from 'quasar'

import BaseSliderWithInput from '../base/BaseSliderWithInput.vue'
import { fieldDescriptions, getFieldDescription } from 'src/generated/api/fieldDescriptions'
import { useDeviceStore } from 'src/stores/device'
import { apiClient } from 'src/services/apiClient'
import { updateCameraNameSettings, type CameraSettings as CameraSettingsModel } from 'src/generated/api'

type CameraOption = { label: string; value: string; orientationFlag?: number | null }

interface CameraSettingsProps {
  camera?: {
    label: string
    value: string
    orientationFlag?: number | null
  } | null
  cameraOptions?: CameraOption[]
  selectedCameraName?: string
  shutterMin?: number
  shutterMax?: number
  shutterStep?: number
}

const props = withDefaults(
  defineProps<CameraSettingsProps>(),
  {
    shutterMin: 1,
    shutterMax: 1000,
    shutterStep: 1
  }
)

const emit = defineEmits<{
  (e: 'update:selectedCameraName', value: string): void
}>()

const deviceStore = useDeviceStore()
void deviceStore.ensureConnected()

type CameraSettingsField = keyof (typeof fieldDescriptions)['CameraSettings']

const cameraSettingDescription = (field: CameraSettingsField) => getFieldDescription('CameraSettings', field)

const cameraSettings = computed<CameraSettingsModel | null>(() =>
  props.camera?.value ? deviceStore.getCamera(props.camera.value)?.settings ?? null : null
)

const cameraOptions = computed<CameraOption[]>(() => props.cameraOptions ?? [])
const selectedCameraNameModel = computed({
  get: () => props.selectedCameraName ?? '',
  set: (value: string) => emit('update:selectedCameraName', value)
})

const sliderMinMs = computed(() => props.shutterMin)
const sliderMaxMs = computed(() => props.shutterMax)
const sliderStepMs = computed(() => props.shutterStep)

const defaultShutterMs = 10
const shutterValue = ref<number>(defaultShutterMs)
const hasInitializedShutterFromSettings = ref(false)

const orientationFlagValue = ref<number>(1)

watch(
  () => props.camera?.value,
  () => {
    hasInitializedShutterFromSettings.value = false
  }
)

watch(
  cameraSettings,
  (settings) => {
    if (settings?.shutter != null && !hasInitializedShutterFromSettings.value) {
      shutterValue.value = settings.shutter
      hasInitializedShutterFromSettings.value = true
    }

    if (settings?.orientation_flag !== undefined && settings.orientation_flag !== null) {
      orientationFlagValue.value = settings.orientation_flag
    }
  },
  { immediate: true }
)

async function persistShutter(value: number) {
  if (!props.camera?.value) {
    return
  }

  try {
    await updateCameraNameSettings({
      client: apiClient,
      path: { name: props.camera.value },
      body: { shutter: value }
    })
  } catch (error) {
    console.error('Failed to update shutter', error)
  }
}

const debouncedPersistShutter = debounce((value: number) => {
  void persistShutter(value)
}, 300)

async function persistOrientationFlag(value: number) {
  if (!props.camera?.value) {
    return
  }

  try {
    await updateCameraNameSettings({
      client: apiClient,
      path: { name: props.camera.value },
      body: { orientation_flag: value }
    })
  } catch (error) {
    console.error('Failed to update orientation flag', error)
  }
}

const debouncedPersistOrientationFlag = debounce((value: number) => {
  void persistOrientationFlag(value)
}, 300)
</script>

<template>
  <div v-if="camera" class="camera-settings">
    <BaseSliderWithInput
      v-model="shutterValue"
      label="Shutter (ms)"
      :slider-min="sliderMinMs"
      :slider-max="sliderMaxMs"
      :slider-step="sliderStepMs"
      :input-min="sliderMinMs"
      :input-max="sliderMaxMs"
      :tooltip="cameraSettingDescription('shutter')"
      @update:model-value="debouncedPersistShutter"
    />
    <q-expansion-item label="Advanced Settings" header-class="text-subtitle1" class="q-mt-md">
      <q-card>
        <q-card-section>
          <div class="row q-col-gutter-sm">
            <div class="col-12">
              <q-select
                v-model="selectedCameraNameModel"
                :options="cameraOptions"
                label="Camera"
                dense
                outlined
              />
            </div>
            <div class="col-12">
              <BaseSliderWithInput
                v-model="orientationFlagValue"
                label="Orientation Flag"
                :slider-min="1"
                :slider-max="8"
                :slider-step="1"
                :input-min="1"
                :input-max="8"
                :tooltip="cameraSettingDescription('orientation_flag')"
                @update:model-value="debouncedPersistOrientationFlag"
              />
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-expansion-item>
  </div>
</template>

<style scoped>
.camera-settings {
  padding: 8px 0;
}
</style>
