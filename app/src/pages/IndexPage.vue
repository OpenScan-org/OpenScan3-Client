<template>
  <q-page v-if="scanner_available">
    <div class="q-pa-md">
      <div class="row q-col-gutter-md">
        <div class="col-8">
          <scan-settings :settings="scan_settings" :cameras="camera_options" :path_methods="path_options"
            :scanning="scanning" @update:camera="update_camera" @update:scanning="update_scanning" />
        </div>
        <div class="col-4">
          <div class="row q-col-gutter-md">
            <div class="col-12">
              <camera-preview :scanning="scanning" :camera="scan_settings.camera" />
            </div>
            <div class="col-12">
              <projects-list v-bind="projects" @delete:project="delete_project" @upload:project="upload_project"
                @update:projects="update_projects" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </q-page>
  <q-page v-else-if="scanner_pinged">
    <div class="q-pa-md">
      <div class="row justify-center">
        <div class="col-4">
          <q-banner v-if="!scanner_available" inline-actions class="text-white bg-red">
            Couldn't connect to OpenScan device.
            <template v-slot:action>
              <q-btn flat color="white" label="Retry" @click="reload_page" />
            </template>
          </q-banner>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { QSelectProps, useQuasar } from 'quasar'
import { ref, onMounted } from 'vue'
import { api } from 'boot/axios'
import generateDashedName from 'src/utils/randomName'

import ScanSettings from 'components/ScanSettings.vue'
import CameraPreview from 'components/CameraPreview.vue'
import ProjectsList from 'components/ProjectsList.vue'
import { ScanSettingsModel } from 'components/models'

const $q = useQuasar()

let projects = ref({ projects: [] })

const camera_options = ref<any[]>([])

const path_options = [
  {
    label: 'Fibonacci',
    value: 'fibonacci'
  },
  {
    label: 'Spiral',
    value: 'spiral'
  },
]

const scan_settings = ref<ScanSettingsModel>({
  project_name: generateDashedName(),
  camera: null,
  points: 100,
  method: path_options[0]
})

const scanner_available = ref(false)
const scanner_pinged = ref(false)
const scanning = ref(false)

const update_camera = (camera: QSelectProps['options']) => {
  scan_settings.value.camera = camera
}

const update_scanning = (status: boolean) => {
  scanning.value = status
  update_projects()
}

const update_projects = () => {
  api.get('/projects/').then((response) => projects.value.projects = response.data)
}

const delete_project = (project: string) => {
  console.log(project)
  api.delete(`/projects/${project}`).then((response) => update_projects())
}

const upload_project = (project: string) => {
  console.log(project)
  api.post(`/cloud/${project}`).then((response) => {
    update_projects()
  })
}

const reload_page = () => {
  window.location.reload()
}

onMounted(() => {
  $q.loading.show({
    message: 'Connecting to OpenScan device...'
  })

  api.get('/').then(
    (response) => {
      if (response.data.status == 'ok') {
        scanner_available.value = true
        let cameras = response.data.cameras.map( (c:any, i:number) => { return {"label": c.name, "value": i}})
        camera_options.value = cameras
        scan_settings.value.camera = cameras[0]
        projects.value.projects = response.data.projects
      }
    }
  ).finally(
    () => {
      $q.loading.hide()
      scanner_pinged.value = true
    }
  )

})

setTimeout(() => {
  if (scanner_available.value) {
    update_projects()
  }
}, 30000)

</script>
