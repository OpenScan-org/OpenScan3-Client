<template>
  <BasePage content-class="col-12 col-lg-9">
    <template #background>
      <BlurredSnapshotBackground
        v-if="backgroundPreviewUrl"
        :src="backgroundPreviewUrl"
        alt="Camera preview background"
        :blur-px="10"
        :saturate-percent="100"
        :max-opacity="0.3"
        :transition-ms="600"
        :orientation-flag="selectedCameraOrientationFlag"
      />
    </template>
    <div class="update-page">
      <BaseBanner v-if="!updatesSupported" class="q-mb-lg">
        Software updates require API version v0.9 or newer. Select a newer API
        version in Settings to use this panel.
      </BaseBanner>

      <template v-else>
        <BaseBanner
          v-if="updateError"
          background-class="bg-red-2"
          text-class="text-negative"
          class="q-mb-md"
        >
          {{ updateError }}
        </BaseBanner>

        <q-skeleton
          v-if="statusLoading && !updateStatus"
          type="rect"
          height="345px"
          class="q-mb-lg"
        />

        <template v-else-if="updateStatus">
          <q-card
            flat
            class="update-hero q-mb-lg"
            :class="`update-hero--${updateStatus.status}`"
          >
            <q-card-section class="q-pa-lg">
              <div class="row items-start q-col-gutter-lg">
                <div class="col-12 col-sm">
                  <div class="row no-wrap items-start">
                    <div
                      class="status-orb"
                      :class="`status-orb--${updateStatus.status}`"
                    >
                      <q-spinner v-if="isInstalling" color="primary" size="34px" />
                      <q-icon v-else :name="statusIcon" size="34px" />
                    </div>
                    <div class="q-ml-md">
                      <div class="text-h4 text-weight-bold">
                        {{ statusHeadline }}
                      </div>
                      <div class="text-body1 q-mt-sm">{{ statusMessage }}</div>
                    </div>
                  </div>
                </div>
                <div v-if="canInstall" class="col-12 col-sm-auto">
                  <BaseButtonPrimary
                    icon="system_update"
                    label="Install updates"
                    size="lg"
                    :dense="false"
                    class="install-button"
                    :loading="activeAction === 'install'"
                    :disable="isBusy"
                    @click="showInstallConfirmation = true"
                  />
                </div>
              </div>
            </q-card-section>
          </q-card>

          <BaseBanner
            v-if="updateStatus.reboot_required"
            background-class="bg-amber-3"
            text-class="text-black"
            class="q-mb-lg"
          >
            A restart is required to finish a previously installed update.
          </BaseBanner>

          <BaseSection
            v-if="installProgress"
            :title="
              isInstalling
                ? 'Installing updates'
                : 'Update installation finished'
            "
            :description="installProgress.message"
            class="update-progress q-mb-lg"
          >
            <template #header-action>
              <q-spinner v-if="isInstalling" color="primary" size="24px" />
              <q-icon v-else name="task_alt" color="positive" size="24px" />
            </template>
            <pre
              v-if="installProgress.lines.length"
              class="update-progress__log"
              >{{ installProgress.lines.join('\n') }}</pre
            >
          </BaseSection>

          <div class="row">
            <div class="col-12">
              <BaseSection
                title="OpenScan components"
                :description="`Versions supplied by the last update check at ${lastCheckedLabel}.`"
                class="update-detail-card full-height"
              >
                <template #header-action>
                  <BaseButtonPrimary
                    icon="search"
                    label="Check for updates"
                    :loading="activeAction === 'check'"
                    :disable="isBusy"
                    @click="checkForUpdates"
                  />
                </template>
                <q-markup-table
                  v-if="sortedPackages.length"
                  flat
                  dense
                  class="update-table"
                >
                  <thead>
                    <tr>
                      <th class="text-left">Component</th>
                      <th class="text-left">Installed</th>
                      <th class="text-left">Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="pkg in sortedPackages" :key="pkg.id">
                      <td>{{ packageLabel(pkg.id) }}</td>
                      <td class="version-cell">
                        {{ pkg.installed_version ?? '—' }}
                      </td>
                      <td class="version-cell">
                        {{ pkg.available_version ?? '—' }}
                        <q-icon
                          v-if="pkg.update_available"
                          name="upgrade"
                          color="positive"
                          size="18px"
                          class="q-ml-xs"
                        />
                      </td>
                    </tr>
                  </tbody>
                </q-markup-table>
                <div v-else class="text-body2 text-grey-7">
                  No OpenScan component version details are available.
                </div>
              </BaseSection>
            </div>
          </div>

        </template>
      </template>
    </div>

    <q-dialog v-model="showInstallConfirmation">
      <q-card style="max-width: 500px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Install updates?</div>
          <q-space />
          <q-btn
            v-close-popup
            icon="close"
            flat
            round
            dense
            aria-label="Close"
          />
        </q-card-section>
        <q-card-section>
          OpenScan services may restart and this page may disconnect
          temporarily. Do not switch off the device during installation.
          <BaseBanner
            v-if="isNightly"
            background-class="bg-amber-3"
            text-class="text-black"
            :inline-actions="false"
            class="q-mt-md"
          >
            Nightly builds are intended for testing and may be unstable.
          </BaseBanner>
        </q-card-section>
        <q-card-actions align="right" class="q-gutter-sm">
          <BaseButtonSecondary
            label="Cancel"
            @click="showInstallConfirmation = false"
          />
          <BaseButtonPrimary
            icon="system_update"
            label="Install updates"
            @click="installUpdates"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </BasePage>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import type * as latestSdk from 'src/generated/api/latest/sdk.gen';
