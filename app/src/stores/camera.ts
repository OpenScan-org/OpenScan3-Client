import { defineStore } from 'pinia';
import { apiClient, API_BASE_URL } from 'src/services/apiClient';
import { getCameras, type Camera } from 'src/generated/api';

export const useCameraStore = defineStore('camera', {
  state: () => ({
    cameras: [] as Camera[],
    selectedCamera: null as string | null,
    loading: false,
    error: null as string | null,
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
  },
});
