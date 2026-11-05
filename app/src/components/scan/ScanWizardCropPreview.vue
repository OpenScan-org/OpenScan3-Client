<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import CameraFastPreview from 'components/camera/CameraFastPreview.vue'
import BaseBanner from 'components/base/BaseBanner.vue'

import { MIN_CROP_SIZE, resizeWizardCrop, type CropEdge, type WizardCrop } from 'src/utils/wizardCrop'

export type { WizardCrop } from 'src/utils/wizardCrop'
type CropPointerEvent = globalThis.PointerEvent

const props = defineProps<{
  camera: { label: string; value: string; orientationFlag?: number | null } | null
  active: boolean
  disabled?: boolean
}>()
const crop = defineModel<WizardCrop | null>({ default: null })
const preview = ref<InstanceType<typeof CameraFastPreview> | null>(null)
const interaction = ref<HTMLElement | null>(null)
const edge = ref<CropEdge | null>(null)
const initialCrop = ref<WizardCrop | null>(null)
const edges: CropEdge[] = ['top', 'right', 'bottom', 'left']
const start = ref<{ x: number; y: number } | null>(null)
const draft = ref<WizardCrop | null>(null)
const pointerId = ref<number | null>(null)
const displayedCrop = computed(() => draft.value ?? crop.value)
// Allow a 10% deviation from the image centre on each axis.
const CENTER_TOLERANCE = 0.1
const offset = computed(() => crop.value ? {
  x: crop.value.x + crop.value.width / 2 - 0.5,
  y: crop.value.y + crop.value.height / 2 - 0.5
} : null)
const hints = computed(() => {
  const value = offset.value
  if (!value) return []
  const messages: string[] = []
  if (Math.abs(value.x) > CENTER_TOLERANCE) {
    messages.push(`Your object is ${value.x < 0 ? 'left' : 'right'} of the image centre. Check that it is centred on the turntable.`)
  }
  if (Math.abs(value.y) > CENTER_TOLERANCE) {
    messages.push(`Your object is ${value.y < 0 ? 'above' : 'below'} the image centre. Check that you are using the correct turntable pedestal.`)
  }
  return messages
})
const boxStyle = computed(() => {
  const box = displayedCrop.value
  return box ? {
    left: `${box.x * 100}%`, top: `${box.y * 100}%`,
    width: `${box.width * 100}%`, height: `${box.height * 100}%`
  } : {}
})
const dimStyles = computed(() => {
  const box = displayedCrop.value
  if (!box) return {}
  return {
    top: { top: '0', left: '0', width: '100%', height: `${box.y * 100}%` },
    bottom: { top: `${(box.y + box.height) * 100}%`, bottom: '0', left: '0', width: '100%' },
    left: { top: `${box.y * 100}%`, left: '0', width: `${box.x * 100}%`, height: `${box.height * 100}%` },
    right: { top: `${box.y * 100}%`, left: `${(box.x + box.width) * 100}%`, right: '0', height: `${box.height * 100}%` }
  }
})

function point(event: CropPointerEvent) {
  const rect = interaction.value!.getBoundingClientRect()
  return {
    x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
  }
}
function begin(event: CropPointerEvent, resizeEdge: CropEdge | null = null) {
  if (props.disabled || !event.isPrimary || event.button !== 0 || pointerId.value !== null || !interaction.value) return
  const target = interaction.value
  target.setPointerCapture(event.pointerId)
  pointerId.value = event.pointerId
  start.value = point(event)
  edge.value = resizeEdge
  initialCrop.value = crop.value ? { ...crop.value } : null
  draft.value = resizeEdge && initialCrop.value ? { ...initialCrop.value } : { ...start.value, width: 0, height: 0 }
}
function move(event: CropPointerEvent) {
  if (!start.value || pointerId.value !== event.pointerId) return
  const end = point(event)
  if (edge.value && initialCrop.value) {
    const box = initialCrop.value
    draft.value = resizeWizardCrop(box, edge.value, {
      x: (edge.value === 'left' ? box.x : box.x + box.width) + end.x - start.value.x,
      y: (edge.value === 'top' ? box.y : box.y + box.height) + end.y - start.value.y
    })
    return
  }
  draft.value = {
    x: Math.min(start.value.x, end.x), y: Math.min(start.value.y, end.y),
    width: Math.abs(end.x - start.value.x), height: Math.abs(end.y - start.value.y)
  }
}
function finish(event: CropPointerEvent) {
  if (pointerId.value !== event.pointerId) return
  move(event)
  if (draft.value && draft.value.width >= MIN_CROP_SIZE - 1e-9 && draft.value.height >= MIN_CROP_SIZE - 1e-9) {
    crop.value = { ...draft.value }
  }
  cancel()
}
function cancel() {
  const captured = pointerId.value
  start.value = null
  draft.value = null
  pointerId.value = null
  edge.value = null
  initialCrop.value = null
  if (captured !== null && interaction.value?.hasPointerCapture(captured)) interaction.value.releasePointerCapture(captured)
}
function resizeWithKeyboard(event: globalThis.KeyboardEvent, resizeEdge: CropEdge) {
  if (props.disabled || !crop.value || start.value) return
  const horizontal = resizeEdge === 'left' || resizeEdge === 'right'
  const negativeKey = horizontal ? 'ArrowLeft' : 'ArrowUp'
  const positiveKey = horizontal ? 'ArrowRight' : 'ArrowDown'
  if (event.key !== negativeKey && event.key !== positiveKey) return
  event.preventDefault()
  const delta = (event.key === negativeKey ? -1 : 1) * (event.shiftKey ? 0.02 : 0.005)
  const box = crop.value
  crop.value = resizeWizardCrop(box, resizeEdge, {
    x: (resizeEdge === 'left' ? box.x : box.x + box.width) + delta,
    y: (resizeEdge === 'top' ? box.y : box.y + box.height) + delta
  })
}
watch([() => props.camera?.value, () => props.camera?.orientationFlag], () => {
  crop.value = null
  cancel()
})
watch(() => [props.active, props.disabled], cancel)
onBeforeUnmount(cancel)
</script>

