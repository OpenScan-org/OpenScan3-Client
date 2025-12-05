<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string
    href: string
    icon?: string
    target?: string
    color?: string
  }>(),
  {
    target: '_blank',
    color: 'primary'
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
    dense
  />
</template>

<style scoped>
</style>
