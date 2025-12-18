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
  }>(),
  {
    options: () => [],
    outlined: true,
    dense: true,
    buttonIcon: 'add',
    buttonType: 'button'
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: unknown): void
  (e: 'button-click'): void
}>()

const attrs = useAttrs()

const value = computed({
  get: () => props.modelValue,
  set: (v: unknown) => emit('update:modelValue', v)
})

const onButtonClick = () => {
  emit('button-click')
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
    <div class="col-auto select-with-button__button">
      <BaseButtonIconSecondary
        :icon="props.buttonIcon"
        :type="props.buttonType"
        :aria-label="props.buttonAriaLabel"
        @click="onButtonClick"
      />
    </div>
  </div>
</template>

<style scoped>

</style>
