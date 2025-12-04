<template>
  <q-card class="camera-hq-preview-card">
    <q-card-section>
      <div class="row items-center q-col-gutter-sm">
        <div class="col-12 col-sm">
          <div class="text-h6">HQ Preview</div>
          <div class="text-caption text-grey-7">
            Accurate preview.
          </div>
        </div>
        <div class="col-12 col-sm-auto flex items-center q-gutter-sm justify-end">
          <q-btn
            icon="mdi-fire"
            dense
            unelevated
            :color="showHeatmap ? 'primary' : 'grey-6'"
            label="Heatmap"
            @click="toggleHeatmap"
          />
          <q-btn
            icon="refresh"
            dense
            unelevated
            color="primary"
            label="Refresh"
            :disable="!canRefresh"
            @click="refreshPhoto"
          />
        </div>
      </div>
    </q-card-section>

    <q-separator />

    <q-card-section class="q-pt-md">
      <div v-if="!camera" class="hq-preview__placeholder">
        <div class="text-caption text-grey-6">
          Select a camera to load the HQ preview.
        </div>
      </div>
      <div v-else class="hq-preview__stage">
        <div class="hq-preview__image-wrapper" :style="orientationTransformStyle">
          <template v-if="imageUrl && !hasError">
            <img
              :key="imageUrl"
              :src="imageUrl"
              alt="High quality camera preview"
              class="hq-preview__image"
              ref="previewImage"
              crossorigin="anonymous"
              @load="onImageLoad"
              @error="onImageError"
            />
            <canvas
              v-if="showHeatmap && imageLoaded"
              ref="heatmapCanvas"
              class="heatmap-overlay"
            />
          </template>
          <div v-else class="hq-preview__placeholder">
            <div class="text-caption text-grey-6">
              {{ hasError ?? 'No preview available.' }}
            </div>
          </div>
          <q-inner-loading :showing="isLoading">
            <q-spinner-dots color="primary" size="42px" />
          </q-inner-loading>
        </div>
      </div>
      <div v-if="imageLoaded" class="hq-preview__histogram-card q-mt-md" :style="histogramCardStyle">
        <div class="histogram__canvas-wrapper" @click="histogramViewDialog = true">
          <q-icon
            class="histogram__info-icon absolute all-pointer-events"
            size="20px"
            name="info"
            @click.stop="histogramInfoDialog = true"
          >
            <q-tooltip anchor="top middle" self="bottom middle" max-width="260px">
              Photogrammetry needs evenly exposed sets. The histogram maps tone distribution per RGB channel: shadows left, mid-tones center, highlights right. Keep the curves away from the edges to maintain texture and avoid clipping.
            </q-tooltip>
          </q-icon>
          <canvas ref="histogramCanvas" class="histogram" />
        </div>
      </div>
      <q-banner v-if="hasError" dense class="bg-red-5 text-white q-mt-md">
        {{ hasError }}
      </q-banner>
      <q-dialog v-model="histogramInfoDialog">
        <q-card class="histogram-info-dialog">
          <q-card-section class="text-h6">Histogram for photogrammetry</q-card-section>
          <q-card-section class="text-body2">
            <p>
              The RGB curves represent how many pixels fall into each brightness bucket. Shadows accumulate on the left, highlights on the right, mid-tones stay centered.
            </p>
            <p>
              For photogrammetry captures, aim for balanced curves with no channel pinned to either edge. That ensures the reconstruction software receives usable texture detail without blown-out whites or crushed blacks.
            </p>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat label="Close" color="primary" v-close-popup />
          </q-card-actions>
        </q-card>
      </q-dialog>
      <q-dialog v-model="histogramViewDialog" persistent>
        <q-card class="histogram-view-dialog" :style="histogramDialogStyle">
          <q-card-section class="text-h6">Histogram preview</q-card-section>
          <q-card-section>
            <canvas ref="histogramCanvasDialog" class="histogram-dialog__canvas" />
          </q-card-section>
          <q-card-section class="text-body2 histogram-dialog__description">
            Photogrammetry needs evenly exposed sets. The histogram maps tone distribution per RGB channel: shadows on the left, mid-tones in the center, highlights on the right. Keep the curves away from the edges to preserve texture and avoid clipping.
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat label="Close" color="primary" v-close-popup />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useCameraStore } from 'src/stores/camera'
import { getOrientationTransform } from 'src/utils/orientation'

