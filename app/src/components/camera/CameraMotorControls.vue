<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseMotorButtonBar from 'components/base/BaseMotorButtonBar.vue'
import BaseButtonIconSecondary from 'components/base/BaseButtonIconSecondary.vue'
import { useDeviceStore } from 'src/stores/device'
import { apiClient, getApiSdk } from 'src/services/apiClient'

const props = defineProps<{ disable?: boolean }>()
const emit = defineEmits<{
  (event: 'busy-change', busy: boolean): void
  (event: 'moved'): void
  (event: 'calibrated'): void
}>()
const deviceStore = useDeviceStore()
const turntableBusy = ref(false)
const rotorBusy = ref(false)
const homeBusy = ref(false)
const busy = computed(() => turntableBusy.value || rotorBusy.value || homeBusy.value)
const disabled = computed(() => props.disable || busy.value)
watch(busy, value => emit('busy-change', value))

async function moveHome() {
  if (disabled.value) return
  homeBusy.value = true
  try {
    await deviceStore.ensureConnected()
    await getApiSdk().moveToPosition({
      client: apiClient,
      body: { theta: 90, fi: 0, r: 1 },
      throwOnError: true
    })
    await deviceStore.refreshFromRest()
    emit('moved')
  } catch (error) {
    console.error('Failed to move to home position', error)
  } finally {
    homeBusy.value = false
  }
}
</script>

<template>
  <q-btn-group unelevated rounded>
    <BaseMotorButtonBar
      motor-name="turntable"
      :step-degrees="20"
      negative-icon="keyboard_arrow_left"
      positive-icon="keyboard_arrow_right"
      negative-tooltip="Rotate turntable left"
      positive-tooltip="Rotate turntable right"
      :show-calibrate="false"
      :disable="disabled"
      :refresh-after-move="true"
      @busy-change="turntableBusy = $event"
      @moved="emit('moved')"
    />
    <span class="camera-motor-controls__divider" aria-hidden="true" />
    <BaseMotorButtonBar
      motor-name="rotor"
      :step-degrees="10"
      negative-icon="keyboard_arrow_up"
      positive-icon="keyboard_arrow_down"
      negative-tooltip="Move rotor up"
      positive-tooltip="Move rotor down"
      :disable="disabled"
      :refresh-after-move="true"
      @busy-change="rotorBusy = $event"
      @moved="emit('moved')"
      @calibrated="emit('calibrated')"
    />
    <BaseButtonIconSecondary
      icon="home"
      size="sm"
      aria-label="Return to home position"
      :disable="disabled"
      :loading="homeBusy"
      @click="moveHome"
    >
      <q-tooltip anchor="bottom middle" self="top middle">Return to home position</q-tooltip>
    </BaseButtonIconSecondary>
  </q-btn-group>
</template>

<style scoped>
.camera-motor-controls__divider {
  align-self: center;
  height: 24px;
  border-left: 1px solid rgba(255, 255, 255, 0.8);
}
</style>
