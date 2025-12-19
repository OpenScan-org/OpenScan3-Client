<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: number;
    label?: string;
    sliderMin?: number;
    sliderMax?: number;
    sliderStep?: number;
    sliderMarkers?: boolean;
    sliderMarkerLabels?: number[];
    sliderColor?: string;
    sliderTrackColor?: string;
    inputMin?: number;
    inputMax?: number;
    inputWidth?: string;
    containerWidth?: string;
    labelWidth?: string;
    labelMinWidth?: string;
    tooltip?: string;
    rules?: ((val: number) => true | string)[];
    disabled?: boolean;
  }>(),
  {
    sliderMin: 1,
    sliderMax: 100,
    sliderStep: 1,
    sliderMarkers: false,
    sliderMarkerLabels: () => [],
    sliderColor: 'primary',
    sliderTrackColor: 'grey-3',
    inputWidth: '64px',
    containerWidth: '100%',
    disabled: false,
    labelWidth: '30%',
    labelMinWidth: '80px',
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void;
}>();

const value = computed({
  get: () => props.modelValue,
  set: (v: number) => emit('update:modelValue', v),
});

const inputMin = computed(() => props.inputMin ?? props.sliderMin);
const inputMax = computed(() => props.inputMax ?? props.sliderMax);
const inputStep = computed(() => props.sliderStep);
</script>

<template>
  <div class="slider-wrapper q-pa-xs" :style="{ width: containerWidth }">
    <label
      v-if="label"
      class="slider-label text-body2"
      :style="{ flexBasis: labelWidth, minWidth: labelMinWidth }"
    >
      {{ label }}
      <q-tooltip v-if="tooltip">{{ tooltip }}</q-tooltip>
    </label>
    <q-input
      v-model.number="value"
      type="number"
      :min="inputMin"
      :max="inputMax"
      :step="inputStep"
      dense
      outlined
      class="slider-input"
      :style="`width: ${inputWidth}`"
      input-class="text-caption"
      :rules="rules"
      :disable="disabled"
    >
      <q-tooltip v-if="tooltip">{{ tooltip }}</q-tooltip>
    </q-input>
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
      class="slider-track"
      dense
    >
      <q-tooltip v-if="tooltip">{{ tooltip }}</q-tooltip>
    </q-slider>
  </div>
</template>

<style scoped>
.slider-wrapper {
  display: flex;
  align-items: baseline;
  gap: 12px;
  max-width: 100%;
}

.slider-label {
  flex: 0 0 auto;
  white-space: normal;
  text-align: left;
  line-height: 1.1;
}

.slider-track {
  flex: 1 1 0;
  min-width: 0;
}

.slider-input {
  flex: 0 0 auto;
}
</style>
