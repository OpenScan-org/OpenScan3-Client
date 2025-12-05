<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { debounce } from 'quasar'

import BaseSliderWithInput from '../base/BaseSliderWithInput.vue'
import BaseRadio from '../base/BaseRadio.vue'
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

const afValue = ref(false)
const manualFocusValue = ref<number>(0)
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

    if (settings?.AF !== undefined && settings.AF !== null) {
      afValue.value = settings.AF
    }

    if (settings?.manual_focus !== undefined && settings.manual_focus !== null) {
      manualFocusValue.value = settings.manual_focus
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

async function persistAF(value: boolean) {
  if (!props.camera?.value) {
    return
  }

  try {
    await updateCameraNameSettings({
      client: apiClient,
      path: { name: props.camera.value },
      body: { AF: value }
    })
  } catch (error) {
    console.error('Failed to update autofocus', error)
  }
}

async function persistManualFocus(value: number) {
  if (!props.camera?.value) {
    return
  }

  try {
    await updateCameraNameSettings({
      client: apiClient,
      path: { name: props.camera.value },
      body: { manual_focus: value }
    })
  } catch (error) {
    console.error('Failed to update manual focus', error)
  }
}

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

const debouncedPersistManualFocus = debounce((value: number) => {
  void persistManualFocus(value)
}, 300)

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

    <div class="q-mt-md">
      <div class="row items-center q-col-gutter-sm">
        <div class="col-12 col-md-5">
          <BaseRadio
            v-model="afValue"
            label="Autofocus"
            :options="[
              { label: 'On', value: true },
              { label: 'Off', value: false }
            ]"
            @update:model-value="persistAF"
          />
        </div>
        <div class="col-12 col-md-7">
          <BaseSliderWithInput
            v-model="manualFocusValue"
            label="Manual Focus (diopters)"
            :slider-min="0"
            :slider-max="15"
            :slider-step="0.1"
            :input-min="0"
            :input-max="15"
            :tooltip="cameraSettingDescription('manual_focus')"
            :disabled="afValue"
            @update:model-value="debouncedPersistManualFocus"
          />
        </div>
      </div>
    </div>

    <q-expansion-item label="Advanced Settings" header-class="text-h6" class="q-mt-md">
      <q-card>
        <q-card-section>
          <div class="row q-col-gutter-md">
            <div class="col-12">
              <q-select
                v-model="selectedCameraNameModel"
                :options="cameraOptions"
                label="Camera"
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
