<template>
  <div class="col-12 col-md-4">
    <div v-if="camera" class="camera-settings">
      <BaseSection title="Picture Quality">
        <BaseSliderWithInput
          v-model="shutterValue"
          label="Shutter"
          :slider-min="sliderMinMs"
          :slider-max="sliderMaxMs"
          :slider-step="sliderStepMs"
          :input-min="sliderMinMs"
          :input-max="sliderMaxMs"
          :tooltip="cameraSettingDescription('shutter')"
          @update:model-value="debouncedPersistShutter"
        />

        <div class="col-12">
          <BaseSliderWithInput
            v-model="jpegQualityValue"
            label="JPEG Quality"
            :slider-min="0"
            :slider-max="100"
            :slider-step="1"
            :input-min="0"
            :input-max="100"
            :tooltip="cameraSettingDescription('jpeg_quality')"
            @update:model-value="debouncedPersistJpegQuality"
          />
        </div>
      </BaseSection>

      <BaseSection title="Advanced Picture Settings" class="q-mt-sm">
        <div class="row q-col-gutter-sm">

          <div class="col-12">
            <BaseSliderWithInput
              v-model="contrastValue"
              label="Contrast"
              :slider-min="0"
              :slider-max="32"
              :slider-step="1"
              :input-min="0"
              :input-max="32"
              :tooltip="cameraSettingDescription('contrast')"
              @update:model-value="debouncedPersistContrast"
            />

            <BaseSliderWithInput
              v-model="saturationValue"
              label="Saturation"
              :slider-min="0"
              :slider-max="32"
              :slider-step="1"
              :input-min="0"
              :input-max="32"
              :tooltip="cameraSettingDescription('saturation')"
              @update:model-value="debouncedPersistSaturation"
            />
          </div>

          <div class="col-12">
            <BaseSliderWithInput
              v-model="gainValue"
              label="Gain"
              :slider-min="0"
              :slider-max="5"
              :slider-step="0.1"
              :input-min="0"
              :input-max="32"
              :tooltip="cameraSettingDescription('gain')"
              @update:model-value="debouncedPersistGain"
            />
          </div>

          <div class="col-12">
            <BaseSliderWithInput
              v-model="awbgRedValue"
              label="AWBG Red"
              :slider-min="0"
              :slider-max="32"
              :slider-step="1"
              :input-min="0"
              :input-max="32"
              :tooltip="cameraSettingDescription('awbg_red')"
              @update:model-value="debouncedPersistAwbgRed"
            />
          </div>

          <div class="col-12">
            <BaseSliderWithInput
              v-model="awbgBlueValue"
              label="AWBG Blue"
              :slider-min="0"
              :slider-max="32"
              :slider-step="1"
              :input-min="0"
              :input-max="32"
              :tooltip="cameraSettingDescription('awbg_blue')"
              @update:model-value="debouncedPersistAwbgBlue"
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
      </BaseSection>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { debounce } from 'quasar';

import BaseSection from 'components/base/BaseSection.vue';
import BaseSliderWithInput from 'components/base/BaseSliderWithInput.vue';
import { useDeviceStore } from 'src/stores/device';
import { apiClient } from 'src/services/apiClient';
import {
  updateCameraNameSettings,
  type CameraSettings as CameraSettingsModel,
} from 'src/generated/api';
import {
  fieldDescriptions,
  getFieldDescription,
} from 'src/generated/api/fieldDescriptions';

type CameraOption = {
  label: string;
  value: string;
  orientationFlag?: number | null;
};

type CameraInfo = {
  label: string;
  value: string;
  orientationFlag?: number | null;
} | null;

interface Props {
  camera?: CameraInfo;
  shutterMin?: number;
  shutterMax?: number;
  shutterStep?: number;
}

const props = withDefaults(defineProps<Props>(), {
  camera: null,
  shutterMin: 1,
  shutterMax: 1000,
  shutterStep: 1,
});

