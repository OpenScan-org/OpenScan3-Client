<template>
  <BasePage content-class="col-12 col-md-12 col-lg-10 col-xl-9">
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
    <div class="about-layout q-mt-md">
      <q-splitter
        v-model="splitterModel"
        class="about-splitter"
        :limits="[22, 34]"
        disable
        :separator-style="{ width: '0px' }"
      >
        <template #before>
          <div class="about-tabs-pane">
            <q-tabs
              v-model="tab"
              vertical
              class="about-tabs"
            >
              <q-tab name="about" icon="info" label="About" />
              <q-tab name="user" icon="school" label="User docs" />
              <q-tab name="developer" icon="code" label="Developer docs" />
              <q-tab name="ideas" icon="lightbulb" label="Key ideas" />
              <q-tab name="community" icon="groups" label="Community" />
              <q-tab name="privacy" icon="shield" label="Privacy" />
            </q-tabs>
          </div>
        </template>

        <template #after>
          <div class="about-panels">
            <q-tab-panels
              v-model="tab"
              animated
              swipeable
              vertical
              transition-prev="jump-up"
              transition-next="jump-up"
              class="about-panels__inner"
            >
              <q-tab-panel name="developer">
                <TextCard title="Developer documentation">
                  <p>
                    This section is intended for developers and advanced users who
                    are interested in the firmware and internal APIs.
                  </p>
                  <p>
                    Firmware and developer documentation is currently in an early
                    alpha / work in progress state and will be improved soon.
                  </p>
                  <p>
                    The main entry point for firmware and architecture details is
                    the developer documentation on GitHub.
                  </p>
                  <p>
                    Your OpenScan3 device also exposes automatically generated HTTP
                    API documentation provided by FastAPI. It is available at the
                    <code>/docs</code>
                    path of the configured API base URL. With your current settings
                    this resolves to:
                    <code>{{ apiDocsUrl }}</code>
                    .
                  </p>
                  <template #links>
                    <BaseLink
                      label="Dev docs on GitHub"
                      icon="code"
                      href="https://github.com/OpenScan-org/OpenScan3/tree/main/docs"
                      outline
                    />
                    <BaseLink
                      label="Interactive API documentation"
                      icon="api"
                      :href="apiDocsUrl"
                    />
                  </template>
                </TextCard>
              </q-tab-panel>

              <q-tab-panel name="user">
                <TextCard title="User documentation">
                  <p>
                    This section contains resources that help you set up and use
                    your OpenScan hardware.
                  </p>
                  <p>
                    For assembly instructions and general hardware usage, please
                    refer to the hardware documentation.
                  </p>
                  <p>
                    If you are new to photogrammetry in general, the tutorial videos
                    below walk you through the basic concepts and workflows.
                  </p>
                  <template #links>
                    <BaseLink
                      label="Hardware documentation"
                      icon="school"
                      href="https://openscan-org.github.io/OpenScan-Doc/"
                      outline
                    />
                    <BaseLink
                      label="Tutorial videos"
                      icon="ondemand_video"
                      href="https://www.youtube.com/watch?v=P-eySAKDRtk&amp;list=PLUvJLiTvLL5Td5hVcwlButMJxfVBz3btO"
                      outline
                    />
                  </template>
                </TextCard>
              </q-tab-panel>

              <q-tab-panel name="about">
                <TextCard title="About OpenScan">
                  <p>
                    Thanks to great community support through Patreon, we are able
                    to offer a free processing pipeline for your 3D models. With
                    over ten million processed photos, we are on our way to bringing
                    3D scanning to the masses.
                  </p>
                  <p>
                    OpenScan is an open-source project that focuses on accessible,
                    high-quality 3D scanning based on DIY, photogrammetry-driven
                    hardware.
                  </p>
                  <p>
                    The OpenScan ecosystem is designed to work with various cameras
                    and affordable components, so you can build your own scanner for
                    3D printing, modeling, reverse engineering or product
                    presentation.
                  </p>
                  <p>
                    With an open and modular design, OpenScan aims to give you full
                    control over your tools, data and workflows without locking you
                    into proprietary ecosystems.
                  </p>
                </TextCard>
              </q-tab-panel>

              <q-tab-panel name="ideas">
                <TextCard title="Key ideas behind OpenScan">
                  <ul class="q-pl-md">
                    <li>
                      Accessible, DIY hardware for photogrammetry-based 3D scanning.
                    </li>
                    <li>
                      Local processing on your own hardware, so you stay in control
                      of your data.
                    </li>
                    <li>
                      Open-source software and hardware designs that can be
                      inspected and modified.
                    </li>
                    <li>
                      Modular setup to adapt to different cameras, use-cases and
                      workflows.
                    </li>
                  </ul>
                </TextCard>
              </q-tab-panel>

              <q-tab-panel name="community">
                <TextCard title="Community and links">
                  <p>
                    OpenScan thrives on an active community of makers, developers
                    and 3D enthusiasts. If you want to contribute, get support or
                    simply follow the project, these links are a good starting
                    point:
                  </p>
                  <template #links>
                    <BaseLink
                      label="OpenScan on GitHub"
                      icon="code"
                      href="https://github.com/OpenScan-org"
                      outline
                    />
                    <BaseLink
                      label="Join our Discord"
                      icon="forum"
                      href="https://discord.gg/eBdqtdkXyF"
                      outline
                    />
                    <BaseLink
                      label="OpenScan website"
                      icon="language"
                      href="https://openscan.eu"
                      outline
                    />
                  </template>
                </TextCard>
              </q-tab-panel>

              <q-tab-panel name="privacy">
                <TextCard title="Privacy and data">
                  <p>
                    OpenScan3 is built to run locally on your own devices. Scan
                    acquisition and processing can be performed on your hardware, so
                    you do not have to upload your data to external services unless
                    you explicitly choose to.
                  </p>
                  <p>
                    For more details on how OpenScan hardware and software work
                    together, as well as updates on future developments, please
                    visit the official website at openscan.eu.
                  </p>
                </TextCard>
              </q-tab-panel>
            </q-tab-panels>
          </div>
        </template>
      </q-splitter>
    </div>
  </BasePage>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import BasePage from 'components/base/BasePage.vue';
