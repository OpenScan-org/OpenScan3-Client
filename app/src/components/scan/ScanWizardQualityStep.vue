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
const level = ref<QualityLevel>(0)
const result = computed(() => readScanAnalysis(props.result))
const focus = computed(() => getFocusRecommendation(result.value))
const plan = computed(() => buildScanWizardPlan(level.value, focus.value))
const labels = QUALITY_LABELS
const detailedPhotos = computed(() => buildScanWizardPlan(2, focus.value).totalPhotos)
watch(focus, value => { level.value = value.mode === 'stacking' ? 1 : 0 }, { immediate: true })
watch(plan, value => emit('plan-change', value), { immediate: true })
</script>

<template>
  <div class="q-mt-lg q-gutter-y-lg">
    <BaseBanner v-if="focus.mode === 'unknown'" background-class="bg-amber-2">
      <div class="text-subtitle2">Focus was not confirmed. Autofocus will be used.</div>
      <div>You can choose the scan quality and continue. The focus measurements are available below in the analysis debug values.</div>
      <template #action>
        <BaseButtonSecondary label="Analyse again" :disable="disabled" @click="emit('retry')" />
      </template>
    </BaseBanner>
    <template v-if="plan">
      <div>
        <div class="text-subtitle1">Scan quality: {{ labels[level] }}</div>
        <p class="text-body2 text-grey-7">Higher quality takes more photos and increases scan time.</p>
        <div class="q-px-sm q-pb-lg">
          <q-slider v-model="level" :min="0" :max="3" :step="1" :marker-labels="labels" markers snap :disable="disabled" aria-label="Scan quality" />
        </div>
        <q-card flat bordered class="q-pa-md" aria-live="polite">
          <div class="text-h6">{{ plan.totalPhotos }} photos</div>
          <div>{{ plan.points }} positions · {{ plan.focusStacks === 1 ? 'Autofocus' : `${plan.focusStacks} focus planes per position` }}</div>
          <div v-if="plan.focusStacks > 1" class="text-body2 text-grey-7 q-mt-sm">This level uses a calculated focus stack for the sampled views.</div>
          <div v-else-if="focus.mode !== 'unknown'" class="text-body2 text-grey-7 q-mt-sm">Autofocus offers the best time and sharpness trade-off at this level.</div>
          <div v-if="level === 3" class="text-body2 q-mt-sm">Ultra takes {{ (plan.totalPhotos / detailedPhotos).toFixed(1) }}× as many photos as Detailed. Allow substantially more time for capture and processing; additional quality gains may be small.</div>
        </q-card>
      </div>
      <q-checkbox
        v-if="plan.focusStacks > 1"
        v-model="autoStartStacking"
        label="Automatically process focus stacks after the scan"
        :disable="disabled"
      />
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
