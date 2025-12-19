<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string
    href: string
    icon?: string
    target?: string
    color?: string
    outline?: boolean
  }>(),
  {
    target: '_blank',
    color: 'primary',
    outline: false
  }
)
</script>

<template>
  <q-btn
    type="a"
    :label="props.label"
    :href="props.href"
    :icon="props.icon"
    :target="props.target"
    :color="props.color"
    :outline="props.outline"
    dense
  />
</template>

<style scoped>
</style>
