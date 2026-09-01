<script setup lang="ts">
import { useSlots } from 'vue';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title?: string;
    persistent?: boolean;
    width?: string;
    maxWidth?: string;
    cardClass?: string;
    cardStyle?: string | Record<string, string>;
    showClose?: boolean;
  }>(),
  {
    title: undefined,
    persistent: false,
    width: 'min(92vw, 560px)',
    maxWidth: 'calc(100vw - 32px)',
    cardClass: undefined,
    cardStyle: undefined,
    showClose: true,
  },
);

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
}>();

const slots = useSlots();

function updateModelValue(value: boolean) {
  emit('update:modelValue', value);
}
</script>

<template>
  <q-dialog
    v-bind="$attrs"
    :model-value="props.modelValue"
    :persistent="props.persistent"
    @update:model-value="updateModelValue"
  >
    <q-card
      class="base-dialog"
      :class="props.cardClass"
      :style="[
        { width: props.width, maxWidth: props.maxWidth },
        props.cardStyle,
      ]"
    >
      <q-card-section
        v-if="props.title || slots.header"
        class="base-dialog__header row items-center justify-between no-wrap"
      >
        <slot name="header">
          <div class="text-h6">{{ props.title }}</div>
          <q-btn
            v-if="props.showClose"
            icon="close"
            flat
            round
            dense
            aria-label="Close dialog"
            @click="updateModelValue(false)"
          />
        </slot>
      </q-card-section>

      <slot />

      <q-card-actions
        v-if="slots.actions"
        align="right"
        class="base-dialog__actions"
      >
        <slot name="actions" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.base-dialog {
  overflow: hidden;
}

.base-dialog__header {
  padding: 16px 20px 12px;
}

.base-dialog__actions {
  padding: 12px 20px 16px;
}
</style>
