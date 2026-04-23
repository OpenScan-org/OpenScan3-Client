<template>
  <div class="col-12 col-md-4">
    <div v-if="camera" class="camera-settings">
      <BaseSectionGroup>
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
            @update:model-value="handleShutterInput"
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
              @update:model-value="handleAwbgBlueInput"
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
import { debounce } from 'quasar';

import BaseSection from 'components/base/BaseSection.vue';
import BaseSectionGroup from 'components/base/BaseSectionGroup.vue';
import BaseSliderWithInput from 'components/base/BaseSliderWithInput.vue';
import { useDeviceStore } from 'src/stores/device';
import { apiClient, getApiSdk } from 'src/services/apiClient';
import {
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
</style>
