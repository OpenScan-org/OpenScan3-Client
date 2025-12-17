<script setup lang="ts">
 const props = withDefaults(
   defineProps<{
     contentClass?: string
   }>(),
   {
     contentClass: 'col-12 col-md-8 col-lg-6'
   }
 )
</script>

<template>
  <q-page padding>
    <div class="row justify-center q-col-gutter-md">
      <div :class="props.contentClass">
        <slot />
      </div>
    </div>
  </q-page>
</template>

<style scoped>
</style>
