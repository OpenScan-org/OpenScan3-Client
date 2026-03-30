import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { apiClient, getApiBaseUrl, getApiSdk } from 'src/services/apiClient'

export type CloudResetCallback = () => void | Promise<void>

export function useCloudResetGuard() {
  const $q = useQuasar()
  const cloudResetLoading = ref(false)
  const apiSdk = () => getApiSdk()

  const promptCloudReset = (projectName: string, onAfterReset: CloudResetCallback) => {
    const downloadUrl = `${getApiBaseUrl()}projects/${encodeURIComponent(projectName)}/model/zip`
    $q.dialog({
      title: 'Existing model',
      message:
        `This project already has a reconstructed model. <a href="${downloadUrl}" target="_blank" rel="noopener noreferrer">Download the current model</a> before adding new scans. ` +
        'Continuing will overwrite the existing model.',
      html: true,
      ok: 'Reset & continue',
      cancel: true,
      persistent: true
    }).onOk(async () => {
      try {
        cloudResetLoading.value = true
        await apiSdk().resetCloudProject({ path: { project_name: projectName }, client: apiClient })
        await onAfterReset()
      } catch (error) {
        console.error('Could not reset cloud project.', error)
      } finally {
        cloudResetLoading.value = false
      }
    })
  }

  return {
    cloudResetLoading,
    promptCloudReset
  }
}
