<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseBanner from 'components/base/BaseBanner.vue'
import BaseButtonSecondary from 'components/base/BaseButtonSecondary.vue'
import { buildScanWizardPlan, getFocusRecommendation, readScanAnalysis, QUALITY_LABELS, type QualityLevel, type ScanWizardPlan } from 'src/utils/scanWizardPlan'

const props = defineProps<{ result: unknown; disabled?: boolean }>()
const emit = defineEmits<{
  (event: 'plan-change', plan: ScanWizardPlan | null): void
  (event: 'retry'): void
  (event: 'manual-settings'): void
}>()
const autoStartStacking = defineModel<boolean>('autoStartStacking', { default: true })
const level = ref<QualityLevel>(1)
const result = computed(() => readScanAnalysis(props.result))
const focus = computed(() => getFocusRecommendation(result.value))
const plan = computed(() => buildScanWizardPlan(level.value, focus.value))
const labels = QUALITY_LABELS
const detailedPhotos = computed(() => buildScanWizardPlan(2, focus.value).totalPhotos)
watch(focus, () => { level.value = 1 }, { immediate: true })
watch(plan, value => emit('plan-change', value), { immediate: true })
</script>

<template>
  <div class="q-gutter-y-md">
    <BaseBanner v-if="focus.mode === 'unknown'" background-class="bg-amber-2">
      <div class="text-subtitle2">Focus was not confirmed. Autofocus will be used.</div>
      <div>You can choose the scan quality and continue. Open the debug report to inspect the focus measurements.</div>
      <template #action>
        <BaseButtonSecondary label="Analyse again" :disable="disabled" @click="emit('retry')" />
      </template>
    </BaseBanner>
    <template v-if="plan">
      <div class="wizard-quality__content">
        <div class="q-px-sm q-pb-lg">
          <q-slider v-model="level" dense :min="0" :max="3" :step="1" :marker-labels="labels" markers snap :disable="disabled" aria-label="Scan quality" />
        </div>
        <q-card flat bordered class="q-pa-md" aria-live="polite">
          <div class="text-h6">{{ plan.totalPhotos }} photos</div>
          <div class="wizard-quality__summary">
            <div :class="{ invisible: plan.focusStacks !== 1 }" :aria-hidden="plan.focusStacks !== 1">{{ plan.points }} positions · Autofocus</div>
            <div :class="{ invisible: plan.focusStacks === 1 }" :aria-hidden="plan.focusStacks === 1">{{ plan.points }} positions · {{ plan.focusStacks }} calculated focus planes per position</div>
          </div>
          <div v-if="level === 3" class="text-body2 text-grey-7 q-mt-sm">Ultra takes {{ (plan.totalPhotos / detailedPhotos).toFixed(1) }}× as many photos as Detailed. Allow substantially more time for capture and processing; additional quality gains may be small.</div>
        </q-card>
        <div class="wizard-quality__focus-option q-mt-sm">
          <div
            class="text-body2 text-grey-7"
            :class="{ invisible: plan.focusStacks > 1 || focus.mode === 'unknown' }"
            :aria-hidden="plan.focusStacks > 1 || focus.mode === 'unknown'"
          >Autofocus offers the best time and sharpness trade-off at this level.</div>
          <q-checkbox
            v-model="autoStartStacking"
            :class="{ invisible: plan.focusStacks === 1 }"
            :aria-hidden="plan.focusStacks === 1"
            label="Automatically process focus stacks after the scan"
            :disable="disabled || plan.focusStacks === 1"
          />
        </div>
      </div>
    </template>
    <BaseBanner v-else background-class="bg-amber-2">
      The focus analysis did not provide a usable focus recommendation. Analyse again or choose the focus settings manually.
      <template #action>
        <BaseButtonSecondary label="Analyse again" :disable="disabled" @click="emit('retry')" />
        <BaseButtonSecondary label="Open scan settings" :disable="disabled" @click="emit('manual-settings')" />
      </template>
    </BaseBanner>
  </div>
</template>

<style scoped>
/* Overlaid alternatives size each shared row to the taller option, including
   wrapped text. Invisible controls cannot receive pointer or keyboard focus. */
.wizard-quality__summary,
.wizard-quality__focus-option { display: grid; }
.wizard-quality__summary > *,
.wizard-quality__focus-option > * { grid-area: 1 / 1; }
.wizard-quality__focus-option { align-items: center; }
.wizard-quality__content { width: 50%; margin: 0 auto; }
@media (max-width: 599px) {
  .wizard-quality__content { width: 100%; }
}
</style>
