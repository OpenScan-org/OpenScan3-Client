<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: number
    label?: string
    sliderMin?: number
    sliderMax?: number
    sliderStep?: number
    sliderMarkers?: boolean
    sliderMarkerLabels?: number[]
    sliderColor?: string
    sliderTrackColor?: string
    inputMin?: number
    inputMax?: number
    inputWidth?: string
    tooltip?: string
    rules?: ((val: number) => true | string)[]
    disabled?: boolean
  }>(),
  {
    sliderMin: 1,
    sliderMax: 100,
    sliderStep: 1,
    sliderMarkers: false,
    sliderMarkerLabels: () => [],
    sliderColor: 'primary',
    sliderTrackColor: 'grey-3',
    inputWidth: '80px',
    rules: () => [(val: number) => (val > 0) || 'Please enter a number > 0'],
    disabled: false
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()

const value = computed({
  get: () => props.modelValue,
  set: (v: number) => emit('update:modelValue', v)
})

const inputMin = computed(() => props.inputMin ?? props.sliderMin)
const inputMax = computed(() => props.inputMax ?? props.sliderMax)
const inputStep = computed(() => props.sliderStep)
</script>

<template>
  <div class="q-pa-sm">
    <label v-if="label" class="q-field__label">{{ label }}</label>
    <div class="row items-center q-gutter-sm">
      <q-slider
        v-model="value"
        :min="sliderMin"
        :max="sliderMax"
        :step="sliderStep"
        :markers="sliderMarkers"
        :marker-labels="sliderMarkerLabels"
        :color="sliderColor"
        :track-color="sliderTrackColor"
        :disable="disabled"
        class="col"
      >
        <q-tooltip v-if="tooltip">{{ tooltip }}</q-tooltip>
      </q-slider>
      <q-input
        v-model.number="value"
        type="number"
        :min="inputMin"
        :max="inputMax"
        :step="inputStep"
        dense
        outlined
        :style="`width: ${inputWidth}`"
        :rules="rules"
        :disable="disabled"
      >
        <q-tooltip v-if="tooltip">{{ tooltip }}</q-tooltip>
      </q-input>
    </div>
  </div>
</template>

<style scoped>
</style>
