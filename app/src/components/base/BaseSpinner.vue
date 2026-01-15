<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    size?: string
    color?: string
  }>(),
  {
    size: 'sm',
    color: 'primary'
  }
)
</script>

<template>
  <q-spinner :size="props.size" :color="props.color" />
</template>

<style scoped>
</style>
