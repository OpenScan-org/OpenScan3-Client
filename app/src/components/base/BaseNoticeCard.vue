<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

type NoticeCardEntry = {
  id: string
  category?: string
  title: string
  body: string
  linkLabel: string
  url: string
}

const props = withDefaults(defineProps<{
  entries: NoticeCardEntry[]
  storageKey?: string
}>(), {
  storageKey: 'base-notice-card-selection'
})

const rotationDayStorageKey = `${props.storageKey}:rotation-day`

function getLocalDayKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function restoreSelectedEntryIndex() {
  try {
    const selectedId = localStorage.getItem(props.storageKey)
    const lastRotationDay = localStorage.getItem(rotationDayStorageKey)
    const today = getLocalDayKey()
    const storedIndex = props.entries.findIndex(entry => entry.id === selectedId)
    let index = storedIndex >= 0 ? storedIndex : 0

    if (lastRotationDay && lastRotationDay !== today && props.entries.length > 1) {
      index = (index + 1) % props.entries.length
    }

    localStorage.setItem(rotationDayStorageKey, today)
    if (props.entries[index]) {
      localStorage.setItem(props.storageKey, props.entries[index].id)
    }

    return index
  } catch {
    return 0
  }
}

function findSelectedEntryIndex(entries: NoticeCardEntry[]) {
  let selectedId: string | null = null
  try {
    selectedId = localStorage.getItem(props.storageKey)
  } catch {
    return 0
  }

  const index = entries.findIndex(entry => entry.id === selectedId)
  return index >= 0 ? index : 0
}

const activeIndex = ref(restoreSelectedEntryIndex())

function persistSelection(index = activeIndex.value) {
  const selectedEntry = props.entries[index]
  try {
    if (selectedEntry) {
      localStorage.setItem(props.storageKey, selectedEntry.id)
    }
    localStorage.setItem(rotationDayStorageKey, getLocalDayKey())
  } catch {
    // Keep the carousel usable if browser storage is unavailable.
  }
}

watch(activeIndex, index => persistSelection(index))

let dailyRotationTimer: ReturnType<typeof setTimeout> | undefined

watch(() => props.entries, entries => {
  activeIndex.value = findSelectedEntryIndex(entries)
}, { deep: true })

function scheduleDailyRotation() {
  const now = new Date()
  const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const delay = Math.max(nextDay.getTime() - now.getTime(), 1000)

  dailyRotationTimer = setTimeout(() => {
    const today = getLocalDayKey()
    let lastRotationDay: string | null = null
    try {
      lastRotationDay = localStorage.getItem(rotationDayStorageKey)
    } catch {
      // Rotation still works in memory when browser storage is unavailable.
    }

    if (lastRotationDay !== today) {
      changeEntry(1)
      persistSelection()
    }

    scheduleDailyRotation()
  }, delay)
}

onMounted(() => {
  scheduleDailyRotation()
})

onBeforeUnmount(() => {
  if (dailyRotationTimer) {
    clearTimeout(dailyRotationTimer)
  }
})

function changeEntry(offset: number) {
  const entryCount = props.entries.length
  if (entryCount < 2) return

  activeIndex.value = (activeIndex.value + offset + entryCount) % entryCount
}
</script>

