<script setup lang="ts">
import { computed } from 'vue'
import BaseBanner from 'components/base/BaseBanner.vue'
import BaseButtonSecondary from 'components/base/BaseButtonSecondary.vue'
import { readScanAnalysis } from 'src/utils/scanWizardPlan'
import { getAnalysisShutter, getSiftVerdict, shouldSuggestCrossPolarizer } from 'src/utils/siftFeedback'

const props = defineProps<{ result: unknown; shutterMs?: number | null; disabled?: boolean }>()
const emit = defineEmits<{ (event: 'retry'): void }>()
const result = computed(() => readScanAnalysis(props.result))
const quality = computed(() => result.value?.sift_analysis?.quality)
const status = computed(() => quality.value?.overall_status)
const shutter = computed(() => getAnalysisShutter(result.value, props.shutterMs))
const suggestPolarizer = computed(() => shouldSuggestCrossPolarizer(shutter.value))
const levels = ['bad', 'okay', 'good', 'great'] as const
const labels: Record<string, string> = { bad: 'Bad', okay: 'Okay', good: 'Good', great: 'Great', insufficient_data: 'Not enough data' }
const colors: Record<string, string> = { bad: 'negative', okay: 'warning', good: 'positive', great: 'positive' }
const ready = computed(() => status.value === 'good' || status.value === 'great')
const needsPreparation = computed(() => status.value === 'bad' || status.value === 'okay')
const suggestCrop = computed(() => quality.value?.spatial_coverage === 'bad')
const verdict = computed(() => getSiftVerdict(quality.value))
const ratings = computed(() => [
  { label: 'Feature density', status: quality.value?.feature_quality, description: 'How many recognizable features were detected per megapixel in the selected area.' },
  { label: 'Features shared between views', status: quality.value?.matching_quality, description: 'How many tested features can be reliably recognized in both images.' },
  { label: 'Match reliability', status: quality.value?.geometry_quality, description: 'How many matches agree with the change in viewpoint, rather than being false matches.' },
  { label: 'Feature distribution', status: quality.value?.spatial_coverage, description: 'How evenly verified features are spread across the selected area, including background. Rated separately from overall scan readiness.' }
])
</script>

<template>
  <div class="sift-step q-gutter-y-md">
    <ol class="sift-readiness" aria-label="Scan readiness rating">
      <li
        v-for="level in levels"
        :key="level"
        class="sift-readiness__level"
        :class="{ 'sift-readiness__level--selected': status === level }"
        :style="status === level ? { '--rating-color': `var(--q-${colors[level]})` } : {}"
        :aria-current="status === level ? 'step' : undefined"
      >
        <span class="sift-readiness__marker" aria-hidden="true"><span class="sift-readiness__dot" /></span>
        <span>{{ labels[level] }}</span>
      </li>
    </ol>
    <p class="text-subtitle2 text-center">{{ verdict.title }}</p>
    <q-expansion-item label="More details" dense>
      <q-list>
        <q-item v-for="rating in ratings" :key="rating.label">
          <q-item-section>
            <q-item-label>{{ rating.label }}</q-item-label>
            <q-item-label caption>{{ rating.description }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-badge :color="colors[rating.status ?? ''] ?? 'grey-7'">{{ labels[rating.status ?? ''] ?? 'Not enough data' }}</q-badge>
          </q-item-section>
        </q-item>
      </q-list>
    </q-expansion-item>

    <section v-if="!ready || suggestCrop || suggestPolarizer" class="sift-step__help q-gutter-y-md" aria-label="Scan preparation hints">
      <BaseBanner v-if="needsPreparation" background-class="bg-amber-2" text-class="text-black">
        <div class="text-subtitle2">Improve surface preparation</div>
        <p class="q-mb-none">Use a scan spray suitable for your object's material to make shiny or transparent surfaces matte and reduce reflections.</p>
        <div class="row justify-center q-mt-md">
          <BaseButtonSecondary label="Prepare surface and analyse again" :disable="disabled" @click="emit('retry')" />
        </div>
        <div class="text-caption text-grey-7 text-center q-mt-sm">You can also continue with the current preparation (not recommended).</div>
      </BaseBanner>
      <BaseButtonSecondary v-else-if="!ready" label="Analyse again" :disable="disabled" @click="emit('retry')" />

      <BaseBanner v-if="suggestCrop" background-class="bg-blue-1" text-class="text-dark">
        <div class="text-subtitle2">Features are unevenly distributed</div>
        <div>Recognizable features cover only part of the crop. The object may be off-centre, or the rectangle may include extra background. Consider checking its position and framing.</div>
      </BaseBanner>

      <BaseBanner v-if="suggestPolarizer" background-class="bg-blue-1" text-class="text-dark">
        <div class="text-subtitle2">Consider cross-polarized lighting</div>
        <div>The shutter time is very short (under 10 ms), which may indicate that no cross-polarizer is being used. Adding one can help reduce reflections and increase feature quality.</div>
      </BaseBanner>
    </section>
  </div>
</template>

<style scoped>
.sift-step { width: 50%; margin: 0 auto; }
.sift-step__help { width: 140%; margin-left: -20%; }
.sift-readiness { position: relative; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); list-style: none; padding: 0; margin: 0; }
.sift-readiness::before { content: ''; position: absolute; left: 12.5%; right: 12.5%; top: 9px; height: 3px; background: #dfe6ec; border-radius: 2px; }
.sift-readiness__level { position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; color: #757575; font-size: 0.8rem; }
.sift-readiness__marker { display: flex; align-items: center; justify-content: center; height: 20px; }
.sift-readiness__dot { display: block; width: 8px; height: 8px; border-radius: 50%; background: #a8b5bf; }
.sift-readiness__level--selected { color: var(--rating-color); font-weight: 600; }
.sift-readiness__level--selected .sift-readiness__dot { width: 16px; height: 16px; background: var(--rating-color); }
@media (max-width: 599px) {
  .sift-step { width: 100%; }
  .sift-step__help { width: 100%; margin-left: 0; }
}
</style>
