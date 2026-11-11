<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { copyToClipboard, useQuasar } from 'quasar'
import BaseButtonSecondary from 'components/base/BaseButtonSecondary.vue'
import BaseButtonPrimary from 'components/base/BaseButtonPrimary.vue'
import BaseBanner from 'components/base/BaseBanner.vue'
import { apiClient, buildApiUrl, getApiSdk } from 'src/services/apiClient'
import { getFocusRecommendation, readScanAnalysis, QUALITY_POLICY } from 'src/utils/scanWizardPlan'
import { getSiftVerdict } from 'src/utils/siftFeedback'
import { createAnalysisSvg } from 'src/utils/analysisSvg'

const props = defineProps<{ task: unknown; crop: unknown; plan: unknown; cameraName?: string | null; projectName?: string }>()
const $q = useQuasar()
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const result = computed(() => readScanAnalysis(record(props.task).result))
const sift = computed(() => result.value?.sift_analysis)
const quality = computed(() => sift.value?.quality)
const verdict = computed(() => getSiftVerdict(quality.value))
const recommendation = computed(() => getFocusRecommendation(result.value))
const data = computed(() => ({
  task: props.task, selected_crop: props.crop, focus_decision: recommendation.value,
  scan_plan: props.plan, quality_policy: QUALITY_POLICY
}))
const raw = computed(() => JSON.stringify(data.value, null, 2))
const siftViews = computed(() => {
  const analysis = sift.value
  if (!analysis) return []
  return (['first', 'second'] as const).map(view => {
    const inlierGrid = analysis.spatial_distribution?.[view]?.geometric_inlier_counts
    return {
      view, label: view === 'first' ? 'First view' : 'Second view',
      features: analysis.feature_count?.[view],
      density: analysis.feature_density?.[view],
      matched: analysis.matchable_feature_count?.[view],
      matchedRatio: analysis.matchable_feature_ratio?.[view],
      verified: inlierGrid?.length ? inlierGrid.flat().reduce((sum, count) => sum + count, 0) : null,
      verifiedRatio: record(quality.value?.metrics?.geometric_feature_ratio)[view],
      distribution: record(quality.value?.metrics?.geometric_coverage)[view]
    }
  })
})
const exporting = ref(false)
const exportError = ref('')
let exportAbort: AbortController | null = null
onBeforeUnmount(() => exportAbort?.abort())

