<template>
  <q-item clickable tag="a" :target="target" :href="link">
    <q-item-section v-if="icon" avatar>
      <q-icon :name="icon" />
    </q-item-section>

    <q-item-section>
      <q-item-label>{{ title }}</q-item-label>
    </q-item-section>

    <q-item-section v-if="isExternal" side>
      <q-icon name="open_in_new" />
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { EssentialLinkProps } from './models';

const props = withDefaults(defineProps<EssentialLinkProps>(), {
  caption: '',
  link: '#',
  icon: '',
});

const isExternal = computed(
  () =>
    props.target === '_blank' ||
    props.link?.startsWith('http://') ||
    props.link?.startsWith('https://')
);
</script>