<template>
  <div>
    <p id="wizard-crop-instructions">
      Drag a rectangle tightly around your entire scan object. The cross marks the image centre.
      Drag any edge or its round handle to resize it. Draw again to replace the rectangle.
    </p>
    <slot name="controls" />
    <div class="wizard-crop-preview">
      <CameraFastPreview ref="preview" :camera="camera" :active="active" :enable-crop="false" />
      <div
        v-if="camera && active && preview?.imageLoaded"
        ref="interaction"
        class="wizard-crop-preview__interaction"
        :class="{ 'wizard-crop-preview__interaction--disabled': disabled }"
        aria-describedby="wizard-crop-instructions"
        @pointerdown.prevent="begin($event)"
        @pointermove="move"
        @pointerup="finish"
        @pointercancel="cancel"
        @lostpointercapture="cancel"
      >
        <div v-for="(style, side) in dimStyles" :key="side" class="crop-dim" :style="style" />
        <span class="wizard-crop-preview__centre" aria-hidden="true" />
        <div v-if="displayedCrop" class="crop-box wizard-crop-preview__box" :style="boxStyle">
          <div class="crop-box__label">{{ (displayedCrop.width * 100).toFixed(0) }}% × {{ (displayedCrop.height * 100).toFixed(0) }}%</div>
          <span class="wizard-crop-preview__box-centre" />
          <button
            v-for="side in edges"
            :key="side"
            type="button"
            class="wizard-crop-preview__edge"
            :class="`wizard-crop-preview__edge--${side}`"
            :aria-label="`Resize ${side} crop edge. Use arrow keys to adjust; hold Shift for larger steps.`"
            :disabled="disabled || !crop || Boolean(start && !edge)"
            @pointerdown.stop.prevent="begin($event, side)"
            @keydown="resizeWithKeyboard($event, side)"
          ><span class="crop-handle" aria-hidden="true" /></button>
        </div>
      </div>
    </div>
    <div v-if="crop && !start" class="q-mt-md" aria-live="polite">
      <BaseBanner
        :background-class="hints.length ? 'bg-amber-2' : 'bg-green-1'"
        :text-class="hints.length ? 'text-black' : 'text-positive'"
      >
        <template v-if="hints.length">
          <div v-for="hint in hints" :key="hint">{{ hint }}</div>
          <div class="q-mt-xs">You can continue if this position is intentional.</div>
        </template>
        <template v-else>Your object is centred in the image.</template>
      </BaseBanner>
    </div>
  </div>
</template>

<style scoped>
.wizard-crop-preview {
  position: relative;
  width: 50%;
  margin: 0 auto;
  border-radius: 12px;
  overflow: hidden;
}
.wizard-crop-preview__interaction {
  position: absolute;
  inset: 0;
  overflow: hidden;
  cursor: crosshair;
  touch-action: none;
  user-select: none;
}
.wizard-crop-preview__interaction--disabled { pointer-events: none; }
.crop-box.wizard-crop-preview__box {
  pointer-events: none;
  padding: 0;
}
.wizard-crop-preview__box .crop-box__label { position: absolute; left: 8px; top: 8px; white-space: nowrap; }
.wizard-crop-preview__edge {
  position: absolute;
  display: block;
  background: transparent;
  padding: 0;
  border: 0;
  touch-action: none;
  pointer-events: auto;
}
.wizard-crop-preview__edge:focus-visible { outline: 2px solid white; }
.wizard-crop-preview__edge--top,
.wizard-crop-preview__edge--bottom { left: 0; width: 100%; height: 24px; cursor: ns-resize; }
.wizard-crop-preview__edge--top { top: 0; transform: translateY(-50%); }
.wizard-crop-preview__edge--bottom { bottom: 0; transform: translateY(50%); }
.wizard-crop-preview__edge--left,
.wizard-crop-preview__edge--right { top: 0; height: 100%; width: 24px; cursor: ew-resize; }
.wizard-crop-preview__edge--left { left: 0; transform: translateX(-50%); }
.wizard-crop-preview__edge--right { right: 0; transform: translateX(50%); }
.wizard-crop-preview__edge .crop-handle {
  width: 24px;
  height: 24px;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}
.wizard-crop-preview__centre,
.wizard-crop-preview__box-centre {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 16px;
  height: 16px;
  transform: translate(-50%, -50%);
  pointer-events: none;
}
.wizard-crop-preview__centre::before,
.wizard-crop-preview__centre::after {
  content: '';
  position: absolute;
  background: white;
  box-shadow: 0 0 2px black;
}
.wizard-crop-preview__centre::before { left: 7px; width: 2px; height: 16px; }
.wizard-crop-preview__centre::after { top: 7px; width: 16px; height: 2px; }
.wizard-crop-preview__box-centre {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--q-primary);
}
</style>

<style scoped src="../camera/cameraCrop.css"></style>
