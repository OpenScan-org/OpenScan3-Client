<script setup lang="ts">
const props = defineProps<{
  title: string
  subtitle?: string
  description?: string
  embedded?: boolean
}>()
</script>

<template>
  <q-card flat :bordered="!props.embedded">
    <q-card-section v-if="!props.embedded" class="q-pb-xs">
      <div class="row items-center justify-between no-wrap">
        <div class="text-h6">{{ props.title }}</div>
        <slot name="header-action" />
      </div>
      <div v-if="props.subtitle" class="text-caption text-grey-7">
        {{ props.subtitle }}
      </div>
      <div v-if="props.description" class="text-body2 text-grey-7">
        {{ props.description }}
      </div>
    </q-card-section>
    <q-card-section :class="props.embedded ? 'q-pa-none' : 'q-pt-none'">
      <slot />
    </q-card-section>
  </q-card>
</template>
