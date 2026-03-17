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
          <q-tabs
            v-model="tab"
            vertical
            class="about-tabs"
          >
            <q-tab name="about" icon="lightbulb" label="About" />
            <q-tab name="user" icon="school" label="User docs" />
            <q-tab name="developer" icon="code" label="Developer docs" />
            <q-tab name="community" icon="groups" label="Community" />
            <q-tab name="sponsor" icon="volunteer_activism" label="Sponsor" />
            <q-tab name="privacy" icon="shield" label="Privacy" />
          </q-tabs>
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
                <div class="about-section">
                  <div class="text-h5 q-mb-md">Developer documentation</div>
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
                  <div class="about-links">
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
                  </div>
                </div>
              </q-tab-panel>

              <q-tab-panel name="user">
                <div class="about-section">
                  <div class="text-h5 q-mb-md">User documentation</div>
                  <p>
                    For assembly instructions and general hardware usage, please
                    refer to the hardware documentation.
                  </p>
                  <p>
                    If you are new to photogrammetry in general, the tutorial videos
                    below walk you through the basic concepts and workflows.
                  </p>
                  <div class="about-links">
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
                  </div>
                </div>
              </q-tab-panel>

              <q-tab-panel name="about">
                <div class="about-section">
                  <div class="text-h5 q-mb-md">About OpenScan</div>
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
                  <p>
                    Thanks to great community support through Patreon, we are able
                    to offer a free processing pipeline for your 3D models. With
                    over ten million processed photos, we are on our way to bringing
                    3D scanning to the masses.
                  </p>
                  <div class="text-h5 q-mb-md">Key ideas behind OpenScan</div>
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
                </div>
              </q-tab-panel>

              <q-tab-panel name="community">
                <div class="about-section">
                  <div class="text-h5 q-mb-md">Community and links</div>
                  <p>
                    OpenScan thrives on an active community of makers, developers
                    and 3D enthusiasts. If you want to contribute, get support or
                    simply follow the project, these links are a good starting
                    point:
                  </p>
                  <div class="about-links">
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
                    <BaseLink
                      label="OpenScan on Reddit"
                      icon="chat"
                      href="https://www.reddit.com/r/OpenScan/"
                      outline
                    />
                  </div>
                </div>
              </q-tab-panel>

              <q-tab-panel name="sponsor">
                <div class="about-section">
                  <div class="text-h5 q-mb-md">Sponsor OpenScan</div>
                  <p>
                    Hey, this is Thomas, the guy behind OpenScan :)
                  </p>
                  <p>
                    I am glad you made it here! I am very happy to be able to share OpenScan with the world. A lot of
                    passion, but also many hours already went into this project and to be honest, I've never expected to
                    get so far.
                  </p>
                  <p>
                    Anyway, there is so much more that I would like to do. It is not only about keeping everything
                    open-source and maintained, there are just so many cool new features and ideas that need to be tried
                    out :)
                  </p>
                  <p>
                    <strong>
                      Buying me a coffee once or monthly would not only help me stay awake all night programming, but
                      would also be a great motivation for all further developments.
                    </strong>
                  </p>
                  <p>
                    Thank you very much for your support,
                  </p>
                  <p>
                    best greetings from Halle, Germany,
                  </p>
                  <p>
                    Thomas
                  </p>
                  <div class="about-links">
                    <BaseLink
                      label="Get in touch"
                      icon="email"
                      href="mailto:info@openscan.eu?subject=Support OpenScan"
                    />
                    <BaseLink
                      label="Become a Patreon"
                      icon="volunteer_activism"
                      href="https://www.patreon.com/OpenScan"
                    />
                    <BaseLink
                      label="Buy me a coffee"
                      icon="coffee"
                      href="https://buymeacoffee.com/openscan"
                      tooltip="Maybe used for beer."
                    />
                  </div>
                </div>
              </q-tab-panel>

              <q-tab-panel name="privacy">
                <div class="about-section">
                  <div class="text-h5 q-mb-md">Privacy and data</div>
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
                </div>
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
const splitterModel = ref(20);

onMounted(() => {
  if (!cameraStore.cameras.length) {
    void cameraStore.fetchCameras();
  }
});
</script>

<style scoped>
.about-layout {
  background: rgba(255, 255, 255, 0.88);
  border-radius: 12px;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.about-splitter {
  min-height: 420px;
}

.about-tabs {
  height: 100%;
  padding: 8px 0;
  background: rgba(0, 0, 0, 0.04);
}

.about-panels {
  height: 100%;
  background: rgba(255, 255, 255, 0.96);
  padding: 12px;
  display: flex;
  flex-direction: column;
}

.about-panels__inner {
  flex: 1;
  min-height: 0;
}

.about-panels__inner :deep(.q-tab-panel) {
  height: 100%;
  overflow-y: auto;
  padding: 0;
}

.about-section {
  padding: 4px 8px;
}

.about-links {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
}

.about-tabs :deep(.q-tab) {
  min-height: 72px;
}

.about-tabs :deep(.q-tab__content) {
  gap: 6px;
}
</style>
