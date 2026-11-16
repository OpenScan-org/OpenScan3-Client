<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    description: string
    separator?: boolean
  }>(),
  {
    separator: true
  }
)
</script>

<template>
  <div class="base-setting-row">
    <q-separator v-if="separator" class="q-my-sm" />
    <div class="row items-center justify-between q-col-gutter-sm">
      <div class="col-12 col-md">
        <div class="text-subtitle2">{{ title }}</div>
        <div class="text-caption text-grey-7">{{ description }}</div>
      </div>
      <div class="col-12 col-md-auto">
        <div class="base-setting-row__control row items-end justify-end q-gutter-sm">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.base-setting-row__control :deep(.q-field) {
  width: 180px;
  max-width: 100%;
}

@media (max-width: 599px) {
  .base-setting-row__control :deep(.q-field) {
    width: 100%;
  }
}
</style>
