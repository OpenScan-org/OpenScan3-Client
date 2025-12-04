import { defineStore } from 'pinia';
import { apiClient, API_BASE_URL } from 'src/services/apiClient';
import { getCameras, type Camera } from 'src/generated/api';

const CAMERA_SETTINGS_CHANGE = /^cameras\.([^\.\s]+)\.settings(?:\.|$)/;

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
    previewUrl: (state) => state.selectedCamera ? `${API_BASE_URL}cameras/${state.selectedCamera}/preview` : null,
    getPreviewUrl: () => (cameraName: string) => cameraName ? `${API_BASE_URL}cameras/${cameraName}/preview` : null,
    getPhotoUrl: () => (cameraName: string) => cameraName ? `${API_BASE_URL}cameras/${cameraName}/photo` : null,
  },
  actions: {
    async fetchCameras() {
      this.loading = true;
      this.error = null;
      try {
        const data = await getCameras({ client: apiClient });
        this.cameras = Object.values(data ?? {});
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
    clearPhoto() {
      if (this.photoObjectUrl) {
        URL.revokeObjectURL(this.photoObjectUrl);
      }
      this.photoBlob = null;
      this.photoObjectUrl = null;
      this.photoError = null;
    },
    handleCameraSettingsChanged(paths: string[]) {
      const affectedCameras = getCameraNamesWithSettingChanges(paths);
      if (!affectedCameras.size || !this.selectedCamera) {
        return;
      }

      if (affectedCameras.has(this.selectedCamera)) {
        void this.fetchPhoto(this.selectedCamera);
        void this.fetchCameras();
      }
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

        this.clearPhoto();
        this.photoBlob = blob;
        this.photoObjectUrl = URL.createObjectURL(blob);
      } catch (err) {
        console.error(err);
        this.photoError = 'Photo could not be loaded.';
      } finally {
        this.photoLoading = false;
      }
    },
  },
});
