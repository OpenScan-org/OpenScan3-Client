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
  saveConfig: false,
  rebootMessage: 'The scanner will restart. Continue?',
  shutdownMessage: 'The scanner will shut down. Continue?'
})

const $q = useQuasar()

const rebooting = ref(false)
const shuttingDown = ref(false)

async function rebootAction() {
  rebooting.value = true
  try {
    await rebootDeviceApi({
      client: apiClient,
      query: { save_config: props.saveConfig ?? false }
    })
    $q.notify({ type: 'positive', message: 'Reboot triggered.' })
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Reboot failed.' })
    throw error
  } finally {
    rebooting.value = false
  }
}

async function shutdownAction() {
  shuttingDown.value = true
  try {
    await shutdownDeviceApi({
      client: apiClient,
      query: { save_config: props.saveConfig ?? false }
    })
    $q.notify({ type: 'positive', message: 'Shutdown triggered.' })
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Shutdown failed.' })
    throw error
  } finally {
    shuttingDown.value = false
  }
}

function confirmReboot() {
  $q.dialog({
    title: 'Confirm reboot',
    message: props.rebootMessage,
    cancel: true,
    persistent: true
  }).onOk(rebootAction)
}

function confirmShutdown() {
  $q.dialog({
    title: 'Confirm shutdown',
    message: props.shutdownMessage,
    cancel: true,
    persistent: true
  }).onOk(shutdownAction)
}
</script>
