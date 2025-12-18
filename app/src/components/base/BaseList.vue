<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    bordered?: boolean
    padding?: boolean
    dense?: boolean
  }>(),
  {
    bordered: true,
    padding: true,
    dense: false
  }
)
</script>

<template>
  <q-list
    :bordered="props.bordered"
    :padding="props.padding"
    :dense="props.dense"
  >
    <slot />
  </q-list>
</template>

<style scoped>
</style>
