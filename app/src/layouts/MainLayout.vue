<template>
  <q-layout view="hHh Lpr lFf">
    <q-header elevated>
      <q-toolbar class="main-toolbar">
        <div class="row items-center no-wrap">
          <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />
          <img :src="openscanLogo" alt="OpenScan3 logo" class="main-logo" />
        </div>

        <q-space />

        <PowerControls v-slot="{ confirmReboot, confirmShutdown, rebooting, shuttingDown }">
          <q-btn
            flat
            round
            icon="restart_alt"
            :loading="rebooting"
            @click="confirmReboot"
          />
          <q-btn
            flat
            round
            icon="power_settings_new"
            :loading="shuttingDown"
            @click="confirmShutdown"
          />
        </PowerControls>

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
import EssentialLink from 'components/EssentialLink.vue';
import type { EssentialLinkProps } from 'components/models';
import { useDeviceStore } from 'src/stores/device'
import { useTaskStore } from 'src/stores/tasks'
import PowerControls from 'components/PowerControls.vue'
import openscanLogo from 'src/assets/openscan_black_Rahmen.avif'

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
    title: '(wip) settings',
    icon: 'settings',
    link: '/settings'
  },
  {
    title: 'About',
    icon: 'help',
    link: '/about'
  },
];

const lowerLinks: EssentialLinkProps[] = [
  {
    title: 'Donate',
    icon: 'volunteer_activism',
    link: '/donate'
  },
];

const leftDrawerOpen = ref(true)

const deviceStore = useDeviceStore()
void deviceStore.ensureConnected()

const taskStore = useTaskStore()
void taskStore.ensureConnected()

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}
 </script>

<style scoped>
.main-toolbar {
  min-height: 56px;
}

.main-logo {
  height: 40px;
}
</style>