interface CameraHQPreviewProps {
  scanning: boolean
  camera?: {
    label: string
    value: string
    orientationFlag?: number | null
  } | null
}

const props = defineProps<CameraHQPreviewProps>()

const $q = useQuasar()
const cameraStore = useCameraStore()

const cacheBuster = ref(0)
const isLoading = ref(false)
const hasError = ref<string | null>(null)
const previewImage = ref<HTMLImageElement | null>(null)
const histogramCanvas = ref<HTMLCanvasElement | null>(null)
const histogramCanvasDialog = ref<HTMLCanvasElement | null>(null)
const heatmapCanvas = ref<HTMLCanvasElement | null>(null)
const imageLoaded = ref(false)
const showHeatmap = ref(false)
const histogramInterval = ref<number | null>(null)
const histogramInfoDialog = ref(false)
const histogramViewDialog = ref(false)

const histogramTheme = computed(() => {
  const isDark = $q.dark.isActive
  return {
    surface: isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(229, 231, 235, 0.9)',
    canvasBg: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(248, 250, 252, 0.95)',
    text: isDark ? '#e2e8f0' : '#0f172a',
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

const imageUrl = computed(() => {
  if (!props.camera?.value) {
    return null
  }
  const base = cameraStore.getPhotoUrl(props.camera.value)
  if (!base) {
    return null
  }
  return `${base}?ts=${cacheBuster.value}`
})

const orientationTransformStyle = computed(() => {
  const transform = getOrientationTransform(props.camera?.orientationFlag ?? null)
  return transform === 'none'
    ? {}
    : { transform, transformOrigin: 'center center' }
})

const canRefresh = computed(() => Boolean(props.camera?.value) && !props.scanning && !isLoading.value)

function refreshPhoto() {
  if (!props.camera?.value) {
    return
  }
  isLoading.value = true
  hasError.value = null
  imageLoaded.value = false
  cacheBuster.value = Date.now()
}

function onImageLoad() {
  isLoading.value = false
  hasError.value = null
  imageLoaded.value = true
  nextTick(() => {
    drawHistogram()
    if (showHeatmap.value) {
      drawHeatmap()
    }
  })
}

function onImageError() {
  isLoading.value = false
  hasError.value = 'Photo could not be loaded.'
  imageLoaded.value = false
  clearHeatmap()
}

function toggleHeatmap() {
  showHeatmap.value = !showHeatmap.value
  if (showHeatmap.value) {
    nextTick(() => drawHeatmap())
  } else {
    clearHeatmap()
  }
}

function drawHistogram() {
  const img = previewImage.value
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

function drawHeatmap() {
  const img = previewImage.value
  const canvas = heatmapCanvas.value
  if (!img || !canvas || !img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
    return
  }

  canvas.width = img.clientWidth
  canvas.height = img.clientHeight

  const ctx = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D | null
  const tempCanvas = document.createElement('canvas')
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D | null
  if (!ctx || !tempCtx) {
    return
  }

  tempCanvas.width = img.naturalWidth
  tempCanvas.height = img.naturalHeight
  tempCtx.drawImage(img, 0, 0)

  const targetCellSize = Math.min(img.naturalWidth, img.naturalHeight) / 32
  const gridX = Math.max(1, Math.round(img.naturalWidth / targetCellSize))
  const gridY = Math.max(1, Math.round(img.naturalHeight / targetCellSize))
  const cellWidth = img.naturalWidth / gridX
  const cellHeight = img.naturalHeight / gridY

  const variances: { x: number; y: number; variance: number }[] = []
  let minVar = Infinity
  let maxVar = 0

  for (let y = 0; y < gridY; y++) {
    for (let x = 0; x < gridX; x++) {
      const startX = Math.floor(x * cellWidth)
      const startY = Math.floor(y * cellHeight)
      const width = Math.max(1, Math.floor(cellWidth))
      const height = Math.max(1, Math.floor(cellHeight))
      const imgData = tempCtx.getImageData(startX, startY, width, height)
      let sum = 0
      let sumSq = 0
      let count = 0

      for (let i = 0; i < imgData.data.length; i += 4) {
        const gray = (imgData.data[i] + imgData.data[i + 1] + imgData.data[i + 2]) / 3
        sum += gray
        sumSq += gray * gray
        count++
      }

      const mean = sum / count
      const variance = sumSq / count - mean * mean
      variances.push({ x, y, variance })
      minVar = Math.min(minVar, variance)
      maxVar = Math.max(maxVar, variance)
    }
  }

  const scaleX = canvas.width / gridX
  const scaleY = canvas.height / gridY

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  variances.forEach(({ x, y, variance }) => {
    const normalized = (variance - minVar) / (maxVar - minVar || 1)
    const r = Math.floor(255 * normalized)
    const b = Math.floor(255 * (1 - normalized))
    ctx.fillStyle = `rgba(${r}, 0, ${b}, 0.6)`
    ctx.fillRect(x * scaleX, y * scaleY, scaleX, scaleY)
  })
}

function clearHeatmap() {
  const canvas = heatmapCanvas.value
  if (!canvas) {
    return
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height)
}

onMounted(() => {
  histogramInterval.value = window.setInterval(() => {
    if (imageLoaded.value) {
      drawHistogram()
      if (showHeatmap.value) {
        drawHeatmap()
      }
    }
  }, 500)
})

onBeforeUnmount(() => {
  if (histogramInterval.value) {
    clearInterval(histogramInterval.value)
  }
})

watch(
  () => props.camera?.value,
  (cameraName) => {
    if (cameraName) {
      refreshPhoto()
    } else {
      isLoading.value = false
      hasError.value = null
      cacheBuster.value = 0
    }
  },
  { immediate: true }
)

watch(
  () => props.scanning,
  (isScanning) => {
    if (isScanning) {
      isLoading.value = false
    }
  }
)

watch(showHeatmap, (active) => {
  if (active) {
    nextTick(() => drawHeatmap())
  } else {
    clearHeatmap()
  }
})

watch(histogramViewDialog, (open) => {
  if (open) {
    nextTick(() => drawHistogram())
  }
})

watch(
  () => histogramTheme.value,
  () => {
    if (imageLoaded.value) {
      nextTick(() => drawHistogram())
    }
  }
)
</script>

<style scoped>
.camera-hq-preview-card {
  width: 100%;
}

.hq-preview__stage {
  width: 100%;
}

.hq-preview__image-wrapper {
  position: relative;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  background: #0f172a;
  overflow: hidden;
}

.hq-preview__image {
  display: block;
  width: 100%;
  height: auto;
  object-fit: contain;
}

.heatmap-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.hq-preview__histogram-card {
  width: 100%;
  max-width: 320px;
  margin: 0 auto;
  border-radius: 12px;
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
  width: 100%;
  height: 120px;
  border-radius: 6px;
  background: var(--histogram-canvas-bg, rgba(248, 250, 252, 0.95));
}

.histogram-view-dialog {
  width: min(90vw, 720px);
}

.histogram-dialog__canvas {
  width: 100%;
  height: 280px;
  border-radius: 8px;
  background: var(--histogram-canvas-bg, rgba(248, 250, 252, 0.95));
}

.hq-preview__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  text-align: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.4);
  border-radius: 12px;
}
</style>
