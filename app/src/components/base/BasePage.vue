<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    padding?: string
    maxWidth?: string
    contentClass?: string
    centerContent?: boolean
  }>(),
  {
    padding: '32px 24px 48px',
    maxWidth: '1100px',
    contentClass: '',
    centerContent: true
  }
)

const contentStyle = computed(() => ({
  padding: props.padding
}))

const innerStyle = computed(() => ({
  maxWidth: props.maxWidth
}))
</script>

<template>
  <q-page class="base-page">
    <div class="base-page__background">
      <slot name="background" />
    </div>
    <div class="base-page__content" :style="contentStyle">
      <div
        v-if="centerContent"
        class="base-page__inner"
        :class="contentClass"
        :style="innerStyle"
      >
        <slot />
      </div>
      <template v-else>
        <slot />
      </template>
    </div>
  </q-page>
</template>

<style scoped>
.base-page {
  position: relative;
  padding: 0;
}

.base-page__background {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.base-page__content {
  position: relative;
  z-index: 1;
}

.base-page__inner {
  margin: 0 auto;
  width: 100%;
}
</style>
