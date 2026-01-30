<template>
  <q-item
    clickable
    v-ripple
    :active="isSelected"
    :class="{ 'bg-blue-2 text-dark': isSelected }"
    @click="handleSelect"
  >
    <q-item-section avatar>
      <q-checkbox
        size="sm"
        :model-value="bulkSelected"
        @update:model-value="toggleBulk"
        @click.stop
      />
    </q-item-section>
    <q-item-section>
      <div class="text-body1">{{ project.name }}</div>
      <div class="text-caption text-grey-7 row justify-between items-center">
        <q-badge color="primary">{{ scanCount }} Scans</q-badge>
        <span>{{ formattedDate }}</span>
      </div>
      <div v-if="project.description" class="text-caption text-grey-6 description-clamp">
        {{ project.description }}
      </div>
    </q-item-section>
  </q-item>
</template>

<style scoped>
.description-clamp {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import { type Project } from 'src/generated/api'

interface Props {
  project: Project
  isSelected: boolean
  bulkSelected?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits(['select', 'toggle:bulk-select'])

const formattedDate = computed(() => {
  if (!props.project.created) {
    return '–'
  }

  const date = new Date(props.project.created)
  return Number.isNaN(date.getTime()) ? props.project.created : date.toLocaleDateString()
})

const scanCount = computed(() => Object.keys(props.project.scans || {}).length)

const handleSelect = () => {
  emit('select', props.project.name)
}

const toggleBulk = (value: boolean) => {
  emit('toggle:bulk-select', value)
}
</script>
