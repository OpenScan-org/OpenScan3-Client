<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseWizard from 'components/base/BaseWizard.vue'
import ScanWizardSiftStep from 'components/scan/ScanWizardSiftStep.vue'
import { getReadinessDebugCase, readinessDebugCases } from 'src/utils/readinessDebugCases'

const route = useRoute()
const router = useRouter()
const lastAction = ref('')
const example = computed(() => getReadinessDebugCase(typeof route.query.case === 'string' ? route.query.case : 'good'))
const cropGrades = ['bad', 'okay', 'good', 'great', 'insufficient_data'] as const
const crop = computed(() => cropGrades.find(value => value === route.query.crop) ?? example.value.quality.spatial_coverage)
const result = computed(() => ({ analysis_type: 'scan_analysis', sift_analysis: { quality: { ...example.value.quality, spatial_coverage: crop.value } } }))
const shutter = computed(() => {
  if (typeof route.query.shutter !== 'string' || !route.query.shutter.trim()) return example.value.shutterMs
  const value = Number(route.query.shutter)
  return Number.isFinite(value) && value > 0 ? value : null
})
const steps = [
  { id: 'project', label: 'Project' }, { id: 'cropping', label: 'Cropping' },
  { id: 'analysis', label: 'Scan readiness' }, { id: 'quality', label: 'Quality' }
]
function selectCase(id: string) {
  lastAction.value = ''
  void router.replace({ query: { ...route.query, case: id } })
}
</script>

<template>
  <q-page class="q-pa-lg">
    <div class="row justify-center q-col-gutter-md">
      <div class="col-12 col-md-10 col-lg-8">
        <q-banner class="bg-blue-1 q-mb-md">
          Debug preview · simulated analysis data · no scan or analysis will be started.
        </q-banner>
        <div class="row q-col-gutter-md q-mb-md">
          <q-select
            class="col-12 col-sm-6"
            :model-value="example.id"
            :options="readinessDebugCases.map(value => ({ label: value.label, value: value.id }))"
            emit-value map-options outlined dense label="Example"
            @update:model-value="selectCase"
          />
          <q-select
            class="col-12 col-sm-3"
            :model-value="typeof route.query.shutter === 'string' ? route.query.shutter : String(example.shutterMs)"
            :options="[{ label: '20 ms · no hint', value: '20' }, { label: '8 ms · polarizer hint', value: '8' }, { label: '10 ms · boundary', value: '10' }, { label: 'Unknown exposure', value: 'unknown' }]"
            emit-value map-options outlined dense label="Exposure"
            @update:model-value="value => router.replace({ query: { ...route.query, shutter: value } })"
          />
          <q-select
            class="col-12 col-sm-3"
            :model-value="crop"
            :options="cropGrades"
            outlined dense label="Crop coverage"
            @update:model-value="value => router.replace({ query: { ...route.query, crop: value } })"
          />
        </div>
        <BaseWizard model-value="analysis" :steps="steps" title="Scan Wizard · debug preview">
          <template #default="{ step }">
            <ScanWizardSiftStep v-if="step.id === 'analysis'" :key="`${example.id}-${shutter}`" :result="result" :shutter-ms="shutter" @retry="lastAction = 'Analyse again clicked (simulation only).'" />
          </template>
          <template #navigation>
            <div class="row justify-between">
              <q-btn outline color="primary" label="Back" @click="lastAction = 'Back clicked (simulation only).'" />
              <q-btn unelevated color="primary" label="Next" @click="lastAction = 'Next clicked (simulation only).'" />
            </div>
            <p v-if="lastAction" class="text-caption q-mt-sm" role="status">{{ lastAction }}</p>
          </template>
        </BaseWizard>
      </div>
    </div>
  </q-page>
</template>
