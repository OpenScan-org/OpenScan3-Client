<template>
  <q-item
    clickable
    :to="!usesHref ? link : undefined"
    :href="usesHref ? link : undefined"
    :target="usesHref ? target : undefined"
    :exact="!usesHref && link === '/'"
  >
    <q-item-section v-if="icon" avatar>
      <q-icon :name="icon" />
    </q-item-section>

    <q-item-section>
      <q-item-label>
        <span>{{ title }}</span>
        <q-icon v-if="props.badge" name="upgrade" color="primary" size="18px" class="q-ml-xs" />
      </q-item-label>
    </q-item-section>

    <q-item-section v-if="showsExternalIcon" side>
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
  badge: '',
});

const usesHref = computed(
  () =>
    !!props.target ||
    props.link?.startsWith('http://') ||
    props.link?.startsWith('https://')
);

const showsExternalIcon = computed(
  () =>
    props.target === '_blank' ||
    props.link?.startsWith('http://') ||
    props.link?.startsWith('https://')
);
</script>