import type {
  OpenScanUpdatePackage,
  UpdateStatusResponse,
} from 'src/generated/api/latest/types.gen';
import {
  apiClient,
  getApiBaseUrl,
  getApiSdk,
  resolveApiTarget,
} from 'src/services/apiClient';
import BaseBanner from 'components/base/BaseBanner.vue';
import BaseButtonPrimary from 'components/base/BaseButtonPrimary.vue';
import BaseButtonSecondary from 'components/base/BaseButtonSecondary.vue';
import BaseSection from 'components/base/BaseSection.vue';
import BlurredSnapshotBackground from 'components/background/BlurredSnapshotBackground.vue';
import BasePage from 'components/base/BasePage.vue';
import { useCameraStore } from 'src/stores/camera';
import { useFrontendSettingsStore } from 'src/stores/frontendSettings';
import { useUpdatesStore } from 'src/stores/updates';

type UpdateSdk = Pick<
  typeof latestSdk,
  'getUpdateStatus' | 'checkForUpdates' | 'applyUpdates'
>;
type UpdateAction = 'check' | 'install' | null;
type UpdateProgressJob = {
  error: string | null;
  status: string;
  unit: string;
  updated_at: string;
};

type UpdateProgress = {
  ok: boolean;
  finished: boolean;
  message: string;
  lines: string[];
  job: UpdateProgressJob;
};

const $q = useQuasar();
const updateStatus = ref<UpdateStatusResponse | null>(null);
const statusLoading = ref(false);
const activeAction = ref<UpdateAction>(null);
const updateError = ref<string | null>(null);
const showInstallConfirmation = ref(false);
const installProgress = ref<UpdateProgress | null>(null);
let updatePollingCancelled = false;
const cameraStore = useCameraStore();
const frontendSettingsStore = useFrontendSettingsStore();
const updatesStore = useUpdatesStore();

const selectedCamera = computed(
  () =>
    cameraStore.cameras.find(
      (camera) => camera.name === cameraStore.selectedCamera,
    ) ?? null,
);
const backgroundPreviewUrl = computed(() => {
  if (!frontendSettingsStore.backgroundCameraPreviewEnabled) {
    return null;
  }
  const cameraName = cameraStore.selectedCamera;
  return cameraName ? cameraStore.getPreviewUrl(cameraName, 30) : null;
});
const selectedCameraOrientationFlag = computed(
  () => selectedCamera.value?.settings?.orientation_flag ?? null,
);

