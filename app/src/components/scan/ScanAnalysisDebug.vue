<script setup lang="ts">
import { computed } from 'vue'
import { getFocusRecommendation, readScanAnalysis, QUALITY_POLICY } from 'src/utils/scanWizardPlan'

const props = defineProps<{ task: unknown; crop: unknown; plan: unknown }>()
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const result = computed(() => readScanAnalysis(record(props.task).result))
const focus = computed(() => result.value?.focus_analysis)
const recommendation = computed(() => getFocusRecommendation(result.value))
const regions = computed(() => (focus.value?.positions ?? []).flatMap(position =>
  Object.entries(position.regions ?? {}).map(([index, region]) => ({
    offset: position.turntable_offset, afPosition: position.autofocus_position, index, ...region
  }))
))
const raw = computed(() => JSON.stringify({ task: props.task, selected_crop: props.crop, focus_decision: recommendation.value, scan_plan: props.plan, quality_policy: QUALITY_POLICY }, null, 2))
function format(value: unknown): string {
  if (value === null || value === undefined) return 'Not provided'
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}
function score(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(3) : 'Not provided'
}
function selected(option: { focus_stacks: number; focus_range: number[] }): boolean {
  const plan = record(props.plan)
  return plan.focusStacks === option.focus_stacks && JSON.stringify(plan.focusRange) === JSON.stringify(option.focus_range)
}
</script>

<template>
  <q-expansion-item class="q-mt-lg rounded-borders" bordered icon="bug_report" label="Analysis debug values" caption="Focus measurements, thresholds and full task response">
    <div class="q-pa-md">
      <dl class="analysis-debug__summary">
        <dt>Task status</dt><dd>{{ format(record(task).status) }}</dd>
        <dt>Default focus strategy</dt><dd>{{ recommendation.mode === 'unknown' ? 'Autofocus fallback (not confirmed)' : recommendation.mode }}</dd>
        <template v-if="recommendation.reason"><dt>Fallback reason</dt><dd>{{ recommendation.reason }}</dd></template>
        <dt>AF mean score</dt><dd>{{ score(recommendation.autofocus?.coverage) }}</dd>
        <dt>AF worst-view score</dt><dd>{{ score(recommendation.autofocus?.worstCoverage) }}</dd>
        <dt>Selected focus range</dt><dd>{{ format(record(plan).focusRange) }}</dd>
        <dt>Selected focus planes</dt><dd>{{ format(record(plan).focusStacks) }}</dd>
        <dt>Selection rule</dt><dd>Equal weight for mean and worst-view score; cheapest option within the quality level's score tolerance.</dd>
      </dl>
      <div class="text-caption">Scores describe relative ISP sharpness, not the percentage of the object in focus.</div>
      <q-markup-table v-if="recommendation.options.length" flat bordered wrap-cells class="q-mt-md">
        <thead><tr><th>Planes</th><th>Range (dpt)</th><th>Mean score</th><th>Worst view</th><th>Gain over AF</th><th>Interpolated</th></tr></thead>
        <tbody>
          <tr v-for="(option, index) in recommendation.options" :key="index" :class="{ 'bg-blue-1': selected(option) }">
            <td>{{ option.focus_stacks }}{{ selected(option) ? ' (selected)' : '' }}</td>
            <td>{{ format(option.focus_range) }}</td>
            <td>{{ score(option.coverage) }}</td>
            <td>{{ score(option.worst_coverage) }}</td>
            <td>{{ score(option.gain) }}</td>
            <td>{{ option.estimated ? 'Yes' : 'No' }}</td>
          </tr>
        </tbody>
      </q-markup-table>
      <q-expansion-item v-if="regions.length" class="q-mt-sm" label="Regional focus profiles">
        <q-markup-table flat bordered wrap-cells>
          <thead><tr><th>Turntable offset</th><th>AF position (dpt)</th><th>Region</th><th>Weight</th><th>AF score</th><th>Manual scores by focus position</th></tr></thead>
          <tbody>
            <tr v-for="(region, index) in regions" :key="index">
              <td>{{ region.offset }}°</td><td>{{ format(region.afPosition) }}</td><td>{{ region.index }}</td>
              <td>{{ score(region.weight) }}</td><td>{{ score(region.autofocus) }}</td><td>{{ format(region.manual) }}</td>
            </tr>
          </tbody>
        </q-markup-table>
      </q-expansion-item>
      <div class="text-subtitle2 q-mt-md">Full task response and wizard decision</div>
      <pre class="analysis-debug__raw" tabindex="0">{{ raw }}</pre>
    </div>
  </q-expansion-item>
</template>

<style scoped>
.analysis-debug__summary { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); gap: 8px 16px; }
.analysis-debug__summary dd { margin: 0; overflow-wrap: anywhere; }
.analysis-debug__raw { white-space: pre-wrap; overflow-wrap: anywhere; max-height: 480px; overflow: auto; padding: 12px; background: #f5f5f5; color: #222; }
</style>
