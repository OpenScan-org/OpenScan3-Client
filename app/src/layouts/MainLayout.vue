<template>
  <q-layout view="hHh Lpr lFf">
    <q-header elevated>
      <q-toolbar class="main-toolbar">
        <div class="row items-center no-wrap">
          <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />
          <q-toolbar-title>OpenScan3 [alpha]</q-toolbar-title>
        </div>

        <q-space />

        <q-btn
          flat
          round
          class="task-toggle-btn"
          aria-label="Tasks"
          @click="toggleRightDrawer"
        >
          <q-icon name="assignment" size="22px" />
          <q-badge
            v-if="runningTaskCount > 0"
            class="task-indicator-badge task-indicator-badge--running"
            color="white"
            text-color="primary"
            outline
          >
            {{ runningTaskCount }}
          </q-badge>
          <q-badge
            v-if="pausedTaskCount > 0"
            class="task-indicator-badge task-indicator-badge--paused"
            color="orange-5"
            text-color="white"
          >
            {{ pausedTaskCount }}
          </q-badge>
          <q-tooltip>{{ rightDrawerOpen ? 'Hide task panel' : 'Show task panel' }}</q-tooltip>
        </q-btn>

      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" elevated :width="200">
      <div class="column full-height">
        <q-list class="col">
          <EssentialLink v-for="link in upperLinks" :key="link.title" v-bind="link" />
          <q-separator />
          <EssentialLink v-for="link in lowerLinks" :key="link.title" v-bind="link" />
        </q-list>

        <q-separator />

        <PowerControls v-slot="{ confirmReboot, confirmShutdown, rebooting, shuttingDown }">
          <div class="q-pa-sm q-gutter-xs row">
            <q-btn
              flat
              dense
              no-caps
              stack
              icon="restart_alt"
              label="Reboot"
              :loading="rebooting"
              class="col"
              @click="confirmReboot"
            />
            <q-btn
              flat
              dense
              no-caps
              stack
              icon="power_settings_new"
              label="Shutdown"
              :loading="shuttingDown"
              class="col"
              @click="confirmShutdown"
            />
          </div>
        </PowerControls>
      </div>
    </q-drawer>

    <q-drawer v-model="rightDrawerOpen" side="right" elevated :width="340">
      <q-toolbar class="tasks-toolbar">
        <q-toolbar-title class="text-center">Tasks</q-toolbar-title>
      </q-toolbar>
      <TaskDrawerPanel />
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import EssentialLink from 'components/EssentialLink.vue';
import type { EssentialLinkProps } from 'components/models';
import { useDeviceStore } from 'src/stores/device';
import { useTaskStore } from 'src/stores/tasks';
import { useVersionStore } from 'src/stores/version';
import PowerControls from 'components/PowerControls.vue';
import TaskDrawerPanel from 'components/task/TaskDrawerPanel.vue';

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
    icon: 'help_center',
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
const rightDrawerOpen = ref(false)

const deviceStore = useDeviceStore()
void deviceStore.ensureConnected()

const taskStore = useTaskStore()
void taskStore.ensureConnected()

const runningTaskCount = computed(() => taskStore.runningTasks.length)
const pausedTaskCount = computed(() => taskStore.tasks.filter((task) => task.status === 'paused').length)

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

function toggleRightDrawer() {
  rightDrawerOpen.value = !rightDrawerOpen.value
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
