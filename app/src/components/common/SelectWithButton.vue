<script setup lang="ts">
import { computed } from 'vue'
import { useAttrs } from 'vue'
import BaseSelect from 'components/base/BaseSelect.vue'
import BaseButtonIconSecondary from 'components/base/BaseButtonIconSecondary.vue'

type SelectOption = string | number | Record<string, unknown>

const props = withDefaults(
  defineProps<{
    modelValue?: unknown
    options?: SelectOption[]
    label?: string
    outlined?: boolean
    dense?: boolean
    buttonIcon?: string
    buttonType?: 'button' | 'submit' | 'reset'
    buttonAriaLabel?: string
    buttonTooltip?: string
    buttonDisable?: boolean
    showPrimaryButton?: boolean
    secondaryButtonIcon?: string
    secondaryButtonType?: 'button' | 'submit' | 'reset'
    secondaryButtonAriaLabel?: string
    secondaryButtonTooltip?: string
    secondaryButtonDisable?: boolean
    showSecondaryButton?: boolean
  }>(),
  {
    options: () => [],
    outlined: true,
    dense: true,
    buttonIcon: 'add',
    buttonType: 'button',
    buttonTooltip: 'Create new project',
    buttonDisable: false,
    showPrimaryButton: true,
    secondaryButtonIcon: 'delete',
    secondaryButtonType: 'button',
    secondaryButtonDisable: false,
    showSecondaryButton: false
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: unknown): void
  (e: 'button-click'): void
  (e: 'secondary-button-click'): void
}>()

const attrs = useAttrs()

const value = computed({
  get: () => props.modelValue,
  set: (v: unknown) => emit('update:modelValue', v)
})

const onButtonClick = () => {
  emit('button-click')
}

const onSecondaryButtonClick = () => {
  emit('secondary-button-click')
}
</script>

<template>
  <div class="row q-col-gutter-sm items-start">
    <div class="col">
      <BaseSelect
        v-bind="attrs"
        v-model="value"
        :options="props.options"
        :label="props.label"
        :outlined="props.outlined"
        :dense="props.dense"
        hide-bottom-space
      />
    </div>
    <div
      v-if="props.showPrimaryButton || props.showSecondaryButton"
      class="col-auto select-with-button__button row no-wrap items-center"
    >
      <BaseButtonIconSecondary
        v-if="props.showPrimaryButton"
        :icon="props.buttonIcon"
        :type="props.buttonType"
        :aria-label="props.buttonAriaLabel"
        size="md"
        dense
        :disable="props.buttonDisable"
        @click="onButtonClick"
      >
        <q-tooltip v-if="props.buttonTooltip" anchor="bottom middle" self="top middle">
          {{ props.buttonTooltip }}
        </q-tooltip>
      </BaseButtonIconSecondary>
      <div v-if="props.showSecondaryButton" class="q-ml-xs">
        <BaseButtonIconSecondary
          :icon="props.secondaryButtonIcon"
          :type="props.secondaryButtonType"
          :aria-label="props.secondaryButtonAriaLabel"
          size="md"
          dense
          outline
          :disable="props.secondaryButtonDisable"
          @click="onSecondaryButtonClick"
        >
          <q-tooltip v-if="props.secondaryButtonTooltip" anchor="bottom middle" self="top middle">
            {{ props.secondaryButtonTooltip }}
          </q-tooltip>
        </BaseButtonIconSecondary>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>
