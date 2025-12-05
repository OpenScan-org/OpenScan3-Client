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
    tooltip?: string
    rules?: ((val: number) => true | string)[]
  }>(),
  {
    min: 0,
    max: 100,
    step: 1,
    markers: false,
    markerLabels: () => [],
    color: 'primary',
    trackColor: 'grey-3',
    inputMin: 0,
    inputMax: 100,
    inputWidth: '80px',
    rules: () => [(val: number) => (val >= 0) || 'Please enter a number < or equal to 0']
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
</script>

<template>
  <div class="q-pa-sm">
    <label v-if="label" class="q-field__label">{{ label }}</label>
    <div class="row items-center q-gutter-sm">
      <q-input
        type="number"
        v-model.number="minValue"
        :min="inputMin"
        :max="inputMax"
        :step="step"
        dense
        outlined
        :style="`width: ${inputWidth}`"
        label="Min"
      />
      <q-range
        v-model="range"
        :min="min"
        :max="max"
        :step="step"
        :markers="markers"
        :marker-labels="markerLabels"
        :color="color"
        :track-color="trackColor"
        class="col"
        style="min-width: 200px"
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
        :style="`width: ${inputWidth}`"
        label="Max"
      />
    </div>
  </div>
</template>

<style scoped>
</style>
