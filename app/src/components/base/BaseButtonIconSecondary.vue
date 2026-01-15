<script setup lang="ts">
import { useAttrs } from 'vue'

const props = withDefaults(
  defineProps<{
    icon?: string
    type?: 'button' | 'submit' | 'reset'
    loading?: boolean
    disable?: boolean
    dense?: boolean
    size?: string
    color?: string
    outline?: boolean
    round?: boolean
  }>(),
  {
    type: 'button',
    loading: false,
    disable: false,
    dense: false,
    size: 'lg',
    color: 'primary',
    outline: true,
    round: true
  }
)

const attrs = useAttrs()
</script>

<template>
  <q-btn
    v-bind="attrs"
    :icon="props.icon"
    :type="props.type"
    :loading="props.loading"
    :disable="props.disable"
    :dense="props.dense"
    :size="props.size"
    :color="props.color"
    :outline="props.outline"
    :round="props.round"
  >
    <slot />
  </q-btn>
</template>
