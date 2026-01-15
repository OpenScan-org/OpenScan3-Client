<template>
  <canvas ref="heatmapCanvas" class="heatmap-overlay" v-show="active && imageLoaded" />
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

interface CameraHeatmapOverlayProps {
  active: boolean
  imageElement?: HTMLImageElement | null
  imageLoaded: boolean
}

const props = defineProps<CameraHeatmapOverlayProps>()

const heatmapCanvas = ref<HTMLCanvasElement | null>(null)
const redrawInterval = ref<number | null>(null)

function drawHeatmap() {
  const img = props.imageElement
  const canvas = heatmapCanvas.value
  if (!img || !canvas || !props.active || !props.imageLoaded || !img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
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

  const targetCellSize = Math.min(img.naturalWidth, img.naturalHeight) / 48
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

function scheduleDraw() {
  if (props.active && props.imageLoaded) {
    nextTick(() => drawHeatmap())
  } else {
    clearHeatmap()
  }
}

watch(
  () => props.active,
  () => {
    scheduleDraw()
  }
)

watch(
  () => props.imageLoaded,
  () => {
    scheduleDraw()
  }
)

watch(
  () => props.imageElement,
  () => {
    scheduleDraw()
  }
)

onMounted(() => {
  redrawInterval.value = window.setInterval(() => {
    if (props.active && props.imageLoaded) {
      drawHeatmap()
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
.heatmap-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
