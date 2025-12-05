<script setup lang="ts">
import { computed } from 'vue'

interface RadioOption {
  label: string
  value: string | number | boolean
}

const props = defineProps<{
  modelValue: string | number | boolean
  label?: string
  options: RadioOption[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number | boolean): void
}>()

const value = computed({
  get: () => props.modelValue,
  set: (val: string | number | boolean) => emit('update:modelValue', val)
})
</script>

<template>
  <div class="q-pa-sm">
    <label v-if="label" class="q-field__label">{{ label }}</label>
    <q-option-group
      v-model="value"
      :options="options"
      type="radio"
      inline
    />
  </div>
</template>

<style scoped>
</style>
