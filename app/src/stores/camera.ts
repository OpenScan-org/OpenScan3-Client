import { defineStore } from 'pinia';
import { apiClient, buildApiUrl, getApiSdk } from 'src/services/apiClient';
import { type Camera } from 'src/generated/api';

const CAMERA_SETTINGS_CHANGE = /^cameras\.([^.\s]+)\.settings(?:\.|$)/;
const PHOTO_DEBOUNCE_MS = 800;
let photoDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function getCameraNamesWithSettingChanges(paths: string[] | null | undefined) {
  const affected = new Set<string>();
  if (!paths) {
    return affected;
  }

  paths.forEach((path) => {
    const match = path.match(CAMERA_SETTINGS_CHANGE);
    if (match?.[1]) {
      affected.add(match[1]);
    }
  });

  return affected;
}

export const useCameraStore = defineStore('camera', {
  state: () => ({
    cameras: [] as Camera[],
    selectedCamera: null as string | null,
    loading: false,
    error: null as string | null,
    photoBlob: null as Blob | null,
    photoObjectUrl: null as string | null,
    photoLoading: false,
    photoError: null as string | null,
  }),
  getters: {
    cameraOptions: (state) => state.cameras.map(camera => ({
      label: camera.name,
      value: camera.name,
      orientationFlag: camera.settings?.orientation_flag ?? null
    })),
    previewUrl: (state) => {
      return state.selectedCamera ? buildApiUrl(`cameras/${state.selectedCamera}/preview?mode=stream`) : null;
    },
    getPreviewUrl: () => {
      return (cameraName: string, fps?: number) => {
        if (!cameraName) {
          return null;
        }

        const fpsParam = typeof fps === 'number' ? `&fps=${fps}` : '';
        return buildApiUrl(`cameras/${cameraName}/preview?mode=stream${fpsParam}`);
      };
    },
    getPhotoUrl: () => {
      return (cameraName: string) => {
        return cameraName ? buildApiUrl(`cameras/${cameraName}/photo`) : null;
      };
    },
  },
  actions: {
    async fetchCameras() {
      this.loading = true;
      this.error = null;
      try {
        const response = await getApiSdk().getCameras({ client: apiClient });
        const data = (response as { data?: Record<string, Camera> } | Record<string, Camera>)?.['data'] ?? response;
        this.cameras = Object.values((data ?? {}) as Record<string, Camera>);
        // Set selectedCamera to first if not set
        if (!this.selectedCamera && this.cameras.length > 0) {
          this.selectedCamera = this.cameras[0].name;
        }
      } catch (error) {
        this.error = 'Error loading cameras';
        console.error(error);
      } finally {
        this.loading = false;
      }
    },
    setSelectedCamera(cameraName: string | null) {
      this.selectedCamera = cameraName;
    },
    setPhoto(blob: Blob | null, { immediateCleanup = false }: { immediateCleanup?: boolean } = {}) {
      const previousUrl = this.photoObjectUrl;

      if (!blob) {
        this.photoBlob = null;
        this.photoObjectUrl = null;
      } else {
        this.photoBlob = blob;
        this.photoObjectUrl = URL.createObjectURL(blob);
      }

      if (previousUrl) {
        if (immediateCleanup) {
          URL.revokeObjectURL(previousUrl);
        } else {
          window.setTimeout(() => URL.revokeObjectURL(previousUrl), 1000);
        }
      }
    },
    clearPhoto() {
      this.setPhoto(null, { immediateCleanup: true });
      this.photoError = null;
    },
    handleCameraSettingsChanged(paths: string[]) {
      const affectedCameras = getCameraNamesWithSettingChanges(paths);
      if (!affectedCameras.size || !this.selectedCamera) {
        return;
      }

      if (affectedCameras.has(this.selectedCamera)) {
        const onlyOrientationChange = paths.every((path) => path.includes('.settings.orientation_flag'));

        if (!onlyOrientationChange) {
          this.debouncedFetchPhoto(this.selectedCamera);
        }

        void this.fetchCameras();
      }
    },
    debouncedFetchPhoto(cameraName: string) {
      this.photoLoading = true;
      if (photoDebounceTimer) {
        clearTimeout(photoDebounceTimer);
      }
      photoDebounceTimer = setTimeout(() => {
        photoDebounceTimer = null;
        void this.fetchPhoto(cameraName);
      }, PHOTO_DEBOUNCE_MS);
    },
    async fetchPhoto(cameraName?: string | null) {
      const name = cameraName ?? this.selectedCamera;
      if (!name) {
        return;
      }

      const url = this.getPhotoUrl(name);
      if (!url) {
        return;
      }

      this.photoLoading = true;
      this.photoError = null;

      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
          this.photoError = 'Photo could not be loaded.';
          return;
        }

        const blob = await response.blob();
        this.setPhoto(blob);
      } catch (err) {
        console.error(err);
        this.photoError = 'Photo could not be loaded.';
      } finally {
        this.photoLoading = false;
      }
    },
  },
});
