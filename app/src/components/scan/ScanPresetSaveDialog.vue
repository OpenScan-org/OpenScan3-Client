<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="q-pa-md" style="min-width: 320px; max-width: 400px">
      <q-card-section class="q-pt-none">
        <div class="text-h6">Save preset</div>
        <div class="text-body2 text-grey-7">
          Choose a descriptive name for the current scan configuration.
        </div>
      </q-card-section>

      <q-card-section>
        <q-input
          v-model="presetName"
          label="Preset name"
          autofocus
          dense
          counter
          maxlength="60"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="primary" @click="$emit('update:modelValue', false)" />
        <q-btn
          label="Save"
          color="primary"
          :disable="!presetName.trim()"
          @click="save"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: boolean
  initialName?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', value: string): void
}>()

const presetName = ref(props.initialName ?? '')

const syncName = () => {
  if (props.modelValue) {
    presetName.value = props.initialName?.trim() ?? ''
  }
}

watch(() => props.modelValue, syncName, { immediate: true })
watch(() => props.initialName, syncName)

const save = () => {
  const name = presetName.value.trim()
  if (!name) {
    return
  }
  emit('save', name)
  emit('update:modelValue', false)
}
</script>
