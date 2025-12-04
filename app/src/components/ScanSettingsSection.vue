<template>
  <div class="col-12">
    <div class="q-pa-sm">
      <label class="q-field__label">Number of Points</label>
      <div class="row items-center q-gutter-sm">
        <q-slider
          v-model="points"
          :min="1"
          :max="300"
          :step="1"
          :markers="true"
          :marker-labels="[70, 130, 200]"
          color="primary"
          track-color="grey-3"
          class="col"
        >
          <q-tooltip>{{ scanSettingDescription('points') }}</q-tooltip>
        </q-slider>
        <q-input
          v-model.number="points"
          type="number"
          :min="1"
          :max="500"
          dense
          outlined
          style="width: 80px"
          :rules="[(val: number) => val && val > 0 || 'Please enter a number > 0']"
        >
          <q-tooltip>Number of points in scanning path.</q-tooltip>
        </q-input>
      </div>
    </div>

    <q-checkbox v-model="enableFocusStacking" label="Focus Stacking" class="q-mt-md" />

    <div v-if="enableFocusStacking" class="q-mt-sm">
      <label class="q-field__label">Focus Stacks</label>
      <q-slider
        v-model="focusStacks"
        :min="1"
        :max="15"
        :step="1"
        color="primary"
        track-color="grey-3"
      >
        <q-tooltip>{{ scanSettingDescription('focus_stacks') }}</q-tooltip>
      </q-slider>
      <q-input
        type="number"
        v-model.number="focusStacks"
        :min="1"
        :max="99"
        dense
        outlined
        style="width: 80px"
        :rules="[(val: number) => val && val > 0 || 'Please enter a number > 0']"
      >
        <q-tooltip>{{ scanSettingDescription('focus_stacks') }}</q-tooltip>
      </q-input>
      <label class="q-field__label">Focus Range (diopters)</label>
      <div class="row items-center q-gutter-sm">
        <q-input
          type="number"
          v-model.number="focusRange.min"
          :min="0"
          :max="15"
          dense
          outlined
          style="width: 80px"
          label="Min"
        />
        <q-range
          v-model="focusRange"
          :min="0"
          :max="15"
          :step="0.1"
          :markers="true"
          :marker-labels="[5, 10, 15]"
          color="primary"
          track-color="grey-3"
          class="col"
          style="min-width: 200px"
        >
          <q-tooltip>{{ scanSettingDescription('focus_range') }}</q-tooltip>
        </q-range>
        <q-input
          type="number"
          v-model.number="focusRange.max"
          :min="0"
          :max="15"
          dense
          outlined
          style="width: 80px"
          label="Max"
        />
      </div>
    </div>

    <q-expansion-item label="Advanced Settings" header-class="text-h6" class="q-mt-md">
      <q-card>
        <q-card-section>
          <div class="row q-col-gutter-md">
            <div class="col-12">
              <q-select v-model="selectedCameraNameModel" :options="cameraOptions" label="Camera" />
            </div>

            <div class="col-12">
              <q-select v-model="pathMethod" :options="pathMethods" label="Path Method">
                <q-tooltip>{{ scanSettingDescription('path_method') }}</q-tooltip>
              </q-select>
            </div>
            <div class="col-12">
              <q-select v-model="imageFormat" :options="imageFormats" label="Image Format">
                <q-tooltip>{{ scanSettingDescription('image_format') }}</q-tooltip>
              </q-select>
            </div>
            <div class="col-6">
              <q-input type="number" v-model.number="minTheta" label="Min Theta (degrees)">
                <q-tooltip>{{ scanSettingDescription('min_theta') }}</q-tooltip>
              </q-input>
            </div>
            <div class="col-6">
              <q-input type="number" v-model.number="maxTheta" label="Max Theta (degrees)">
                <q-tooltip>{{ scanSettingDescription('max_theta') }}</q-tooltip>
              </q-input>
            </div>
            <div class="col-12">
              <div class="row items-center q-col-gutter-md">
                <div class="col-auto">
                  <q-checkbox v-model="optimizePath" label="Optimize Path">
                    <q-tooltip>{{ scanSettingDescription('optimize_path') }}</q-tooltip>
                  </q-checkbox>
                </div>
                <div class="col">
                  <q-input v-model="optimizationAlgorithm" label="Optimization Algorithm" :disable="!optimizePath">
                    <q-tooltip>{{ scanSettingDescription('optimization_algorithm') }}</q-tooltip>
                  </q-input>
                </div>
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-expansion-item>

    <q-btn
      :label="`Start scan with ${photoCount} photos`"
      type="submit"
      size="lg"
      color="primary"
      class="full-width q-mt-md"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

import type { ScanSetting } from 'src/generated/api'
import { fieldDescriptions, getFieldDescription } from 'src/generated/api/fieldDescriptions'

type CameraOption = { label: string; value: string }

const props = defineProps<{
  cameraOptions: CameraOption[]
  selectedCameraName: string
}>()
const cameraOptions = computed(() => props.cameraOptions)
const emit = defineEmits<{
  (e: 'update:selectedCameraName', value: string): void
}>()

const pathMethods = [
  { label: 'Fibonacci', value: 'fibonacci' },
  { label: 'Spiral', value: 'spiral' }
]

const imageFormats = ['jpeg', 'dng', 'rgb_array', 'yuv_array']

const selectedCameraNameModel = computed({
  get: () => props.selectedCameraName,
  set: value => emit('update:selectedCameraName', value)
})

const pathMethod = ref(pathMethods[0])
const points = ref(130)
const imageFormat = ref(imageFormats[0])
const minTheta = ref<number>(12.0)
const maxTheta = ref<number>(125.0)
const optimizePath = ref(true)
const optimizationAlgorithm = ref('nearest_neighbor')
const focusStacks = ref<number>(1)
const enableFocusStacking = ref(false)
const focusRange = ref({ min: 10.0, max: 15.0 })

const photoCount = computed(() => points.value * (enableFocusStacking.value ? focusStacks.value : 1))

type ScanSettingField = keyof (typeof fieldDescriptions)['ScanSetting']
const scanSettingDescription = (field: ScanSettingField) => getFieldDescription('ScanSetting', field)

const getScanSettings = () => {
  const settings: ScanSetting = {
    path_method: pathMethod.value.value as 'fibonacci' | 'spiral',
    points: points.value,
    image_format: imageFormat.value as 'jpeg' | 'dng' | 'rgb_array' | 'yuv_array'
  }

  if (minTheta.value !== undefined) settings.min_theta = minTheta.value
  if (maxTheta.value !== undefined) settings.max_theta = maxTheta.value
  if (optimizePath.value) settings.optimize_path = optimizePath.value
  if (optimizationAlgorithm.value) settings.optimization_algorithm = optimizationAlgorithm.value
  if (enableFocusStacking.value) {
    if (focusStacks.value !== undefined) settings.focus_stacks = focusStacks.value
    if (focusRange.value.min !== 0 && focusRange.value.max !== 0) settings.focus_range = [focusRange.value.min, focusRange.value.max]
  }

  return settings
}

defineExpose({ getScanSettings })
</script>
