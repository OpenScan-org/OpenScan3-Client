<template>
  <q-layout view="hHh Lpr lFf">
    <q-header elevated>
      <q-toolbar class="main-toolbar">
        <div class="row items-center no-wrap">
          <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />
          <q-toolbar-title>OpenScan3 [alpha]</q-toolbar-title>
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

    <q-drawer v-model="leftDrawerOpen" elevated :width="200">
      <q-list>
        <EssentialLink v-for="link in upperLinks" :key="link.title" v-bind="link" />
        <q-separator />
        <EssentialLink v-for="link in lowerLinks" :key="link.title" v-bind="link" />
      </q-list>
    </q-drawer>

    <q-page-container>
      <div class="row justify-center q-ma-md">
        <div class="col-12 col-md-5 col-lg-5 q-gutter-y-sm">
          <BaseBanner v-if="showSetupBanner">
            Your OpenScan device is not configured yet.
            <template #action>
              <BaseButtonPrimary label="Setup device" @click="openSetupPage" />
            </template>
          </BaseBanner>
          <BaseBanner
            v-else-if="showConnectionIssueBanner"
            background-class="bg-amber-4"
            text-class="text-black"
          >
            No connection to your OpenScan device.
            <template #action>
              <BaseButtonPrimary label="Check settings" @click="openSettingsPage" />
            </template>
          </BaseBanner>
        </div>
      </div>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import EssentialLink from 'components/EssentialLink.vue';
import type { EssentialLinkProps } from 'components/models';
import { useDeviceStore } from 'src/stores/device';
import { useTaskStore } from 'src/stores/tasks';
import { useVersionStore } from 'src/stores/version';
import PowerControls from 'components/PowerControls.vue';
import BaseButtonPrimary from 'components/base/BaseButtonPrimary.vue';
import BaseBanner from 'components/base/BaseBanner.vue';

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
    title: 'Settings',
    icon: 'settings',
    link: '/settings'
  },
  {
    title: 'Logs',
    icon: 'article',
    link: '/logs'
  },
  {
    title: 'About',
    icon: 'help',
    link: '/about'
  },
];

const versionStore = useVersionStore()
void versionStore.initialize()

const updateBadge = computed(() => versionStore.anyUpdateAvailable ? '!' : '')

const lowerLinks = computed<EssentialLinkProps[]>(() => [
  {
    title: 'Update',
    icon: 'system_update',
    target: '_self',
    link: '/admin/',
    badge: updateBadge.value
  }
])

const leftDrawerOpen = ref(true)

const deviceStore = useDeviceStore()
void deviceStore.ensureConnected()

const taskStore = useTaskStore()
void taskStore.ensureConnected()

const router = useRouter()
const route = useRoute()

const showSetupBanner = computed(
  () => deviceStore.needsSetup && route.path !== '/setup'
)
const showConnectionIssueBanner = computed(
  () => deviceStore.hasConnectionIssue && !showSetupBanner.value
)

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

function openSetupPage() {
  void router.push('/setup')
}

function openSettingsPage() {
  void router.push('/settings')
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
