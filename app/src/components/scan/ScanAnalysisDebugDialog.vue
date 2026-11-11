<script setup lang="ts">
import BaseDialog from 'components/base/BaseDialog.vue'
import ScanAnalysisDebug from './ScanAnalysisDebug.vue'

defineProps<{ task: unknown; crop: unknown; plan: unknown; cameraName?: string | null; projectName?: string }>()
const open = defineModel<boolean>({ default: false })
</script>

<template>
  <BaseDialog v-model="open" title="Debug report" width="min(92vw, 1000px)">
    <q-card-section class="analysis-debug-dialog__content">
      <ScanAnalysisDebug :task="task" :crop="crop" :plan="plan" :camera-name="cameraName" :project-name="projectName" />
    </q-card-section>
  </BaseDialog>
</template>

<style scoped>
.analysis-debug-dialog__content { max-height: 75vh; overflow-y: auto; }
</style>