const updatesSupported = computed(() => resolveApiTarget() !== 'v0_8');
const isBusy = computed(
  () => statusLoading.value || activeAction.value !== null,
);
const isNightly = computed(
  () => updateStatus.value?.release_channel === 'nightly',
);
const canInstall = computed(
  () =>
    updateStatus.value?.status === 'updates_available' &&
    !updateStatus.value.stale,
);
const isInstalling = computed(() => activeAction.value === 'install');
const openScanUpdateCount = computed(
  () =>
    updateStatus.value?.openscan.packages.filter((pkg) => pkg.update_available)
      .length ?? 0,
);
const systemUpdateCount = computed(() => updateStatus.value?.system.count ?? 0);
const totalUpdateCount = computed(
  () => openScanUpdateCount.value + systemUpdateCount.value,
);
const sortedPackages = computed(() =>
  [...(updateStatus.value?.openscan.packages ?? [])].sort(
    (left, right) =>
      Number(left.id === 'updater') - Number(right.id === 'updater'),
  ),
);
const lastCheckedLabel = computed(() =>
  formatCheckedAt(updateStatus.value?.checked_at ?? null),
);
const statusTitle = computed(() => {
  switch (updateStatus.value?.status) {
    case 'updates_available':
      return 'Updates available';
    case 'up_to_date':
      return 'Up to date';
    case 'check_failed':
      return 'Update check failed';
    case 'status_unavailable':
      return 'Update information unavailable';
    default:
      return 'Update information incomplete';
  }
});
const statusHeadline = computed(() => {
  const status = updateStatus.value;
  if (!status) return '';
  if (isInstalling.value) return 'Update in progress';
  if (status.stale) return 'Update information needs refreshing';
  if (status.status === 'updates_available') {
    return `Updates for ${totalUpdateCount.value} ${pluralize(totalUpdateCount.value, 'package')} available`;
  }
  if (status.status === 'up_to_date') return 'All good';
  return statusTitle.value;
});
const statusMessage = computed(() => {
  const status = updateStatus.value;
  if (!status) return '';
  if (isInstalling.value)
    return 'Updates are being installed. Do not turn off your OpenScan device.';
  if (status.stale)
    return 'The saved update information may be outdated. Check again before installing updates.';
  if (status.status === 'updates_available') {
    const messages = [
      status.openscan.updates_available
        ? `${openScanUpdateCount.value} OpenScan ${pluralize(openScanUpdateCount.value, 'package')} available.`
        : null,
      status.system.updates_available
        ? `${status.system.count} system update${status.system.count === 1 ? '' : 's'} available.`
        : null,
      status.system.reboot_required_after_install
        ? 'A restart will be required after installation.'
        : null,
    ].filter(Boolean);
    return messages.join(' ');
  }
  if (status.status === 'up_to_date')
    return 'Your OpenScan and system packages are up to date.';
  if (status.status === 'check_failed')
    return 'The device could not complete its last update check. Check again before installing updates.';
  if (status.status === 'status_unavailable')
    return 'No valid update snapshot is available. Check again to retrieve one.';
  return 'No valid update snapshot is available. Check again before installing updates.';
});
const statusIcon = computed(() => {
  if (updateStatus.value?.status === 'up_to_date' && !updateStatus.value.stale)
    return 'check_circle';
  if (
    updateStatus.value?.status === 'updates_available' &&
    !updateStatus.value.stale
  )
    return 'system_update';
  return 'warning';
});

function updateSdk(): UpdateSdk {
  return getApiSdk() as unknown as UpdateSdk;
}

function unwrapResponse<T>(response: unknown): T {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as { data: T }).data;
  }
  return response as T;
}

