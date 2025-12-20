<template>
  <BaseSection title="Focus Settings">
    <q-tabs v-model="focusModeModel" dense active-color="primary" indicator-color="primary">
      <q-tab name="autofocus" label="Autofocus" />
      <q-tab name="manual" label="Manual" />
      <q-tab name="stacking" label="Stacking" />
    </q-tabs>

    <q-tab-panels v-model="focusModeModel" animated class="q-mt-md">
      <q-tab-panel name="autofocus">
        <div class="text-body2">
          Autofocus enabled
        </div>
      </q-tab-panel>
      <q-tab-panel name="manual">
        <BaseSliderWithInput
          v-model="manualFocusValueModel"
          label="Focus (diopters)"
          :slider-min="0"
          :slider-max="15"
          :slider-step="0.1"
          :input-min="0"
          :input-max="15"
          :tooltip="manualFocusDescription"
          @update:model-value="handleManualFocusInput"
        />
      </q-tab-panel>
      <q-tab-panel name="stacking">
        <BaseSliderWithInput
          v-model="focusStacksModel"
          label="Focus Stacks"
          :slider-min="2"
          :slider-max="15"
          :slider-step="1"
          :input-min="2"
          :input-max="99"
          :tooltip="focusStacksDescription"
        />

        <div class="q-mt-sm">
          <BaseRangeWithInput
            v-model="focusRangeModel"
            label="Focus Range"
            :min="0"
            :max="15"
            :step="0.1"
            :markers="true"
            :marker-labels="[5, 10, 15]"
            :input-min="0"
            :input-max="15"
            :tooltip="focusRangeDescription"
          />
        </div>
      </q-tab-panel>
    </q-tab-panels>
  </BaseSection>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import BaseSliderWithInput from 'components/base/BaseSliderWithInput.vue'
import BaseRangeWithInput from 'components/base/BaseRangeWithInput.vue'
import BaseSection from 'components/base/BaseSection.vue'

type FocusMode = 'autofocus' | 'manual' | 'stacking'

const props = defineProps<{
  focusMode: FocusMode
  manualFocusValue: number
  focusStacks: number
  focusRange: { min: number; max: number }
  afDescription: string
  manualFocusDescription: string
  focusStacksDescription: string
  focusRangeDescription: string
}>()

const emit = defineEmits<{
  (e: 'update:focusMode', value: FocusMode): void
  (e: 'update:manualFocusValue', value: number): void
  (e: 'update:focusStacks', value: number): void
  (e: 'update:focusRange', value: { min: number; max: number }): void
  (e: 'manual-focus-input', value: number): void
}>()

const focusModeModel = computed({
  get: () => props.focusMode,
  set: (value: FocusMode) => emit('update:focusMode', value)
})

const manualFocusValueModel = computed({
  get: () => props.manualFocusValue,
  set: (value: number) => emit('update:manualFocusValue', value)
})

const focusStacksModel = computed({
  get: () => props.focusStacks,
  set: (value: number) => emit('update:focusStacks', value)
})

const focusRangeModel = computed({
  get: () => props.focusRange,
  set: (value: { min: number; max: number }) => emit('update:focusRange', value)
})

const handleManualFocusInput = (value: number) => {
  emit('manual-focus-input', value)
}
</script>
