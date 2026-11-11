<template>
  <div class="col-12 col-md-4">
    <div v-if="camera" class="camera-settings">
      <BaseSectionGroup>
        <BaseSection title="Picture Quality">
          <div class="camera-auto-control">
            <BaseSliderWithInput
              v-model="shutterValue"
              label="Shutter"
              :slider-min="sliderMinMs"
              :slider-max="sliderMaxMs"
              :slider-step="sliderStepMs"
              :input-min="sliderMinMs"
              :input-max="sliderMaxMs"
              :disabled="exposureCalibrating"
              :tooltip="cameraSettingDescription('shutter')"
              @update:model-value="handleShutterInput"
            />
            <BaseButtonSecondary
              v-if="supportsAutoExposure"
              class="camera-auto-button"
              icon="auto_awesome"
              aria-label="Auto shutter"
              :loading="exposureCalibrating"
              :disable="exposureCalibrating || awbCalibrating"
              @click="calibrateExposure"
            >
              <q-tooltip>Auto shutter: calibrate exposure and lock analogue gain at 1.0.</q-tooltip>
            </BaseButtonSecondary>
          </div>

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
              @update:model-value="handleJpegQualityInput"
            />
          </div>
        </BaseSection>

        <BaseSection title="Advanced Picture Settings">
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
              @update:model-value="handleContrastInput"
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
              @update:model-value="handleSaturationInput"
            />
          </div>

          <div class="col-12">
            <BaseSliderWithInput
              v-model="gainValue"
              :disabled="exposureCalibrating"
              label="Gain"
              :slider-min="0"
              :slider-max="5"
              :slider-step="0.1"
              :input-min="0"
              :input-max="32"
              :tooltip="cameraSettingDescription('gain')"
              @update:model-value="handleGainInput"
            />
          </div>

          <div class="col-12">
            <div class="camera-auto-control">
              <div class="awb-slider-stack q-gutter-y-sm">
                <BaseSliderWithInput
                  v-model="awbgRedValue"
                  label="AWBG Red"
                  :slider-min="0"
                  :slider-max="32"
                  :slider-step="1"
                  :input-min="0"
                  :input-max="32"
                  :tooltip="cameraSettingDescription('awbg_red')"
                  @update:model-value="handleAwbgRedInput"
                />
                <BaseSliderWithInput
                  v-model="awbgBlueValue"
                  label="AWBG Blue"
                  :slider-min="0"
                  :slider-max="32"
                  :slider-step="1"
                  :input-min="0"
                  :input-max="32"
                  :tooltip="cameraSettingDescription('awbg_blue')"
                  @update:model-value="handleAwbgBlueInput"
                />
              </div>
              <BaseButtonSecondary
                class="camera-auto-button"
                icon="auto_awesome"
                :loading="awbCalibrating"
                :disable="awbCalibrating || exposureCalibrating"
                @click="calibrateAwb"
              >
                <q-tooltip>
                  Run automatic white balance calibration and lock the gains.
                </q-tooltip>
              </BaseButtonSecondary>
            </div>
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
              @update:model-value="handleOrientationFlagInput"
            />
          </div>
          </div>
        </BaseSection>
      </BaseSectionGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { debounce, useQuasar } from 'quasar';

import BaseSection from 'components/base/BaseSection.vue';
import BaseSectionGroup from 'components/base/BaseSectionGroup.vue';
import BaseButtonSecondary from 'components/base/BaseButtonSecondary.vue';
import BaseSliderWithInput from 'components/base/BaseSliderWithInput.vue';
import { useDeviceStore } from 'src/stores/device';
import { useDeviceWakeup } from 'src/composables/useDeviceWakeup';
import { apiClient, getApiSdk } from 'src/services/apiClient';
import {
  type AutoCalibrateAwbResponse,
  type CameraSettings as CameraSettingsModel,
} from 'src/generated/api';
import {
  fieldDescriptions,
  getFieldDescription,
} from 'src/generated/api/fieldDescriptions';
import { fieldDefaults } from 'src/generated/api/fieldDefaults';

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
const $q = useQuasar();
const { wakeUpDevice } = useDeviceWakeup();
const apiSdk = () => getApiSdk();
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
const CAMERA_SETTING_SYNC_GUARD_MS = 1200;
const CAMERA_SETTING_MATCH_EPSILON = 0.051;

type NumericCameraSettingKey =
  | 'shutter'
  | 'saturation'
  | 'contrast'
  | 'gain'
  | 'awbg_red'
  | 'awbg_blue'
  | 'jpeg_quality'
  | 'orientation_flag';

const shutterValue = ref<number>(defaultShutterMs);
const saturationValue = ref<number>(defaultSaturation);
const contrastValue = ref<number>(defaultContrast);
const gainValue = ref<number>(defaultGain);
const awbgRedValue = ref<number>(defaultAwbg);
const awbgBlueValue = ref<number>(defaultAwbg);
const jpegQualityValue = ref<number>(defaultJpegQuality);
const awbCalibrating = ref(false);
const exposureCalibrating = ref(false);
const supportsAutoExposure = computed(() => 'autoCalibrateExposure' in apiSdk());
const awbCalibrationDefaults = fieldDefaults.AutoCalibrateAwbRequest ?? null;