function packageLabel(id: OpenScanUpdatePackage['id']) {
  const labels: Record<OpenScanUpdatePackage['id'], string> = {
    firmware: 'Firmware',
    client: 'Frontend',
    updater: 'Updater',
    system_config: 'System configuration',
    camera_stack: 'Camera stack',
  };
  return labels[id];
}

function pluralize(count: number, noun: string) {
  return `${noun}${count === 1 ? '' : 's'}`;
}

function formatCheckedAt(value: string | null) {
  if (!value) return 'No successful check recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function updateProgressUrl() {
  return new URL('/update-status', getApiBaseUrl()).toString();
}

function parseUpdateProgress(value: unknown): UpdateProgress {
  if (!value || typeof value !== 'object') {
    throw new Error('Update progress response is not an object.');
  }

  const progress = value as Record<string, unknown>;
  const job = progress.job;
  if (
    typeof progress.ok !== 'boolean' ||
    typeof progress.finished !== 'boolean' ||
    typeof progress.message !== 'string' ||
    !Array.isArray(progress.lines) ||
    !progress.lines.every((line) => typeof line === 'string') ||
    !job ||
    typeof job !== 'object'
  ) {
    throw new Error('Update progress response has an unexpected shape.');
  }

  const jobRecord = job as Record<string, unknown>;
  if (
    (jobRecord.error !== null && typeof jobRecord.error !== 'string') ||
    typeof jobRecord.status !== 'string' ||
    typeof jobRecord.unit !== 'string' ||
    typeof jobRecord.updated_at !== 'string'
  ) {
    throw new Error('Update progress job has an unexpected shape.');
  }

  return {
    ok: progress.ok,
    finished: progress.finished,
    message: progress.message,
    lines: progress.lines,
    job: {
      error: jobRecord.error,
      status: jobRecord.status,
      unit: jobRecord.unit,
      updated_at: jobRecord.updated_at,
    },
  };
}

function jobStatus(progress: UpdateProgress) {
  return progress.job.status;
}

function isUpdateRunning(progress: UpdateProgress) {
  return jobStatus(progress) === 'update_running' || !progress.finished;
}

function isUpdateFinished(progress: UpdateProgress) {
  return !isUpdateRunning(progress) && progress.finished;
}

function updateFailed(progress: UpdateProgress) {
  return /(?:fail|error|cancel)/i.test(progress.job.status) ||
    progress.ok === false;
}

function waitForNextUpdatePoll() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, 2_000));
}

async function pollUpdateProgress(): Promise<UpdateProgress | null> {
  let lastProgress: UpdateProgress | null = null;

  while (!updatePollingCancelled) {
    try {
      const response = await fetch(updateProgressUrl(), { cache: 'no-store' });
      if (!response.ok)
        throw new Error(`Update status returned ${response.status}`);

      const progress = parseUpdateProgress(await response.json());
      lastProgress = progress;
      installProgress.value = progress;
      if (isUpdateFinished(progress)) return progress;
    } catch (error) {
      // nginx and the updater may be restarted by the update itself. Keep
      // polling instead of presenting a temporary connection error as failure.
      console.debug('Update progress endpoint temporarily unavailable.', error);
    }

    await waitForNextUpdatePoll();
  }

  return lastProgress;
}

async function loadStatus() {
  if (!updatesSupported.value) return;

  statusLoading.value = true;
  updateError.value = null;
  try {
    updateStatus.value = unwrapResponse<UpdateStatusResponse>(
      await updateSdk().getUpdateStatus({ client: apiClient }),
    );
    updatesStore.applyStatus(updateStatus.value);
  } catch (error) {
    console.error('Could not load update status.', error);
    updateError.value =
      'Could not load update information. Check that the device is connected and try again.';
  } finally {
    statusLoading.value = false;
  }
}