function format(value: unknown): string {
  if (value === null || value === undefined) return 'Not provided'
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}
function measurement(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString('en-US', { maximumFractionDigits: 1 }) : '—'
}
function percentage(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${(value * 100).toFixed(1)}%` : '—'
}
function score(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(3) : 'Not provided'
}
function selected(option: { focus_stacks: number; focus_range: number[] }): boolean {
  const plan = record(props.plan)
  return plan.focusStacks === option.focus_stacks && JSON.stringify(plan.focusRange) === JSON.stringify(option.focus_range)
}
async function copyJson() {
  try {
    await copyToClipboard(raw.value)
    $q.notify({ type: 'positive', message: 'Analysis JSON copied to clipboard.' })
  } catch {
    $q.notify({ type: 'negative', message: 'Could not copy JSON to clipboard.' })
  }
}
async function downloadSvg() {
  if (exporting.value || !props.cameraName) return
  exporting.value = true
  exportError.value = ''
  const controller = new AbortController()
  exportAbort = controller
  // Freeze the analysis and selected settings before acquiring the new photo.
  const snapshot = JSON.parse(raw.value)
  const cameraName = props.cameraName
  const projectName = props.projectName
  let imageUrl: string | null = null
  try {
    const sdk = getApiSdk()
    if (!('startScanAnalysis' in sdk)) throw new Error('SVG export requires the Next API.')
    const response = await sdk.getPhoto({
      client: apiClient, path: { camera_name: cameraName },
      query: { image_format: 'jpeg', with_metadata: true }, throwOnError: true, signal: controller.signal
    })
    const metadata = response.data
    if (!metadata?.payload_url) throw new Error('No photo payload was returned.')
    const payload = await fetch(new URL(metadata.payload_url, buildApiUrl('')), { signal: controller.signal, cache: 'no-store' })
    if (!payload.ok) throw new Error('Could not download the export photo.')
    const blob = await payload.blob()
    imageUrl = URL.createObjectURL(blob)
    const img = new Image()
    img.src = imageUrl
    await img.decode()
    if (controller.signal.aborted) return
    // Decoding applies the JPEG's EXIF orientation. Bake those upright pixels
    // into a fresh JPEG so SVG viewers cannot ignore or apply EXIF a second time.
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Could not prepare the export photo.')
    context.drawImage(img, 0, 0)
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95)
    if (controller.signal.aborted) return
    const capturedAt = new Date().toISOString()
    const svg = createAnalysisSvg({
      imageDataUrl, width: img.naturalWidth, height: img.naturalHeight,
      capturedAt, summary: verdict.value.title,
      data: { format: 'openscan-analysis', version: 1, exported_at: capturedAt, camera_name: cameraName,
        project_name: projectName, ...snapshot, photo: { captured_at: capturedAt, source: 'new_capture_at_export', metadata } }
    })
    const downloadUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = 'scan-analysis-' + capturedAt.replace(/[:.]/g, '-') + '.svg'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
  } catch (error) {
    if (!controller.signal.aborted) exportError.value = error instanceof Error ? error.message : 'Could not export the analysis.'
  } finally {
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    exporting.value = false
    exportAbort = null
  }
}
</script>

<template>
  <div class="analysis-debug q-gutter-y-lg">
    <section>
      <div class="analysis-debug__export">
        <p class="text-body2 text-grey-7 q-ma-none">Need help, or do the wizard settings look unexpected? Download the Debug SVG and share the file on Discord, by email or in an issue. It includes the analysis data and selected settings to help others investigate.</p>
        <BaseButtonPrimary class="analysis-debug__export-button" label="Debug SVG" icon="download" :loading="exporting" :disable="exporting || !cameraName || record(task).status !== 'completed'" @click="downloadSvg" />
      </div>
      <BaseBanner v-if="exportError" class="q-mt-sm" background-class="bg-red-2" text-class="text-negative">{{ exportError }}</BaseBanner>
    </section>
    <section>
      <h3 class="text-subtitle1 q-mt-none q-mb-sm">Focus stack options</h3>
      <div class="text-caption q-mb-sm">Relative ISP sharpness scores, not the percentage of the object in focus.</div>
      <q-markup-table v-if="recommendation.options.length" flat bordered wrap-cells>
        <thead><tr><th>Planes</th><th>Range (dpt)</th><th>Mean score</th><th>Worst view</th><th>Gain over AF</th><th>Interpolated</th></tr></thead>
        <tbody>
          <tr v-for="(option, index) in recommendation.options" :key="index" :class="{ 'bg-blue-1': selected(option) }">
            <td>{{ option.focus_stacks }}{{ selected(option) ? ' (selected)' : '' }}</td>
            <td>{{ format(option.focus_range) }}</td><td>{{ score(option.coverage) }}</td><td>{{ score(option.worst_coverage) }}</td><td>{{ score(option.gain) }}</td><td>{{ option.estimated ? 'Yes' : 'No' }}</td>
          </tr>
        </tbody>
      </q-markup-table>
      <p v-else class="text-grey-7">No usable focus stack options were returned.</p>
    </section>
    <section>
      <h3 class="text-subtitle1 q-mt-none q-mb-sm">SIFT features</h3>
      <template v-if="sift">
        <div class="text-caption q-mb-sm">Matched and verified percentages refer to tested features. Distribution measures coverage across the crop, including background.</div>
        <q-markup-table flat bordered wrap-cells>
          <thead><tr><th>View</th><th>Features</th><th>Features / MP</th><th>Matched</th><th>Verified</th><th>Distribution</th></tr></thead>
          <tbody>
            <tr v-for="view in siftViews" :key="view.view">
              <td>{{ view.label }}</td>
              <td>{{ measurement(view.features) }}</td>
              <td>{{ measurement(view.density) }}</td>
              <td>
                <div>{{ measurement(view.matched) }}</div>
                <div class="text-caption text-grey-7">{{ percentage(view.matchedRatio) }} of sample</div>
              </td>
              <td>
                <div>{{ measurement(view.verified) }}</div>
                <div class="text-caption text-grey-7">{{ percentage(view.verifiedRatio) }} of sample</div>
              </td>
              <td>{{ percentage(view.distribution) }}</td>
            </tr>
          </tbody>
        </q-markup-table>
        <div class="text-caption text-grey-7 q-mt-sm">
          Between views: {{ measurement(sift.mutual_match_count) }} matched pairs ·
          {{ measurement(sift.geometric_inlier_count) }} verified ({{ percentage(sift.geometric_inlier_ratio) }}) ·
          {{ measurement(sift.turntable_angle) }}° rotation
        </div>
      </template>
      <p v-else class="text-grey-7">No SIFT measurements were returned.</p>
    </section>
    <q-expansion-item label="Analysis JSON" icon="data_object">
      <div class="q-pa-sm">
        <BaseButtonSecondary label="Copy JSON to clipboard" icon="content_copy" @click="copyJson" />
        <pre class="analysis-debug__raw" tabindex="0">{{ raw }}</pre>
      </div>
    </q-expansion-item>
  </div>
</template>

<style scoped>
.analysis-debug__export { display: flex; align-items: center; gap: 16px; }
.analysis-debug__export-button { flex-shrink: 0; }
.analysis-debug__export p { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.analysis-debug :deep(.q-table td) { font-variant-numeric: tabular-nums; }
.analysis-debug__raw { white-space: pre-wrap; overflow-wrap: anywhere; max-height: 480px; overflow: auto; padding: 12px; background: #f5f5f5; color: #222; }
</style>
