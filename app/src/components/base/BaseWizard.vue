<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import BaseButtonPrimary from './BaseButtonPrimary.vue'
import BaseButtonSecondary from './BaseButtonSecondary.vue'

interface WizardStep {
  id: string
  label: string
  caption?: string
}

const props = withDefaults(
  defineProps<{
    steps: WizardStep[]
    modelValue?: string
    vertical?: boolean
    finishLabel?: string
    nextLabel?: string
    backLabel?: string
    showBackButton?: boolean
  }>(),
  {
    vertical: false,
    finishLabel: 'Finish',
    nextLabel: 'Next',
    backLabel: 'Back',
    showBackButton: true
  }
)

const $q = useQuasar()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'finish'): void
}>()

const activeId = ref(props.modelValue ?? (props.steps[0]?.id ?? ''))

watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue && newValue !== activeId.value) {
      activeId.value = newValue
    }
  }
)

watch(
  () => activeId.value,
  (newValue) => {
    if (newValue !== props.modelValue) {
      emit('update:modelValue', newValue)
    }
  }
)

const activeIndex = computed(() =>
  props.steps.findIndex((step) => step.id === activeId.value)
)

const computedVertical = computed(
  () => props.vertical || $q.screen.lt.sm
)

const isFirstStep = computed(() => activeIndex.value === 0)
const isLastStep = computed(
  () => activeIndex.value === props.steps.length - 1
)

function goToStep(index: number) {
  const step = props.steps[index]
  if (step) {
    activeId.value = step.id
  }
}

function handleNext() {
  if (isLastStep.value) {
    emit('finish')
    return
  }

  goToStep(activeIndex.value + 1)
}

function handleBack() {
  if (isFirstStep.value) return

  goToStep(activeIndex.value - 1)
}

function isDone(stepId: string) {
  const index = props.steps.findIndex((step) => step.id === stepId)
  return index >= 0 && index < activeIndex.value
}
</script>

<template>
  <q-stepper
    v-model="activeId"
    :vertical="computedVertical"
    flat
    bordered
    animated
    alternative-labels
    class="wizard-stepper"
  >
    <q-step
      v-for="step in steps"
      :key="step.id"
      :name="step.id"
      :title="step.label"
      :caption="step.caption"
      :done="isDone(step.id)"
    >
      <div class="q-mt-md">
        <slot
          :step="step"
          :active-id="activeId"
          :is-active="step.id === activeId"
        />
      </div>
    </q-step>

    <template #navigation>
      <slot
        name="navigation"
        :is-first-step="isFirstStep"
        :is-last-step="isLastStep"
        :go-next="handleNext"
        :go-back="handleBack"
      >
        <div class="row items-center justify-between q-mt-md">
          <BaseButtonSecondary
            v-if="showBackButton && !isFirstStep"
            :label="backLabel"
            @click="handleBack"
          />
          <q-space />
          <BaseButtonPrimary
            :label="isLastStep ? finishLabel : nextLabel"
            @click="handleNext"
          />
        </div>
      </slot>
    </template>
  </q-stepper>
</template>

<style scoped>
.wizard-stepper :deep(.q-stepper__tab) {
  min-width: 100px;
}
</style>