<template>
  <q-card flat bordered class="base-notice-card">
    <div class="base-notice-card__carousel-wrap">
      <q-carousel
        v-model="activeIndex"
        height="104px"
        infinite
        animated
        class="base-notice-card__carousel"
      >
        <q-carousel-slide
          v-for="(entry, index) in props.entries"
          :key="entry.id"
          :name="index"
          class="q-pa-none"
        >
          <a
            class="base-notice-card__entry"
            :href="entry.url"
            :aria-label="`${entry.linkLabel}: ${entry.title}`"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div class="base-notice-card__copy">
              <div v-if="entry.category" class="base-notice-card__category">
                {{ entry.category }}
              </div>
              <div class="base-notice-card__title">{{ entry.title }}</div>
              <div class="base-notice-card__body">{{ entry.body }}</div>
            </div>
            <span class="base-notice-card__link" aria-hidden="true">
              <q-icon name="open_in_new" size="20px" />
            </span>
          </a>
        </q-carousel-slide>
      </q-carousel>

      <q-btn
        v-if="props.entries.length > 1"
        class="base-notice-card__navigation base-notice-card__navigation--previous"
        flat
        round
        dense
        icon="chevron_left"
        aria-label="Previous notice"
        @click="changeEntry(-1)"
      />
      <q-btn
        v-if="props.entries.length > 1"
        class="base-notice-card__navigation base-notice-card__navigation--next"
        flat
        round
        dense
        icon="chevron_right"
        aria-label="Next notice"
        @click="changeEntry(1)"
      />
    </div>
  </q-card>
</template>

<style scoped>
.base-notice-card {
  position: relative;
  width: min(100%, 520px);
  --notice-navigation-size: 30px;
  --notice-entry-inset: 36px;
  margin-inline: auto;
  overflow: hidden;
  border: 0;
  background: transparent;
}

.base-notice-card__carousel-wrap {
  position: relative;
}

.base-notice-card__carousel {
  background: transparent;
}

.base-notice-card__carousel :deep(.q-carousel__slide) {
  overflow: hidden;
}

.base-notice-card__entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: calc(100% - 72px);
  height: calc(100% - 8px);
  box-sizing: border-box;
  gap: 12px;
  margin: 4px auto;
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.42);
  color: inherit;
  text-decoration: none;
  transition: background-color 140ms ease;
}

.base-notice-card__entry:hover {
  background: rgba(255, 255, 255, 0.68);
}

.base-notice-card__entry:focus-visible {
  outline: 2px solid var(--q-primary);
  outline-offset: -2px;
}

.base-notice-card__copy {
  flex: 1 1 auto;
  min-width: 0;
}

.base-notice-card__category {
  margin-bottom: 3px;
  color: #757575;
  font-size: 10px;
  letter-spacing: 0.06em;
  line-height: 1.2;
  text-transform: uppercase;
}

.base-notice-card__title {
  color: var(--q-dark);
  font-size: 15px;
  font-weight: 400;
  line-height: 1.3;
}

.base-notice-card__body {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 3px;
  color: #757575;
  font-size: 13px;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.base-notice-card__link {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #757575;
}

.base-notice-card__navigation {
  position: absolute;
  top: 50%;
  z-index: 2;
  width: var(--notice-navigation-size);
  min-width: var(--notice-navigation-size);
  height: 34px;
  padding: 0;
  color: #757575;
  background: transparent;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-50%);
  transition: opacity 140ms ease;
}

.base-notice-card__navigation--previous {
  left: 3px;
}

.base-notice-card__navigation--next {
  right: 3px;
}

.base-notice-card:hover .base-notice-card__navigation,
.base-notice-card:focus-within .base-notice-card__navigation {
  opacity: 1;
  pointer-events: auto;
}

@media (max-width: 420px) {
  .base-notice-card {
    --notice-navigation-size: 26px;
    --notice-entry-inset: 32px;
  }

  .base-notice-card__entry {
    width: calc(100% - 64px);
    gap: 4px;
    padding-right: 8px;
    padding-left: 10px;
  }

  .base-notice-card__link {
    width: 34px;
    height: 34px;
  }
}

@media (hover: none) {
  .base-notice-card__navigation {
    opacity: 1;
    pointer-events: auto;
  }
}

:global(.body--dark) .base-notice-card {
  background: transparent;
}

:global(.body--dark) .base-notice-card__entry {
  background: rgba(255, 255, 255, 0.06);
}

:global(.body--dark) .base-notice-card__entry:hover {
  background: rgba(255, 255, 255, 0.12);
}

:global(.body--dark) .base-notice-card__navigation {
  background: transparent;
  color: #9e9e9e;
}

:global(.body--dark) .base-notice-card__link {
  background: transparent;
}
</style>
