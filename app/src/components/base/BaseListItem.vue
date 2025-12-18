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
  }>(),
  {
    avatarColor: 'secondary',
    selected: false
  }
)

const attrs = useAttrs()
</script>

<template>
  <q-item
    v-bind="attrs"
    clickable
    v-ripple
    :active="props.selected"
    :class="{ 'bg-blue-2 text-dark': props.selected }"
  >
    <q-item-section v-if="props.icon" avatar>
      <q-icon :name="props.icon" :color="props.avatarColor" />
    </q-item-section>

    <q-item-section>
      <q-item-label v-if="props.overline" overline>{{ props.overline }}</q-item-label>
      <q-item-label>{{ props.title }}</q-item-label>
      <q-item-label v-if="props.caption" caption>{{ props.caption }}</q-item-label>
    </q-item-section>

    <q-item-section v-if="props.meta" side top>
      <q-item-label caption>{{ props.meta }}</q-item-label>
    </q-item-section>
  </q-item>
</template>

<style scoped>
</style>
