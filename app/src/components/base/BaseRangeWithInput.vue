<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: { min: number; max: number }
    label?: string
    min?: number
    max?: number
    step?: number
    markers?: boolean
    markerLabels?: number[]
    color?: string
    trackColor?: string
    inputMin?: number
    inputMax?: number
    inputWidth?: string
    containerWidth?: string
    tooltip?: string
    rules?: ((val: number) => true | string)[]
    disabled?: boolean
  }>(),
  {
    min: 0,
    max: 100,
    step: 1,
    markers: false,
    markerLabels: () => [],
    color: 'primary',
    trackColor: 'grey-3',
    inputWidth: '80px',
    containerWidth: '100%',
    rules: () => [(val: number) => (val >= 0) || 'Please enter a number < or equal to 0'],
    disabled: false
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: { min: number; max: number }): void
}>()

const range = computed({
  get: () => props.modelValue,
  set: (v: { min: number; max: number }) => emit('update:modelValue', v)
})

const minValue = computed({
  get: () => range.value.min,
  set: (v: number) => {
    range.value = { ...range.value, min: v }
  }
})

const maxValue = computed({
  get: () => range.value.max,
  set: (v: number) => {
    range.value = { ...range.value, max: v }
  }
})

const inputMin = computed(() => props.inputMin ?? props.min)
const inputMax = computed(() => props.inputMax ?? props.max)
</script>

<template>
  <div class="range-wrapper q-pa-sm" :style="{ width: containerWidth }">
    <label v-if="label" class="range-label text-body2">
      {{ label }}
      <q-tooltip v-if="tooltip">{{ tooltip }}</q-tooltip>
    </label>
    <q-input
      type="number"
      v-model.number="minValue"
      :min="inputMin"
      :max="inputMax"
      :step="step"
      dense
      outlined
      class="range-input"
      :style="`width: ${inputWidth}`"
      label="Min"
      :disable="disabled"
    >
      <q-tooltip v-if="tooltip">{{ tooltip }}</q-tooltip>
    </q-input>
    <q-range
      v-model="range"
      :min="min"
      :max="max"
      :step="step"
      :markers="markers"
      :marker-labels="markerLabels"
      :color="color"
      :track-color="trackColor"
      :disable="disabled"
      class="range-track"
      dense
    >
      <q-tooltip v-if="tooltip">{{ tooltip }}</q-tooltip>
    </q-range>
    <q-input
      type="number"
      v-model.number="maxValue"
      :min="inputMin"
      :max="inputMax"
      :step="step"
      dense
      outlined
      class="range-input"
      :style="`width: ${inputWidth}`"
      label="Max"
      :disable="disabled"
    >
      <q-tooltip v-if="tooltip">{{ tooltip }}</q-tooltip>
    </q-input>
  </div>
</template>

<style scoped>
.range-wrapper {
  display: flex;
  align-items: baseline;
  gap: 12px;
  max-width: 100%;
  flex-wrap: wrap;
}

.range-label {
  flex: 0 0 100%;
  white-space: nowrap;
  margin-bottom: 4px;
}

.range-input {
  flex: 0 0 auto;
}

.range-track {
  flex: 1 1 160px;
  min-width: 0;
  max-width: 100%;
}
</style>
