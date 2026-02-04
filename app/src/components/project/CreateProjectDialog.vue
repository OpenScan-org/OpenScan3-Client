<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :no-backdrop-dismiss="true"
    :max-width="maxWidth"
  >
    <q-card :style="cardStyle">
      <q-card-section class="row items-center">
        <span class="q-ml-sm">Create New Project</span>
      </q-card-section>

      <q-card-section>
        <div class="row items-end q-gutter-sm">
          <q-input
            v-model="projectName"
            label="Project Name"
            autofocus
            class="col"
          >
            <q-tooltip>{{ projectFieldDescription('name') }}</q-tooltip>
          </q-input>
          <q-btn
            icon="casino"
            @click="projectName = generateDashedName()"
            flat
            round
            hint="Generate random name"
          />
        </div>
        <q-input
          v-model="projectDescription"
          label="Project Description (optional)"
          type="textarea"
          rows="4"
        >
          <q-tooltip>{{ projectFieldDescription('description') }}</q-tooltip>
        </q-input>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="primary" v-close-popup />
        <q-btn
          label="Create"
          color="primary"
          @click="confirm"
          :disable="!projectName.trim()"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { generateDashedName } from 'src/utils/randomName'
import { fieldDescriptions, getFieldDescription } from 'src/generated/api/fieldDescriptions'
import { useQuasar } from 'quasar'

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'create-project', data: { name: string; description?: string }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const $q = useQuasar()

const projectName = ref('')
const projectDescription = ref('')

const maxWidth = computed(() => $q.screen.lt.sm ? '100vw' : '1200px')
const cardStyle = computed(() => $q.screen.lt.sm ? {} : { 'min-width': '600px' })

type ProjectField = keyof (typeof fieldDescriptions)['Project']

const projectFieldDescription = (field: ProjectField) => getFieldDescription('Project', field)

const confirm = () => {
  if (projectName.value.trim()) {
    emit('create-project', {
      name: projectName.value.trim(),
      description: projectDescription.value.trim() || undefined
    })
    emit('update:modelValue', false)
    projectName.value = ''
    projectDescription.value = ''
  }
}

watch(() => props.modelValue, (newVal) => {
  if (!newVal) {
    projectName.value = ''
    projectDescription.value = ''
  }
})
</script>
