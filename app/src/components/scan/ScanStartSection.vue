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
        @button-click="emit('create-project-click')"
      />

      <BaseButtonPrimary
        :label="`Start scan with ${photoCount} photos`"
        type="submit"
        class="full-width q-mt-sm"
      />
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
}>()
const emit = defineEmits<{
  (e: 'update:selectedProject', value: string): void
  (e: 'create-project-click'): void
  (e: 'submit'): void
}>()

const selectedProjectModel = computed({
  get: () => props.selectedProject,
  set: value => emit('update:selectedProject', value || '')
})

const photoCount = computed(() => props.photoCount)
</script>