async function checkForUpdates() {
  activeAction.value = 'check';
  updateError.value = null;
  try {
    updateStatus.value = unwrapResponse<UpdateStatusResponse>(
      await updateSdk().checkForUpdates({ client: apiClient }),
    );
    updatesStore.applyStatus(updateStatus.value);
  } catch (error) {
    console.error('Could not check for updates.', error);
    updateError.value = 'Could not check for updates. Please try again.';
  } finally {
    activeAction.value = null;
  }
}

async function installUpdates() {
  showInstallConfirmation.value = false;
  activeAction.value = 'install';
  updateError.value = null;
  installProgress.value = null;
  updatePollingCancelled = false;
  try {
    const result = unwrapResponse<{
      status?: string;
      reboot_required?: boolean;
    }>(await updateSdk().applyUpdates({ client: apiClient }));
    if (result.status === 'install_blocked') {
      updateError.value =
        'The update could not start because the device is currently busy.';
      installProgress.value = null;
      return;
    }
    if (result.status === 'install_failed') {
      updateError.value =
        'The update installation failed. Please try again or inspect the device logs.';
      return;
    }

    const progress = await pollUpdateProgress();
    if (updatePollingCancelled) return;
    if (progress && updateFailed(progress)) {
      updateError.value =
        progress?.message ??
        'The update installation failed. Please try again or inspect the device logs.';
      return;
    }

    $q.notify({
      type: 'positive',
      message: result.reboot_required
        ? 'Updates installed. Restart the device to finish the update.'
        : 'Updates installed successfully.',
    });
    await loadStatus();
  } catch (error) {
    console.error('Could not install updates.', error);
    updateError.value = 'Could not install updates. Please try again.';
  } finally {
    activeAction.value = null;
  }
}

onMounted(() => {
  void loadStatus();
  if (!cameraStore.cameras.length) {
    void cameraStore.fetchCameras();
  }
});

onBeforeUnmount(() => {
  updatePollingCancelled = true;
});
</script>

<style scoped>
.update-page {
  max-width: 1080px;
  margin: 0 auto;
  padding: 8px 0 32px;
}

.update-table {
  overflow-x: auto;
}

.update-hero {
  overflow: hidden;
  color: #1f2937;
  background: #f1f8fd;
  border: 1px solid #cfe4f2;
  border-radius: 14px;
  box-shadow: 0 6px 18px rgb(9 111 181 / 10%);
}

.update-hero--up_to_date {
  background: #f0faf6;
  border-color: #c6e7da;
  box-shadow: 0 6px 18px rgb(6 126 97 / 8%);
}

.update-hero--check_failed,
.update-hero--status_unavailable,
.update-hero--unknown {
  background: #fff8e9;
  border-color: #f0d79d;
  box-shadow: 0 6px 18px rgb(151 85 0 / 8%);
}

.status-orb {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  flex: 0 0 64px;
  color: var(--q-primary);
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 3px 10px rgb(0 0 0 / 10%);
}

.status-orb--up_to_date {
  color: var(--q-positive);
}

.install-button {
  min-width: 190px;
  min-height: 54px;
}

.update-detail-card {
  border-color: #dde3ea;
  border-radius: 10px;
}

.update-progress {
  border-color: #cfe4f2;
  background: #f8fcff;
}

.update-progress__log {
  max-height: 240px;
  margin: 16px 0 0;
  padding: 12px;
  overflow: auto;
  color: #d7e3ee;
  background: #17212b;
  border-radius: 6px;
  font-family: monospace;
  font-size: 0.75rem;
  white-space: pre-wrap;
}

.version-cell {
  font-family: monospace;
  font-size: 0.8rem;
  overflow-wrap: anywhere;
}

@media (max-width: 599px) {
  .update-hero :deep(.q-card__section) {
    padding: 20px;
  }

  .status-orb {
    width: 52px;
    height: 52px;
    flex-basis: 52px;
  }

  .update-page__title {
    font-size: 1.7rem;
  }
}
</style>