const deviceStore = useDeviceStore();
void deviceStore.ensureConnected();

type CameraSettingsField = keyof (typeof fieldDescriptions)['CameraSettings'];

const cameraSettingDescription = (field: CameraSettingsField) =>
  getFieldDescription('CameraSettings', field);

const cameraSettings = computed<CameraSettingsModel | null>(() =>
  props.camera?.value
    ? (deviceStore.getCamera(props.camera.value)?.settings ?? null)
    : null,
);

const sliderMinMs = computed(() => props.shutterMin);
const sliderMaxMs = computed(() => props.shutterMax);
const sliderStepMs = computed(() => props.shutterStep);

const defaultShutterMs = 10;
const defaultSaturation = 16;
const defaultContrast = 16;
const defaultGain = 16;
const defaultAwbg = 16;
const defaultJpegQuality = 75;

const shutterValue = ref<number>(defaultShutterMs);
const saturationValue = ref<number>(defaultSaturation);
const contrastValue = ref<number>(defaultContrast);
const gainValue = ref<number>(defaultGain);
const awbgRedValue = ref<number>(defaultAwbg);
const awbgBlueValue = ref<number>(defaultAwbg);
const jpegQualityValue = ref<number>(defaultJpegQuality);

const hasInitializedShutterFromSettings = ref(false);
const hasInitializedSaturationFromSettings = ref(false);
const hasInitializedContrastFromSettings = ref(false);
const hasInitializedGainFromSettings = ref(false);
const hasInitializedAwbgRedFromSettings = ref(false);
const hasInitializedAwbgBlueFromSettings = ref(false);
const hasInitializedJpegQualityFromSettings = ref(false);

const orientationFlagValue = ref<number>(1);

watch(
  () => props.camera?.value,
  () => {
    hasInitializedShutterFromSettings.value = false;
    hasInitializedSaturationFromSettings.value = false;
    hasInitializedContrastFromSettings.value = false;
    hasInitializedGainFromSettings.value = false;
    hasInitializedAwbgRedFromSettings.value = false;
    hasInitializedAwbgBlueFromSettings.value = false;
    hasInitializedJpegQualityFromSettings.value = false;
    shutterValue.value = defaultShutterMs;
    saturationValue.value = defaultSaturation;
    contrastValue.value = defaultContrast;
    gainValue.value = defaultGain;
    awbgRedValue.value = defaultAwbg;
    awbgBlueValue.value = defaultAwbg;
    jpegQualityValue.value = defaultJpegQuality;
  },
);

watch(
  cameraSettings,
  (settings) => {
    if (settings?.shutter != null && !hasInitializedShutterFromSettings.value) {
      shutterValue.value = settings.shutter;
      hasInitializedShutterFromSettings.value = true;
    }

    if (
      settings?.saturation != null &&
      !hasInitializedSaturationFromSettings.value
    ) {
      saturationValue.value = settings.saturation;
      hasInitializedSaturationFromSettings.value = true;
    }

    if (
      settings?.contrast != null &&
      !hasInitializedContrastFromSettings.value
    ) {
      contrastValue.value = settings.contrast;
      hasInitializedContrastFromSettings.value = true;
    }

    if (settings?.gain != null && !hasInitializedGainFromSettings.value) {
      gainValue.value = settings.gain;
      hasInitializedGainFromSettings.value = true;
    }

    if (
      settings?.awbg_red != null &&
      !hasInitializedAwbgRedFromSettings.value
    ) {
      awbgRedValue.value = settings.awbg_red;
      hasInitializedAwbgRedFromSettings.value = true;
    }

    if (
      settings?.awbg_blue != null &&
      !hasInitializedAwbgBlueFromSettings.value
    ) {
      awbgBlueValue.value = settings.awbg_blue;
      hasInitializedAwbgBlueFromSettings.value = true;
    }

    if (
      settings?.jpeg_quality != null &&
      !hasInitializedJpegQualityFromSettings.value
    ) {
      jpegQualityValue.value = settings.jpeg_quality;
      hasInitializedJpegQualityFromSettings.value = true;
    }

    if (
      settings?.orientation_flag !== undefined &&
      settings.orientation_flag !== null
    ) {
      orientationFlagValue.value = settings.orientation_flag;
    }
  },
  { immediate: true },
);

