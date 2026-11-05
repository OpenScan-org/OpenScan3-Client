<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseBanner from 'components/base/BaseBanner.vue'
import BaseButtonSecondary from 'components/base/BaseButtonSecondary.vue'
import { readScanAnalysis } from 'src/utils/scanWizardPlan'
import { buildSiftGrids, type SiftGridMetric } from 'src/utils/siftVisualization'

const props = defineProps<{ result: unknown; disabled?: boolean }>()
const emit = defineEmits<{ (event: 'retry'): void }>()
const sift = computed(() => readScanAnalysis(props.result)?.sift_analysis)
const quality = computed(() => sift.value?.quality)
const status = computed(() => quality.value?.overall_status)
const metric = ref<SiftGridMetric>('matchable_feature_counts')
const grids = computed(() => buildSiftGrids(sift.value, metric.value))
const labels: Record<string, string> = { good: 'Good', warning: 'Needs attention', poor: 'Weak' }
const colors: Record<string, string> = { good: 'positive', warning: 'warning', poor: 'negative' }
const feedback = computed(() => {
  if (status.value === 'good') return 'Good conditions for reconstructing your object.'
  if (quality.value?.feature_quality === 'poor') return 'Your object needs more recognizable surface detail.'
  if (quality.value?.matching_quality === 'poor') return 'The views could not be matched reliably.'
  if (status.value === 'poor') return 'Recognizable detail is too unevenly distributed across the analysed area.'
  if (status.value === 'warning') return 'Some parts of your object may be difficult to reconstruct.'
  return 'Feature quality could not be assessed. You can still continue to choose the scan quality.'
})
const ratings = computed(() => [
  { label: 'Surface detail', status: quality.value?.feature_quality, description: 'Distinctive points that help identify the same surface in different photos.' },
  { label: 'Feature distribution', status: quality.value?.spatial_coverage, description: 'How well these points are spread across the analysed image area.' },
  { label: 'Matching between views', status: quality.value?.matching_quality, description: 'How reliably the same points are recognized after rotation.' }
])
const tips = computed(() => {
  const value = quality.value
  if (!value) return []
  const hints: string[] = []
  if (value.feature_quality !== 'good') hints.push('Reduce reflections or add visible surface texture. More photos alone will not add surface detail.')
  if (value.spatial_coverage !== 'good') hints.push('Check that the selected rectangle tightly surrounds the object and includes its important surfaces.')
  if (value.matching_quality !== 'good') hints.push('Use steady lighting and check that the object does not wobble or move on the turntable.')
  return hints
})
function number(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : 'Unavailable'
}
</script>

