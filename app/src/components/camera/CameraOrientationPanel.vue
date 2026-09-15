<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuasar } from 'quasar';
import { apiClient, getApiSdk } from 'src/services/apiClient';
import { useCameraStore } from 'src/stores/camera';
import { useDeviceStore } from 'src/stores/device';
import CameraFastPreview from './CameraFastPreview.vue';
import BaseButtonSecondary from 'components/base/BaseButtonSecondary.vue';
import BaseSpinner from 'components/base/BaseSpinner.vue';

const props = defineProps<{
  cameraName: string | null;
}>();

const $q = useQuasar();
const cameraStore = useCameraStore();
const deviceStore = useDeviceStore();
const apiSdk = () => getApiSdk();

const orientationAction = ref<'left' | 'right' | 'mirror' | null>(null);
const isOrientationUpdating = computed(() => orientationAction.value !== null);

const orientationCamera = computed(() => {
  if (!props.cameraName) {
    return null;
  }

  const cameraOption = cameraStore.cameraOptions.find(
    (camera) => camera.value === props.cameraName,
  );
  const deviceCamera = deviceStore.getCamera(props.cameraName);

  return {
    label: cameraOption?.label ?? props.cameraName,
    value: props.cameraName,
    orientationFlag:
      deviceCamera?.settings?.orientation_flag ??
      cameraOption?.orientationFlag ??
      null,
  };
});

const ROTATE_RIGHT_MAP: Record<number, number> = {
  1: 6,
  6: 3,
  3: 8,
  8: 1,
  2: 7,
  7: 4,
  4: 5,
  5: 2,
};

const MIRROR_MAP: Record<number, number> = {
  1: 2,
  2: 1,
  3: 4,
  4: 3,
  5: 6,
  6: 5,
  7: 8,
  8: 7,
};

function getSafeOrientationFlag(): number {
  const flag = orientationCamera.value?.orientationFlag ?? null;
  return flag && flag >= 1 && flag <= 8 ? flag : 1;
}

async function applyOrientationFlag(nextFlag: number) {
  const camera = orientationCamera.value;
  if (!camera) {
    return;
  }

  try {
    await apiSdk().updateCameraNameSettings({
      client: apiClient,
      path: { name: camera.value },
      body: { orientation_flag: nextFlag },
    });
    await deviceStore.refreshFromRest();
    await cameraStore.fetchCameras();
  } catch (error) {
    console.error('Failed to update orientation flag', error);
    $q.notify({
      type: 'negative',
      message: 'Failed to update orientation flag',
    });
  }
}

function nextFlagWithMap(map: Record<number, number>): number {
  return map[getSafeOrientationFlag()] ?? 1;
}

function handleRotateRight() {
  orientationAction.value = 'right';
  void applyOrientationFlag(nextFlagWithMap(ROTATE_RIGHT_MAP)).finally(() => {
    orientationAction.value = null;
  });
}

function handleRotateLeft() {
  const inverse: Record<number, number> = {};
  Object.entries(ROTATE_RIGHT_MAP).forEach(([from, to]) => {
    inverse[to] = Number(from);
  });

  orientationAction.value = 'left';
  void applyOrientationFlag(nextFlagWithMap(inverse)).finally(() => {
    orientationAction.value = null;
  });
}

function handleToggleMirror() {
  orientationAction.value = 'mirror';
  void applyOrientationFlag(nextFlagWithMap(MIRROR_MAP)).finally(() => {
    orientationAction.value = null;
  });
}
</script>

<template>
  <div class="camera-orientation-panel">
    <p class="q-mb-md">
      Adjust the camera orientation and mirroring so that the preview matches
      your physical setup.
    </p>

    <div class="camera-orientation-panel__preview-wrapper">
      <div
        v-if="orientationCamera"
        class="camera-orientation-panel__controls row q-gutter-sm items-center justify-center no-wrap q-mb-sm"
      >
        <BaseButtonSecondary
          icon="rotate_left"
          label="Rotate left"
          :loading="orientationAction === 'left'"
          :disable="isOrientationUpdating"
          size="md"
          @click="handleRotateLeft"
        />
        <BaseButtonSecondary
          icon="flip"
          label="Mirror vertically"
          :loading="orientationAction === 'mirror'"
          :disable="isOrientationUpdating"
          size="md"
          @click="handleToggleMirror"
        />
        <BaseButtonSecondary
          icon="rotate_right"
          label="Rotate right"
          :loading="orientationAction === 'right'"
          :disable="isOrientationUpdating"
          size="md"
          @click="handleRotateRight"
        />
      </div>

      <div class="camera-orientation-panel__preview-inner">
        <CameraFastPreview
          :camera="orientationCamera"
          :active="!!orientationCamera"
          :enable-crop="false"
        >
          <template #placeholder>
            <div class="text-caption text-grey-6">
              Camera preview will appear once a camera is available.
            </div>
          </template>
        </CameraFastPreview>

        <div
          v-if="isOrientationUpdating"
          class="camera-orientation-panel__overlay"
        >
          <BaseSpinner size="md" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.camera-orientation-panel__preview-wrapper {
  max-width: 480px;
  margin: 0 auto;
}

.camera-orientation-panel__preview-inner {
  position: relative;
}

.camera-orientation-panel__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  pointer-events: none;
}

@media (max-width: 600px) {
  .camera-orientation-panel__controls {
    flex-wrap: wrap;
  }
}
</style>
