<template>
  <div class="camera-histogram" :style="histogramCardStyle">
    <div class="histogram__canvas-wrapper" @click="histogramViewDialog = true">
      <q-icon
        class="histogram__info-icon absolute all-pointer-events"
        size="20px"
        name="info"
        @click.stop="histogramInfoDialog = true"
      >
        <q-tooltip anchor="top middle" self="bottom middle" max-width="260px">
          Photogrammetry needs evenly exposed sets. The histogram maps tone distribution per RGB channel:
          shadows left, mid-tones center, highlights right. Keep the curves away from the edges to maintain
          texture and avoid clipping.
        </q-tooltip>
      </q-icon>
      <canvas ref="histogramCanvas" class="histogram" />
    </div>

    <q-dialog v-model="histogramInfoDialog">
      <q-card class="histogram-info-dialog">
        <q-card-section class="text-h6">Histogram for photogrammetry</q-card-section>
        <q-card-section class="text-body2">
          <p>
            The RGB curves represent how many pixels fall into each brightness bucket. Shadows accumulate
            on the left, highlights on the right, mid-tones stay centered.
          </p>
          <p>
            For photogrammetry captures, aim for balanced curves with no channel pinned to either edge.
            That ensures the reconstruction software receives usable texture detail without blown-out whites
            or crushed blacks.
          </p>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Close" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="histogramViewDialog" persistent>
      <q-card class="histogram-view-dialog" :style="histogramDialogStyle">
        <q-card-section class="text-h6">Histogram</q-card-section>
        <q-card-section>
          <canvas ref="histogramCanvasDialog" class="histogram-dialog__canvas" />
        </q-card-section>
        <q-card-section class="text-body2 histogram-dialog__description">
          Photogrammetry needs evenly exposed sets. The histogram maps tone distribution per RGB channel:
          shadows on the left, mid-tones in the center, highlights on the right. Keep the curves away from
          the edges to preserve texture and avoid clipping.
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Close" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useCameraStore } from 'src/stores/camera'

const $q = useQuasar()

const cameraStore = useCameraStore()

const histogramCanvas = ref<HTMLCanvasElement | null>(null)
const histogramCanvasDialog = ref<HTMLCanvasElement | null>(null)
const histogramInfoDialog = ref(false)
const histogramViewDialog = ref(false)
const redrawInterval = ref<number | null>(null)
const histogramImage = ref<HTMLImageElement | null>(null)
const imageLoaded = ref(false)

const histogramTheme = computed(() => {
  const isDark = $q.dark.isActive
  return {
    surface: isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(229, 231, 235, 0.9)',
    canvasBg: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(248, 250, 252, 0.95)',
    lineColors: {
      r: isDark ? 'rgba(248, 113, 113, 0.95)' : 'rgba(220, 38, 38, 0.8)',
      g: isDark ? 'rgba(74, 222, 128, 0.95)' : 'rgba(22, 163, 74, 0.8)',
      b: isDark ? 'rgba(96, 165, 250, 0.95)' : 'rgba(37, 99, 235, 0.8)'
    }
  }
})

const histogramCardStyle = computed(() => ({
  '--histogram-canvas-bg': histogramTheme.value.canvasBg
}))

const histogramDialogStyle = computed(() => ({
  '--histogram-surface': histogramTheme.value.surface,
  '--histogram-canvas-bg': histogramTheme.value.canvasBg,
  background: histogramTheme.value.surface
}))

function drawHistogram() {
  const img = histogramImage.value
  const canvases = [histogramCanvas.value, histogramCanvasDialog.value].filter(
    (canvas): canvas is HTMLCanvasElement => Boolean(canvas)
  )

  if (!img || canvases.length === 0 || !img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
    return
  }

  const tempCanvas = document.createElement('canvas')
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D | null
  if (!tempCtx) {
    return
  }

  tempCanvas.width = img.naturalWidth
  tempCanvas.height = img.naturalHeight
  tempCtx.drawImage(img, 0, 0)

  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)
  const data = imageData.data

  const r = new Array(256).fill(0)
  const g = new Array(256).fill(0)
  const b = new Array(256).fill(0)

  for (let i = 0; i < data.length; i += 4) {
    r[data[i]]++
    g[data[i + 1]]++
    b[data[i + 2]]++
  }

  const maxVal = Math.max(...r, ...g, ...b)
  const theme = histogramTheme.value
  canvases.forEach((canvas) => {
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width || 200
    canvas.height = rect.height || 100

    const ctx = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D | null
    if (!ctx) {
      return
    }

    if (maxVal === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      return
    }

    ctx.fillStyle = theme.canvasBg
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const drawChannel = (hist: number[], color: string) => {
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let i = 0; i < 256; i++) {
        const x = (i / 256) * canvas.width
        const logVal = hist[i] > 0 ? Math.log10(hist[i] + 1) : 0
        const maxLog = Math.log10(maxVal + 1)
        const y = canvas.height - (logVal / maxLog) * canvas.height
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.stroke()
    }

    drawChannel(r, theme.lineColors.r)
    drawChannel(g, theme.lineColors.g)
    drawChannel(b, theme.lineColors.b)
  })
}

function clearHistogram() {
  const canvases = [histogramCanvas.value, histogramCanvasDialog.value].filter(
    (canvas): canvas is HTMLCanvasElement => Boolean(canvas)
  )
  canvases.forEach((canvas) => {
    const ctx = canvas.getContext('2d')
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
  })
}

function scheduleDraw() {
  if (imageLoaded.value && histogramImage.value) {
    nextTick(() => drawHistogram())
  } else {
    clearHistogram()
  }
}

function loadHistogramImage() {
  const url = cameraStore.photoObjectUrl
  if (!url) {
    histogramImage.value = null
    imageLoaded.value = false
    clearHistogram()
    return
  }

  const img = new Image()
  img.crossOrigin = 'anonymous'
  imageLoaded.value = false

  img.onload = () => {
    histogramImage.value = img
    imageLoaded.value = true
    scheduleDraw()
  }

  img.onerror = () => {
    imageLoaded.value = false
  }

  img.src = url
}

watch(
  () => cameraStore.photoObjectUrl,
  () => {
    loadHistogramImage()
  },
  { immediate: true }
)

watch(imageLoaded, () => {
  scheduleDraw()
})

watch(histogramViewDialog, (open) => {
  if (open && imageLoaded.value && histogramImage.value) {
    nextTick(() => drawHistogram())
  }
})

watch(
  () => histogramTheme.value,
  () => {
    if (imageLoaded.value && histogramImage.value) {
      nextTick(() => drawHistogram())
    }
  }
)

onMounted(() => {
  redrawInterval.value = window.setInterval(() => {
    if (imageLoaded.value && histogramImage.value) {
      drawHistogram()
    }
  }, 500)
})

onBeforeUnmount(() => {
  if (redrawInterval.value) {
    clearInterval(redrawInterval.value)
  }
})
</script>

<style scoped>
.camera-histogram {
  width: 100%;
  padding: 0;
}

.histogram__canvas-wrapper {
  position: relative;
  width: 100%;
  cursor: pointer;
}

.histogram__info-icon {
  top: 12px;
  right: 12px;
}

.histogram {
  display: block;
  width: 100%;
  height: 120px;
  background: var(--histogram-canvas-bg, rgba(248, 250, 252, 0.95));
}

.histogram-view-dialog {
  width: min(90vw, 720px);
}

.histogram-dialog__canvas {
  width: 100%;
  height: 280px;
  background: var(--histogram-canvas-bg, rgba(248, 250, 252, 0.95));
}
</style>
