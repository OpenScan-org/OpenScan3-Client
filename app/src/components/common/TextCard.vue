<script setup lang="ts">
const props = defineProps<{
  title: string
}>()
</script>

<template>
  <q-card flat bordered>
    <q-card-section>
      <div class="text-h6">{{ props.title }}</div>
    </q-card-section>
    <q-card-section>
      <slot />
    </q-card-section>
    <q-separator v-if="$slots.links" />
    <q-card-actions v-if="$slots.links">
      <slot name="links" />
    </q-card-actions>
  </q-card>
</template>

<style scoped>

</style>
