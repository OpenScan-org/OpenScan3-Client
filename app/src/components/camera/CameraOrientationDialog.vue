<script setup lang="ts">
import BaseDialog from 'components/base/BaseDialog.vue';
import CameraOrientationPanel from './CameraOrientationPanel.vue';

defineProps<{
  modelValue: boolean;
  cameraName: string | null;
}>();

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
}>();
</script>

<template>
  <BaseDialog
    :model-value="modelValue"
    title="Camera orientation"
    persistent
    width="min(94vw, 620px)"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <q-card-section class="q-pt-none">
      <CameraOrientationPanel :camera-name="cameraName" />
    </q-card-section>
  </BaseDialog>
</template>
