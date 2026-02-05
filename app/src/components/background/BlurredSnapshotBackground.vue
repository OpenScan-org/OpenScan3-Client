<template>
  <div class="blurred-snapshot-background" :style="containerStyle">
    <img
      v-if="previousSrc"
      :key="`previous-${previousSrc}`"
      :src="previousSrc"
      :alt="alt"
      :style="mergedImageStyle"
      class="background-image background-image--previous"
      :class="{ 'background-image--visible': previousVisible }"
    />
    <img
      v-if="currentSrc"
      :key="`current-${currentSrc}`"
      :src="currentSrc"
      :alt="alt"
      :style="mergedImageStyle"
      class="background-image background-image--current"
      :class="{ 'background-image--visible': currentVisible }"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch, type CSSProperties } from 'vue'

interface Props {
  src: string | null
  alt?: string
  blurPx?: number
  saturatePercent?: number
  maxOpacity?: number
  transitionMs?: number
  imageStyle?: CSSProperties
}

const props = withDefaults(defineProps<Props>(), {
  alt: 'Background preview',
  blurPx: 14,
  saturatePercent: 120,
  maxOpacity: 0.35,
  transitionMs: 400,
  imageStyle: () => ({})
})

const currentSrc = ref<string | null>(null)
const previousSrc = ref<string | null>(null)
const currentVisible = ref(false)
const previousVisible = ref(false)
const transitionTimeoutId = ref<number | null>(null)
const overlapTimeoutId = ref<number | null>(null)
let loadRequestId = 0

const containerStyle = computed(() => ({
  '--blurred-bg-transition': `${props.transitionMs}ms`,
  '--blurred-bg-opacity': props.maxOpacity.toString()
}))

const mergedImageStyle = computed<CSSProperties>(() => {
  const baseStyle: CSSProperties = {
    width: '120vmax',
    height: '120vmax',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    objectFit: 'cover',
    ...props.imageStyle
  }

  const existingFilter = props.imageStyle?.filter ? `${props.imageStyle.filter} ` : ''
  baseStyle.filter = `${existingFilter}blur(${props.blurPx}px) saturate(${props.saturatePercent}%)`.trim()

  return baseStyle
})

function clearTransitionTimeout() {
  if (transitionTimeoutId.value !== null) {
    window.clearTimeout(transitionTimeoutId.value)
    transitionTimeoutId.value = null
  }
}

function clearOverlapTimeout() {
  if (overlapTimeoutId.value !== null) {
    window.clearTimeout(overlapTimeoutId.value)
    overlapTimeoutId.value = null
  }
}

function schedulePreviousCleanup() {
  clearTransitionTimeout()
  transitionTimeoutId.value = window.setTimeout(() => {
    previousSrc.value = null
    previousVisible.value = false
    transitionTimeoutId.value = null
  }, props.transitionMs)
}

function scheduleFadeOutPrevious() {
  clearOverlapTimeout()
  const overlapDelay = Math.max(props.transitionMs * 0.6, 50)
  overlapTimeoutId.value = window.setTimeout(() => {
    overlapTimeoutId.value = null
    fadeOutPrevious()
  }, overlapDelay)
}

function animateCurrentVisibility() {
  currentVisible.value = false
  nextTick(() => {
    requestAnimationFrame(() => {
      currentVisible.value = true
    })
  })
}

function fadeOutPrevious() {
  if (!previousSrc.value) {
    return
  }
  nextTick(() => {
    requestAnimationFrame(() => {
      previousVisible.value = false
    })
  })
  schedulePreviousCleanup()
}

function applyLoadedSource(newSrc: string) {
  if (currentSrc.value === newSrc) {
    return
  }

  const hasPrevious = Boolean(currentSrc.value)
  if (hasPrevious) {
    previousSrc.value = currentSrc.value
    previousVisible.value = true
  }

  currentSrc.value = newSrc
  animateCurrentVisibility()

  if (hasPrevious) {
    scheduleFadeOutPrevious()
  } else {
    previousSrc.value = null
    previousVisible.value = false
  }
}

function handleSourceChange(newSrc: string | null) {
  if (!newSrc) {
    if (currentSrc.value) {
      previousSrc.value = currentSrc.value
      currentSrc.value = null
      fadeOutPrevious()
    }
    return
  }

  const requestId = ++loadRequestId
  const img = new Image()
  img.onload = () => {
    if (requestId !== loadRequestId) {
      return
    }
    applyLoadedSource(newSrc)
  }
  img.onerror = () => {
    if (requestId === loadRequestId && !currentSrc.value) {
      previousSrc.value = null
      previousVisible.value = false
      clearTransitionTimeout()
    }
  }
  img.src = newSrc
}

watch(
  () => props.src,
  (newSrc) => {
    handleSourceChange(newSrc)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  clearTransitionTimeout()
  clearOverlapTimeout()
})
</script>

<style scoped>
.blurred-snapshot-background {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
}

.background-image {
  position: absolute;
  opacity: 0;
  transition: opacity var(--blurred-bg-transition, 400ms) ease;
}

.background-image--current.background-image--visible {
  opacity: var(--blurred-bg-opacity, 0.35);
}

.background-image--previous {
  opacity: var(--blurred-bg-opacity, 0.35);
}

.background-image--previous:not(.background-image--visible) {
  opacity: 0;
}
</style>