async function persistShutter(value: number) {
  if (!props.camera?.value) {
    return;
  }

  try {
    await updateCameraNameSettings({
      client: apiClient,
      path: { name: props.camera.value },
      body: { shutter: value },
    });
  } catch (error) {
    console.error('Failed to update shutter', error);
  }
}

const debouncedPersistShutter = debounce((value: number) => {
  void persistShutter(value);
}, 300);

async function persistSaturation(value: number) {
  if (!props.camera?.value) {
    return;
  }

  try {
    await updateCameraNameSettings({
      client: apiClient,
      path: { name: props.camera.value },
      body: { saturation: value },
    });
  } catch (error) {
    console.error('Failed to update saturation', error);
  }
}

const debouncedPersistSaturation = debounce((value: number) => {
  void persistSaturation(value);
}, 300);

async function persistContrast(value: number) {
  if (!props.camera?.value) {
    return;
  }

  try {
    await updateCameraNameSettings({
      client: apiClient,
      path: { name: props.camera.value },
      body: { contrast: value },
    });
  } catch (error) {
    console.error('Failed to update contrast', error);
  }
}

const debouncedPersistContrast = debounce((value: number) => {
  void persistContrast(value);
}, 300);

async function persistGain(value: number) {
  if (!props.camera?.value) {
    return;
  }

  try {
    await updateCameraNameSettings({
      client: apiClient,
      path: { name: props.camera.value },
      body: { gain: value },
    });
  } catch (error) {
    console.error('Failed to update gain', error);
  }
}

const debouncedPersistGain = debounce((value: number) => {
  void persistGain(value);
}, 300);

async function persistJpegQuality(value: number) {
  if (!props.camera?.value) {
    return;
  }

  try {
    await updateCameraNameSettings({
      client: apiClient,
      path: { name: props.camera.value },
      body: { jpeg_quality: value },
    });
  } catch (error) {
    console.error('Failed to update JPEG quality', error);
  }
}

const debouncedPersistJpegQuality = debounce((value: number) => {
  void persistJpegQuality(value);
}, 300);

async function persistAwbgRed(value: number) {
  if (!props.camera?.value) {
    return;
  }

  try {
    await updateCameraNameSettings({
      client: apiClient,
      path: { name: props.camera.value },
      body: { awbg_red: value },
    });
  } catch (error) {
    console.error('Failed to update AWBG red', error);
  }
}

const debouncedPersistAwbgRed = debounce((value: number) => {
  void persistAwbgRed(value);
}, 300);

async function persistAwbgBlue(value: number) {
  if (!props.camera?.value) {
    return;
  }

  try {
    await updateCameraNameSettings({
      client: apiClient,
      path: { name: props.camera.value },
      body: { awbg_blue: value },
    });
  } catch (error) {
    console.error('Failed to update AWBG blue', error);
  }
}

const debouncedPersistAwbgBlue = debounce((value: number) => {
  void persistAwbgBlue(value);
}, 300);

async function persistOrientationFlag(value: number) {
  if (!props.camera?.value) {
    return;
  }

  try {
    await updateCameraNameSettings({
      client: apiClient,
      path: { name: props.camera.value },
      body: { orientation_flag: value },
    });
  } catch (error) {
    console.error('Failed to update orientation flag', error);
  }
}

const debouncedPersistOrientationFlag = debounce((value: number) => {
  void persistOrientationFlag(value);
}, 300);
</script>

<style scoped>
.camera-settings :deep(.base-section + .base-section) {
  margin-top: 8px;
}
</style>
