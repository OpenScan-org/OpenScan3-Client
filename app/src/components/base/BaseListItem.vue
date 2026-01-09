<script setup lang="ts">
import { useAttrs } from 'vue'

const props = withDefaults(
  defineProps<{
    title: string
    caption?: string
    overline?: string
    meta?: string
    icon?: string
    avatarColor?: string
    selected?: boolean
    clickable?: boolean
  }>(),
  {
    avatarColor: 'secondary',
    selected: false,
    clickable: true
  }
)

const attrs = useAttrs()
</script>

<template>
  <q-item
    v-bind="attrs"
    :clickable="props.clickable"
    v-ripple="props.clickable"
    :active="props.selected"
    :class="{ 'bg-blue-2 text-dark': props.selected }"
  >
    <template v-if="$slots.icon">
      <slot name="icon" />
    </template>
    <q-item-section v-else-if="props.icon" avatar>
      <q-icon :name="props.icon" :color="props.avatarColor" />
    </q-item-section>

    <q-item-section>
      <q-item-label v-if="props.overline" overline>{{ props.overline }}</q-item-label>
      <q-item-label>{{ props.title }}</q-item-label>
      <template v-if="$slots.caption">
        <slot name="caption" />
      </template>
      <q-item-label v-else-if="props.caption" caption>{{ props.caption }}</q-item-label>
    </q-item-section>

    <q-item-section v-if="props.meta" side top>
      <q-item-label caption>{{ props.meta }}</q-item-label>
    </q-item-section>

    <slot name="actions" />
  </q-item>
</template>

<style scoped>
</style>
