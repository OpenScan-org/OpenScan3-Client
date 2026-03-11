<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDeviceStore } from 'src/stores/device'
import BaseBanner from 'components/base/BaseBanner.vue'
import BaseButtonPrimary from 'components/base/BaseButtonPrimary.vue'

const props = withDefaults(
  defineProps<{
    padding?: string
    maxWidth?: string
    contentClass?: string
    centerContent?: boolean
  }>(),
  {
    padding: '32px 24px 48px',
    maxWidth: '1100px',
    contentClass: '',
    centerContent: true
  }
)

const route = useRoute()
const router = useRouter()
const deviceStore = useDeviceStore()

const showSetupBanner = computed(
  () => deviceStore.needsSetup && route.path !== '/setup'
)
const showConnectionIssueBanner = computed(
  () => deviceStore.hasConnectionIssue && !showSetupBanner.value
)
const showBanner = computed(() => showSetupBanner.value || showConnectionIssueBanner.value)

function openSetupPage() {
  void router.push('/setup')
}

function openSettingsPage() {
  void router.push('/settings')
}

const contentStyle = computed(() => ({
  padding: props.padding
}))

const innerStyle = computed(() => ({
  maxWidth: props.maxWidth
}))
</script>

<template>
  <q-page class="base-page">
    <div class="base-page__background">
      <slot name="background" />
    </div>
    <div class="base-page__content" :style="contentStyle">
      <div v-if="showBanner" class="base-page__banner">
        <BaseBanner v-if="showSetupBanner">
          Your OpenScan device is not configured yet.
          <template #action>
            <BaseButtonPrimary label="Setup device" @click="openSetupPage" />
          </template>
        </BaseBanner>
        <BaseBanner
          v-else
          background-class="bg-amber-4"
          text-class="text-black"
        >
          No connection to your OpenScan device.
          <template #action>
            <BaseButtonPrimary label="Check settings" @click="openSettingsPage" />
          </template>
        </BaseBanner>
      </div>
      <div
        v-if="centerContent"
        class="base-page__inner"
        :class="contentClass"
        :style="innerStyle"
      >
        <slot />
      </div>
      <template v-else>
        <slot />
      </template>
    </div>
  </q-page>
</template>

<style scoped>
.base-page {
  position: relative;
  padding: 0;
}

.base-page__background {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.base-page__content {
  position: relative;
  z-index: 1;
}

.base-page__banner {
  max-width: 600px;
  margin: 0 auto 12px;
}

.base-page__inner {
  margin: 0 auto;
  width: 100%;
}
</style>