import TextCard from 'components/base/TextCard.vue';
import BaseLink from 'components/base/BaseLink.vue';
import BlurredSnapshotBackground from 'components/background/BlurredSnapshotBackground.vue';
import { useApiConfigStore } from 'src/stores/apiConfig';
import { useCameraStore } from 'src/stores/camera';

const apiConfigStore = useApiConfigStore();
const cameraStore = useCameraStore();

const apiDocsUrl = computed(
  () => apiConfigStore.baseURL.replace(/\/$/, '') + '/docs',
);

const selectedCamera = computed(
  () => cameraStore.cameras.find((camera) => camera.name === cameraStore.selectedCamera) ?? null,
);
const backgroundPreviewUrl = computed(() => {
  const cameraName = cameraStore.selectedCamera;
  return cameraName ? cameraStore.getPreviewUrl(cameraName, 30) : null;
});
const selectedCameraOrientationFlag = computed(
  () => selectedCamera.value?.settings?.orientation_flag ?? null,
);

const tab = ref('developer');
const splitterModel = ref(28);

onMounted(() => {
  if (!cameraStore.cameras.length) {
    void cameraStore.fetchCameras();
  }
});
</script>

<style scoped>
.about-layout {
  background: rgba(255, 255, 255, 0.85);
  border-radius: 12px;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.about-splitter {
  min-height: 520px;
}

.about-tabs-pane {
  height: 100%;
  background: rgba(0, 0, 0, 0.04);
}

.about-tabs {
  width: 210px;
  height: 100%;
  padding: 12px 0;
}

.about-panels {
  height: 100%;
  background: rgba(255, 255, 255, 0.95);
}

.about-panels__inner {
  height: 100%;
}

.about-panels__inner :deep(.q-tab-panel) {
  height: 100%;
  overflow-y: auto;
}
</style>
