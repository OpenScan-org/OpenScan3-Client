<template>
  <q-card class="q-pa-md">
    <q-form @submit.prevent="emit('submit')">
      <div class="row q-col-gutter-md">
        <div class="col-8">
          <q-select
            v-model="selectedProjectModel"
            :options="projectOptions"
            label="Project"
            new-value-mode="add-unique"
            emit-value
            map-options
            lazy-rules
            :rules="projectRules"
          />
        </div>
        <div class="col-4">
          <q-btn label="New Project" color="primary" type="button" @click="emit('create-project-click')" />
        </div>
        <scan-settings-section
          ref="scanSettingsSectionRef"
        />
      </div>
    </q-form>
  </q-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

import ScanSettingsSection from 'components/ScanSettingsSection.vue'

import type { ScanSetting } from 'src/generated/api'

const projectRules = [(val: string) => (val && val.length > 0) || 'Please select or enter a project']

type Option = { label: string; value: string }

const props = defineProps<{
  projectOptions: Option[]
  selectedProject: string
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

const scanSettingsSectionRef = ref<InstanceType<typeof ScanSettingsSection> | null>(null)

const getScanSettings = (): ScanSetting | undefined => scanSettingsSectionRef.value?.getScanSettings()

defineExpose({ getScanSettings })
</script>
