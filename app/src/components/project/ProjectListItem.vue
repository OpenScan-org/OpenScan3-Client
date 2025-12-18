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
      <div class="text-caption text-secondary row justify-between items-center">
        <q-badge color="primary">{{ scanCount }} Scans</q-badge>
        <span>{{ formattedDate }}</span>
      </div>
      <div class="text-caption text-grey-6">
        {{ project.description || 'No description' }}
      </div>
    </q-item-section>
  </q-item>
</template>

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
