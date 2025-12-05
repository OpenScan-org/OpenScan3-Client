<template>
  <q-layout view="hHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title>
          OpenScan3
        </q-toolbar-title>

        <q-chip
          dense
          text-color="white"
          :color="deviceStatusColor"
          icon="circle"
        >
          {{ deviceStatusLabel }}
        </q-chip>

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
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia'
import EssentialLink from 'components/EssentialLink.vue';
import type { EssentialLinkProps } from 'components/models';
import { useDeviceStore } from 'src/stores/device'
import { useTaskStore } from 'src/stores/tasks'
import PowerControls from 'components/PowerControls.vue'

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
    title: 'Docs',
    icon: 'school',
    link: 'https://openscan-org.github.io/OpenScan-Doc/',
    target: '_blank'
  },
];

const lowerLinks: EssentialLinkProps[] = [
  {
    title: 'Contribute on Github',
    icon: 'code',
    link: 'https://github.com/OpenScan-org',
    target: '_blank'
  },
  {
    title: 'Join Discord',
    icon: 'forum',
    link: 'https://discord.gg/eBdqtdkXyF',
    target: '_blank'
  },
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

const { status: deviceStatus } = storeToRefs(deviceStore)

const deviceStatusLabel = computed(() => {
  switch (deviceStatus.value) {
    case 'open':
      return 'Device connected'
    case 'connecting':
      return 'Connecting…'
    case 'error':
      return 'Device error'
    default:
      return 'Device offline'
  }
})

const deviceStatusColor = computed(() => {
  switch (deviceStatus.value) {
    case 'open':
      return 'positive'
    case 'connecting':
      return 'warning'
    case 'error':
      return 'negative'
    default:
      return 'grey-7'
  }
})

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}


</script>
