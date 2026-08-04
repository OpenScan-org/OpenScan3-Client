<template>
  <q-layout view="hHh Lpr lFf">
    <q-header elevated>
      <q-toolbar class="main-toolbar">
        <div class="row items-center no-wrap">
          <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />
          <q-toolbar-title>OpenScan3</q-toolbar-title>
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
          <q-item
            clickable
            class="update-link--paused text-grey-7"
            aria-label="Updates are unavailable"
            @click="updateInfoDialog = true"
          >
            <q-item-section avatar>
              <q-icon name="system_update" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-strike">Update</q-item-label>
            </q-item-section>
            <q-tooltip>Updates are unavailable</q-tooltip>
          </q-item>
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

    <q-dialog v-model="updateInfoDialog">
      <q-card style="max-width: 480px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Stable release coming soon</div>
          <q-space />
          <q-btn v-close-popup icon="close" flat round dense aria-label="Close" />
        </q-card-section>
        <q-card-section>
          OpenScan is moving from beta to its stable release. Updates are temporarily paused while we prepare the new version.
          You can continue using your scanner as usual. Installing the stable release will require flashing a new system image.
          We will provide instructions when it is ready.
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-close-popup flat color="primary" label="Close" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import EssentialLink from 'components/EssentialLink.vue';
import type { EssentialLinkProps } from 'components/models';
import { useDeviceStore } from 'src/stores/device';
import { useTaskStore } from 'src/stores/tasks';
import PowerControls from 'components/PowerControls.vue';
import TaskDrawerPanel from 'components/task/TaskDrawerPanel.vue';
import { useUpdatesStore } from 'src/stores/updates';

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

const lowerLinks = computed<EssentialLinkProps[]>(() => [
  {
    title: 'Update',
    icon: 'system_update',
    link: '/update',
    badge: updatesStore.updatesAvailable ? 'Updates available' : ''
  }
])

const leftDrawerOpen = ref(true)
const rightDrawerOpen = ref(false)
const updateInfoDialog = ref(false)

const deviceStore = useDeviceStore()
void deviceStore.ensureConnected()

const taskStore = useTaskStore()
void taskStore.ensureConnected()

const updatesStore = useUpdatesStore()
updatesStore.startPolling()

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

.update-link--paused {
  opacity: 0.7;
}

</style>
