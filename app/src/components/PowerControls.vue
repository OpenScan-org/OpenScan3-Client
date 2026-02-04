<template>
  <slot
    :confirm-reboot="confirmReboot"
    :confirm-shutdown="confirmShutdown"
    :rebooting="rebooting"
    :shutting-down="shuttingDown"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { apiClient } from 'src/services/apiClient'
import { reboot as rebootDeviceApi, shutdown as shutdownDeviceApi } from 'src/generated/api'

type PowerControlsProps = {
  saveConfig?: boolean
  rebootMessage?: string
  shutdownMessage?: string
}

const props = withDefaults(defineProps<PowerControlsProps>(), {
  saveConfig: true,
  rebootMessage: 'The scanner will restart. Continue?',
  shutdownMessage: 'The scanner will shut down. Continue?'
})

const $q = useQuasar()

const rebooting = ref(false)
const shuttingDown = ref(false)

const SAVE_SETTINGS_OPTION = 'save-settings'

function buildOptionsModel(defaultValue: boolean | undefined) {
  return (defaultValue ?? true) ? [SAVE_SETTINGS_OPTION] : []
}

function handlePowerConfirmation(
  params: {
    title: string
    message: string
    action: (saveConfig: boolean) => Promise<void>
  }
) {
  $q.dialog({
    class: 'power-controls-dialog',
    title: params.title,
    message: params.message,
    cancel: true,
    persistent: true,
    options: {
      type: 'checkbox',
      model: buildOptionsModel(props.saveConfig),
      items: [
        {
          label: 'Save settings',
          value: SAVE_SETTINGS_OPTION
        }
      ]
    }
  }).onOk((selection) => {
    const selections = Array.isArray(selection)
      ? selection
      : selection
        ? [selection]
        : []
    const shouldSave = selections.includes(SAVE_SETTINGS_OPTION)
    void params.action(shouldSave)
  })
}

async function rebootAction(saveConfig: boolean) {
  rebooting.value = true
  try {
    await rebootDeviceApi({
      client: apiClient,
      query: { save_config: saveConfig }
    })
  } catch (error) {
    console.error('Reboot failed.', error)
    throw error
  } finally {
    rebooting.value = false
  }
}

async function shutdownAction(saveConfig: boolean) {
  shuttingDown.value = true
  try {
    await shutdownDeviceApi({
      client: apiClient,
      query: { save_config: saveConfig }
    })
  } catch (error) {
    console.error('Shutdown failed.', error)
    throw error
  } finally {
    shuttingDown.value = false
  }
}

function confirmReboot() {
  handlePowerConfirmation({
    title: 'Confirm reboot',
    message: props.rebootMessage,
    action: rebootAction
  })
}

function confirmShutdown() {
  handlePowerConfirmation({
    title: 'Confirm shutdown',
    message: props.shutdownMessage,
    action: shutdownAction
  })
}
</script>

<style>
.power-controls-dialog .q-dialog__section--options {
  border-top: 0;
  border-bottom: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.power-controls-dialog .q-separator {
  display: none;
}
</style>
