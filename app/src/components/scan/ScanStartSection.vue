<template>
  <q-form @submit.prevent="emit('submit')">
    <BaseSection title="Start scan" description="Select a project or create a new one and start a scan.">
      <SelectWithButton
        v-model="selectedProjectModel"
        :options="projectOptions"
        label="Project"
        new-value-mode="add-unique"
        emit-value
        map-options
        lazy-rules
        :rules="projectRules"
        button-icon="add"
        button-aria-label="Create new project"
        button-tooltip="Create new project"
        @button-click="emit('create-project-click')"
      />

      <BaseButtonPrimary
        :label="`Start scan with ${photoCount} photos`"
        type="submit"
        class="full-width q-mt-sm"
      />
    </BaseSection>

    <BaseSection title="Use preset" description="Apply saved scan settings or store the current one.">
      <SelectWithButton
        v-model="selectedPresetModel"
        :options="presetSelectOptions"
        label="Presets"
        emit-value
        map-options
        clearable
        :disable="!presetSelectOptions.length"
        placeholder="Select a preset"
        button-icon="save"
        button-aria-label="Save preset"
        :button-tooltip="overwriteTooltip"
        :button-disable="!selectedPresetModel"
        :show-primary-button="!!selectedPresetModel"
        show-secondary-button
        secondary-button-icon="delete_outline"
        secondary-button-aria-label="Delete selected preset"
        :secondary-button-disable="!selectedPresetModel"
        secondary-button-tooltip="Delete selected preset"
        @button-click="emit('overwrite-preset')"
        @secondary-button-click="handleDeletePreset"
      />

      <div class="column q-gutter-xs q-mt-sm">
        <q-btn
          flat
          dense
          color="grey-7"
          icon="playlist_add"
          label="Add current settings as preset"
          @click="emit('create-preset-click')"
        />
        <q-btn
          flat
          dense
          color="grey-7"
          icon="restart_alt"
          label="Reset defaults"
          @click="emit('reset-defaults')"
        >
          <q-tooltip>Reset all scan and camera settings to defaults</q-tooltip>
        </q-btn>
      </div>
    </BaseSection>
  </q-form>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseButtonPrimary from 'components/base/BaseButtonPrimary.vue'
import BaseSection from 'components/base/BaseSection.vue'
import SelectWithButton from 'components/common/SelectWithButton.vue'

const projectRules = [(val: string) => (val && val.length > 0) || 'Please select or enter a project']

type Option = { label: string; value: string }

const props = defineProps<{
  projectOptions: Option[]
  selectedProject: string
  photoCount: number
  presetOptions?: Option[]
  selectedPresetId?: string
}>()
const emit = defineEmits<{
  (e: 'update:selectedProject', value: string): void
  (e: 'create-project-click'): void
  (e: 'reset-defaults'): void
  (e: 'create-preset-click'): void
  (e: 'overwrite-preset'): void
  (e: 'delete-preset', value: string): void
  (e: 'update:selectedPresetId', value: string): void
  (e: 'submit'): void
}>()

const selectedProjectModel = computed({
  get: () => props.selectedProject,
  set: value => emit('update:selectedProject', value || '')
})

const photoCount = computed(() => props.photoCount)

const selectedPresetModel = computed({
  get: () => props.selectedPresetId ?? '',
  set: value => emit('update:selectedPresetId', typeof value === 'string' ? value : '')
})

const presetSelectOptions = computed(() => props.presetOptions ?? [])

const selectedPresetLabel = computed(() => {
  const presets = presetSelectOptions.value
  const current = selectedPresetModel.value
  if (!current) {
    return ''
  }
  return presets.find(option => option.value === current)?.label ?? ''
})

const overwriteTooltip = computed(() => {
  if (!selectedPresetModel.value) {
    return ''
  }
  return selectedPresetLabel.value
    ? `Overwrite preset "${selectedPresetLabel.value}"`
    : 'Overwrite selected preset'
})

const handleDeletePreset = () => {
  if (!selectedPresetModel.value) {
    return
  }
  emit('delete-preset', selectedPresetModel.value)
}
</script>
