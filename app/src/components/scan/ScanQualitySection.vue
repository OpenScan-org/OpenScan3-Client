<template>
  <BaseSection title="Scan quality">
    <BaseSliderWithInput
      v-model="pointsModel"
      label="Number of Points"
      :slider-min="1"
      :slider-max="300"
      :slider-step="1"
      :slider-markers="false"
      :slider-marker-labels="[70, 130, 200]"
      :input-min="1"
      :input-max="500"
      :tooltip="pointsTooltip"
    />
  </BaseSection>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import BaseSliderWithInput from 'components/base/BaseSliderWithInput.vue'
import BaseSection from 'components/base/BaseSection.vue'

const props = defineProps<{
  points: number
  pointsTooltip?: string
}>()

const emit = defineEmits<{
  (e: 'update:points', value: number): void
}>()

const pointsModel = computed({
  get: () => props.points,
  set: value => emit('update:points', value)
})
</script>