<template>
  <div class="q-gutter-y-md">
    <BaseBanner :background-class="status === 'good' ? 'bg-green-1' : 'bg-amber-2'" :text-class="status === 'good' ? 'text-positive' : 'text-black'">
      <div class="text-subtitle2">{{ feedback }}</div>
      <template v-if="status !== 'good'" #action>
        <BaseButtonSecondary label="Adjust object and analyse again" :disable="disabled" @click="emit('retry')" />
      </template>
    </BaseBanner>
    <p v-if="sift" class="text-body2 text-grey-7">We compared two views{{ Number.isFinite(sift.turntable_angle) ? ` separated by ${sift.turntable_angle}°` : '' }} to check whether the object has enough recognizable detail.</p>
    <div class="row q-col-gutter-sm">
      <div v-for="rating in ratings" :key="rating.label" class="col-12 col-sm-4">
        <q-card flat bordered class="q-pa-sm sift-step__rating">
          <div class="text-subtitle2">{{ rating.label }}</div>
          <q-badge class="q-my-sm" :color="colors[rating.status ?? ''] ?? 'grey-7'">{{ labels[rating.status ?? ''] ?? 'Unavailable' }}</q-badge>
          <div class="text-caption text-grey-7">{{ rating.description }}</div>
        </q-card>
      </div>
    </div>

    <div v-if="grids.length">
      <div class="text-subtitle1 q-mb-sm">Where are the features?</div>
      <q-btn-toggle v-model="metric" :options="[{ label: 'Recognized in both views', value: 'matchable_feature_counts' }, { label: 'All detected features', value: 'feature_counts' }]" no-caps unelevated toggle-color="primary" class="sift-step__toggle q-mb-md" aria-label="Feature map metric" />
      <div class="row q-col-gutter-md">
        <figure v-for="grid in grids" :key="grid.key" class="col-12 col-sm-6 sift-step__figure">
          <figcaption class="text-subtitle2 q-mb-sm">{{ grid.label }}</figcaption>
          <div class="sift-step__grid" :style="{ gridTemplateColumns: `repeat(${grid.columns}, minmax(0, 1fr))` }" role="img" :aria-label="`${grid.label}: ${metric === 'feature_counts' ? 'detected' : 'matched'} feature counts by image region`">
            <div v-for="(cell, index) in grid.cells" :key="index" class="sift-step__cell" :class="`sift-step__cell--${cell.level}`">
              {{ cell.count === null ? '—' : number(cell.count) }}
              <q-tooltip>Row {{ cell.row + 1 }}, column {{ cell.column + 1 }}: {{ cell.count === null ? 'measurement unavailable' : `${number(cell.count)} features` }}</q-tooltip>
            </div>
          </div>
        </figure>
      </div>
      <div class="sift-step__legend text-caption q-mt-sm">
        <span><i class="sift-step__cell--empty" /> No features</span>
        <span><i class="sift-step__cell--low" /> Below analysis threshold</span>
        <span><i class="sift-step__cell--light" /> Fewer</span>
        <span><i class="sift-step__cell--high" /> More</span>
      </div>
      <p class="text-caption text-grey-7 q-mt-sm">Each cell represents an image region. Both maps use the same colour scale. A dash means no measurement was returned.</p>
    </div>
    <p v-else class="text-body2 text-grey-7">No spatial feature map was returned. You can continue to choose the scan quality.</p>

    <div v-if="sift" class="row q-col-gutter-sm">
      <div class="col-6"><q-card flat bordered class="q-pa-sm"><div class="text-h6">{{ number(sift.mutual_match_count) }}</div><div class="text-caption">Points recognized in both views</div></q-card></div>
      <div class="col-6"><q-card flat bordered class="q-pa-sm"><div class="text-h6">{{ number(sift.geometric_inlier_count) }}</div><div class="text-caption">Matches verified by geometry</div></q-card></div>
    </div>
    <div v-if="tips.length" class="q-gutter-y-sm">
      <div class="text-subtitle2">What you can improve</div>
      <div v-for="tip in tips" :key="tip" class="text-body2">{{ tip }}</div>
      <div class="text-caption text-grey-7">You can also continue with the current setup.</div>
    </div>
    <q-expansion-item v-if="quality?.warnings?.length" label="Analysis details" icon="info">
      <q-list dense>
        <q-item v-for="(warning, index) in quality.warnings" :key="`${warning.code}-${index}`">
          <q-item-section avatar><q-icon :name="warning.severity === 'error' ? 'error' : 'warning'" :color="warning.severity === 'error' ? 'negative' : 'warning'" /></q-item-section>
          <q-item-section>{{ warning.message }}</q-item-section>
        </q-item>
      </q-list>
    </q-expansion-item>
  </div>
</template>

<style scoped>
.sift-step__rating { height: 100%; }
.sift-step__toggle { max-width: 100%; flex-wrap: wrap; }
.sift-step__figure { margin: 0; }
.sift-step__grid { display: grid; gap: 3px; }
.sift-step__cell { display: flex; align-items: center; justify-content: center; min-height: 34px; aspect-ratio: 1.4; border-radius: 4px; font-size: 0.8rem; }
.sift-step__cell--empty { background: #eceff1; color: #455a64; }
.sift-step__cell--missing { background: #fff; color: #546e7a; border: 1px dashed #90a4ae; }
.sift-step__cell--low { background: #ffe0b2; color: #6d3b00; }
.sift-step__cell--light { background: #bbdefb; color: #0d3865; }
.sift-step__cell--medium { background: #64b5f6; color: #102b44; }
.sift-step__cell--high { background: #1565c0; color: white; }
.sift-step__legend { display: flex; flex-wrap: wrap; gap: 8px 16px; }
.sift-step__legend span { display: inline-flex; align-items: center; gap: 6px; }
.sift-step__legend i { display: inline-block; width: 12px; height: 12px; border-radius: 2px; }
</style>