const orientationFlagValue = ref<number>(1);
const pendingLocalValues = ref<Partial<Record<NumericCameraSettingKey, number>>>({});
const lastLocalInputAt = ref<Partial<Record<NumericCameraSettingKey, number>>>({});

const cameraSettingMatches = (left: number, right: number) =>
  Math.abs(left - right) <= CAMERA_SETTING_MATCH_EPSILON;

const markLocalInput = (key: NumericCameraSettingKey, value: number) => {
  pendingLocalValues.value = {
    ...pendingLocalValues.value,
    [key]: value,
  };
  lastLocalInputAt.value = {
    ...lastLocalInputAt.value,
    [key]: Date.now(),
  };
};

const clearPendingLocalInput = (key: NumericCameraSettingKey) => {
  if (pendingLocalValues.value[key] === undefined) {
    return;
  }

  const nextPending = { ...pendingLocalValues.value };
  delete nextPending[key];
  pendingLocalValues.value = nextPending;
};

const canApplyRemoteSetting = (key: NumericCameraSettingKey, value: number) => {
  const pending = pendingLocalValues.value[key];
  if (pending === undefined) {
    return true;
  }

  if (cameraSettingMatches(value, pending)) {
    clearPendingLocalInput(key);
    return true;
  }

  const lastInputAt = lastLocalInputAt.value[key] ?? 0;
  const withinGuardWindow = Date.now() - lastInputAt < CAMERA_SETTING_SYNC_GUARD_MS;
  if (withinGuardWindow) {
    return false;
  }

  clearPendingLocalInput(key);
  return true;
};

const resetLocalSyncState = () => {
  pendingLocalValues.value = {};
  lastLocalInputAt.value = {};
};

watch(
  () => props.camera?.value,
  () => {
    resetLocalSyncState();
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
    const applyRemoteNumeric = (
      key: NumericCameraSettingKey,
      value: number | null | undefined,
      assign: (remoteValue: number) => void,
    ) => {
      if (value === undefined || value === null) {
        return;
      }

      if (canApplyRemoteSetting(key, value)) {
        assign(value);
      }
    };

    applyRemoteNumeric('shutter', settings?.shutter, (value) => {
      shutterValue.value = value;
    });
    applyRemoteNumeric('saturation', settings?.saturation, (value) => {
      saturationValue.value = value;
    });
    applyRemoteNumeric('contrast', settings?.contrast, (value) => {
      contrastValue.value = value;
    });
    applyRemoteNumeric('gain', settings?.gain, (value) => {
      gainValue.value = value;
    });
    applyRemoteNumeric('awbg_red', settings?.awbg_red, (value) => {
      awbgRedValue.value = value;
    });
    applyRemoteNumeric('awbg_blue', settings?.awbg_blue, (value) => {
      awbgBlueValue.value = value;
    });
    applyRemoteNumeric('jpeg_quality', settings?.jpeg_quality, (value) => {
      jpegQualityValue.value = value;
    });
    applyRemoteNumeric('orientation_flag', settings?.orientation_flag, (value) => {
      orientationFlagValue.value = value;
    });
  },
  { immediate: true },
);

