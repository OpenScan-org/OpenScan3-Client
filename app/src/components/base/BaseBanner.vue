<script setup lang="ts">
import { computed, useAttrs } from 'vue'

defineOptions({
  inheritAttrs: false
})

const props = withDefaults(
  defineProps<{
    backgroundClass?: string
    textClass?: string
    inlineActions?: boolean
  }>(),
  {
    backgroundClass: 'bg-amber-4',
    textClass: 'text-black',
    inlineActions: true
  }
)

const attrs = useAttrs()

const bannerAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})

const classes = computed(() => {
  const attrClass = attrs.class
  return [props.textClass, props.backgroundClass, attrClass].filter(Boolean)
})
</script>

<template>
  <q-banner
    v-bind="bannerAttrs"
    :class="classes"
    :inline-actions="props.inlineActions"
  >
    <slot />
    <template v-if="$slots.action" #action>
      <slot name="action" />
    </template>
  </q-banner>
</template>
