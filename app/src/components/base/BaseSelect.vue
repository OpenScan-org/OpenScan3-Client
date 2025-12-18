<script setup lang="ts">
import { useAttrs } from 'vue'

type SelectOption = string | number | Record<string, unknown>

const props = withDefaults(
  defineProps<{
    modelValue?: unknown
    options?: SelectOption[]
    label?: string
    outlined?: boolean
    dense?: boolean
  }>(),
  {
    options: () => [],
    outlined: true,
    dense: true
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: unknown): void
}>()

const attrs = useAttrs()

const updateModelValue = (value: unknown) => {
  emit('update:modelValue', value)
}
</script>

<template>
  <q-select
    v-bind="attrs"
    :model-value="props.modelValue"
    :options="props.options"
    :label="props.label"
    :outlined="props.outlined"
    :dense="props.dense"
    @update:model-value="updateModelValue"
  />
</template>
