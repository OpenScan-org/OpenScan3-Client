<template>
  <q-layout view="hHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title>
          OpenScan3
        </q-toolbar-title>

        <q-btn flat round icon="restart_alt" @click="reboot" />
        <q-btn flat round icon="power_settings_new" @click="shutdown" />

      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" elevated>
      <q-list>
        <EssentialLink v-for="link in upperLinks" :key="link.title" v-bind="link" />
        <q-separator />
        <EssentialLink v-for="link in lowerLinks" :key="link.title" v-bind="link" />
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { api } from 'src/api'
import EssentialLink from 'components/EssentialLink.vue';
import type { EssentialLinkProps } from 'components/models';

const upperLinks: EssentialLinkProps[] = [
  {
    title: 'Dashboard',
    icon: 'dashboard',
    link: '/'
  },
  {
    title: 'Projects',
    icon: 'folder',
    link: '/projects'
  },
  {
    title: 'Scan',
    icon: 'camera',
    link: '/scan'
  },
  {
    title: '(dev) settings',
    icon: 'settings',
    link: '/settings'
  },
  {
    title: 'Docs',
    icon: 'school',
    link: 'https://openscan-org.github.io/OpenScan-Doc/',
    target: '_blank'
  },
];

const lowerLinks: EssentialLinkProps[] = [
  {
    title: 'Contribute (Github)',
    icon: 'code',
    link: 'https://github.com/OpenScan-org',
    target: '_blank'
  },
  {
    title: 'Donate (Patreon)',
    icon: 'volunteer_activism',
    link: 'https://www.patreon.com/OpenScan',
    target: '_blank'
  },
];

const leftDrawerOpen = ref(false)

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

const shutdown = () => {
  api.post('/shutdown')
}

const reboot = () => {
  api.post('/reboot')
}


</script>
