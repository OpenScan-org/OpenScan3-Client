<script setup lang="ts">
const props = defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <q-card flat bordered>
    <q-card-section class="q-pb-xs">
      <div class="text-subtitle1">{{ props.title }}</div>
      <div v-if="props.subtitle" class="text-caption text-grey-7">
        {{ props.subtitle }}
      </div>
    </q-card-section>
    <q-card-section class="q-pt-none">
      <slot />
    </q-card-section>
  </q-card>
</template>
