<template>
  <BasePage>
    <TextCard title="Version info">
      <div class="row q-col-gutter-md">
        <div class="col">
          <div class="text-caption">Frontend</div>
          <div>{{ appInfoStore.version }}</div>
        </div>
        <div class="col">
          <div class="text-caption">Firmware</div>
          <div>{{ firmwareVersion ?? 'Loading...' }}</div>
        </div>
        <div class="col">
          <div class="text-caption">API version</div>
          <div>{{ apiConfigStore.version }}</div>
        </div>
      </div>
    </TextCard>

    <div class="q-mt-md">
      <TextCard title="Developer documentation">
        <p>
          This section is intended for developers and advanced users who are
          interested in the firmware and internal APIs.
        </p>
        <p>
          Firmware and developer documentation is currently in an early alpha /
          work in progress state and will be improved soon.
        </p>
        <p>
          The main entry point for firmware and architecture details is the
          developer documentation on GitHub.
        </p>
        <p>
          Your OpenScan3 device also exposes automatically generated HTTP API
          documentation provided by FastAPI. It is available at the
          <code>/docs</code>
          path of the configured API base URL. With your current settings this
          resolves to:
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
    </div>
    <div class="q-mt-md">
      <TextCard title="User documentation">
        <p>
          This section contains resources that help you set up and use your
          OpenScan hardware.
        </p>
        <p>
          For assembly instructions and general hardware usage, please refer to
          the hardware documentation.
        </p>
        <p>
          If you are new to photogrammetry in general, the tutorial videos below
          walk you through the basic concepts and workflows.
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
    </div>
    <TextCard title="About OpenScan">
      <p>
        Thanks to great community support through Patreon, we are able to offer
        a free processing pipeline for your 3D models. With over ten million
        processed photos, we are on our way to bringing 3D scanning to the
        masses.
      </p>
      <p>
        OpenScan is an open-source project that focuses on accessible,
        high-quality 3D scanning based on DIY, photogrammetry-driven hardware.
      </p>
      <p>
        The OpenScan ecosystem is designed to work with various cameras and
        affordable components, so you can build your own scanner for 3D
        printing, modeling, reverse engineering or product presentation.
      </p>
      <p>
        With an open and modular design, OpenScan aims to give you full control
        over your tools, data and workflows without locking you into proprietary
        ecosystems.
      </p>
    </TextCard>

    <div class="q-mt-md">
      <TextCard title="Key ideas behind OpenScan">
        <ul class="q-pl-md">
          <li>
            Accessible, DIY hardware for photogrammetry-based 3D scanning.
          </li>
          <li>
            Local processing on your own hardware, so you stay in control of
            your data.
          </li>
          <li>
            Open-source software and hardware designs that can be inspected and
            modified.
          </li>
          <li>
            Modular setup to adapt to different cameras, use-cases and
            workflows.
          </li>
        </ul>
      </TextCard>
    </div>

    <div class="q-mt-md">
      <TextCard title="Community and links">
        <p>
          OpenScan thrives on an active community of makers, developers and 3D
          enthusiasts. If you want to contribute, get support or simply follow
          the project, these links are a good starting point:
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
    </div>

    <div class="q-mt-md">
      <TextCard title="Privacy and data">
        <p>
          OpenScan3 is built to run locally on your own devices. Scan
          acquisition and processing can be performed on your hardware, so you
          do not have to upload your data to external services unless you
          explicitly choose to.
        </p>
        <p>
          For more details on how OpenScan hardware and software work together,
          as well as updates on future developments, please visit the official
          website at openscan.eu.
        </p>
      </TextCard>
    </div>
  </BasePage>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import BasePage from 'components/base/BasePage.vue';
import TextCard from 'components/base/TextCard.vue';
import BaseLink from 'components/base/BaseLink.vue';
import { useApiConfigStore } from 'src/stores/apiConfig';
import { useAppInfoStore } from 'src/stores/appInfo';

interface SoftwareInfo {
  model: string | null;
  firmware_version: string;
}

const apiConfigStore = useApiConfigStore();
const appInfoStore = useAppInfoStore();
const firmwareVersion = ref<string | null>(null);

const apiDocsUrl = computed(
  () => apiConfigStore.baseURL.replace(/\/$/, '') + '/docs',
);

onMounted(async () => {
  try {
    const response = await fetch(apiConfigStore.baseURL);
    if (response.ok) {
      const data: SoftwareInfo = await response.json();
      firmwareVersion.value = data.firmware_version;
    } else {
      firmwareVersion.value = 'N/A';
    }
  } catch (error) {
    console.error('Failed to fetch software info:', error);
    firmwareVersion.value = 'N/A';
  }
});
</script>

<style scoped></style>
