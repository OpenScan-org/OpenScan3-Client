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
        <q-item-label header>
          Essential Links
        </q-item-label>

        <EssentialLink v-for="link in essentialLinks" :key="link.title" v-bind="link" />
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { api } from 'boot/axios'
import EssentialLink, { EssentialLinkProps } from 'components/EssentialLink.vue';

const essentialLinks: EssentialLinkProps[] = [
  {
    title: 'Index',
    icon: 'dashboard',
    link: '/'
  },
  {
    title: 'Settings',
    icon: 'settings',
    link: '/settings'
  },
  {
    title: 'Docs',
    icon: 'school',
    link: 'https://openscan-org.github.io/OpenScan-Doc/',
    target: '_blank'
  },
  {
    title: 'Github',
    icon: 'code',
    link: 'https://github.com/OpenScan-org',
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
