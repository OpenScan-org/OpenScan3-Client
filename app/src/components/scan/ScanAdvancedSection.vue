<template>
  <BaseSection title="Advanced scan options">
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-select
          v-model="imageFormatModel"
          :options="imageFormats"
          label="Image Format"
          dense
          outlined
        >
          <q-tooltip>{{ imageFormatDescription }}</q-tooltip>
        </q-select>
      </div>
      <div class="col-12">
        <q-select
          v-model="pathMethodModel"
          :options="pathMethods"
          label="Path Method"
          dense
          outlined
        >
          <q-tooltip>{{ pathMethodDescription }}</q-tooltip>
        </q-select>
      </div>
      <div class="col-6">
        <q-input
          type="number"
          v-model.number="minThetaModel"
          label="Min Theta (degrees)"
          dense
          outlined
        >
          <q-tooltip>{{ minThetaDescription }}</q-tooltip>
        </q-input>
      </div>
      <div class="col-6">
        <q-input
          type="number"
          v-model.number="maxThetaModel"
          label="Max Theta (degrees)"
          dense
          outlined
        >
          <q-tooltip>{{ maxThetaDescription }}</q-tooltip>
        </q-input>
      </div>
      <div class="col-12">
        <div class="row items-center q-col-gutter-md">
          <div class="col-auto">
            <q-checkbox v-model="optimizePathModel" label="Optimize Path" dense>
              <q-tooltip>{{ optimizePathDescription }}</q-tooltip>
            </q-checkbox>
          </div>
          <div class="col">
            <q-input
              v-model="optimizationAlgorithmModel"
              label="Optimization Algorithm"
              :disable="!optimizePathModel"
              dense
              outlined
            >
              <q-tooltip>{{ optimizationAlgorithmDescription }}</q-tooltip>
            </q-input>
          </div>
        </div>
      </div>
    </div>
  </BaseSection>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import BaseSection from 'components/base/BaseSection.vue'

type PathMethodOption = { label: string; value: string }

const props = defineProps<{
  imageFormat: string
  imageFormats: string[]
  pathMethod: PathMethodOption
  pathMethods: PathMethodOption[]
  minTheta: number
  maxTheta: number
  optimizePath: boolean
  optimizationAlgorithm: string
  imageFormatDescription: string
  pathMethodDescription: string
  minThetaDescription: string
  maxThetaDescription: string
  optimizePathDescription: string
  optimizationAlgorithmDescription: string
}>()

const emit = defineEmits<{
  (e: 'update:imageFormat', value: string): void
  (e: 'update:pathMethod', value: PathMethodOption): void
  (e: 'update:minTheta', value: number): void
  (e: 'update:maxTheta', value: number): void
  (e: 'update:optimizePath', value: boolean): void
  (e: 'update:optimizationAlgorithm', value: string): void
}>()

const imageFormatModel = computed({
  get: () => props.imageFormat,
  set: (value: string) => emit('update:imageFormat', value)
})

const pathMethodModel = computed({
  get: () => props.pathMethod,
  set: (value: PathMethodOption) => emit('update:pathMethod', value)
})

const minThetaModel = computed({
  get: () => props.minTheta,
  set: (value: number) => emit('update:minTheta', value)
})

const maxThetaModel = computed({
  get: () => props.maxTheta,
  set: (value: number) => emit('update:maxTheta', value)
})

const optimizePathModel = computed({
  get: () => props.optimizePath,
  set: (value: boolean) => emit('update:optimizePath', value)
})

const optimizationAlgorithmModel = computed({
  get: () => props.optimizationAlgorithm,
  set: (value: string) => emit('update:optimizationAlgorithm', value)
})
</script>
