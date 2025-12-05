<template>
  <div class="col-12">
    <BaseSliderWithInput
      v-model="points"
      label="Number of Points"
      :slider-min="1"
      :slider-max="300"
      :slider-step="1"
      :slider-markers="false"
      :slider-marker-labels="[70, 130, 200]"
      :input-min="1"
      :input-max="500"
      :tooltip="scanSettingDescription('points')"
    />

    <div class="q-mt-md">
      <div class="row items-center q-col-gutter-sm">
        <div class="col-auto">
          <q-checkbox v-model="enableFocusStacking" label="Focus Stacking" />
        </div>
        <div class="col">
          <BaseSliderWithInput
            v-model="focusStacks"
            label="Focus Stacks"
            :slider-min="2"
            :slider-max="15"
            :slider-step="1"
            :input-min="2"
            :input-max="99"
            :tooltip="scanSettingDescription('focus_stacks')"
            :disabled="!enableFocusStacking"
          />
        </div>
      </div>

      <div class="q-mt-sm">
        <BaseRangeWithInput
          v-model="focusRange"
          label="Focus Range (diopters)"
          :min="0"
          :max="15"
          :step="0.1"
          :markers="true"
          :marker-labels="[5, 10, 15]"
          :input-min="0"
          :input-max="15"
          :tooltip="scanSettingDescription('focus_range')"
          :disabled="!enableFocusStacking"
        />
      </div>
    </div>

    <q-expansion-item label="Advanced Settings" header-class="text-h6" class="q-mt-md">
      <q-card>
        <q-card-section>
          <div class="row q-col-gutter-md">
            <div class="col-12">
              <q-select v-model="imageFormat" :options="imageFormats" label="Image Format">
                <q-tooltip>{{ scanSettingDescription('image_format') }}</q-tooltip>
              </q-select>
            </div>
            <div class="col-12">
              <q-select v-model="pathMethod" :options="pathMethods" label="Path Method">
                <q-tooltip>{{ scanSettingDescription('path_method') }}</q-tooltip>
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

import BaseSliderWithInput from './base/BaseSliderWithInput.vue'
import BaseRangeWithInput from './base/BaseRangeWithInput.vue'
import type { ScanSetting } from 'src/generated/api'
import { fieldDescriptions, getFieldDescription } from 'src/generated/api/fieldDescriptions'

const pathMethods = [
  { label: 'Fibonacci', value: 'fibonacci' },
  { label: 'Spiral', value: 'spiral' }
]

const imageFormats = ['jpeg', 'dng', 'rgb_array', 'yuv_array']

const pathMethod = ref(pathMethods[0])
const points = ref(130)
const imageFormat = ref(imageFormats[0])
const minTheta = ref<number>(12.0)
const maxTheta = ref<number>(125.0)
const optimizePath = ref(true)
const optimizationAlgorithm = ref('nearest_neighbor')
const focusStacks = ref<number>(2)
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