async function persistShutter(value: number) {
  if (!props.camera?.value) {
    return;
  }

  try {
    await apiSdk().updateCameraNameSettings({
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

const handleShutterInput = (value: number) => {
  markLocalInput('shutter', value);
  debouncedPersistShutter(value);
};

async function persistSaturation(value: number) {
  if (!props.camera?.value) {
    return;
  }

  try {
    await apiSdk().updateCameraNameSettings({
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

const handleSaturationInput = (value: number) => {
  markLocalInput('saturation', value);
  debouncedPersistSaturation(value);
};

async function persistContrast(value: number) {
  if (!props.camera?.value) {
    return;
  }

  try {
    await apiSdk().updateCameraNameSettings({
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

const handleContrastInput = (value: number) => {
  markLocalInput('contrast', value);
  debouncedPersistContrast(value);
};

async function persistGain(value: number) {
  if (!props.camera?.value) {
    return;
  }

  try {
    await apiSdk().updateCameraNameSettings({
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

const handleGainInput = (value: number) => {
  markLocalInput('gain', value);
  debouncedPersistGain(value);
};

async function persistJpegQuality(value: number) {
  if (!props.camera?.value) {
    return;
  }

  try {
    await apiSdk().updateCameraNameSettings({
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

const handleJpegQualityInput = (value: number) => {
  markLocalInput('jpeg_quality', value);
  debouncedPersistJpegQuality(value);
};

async function persistAwbgRed(value: number) {
  if (!props.camera?.value) {
    return;
  }

  try {
    await apiSdk().updateCameraNameSettings({
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

const handleAwbgRedInput = (value: number) => {
  markLocalInput('awbg_red', value);
  debouncedPersistAwbgRed(value);
};

async function persistAwbgBlue(value: number) {
  if (!props.camera?.value) {
    return;
  }

  try {
    await apiSdk().updateCameraNameSettings({
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

const handleAwbgBlueInput = (value: number) => {
  markLocalInput('awbg_blue', value);
  debouncedPersistAwbgBlue(value);
};

async function calibrateExposure() {
  const cameraName = props.camera?.value;
  const sdk = apiSdk();
  if (!cameraName || exposureCalibrating.value || awbCalibrating.value || !('autoCalibrateExposure' in sdk)) return;

  exposureCalibrating.value = true;
  debouncedPersistShutter.cancel();
  debouncedPersistGain.cancel();
  try {
    await wakeUpDevice();
    const response = await sdk.autoCalibrateExposure({
      client: apiClient,
      path: { camera_name: cameraName },
      body: {},
      throwOnError: true,
    });
    const result = response.data;
    if (!result) throw new Error('No exposure calibration result was returned.');
    if (props.camera?.value === cameraName) {
      shutterValue.value = result.shutter_ms;
      gainValue.value = result.analogue_gain;
      markLocalInput('shutter', result.shutter_ms);
      markLocalInput('gain', result.analogue_gain);
    }
    await deviceStore.refreshFromRest();
  } catch (error) {
    console.error('Camera exposure calibration failed.', error);
    $q.notify({ type: 'negative', message: 'Could not calibrate exposure. Please try again.' });
  } finally {
    exposureCalibrating.value = false;
  }
}

async function calibrateAwb() {
  if (!props.camera?.value || awbCalibrating.value || exposureCalibrating.value) {
    return;
  }

  awbCalibrating.value = true;
  try {
    const response = await apiSdk().autoCalibrateAwb({
      client: apiClient,
      path: { camera_name: props.camera.value },
      body: awbCalibrationDefaults ? { ...awbCalibrationDefaults } : undefined,
    });

    const result = ((response?.data ?? response) as AutoCalibrateAwbResponse | undefined) ?? null;
    if (!result) {
      return;
    }

    awbgRedValue.value = result.red_gain;
    awbgBlueValue.value = result.blue_gain;
    markLocalInput('awbg_red', result.red_gain);
    markLocalInput('awbg_blue', result.blue_gain);
    await apiSdk().saveDeviceConfig({ client: apiClient });
  } catch (error) {
    console.error('Camera AWB calibration failed.', error);
  } finally {
    awbCalibrating.value = false;
  }
}

async function persistOrientationFlag(value: number) {
  if (!props.camera?.value) {
    return;
  }

  try {
    await apiSdk().updateCameraNameSettings({
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

const handleOrientationFlagInput = (value: number) => {
  markLocalInput('orientation_flag', value);
  debouncedPersistOrientationFlag(value);
};

const resetToDefaults = () => {
  const defaults = fieldDefaults.CameraSettings;
  applyCameraSettings(defaults);
};

const applyCameraSettings = (settings: Partial<CameraSettingsModel> | null | undefined) => {
  if (!settings) {
    return;
  }

  const assignNumeric = (
    key: NumericCameraSettingKey,
    value: number | null | undefined,
    assign: (val: number) => void,
    persist: (val: number) => Promise<void>,
  ) => {
    if (value === undefined || value === null) {
      return;
    }

    assign(value);
    markLocalInput(key, value);
    void persist(value);
  };

  assignNumeric('shutter', settings.shutter, (value) => {
    shutterValue.value = value;
  }, persistShutter);
  assignNumeric('saturation', settings.saturation, (value) => {
    saturationValue.value = value;
  }, persistSaturation);
  assignNumeric('contrast', settings.contrast, (value) => {
    contrastValue.value = value;
  }, persistContrast);
  assignNumeric('gain', settings.gain, (value) => {
    gainValue.value = value;
  }, persistGain);
  assignNumeric('awbg_red', settings.awbg_red, (value) => {
    awbgRedValue.value = value;
  }, persistAwbgRed);
  assignNumeric('awbg_blue', settings.awbg_blue, (value) => {
    awbgBlueValue.value = value;
  }, persistAwbgBlue);
  assignNumeric('jpeg_quality', settings.jpeg_quality, (value) => {
    jpegQualityValue.value = value;
  }, persistJpegQuality);
  assignNumeric('orientation_flag', settings.orientation_flag, (value) => {
    orientationFlagValue.value = value;
  }, persistOrientationFlag);
};

const getCameraSettingsSnapshot = (): CameraSettingsModel => ({
  shutter: shutterValue.value,
  saturation: saturationValue.value,
  contrast: contrastValue.value,
  gain: gainValue.value,
  awbg_red: awbgRedValue.value,
  awbg_blue: awbgBlueValue.value,
  jpeg_quality: jpegQualityValue.value,
  orientation_flag: orientationFlagValue.value,
});

defineExpose({ resetToDefaults, applyCameraSettings, getCameraSettingsSnapshot });
</script>

<style scoped>
.camera-settings :deep(.base-section + .base-section) {
  margin-top: 8px;
}

.camera-auto-control {
  position: relative;
}

.camera-auto-control :deep(.slider-track) {
  margin-right: 40px;
}

.camera-auto-button {
  position: absolute;
  top: calc(50% - 8px);
  right: 0;
  transform: translateY(-50%);
  background: white;
}
</style>
