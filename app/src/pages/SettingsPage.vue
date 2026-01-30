<template>
  <q-page>
    <div class="q-pa-md">
      <div class="row justify-center q-col-gutter-md">
        <div class="col-12">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6 col-lg-4">
              <div class="q-gutter-y-md">
                <BaseSection title="Frontend Settings">
                  <div class="row q-col-gutter-sm">
                    <div class="col-12 col-md-6">
                      <q-input v-model="apiConfigForm.host" label="Host/IP" />
                    </div>
                    <div class="col-6 col-md-3">
                      <q-input
                        v-model.number="apiConfigForm.port"
                        :disable="!apiConfigForm.developerMode"
                        type="number"
                        label="Port"
                      />
                    </div>
                    <div class="col-6 col-md-3">
                      <q-input v-model="apiConfigForm.version" label="Version" />
                    </div>
                    <div class="col-12">
                      <q-toggle
                        v-model="apiConfigForm.developerMode"
                        label="Developer mode (connect directly to port)"
                        left-label
                      />
                    </div>
                    <div class="col-12 col-sm-6">
                      <BaseButtonSecondary
                        class="full-width"
                        icon="restart_alt"
                        label="Reset"
                        @click="resetApiConfigToWindow"
                      />
                    </div>
                    <div class="col-12 col-sm-6">
                      <BaseButtonPrimary
                        class="full-width"
                        icon="save"
                        label="Save"
                        @click="saveApiConfig"
                      />
                    </div>
                  </div>
                </BaseSection>

                <BaseSection title="Device Settings">
                  <div class="row q-col-gutter-sm items-end">
                    <div class="col-12">
                      <BaseSelect
                        v-model="selectedConfig"
                        :options="configOptions"
                        label="Configuration File"
                        :loading="configOptionsLoading"
                        emit-value
                        map-options
                        behavior="menu"
                        clearable
                      />
                    </div>
                    <div class="col-6">
                      <BaseButtonSecondary
                        class="full-width"
                        icon="refresh"
                        label="Reload"
                        :loading="configOptionsLoading"
                        @click="loadDeviceConfigs"
                      />
                    </div>
                    <div class="col-6">
                      <BaseButtonPrimary
                        class="full-width"
                        icon="publish"
                        label="Apply"
                        :disable="!selectedConfig"
                        :loading="configApplying"
                        @click="applySelectedConfig"
                      />
                    </div>
                  </div>

                  <div class="row q-col-gutter-md q-mt-md">
                    <div class="col-12">
                      <q-toggle v-model="detectCameras" label="Detect cameras on reinit" />
                    </div>
                    <div class="col-12">
                      <q-toggle
                        v-model="saveConfigBeforePowerAction"
                        label="Save configuration before reboot/shutdown"
                      />
                    </div>
                  </div>

                  <div class="row q-col-gutter-sm q-mt-md">
                    <div class="col-12 col-sm-6">
                      <BaseButtonPrimary
                        class="full-width"
                        icon="save"
                        label="Save config"
                        :loading="hardwareActions.save"
                        @click="saveCurrentConfig"
                      />
                    </div>
                    <div class="col-12 col-sm-6">
                      <BaseButtonSecondary
                        class="full-width"
                        icon="autorenew"
                        label="Reinitialize hardware"
                        :loading="hardwareActions.reinitialize"
                        @click="handleReinitializeHardware"
                      />
                    </div>
                    <PowerControls
                      :save-config="saveConfigBeforePowerAction"
                      v-slot="{ confirmReboot, confirmShutdown, rebooting, shuttingDown }"
                    >
                      <div class="col-12 col-sm-6">
                        <BaseButtonSecondary
                          class="full-width"
                          icon="restart_alt"
                          label="Reboot"
                          :loading="rebooting"
                          @click="confirmReboot"
                        />
                      </div>
                      <div class="col-12 col-sm-6">
                        <BaseButtonSecondary
                          class="full-width"
                          icon="power_settings_new"
                          label="Shutdown"
                          :loading="shuttingDown"
                          @click="confirmShutdown"
                        />
                      </div>
                    </PowerControls>
                  </div>
                </BaseSection>

                <BaseVersionInfoCard />
              </div>
            </div>

            <div class="col-12 col-md-6 col-lg-4">
              <div class="q-gutter-y-md">
                <BaseSection title="Motor Settings">
                  <div class="row q-col-gutter-md">
                    <div class="col-12" v-if="motorNames.length === 0">
                      <q-banner dense>No motors found.</q-banner>
                    </div>

                    <div class="col-12" v-for="motorName in motorNames" :key="motorName">
                      <q-card flat bordered>
                        <q-card-section>
                          <div class="text-subtitle1">{{ motorName }}</div>
                        </q-card-section>
                        <q-card-section class="q-pt-none" v-if="motorForms[motorName]">
                          <div class="row q-col-gutter-md">
                            <div class="col-12 col-md-6 col-lg-4">
                              <q-input v-model.number="motorForms[motorName].direction_pin" type="number" label="Direction Pin" />
                            </div>
                            <div class="col-12 col-md-6 col-lg-4">
                              <q-input v-model.number="motorForms[motorName].enable_pin" type="number" label="Enable Pin" />
                            </div>
                            <div class="col-12 col-md-6 col-lg-4">
                              <q-input v-model.number="motorForms[motorName].step_pin" type="number" label="Step Pin" />
                            </div>
                            <div class="col-12 col-md-6 col-lg-4">
                              <q-input v-model.number="motorForms[motorName].acceleration" type="number" label="Acceleration">
                                <q-tooltip>{{ motorConfigDescription('acceleration') }}</q-tooltip>
                              </q-input>
                            </div>
                            <div class="col-12 col-md-6 col-lg-4">
                              <q-input v-model.number="motorForms[motorName].max_speed" type="number" label="Max Speed">
                                <q-tooltip>{{ motorConfigDescription('max_speed') }}</q-tooltip>
                              </q-input>
                            </div>
                            <div class="col-12 col-md-6 col-lg-4">
                              <q-select
                                v-model="motorForms[motorName].direction"
                                :options="directionOptions"
                                label="Direction"
                                emit-value
                                map-options
                              />
                            </div>
                            <div class="col-12 col-md-6 col-lg-4">
                              <q-input v-model.number="motorForms[motorName].steps_per_rotation" type="number" label="Steps per Rotation">
                                <q-tooltip>{{ motorConfigDescription('steps_per_rotation') }}</q-tooltip>
                              </q-input>
                            </div>
                            <div class="col-12 col-md-6 col-lg-4">
                              <q-input v-model.number="motorForms[motorName].min_angle" type="number" label="Min Angle">
                                <q-tooltip>{{ motorConfigDescription('min_angle') }}</q-tooltip>
                              </q-input>
                            </div>
                            <div class="col-12 col-md-6 col-lg-4">
                              <q-input v-model.number="motorForms[motorName].max_angle" type="number" label="Max Angle">
                                <q-tooltip>{{ motorConfigDescription('max_angle') }}</q-tooltip>
                              </q-input>
                            </div>
                          </div>
                        </q-card-section>
                        <q-card-actions align="right">
                          <BaseButtonPrimary
                            icon="save"
                            label="Save"
                            :loading="motorSaving[motorName] === true"
                            @click="saveMotorSettings(motorName)"
                          />
                        </q-card-actions>
                      </q-card>
                    </div>
                  </div>
                </BaseSection>
              </div>
            </div>

            <div class="col-12 col-md-6 col-lg-4">
              <div class="q-gutter-y-md">
                <BaseSection title="Light Settings">
                  <div class="row q-col-gutter-md">
                    <div class="col-12" v-if="lightNames.length === 0">
                      <q-banner dense>No lights found.</q-banner>
                    </div>

                    <div class="col-12" v-for="lightName in lightNames" :key="lightName">
                      <q-card flat bordered>
                        <q-card-section>
                          <div class="text-subtitle1">{{ lightName }}</div>
                        </q-card-section>
                        <q-card-section class="q-pt-none" v-if="lightForms[lightName]">
                          <div class="row q-col-gutter-sm">
                            <div class="col-12">
                              <q-input
                                v-model="lightForms[lightName].pins"
                                label="Pins (comma-separated)"
                              />
                            </div>
                          </div>
                        </q-card-section>
                        <q-card-actions align="right">
                          <BaseButtonPrimary
                            icon="save"
                            label="Save"
                            :loading="lightSaving[lightName] === true"
                            @click="saveLightSettings(lightName)"
                          />
                        </q-card-actions>
                      </q-card>
                    </div>
                  </div>
                </BaseSection>

                <BaseSection title="Camera Settings">
                  <div class="row q-col-gutter-md">
                    <div class="col-12">
                      <BaseSelect
                        v-model="selectedCamera"
                        :options="cameraOptions"
                        label="Camera"
                        :loading="cameraOptionsLoading"
                        emit-value
                        map-options
                        behavior="menu"
                        clearable
                      />
                    </div>

                    <div class="col-12" v-if="cameraLoading">
                      <q-skeleton type="rect" height="150px" />
                    </div>

                    <template v-else-if="selectedCamera">
                      <div class="col-12 col-sm-6">
                        <q-input v-model.number="cameraForm.shutter" type="number" label="Shutter (ms)">
                          <q-tooltip>{{ cameraSettingDescription('shutter') }}</q-tooltip>
                        </q-input>
                      </div>
                      <div class="col-12 col-sm-6">
                        <q-input v-model.number="cameraForm.gain" type="number" label="Analogue Gain">
                          <q-tooltip>{{ cameraSettingDescription('gain') }}</q-tooltip>
                        </q-input>
                      </div>
                      <div class="col-12 col-sm-6">
                        <q-input v-model.number="cameraForm.saturation" type="number" label="Saturation">
                          <q-tooltip>{{ cameraSettingDescription('saturation') }}</q-tooltip>
                        </q-input>
                      </div>
                      <div class="col-12 col-sm-6">
                        <q-input v-model.number="cameraForm.contrast" type="number" label="Contrast">
                          <q-tooltip>{{ cameraSettingDescription('contrast') }}</q-tooltip>
                        </q-input>
                      </div>
                      <div class="col-12 col-sm-6">
                        <q-input v-model.number="cameraForm.awbg_red" type="number" label="AWBG Red">
                          <q-tooltip>{{ cameraSettingDescription('awbg_red') }}</q-tooltip>
                        </q-input>
                      </div>
                      <div class="col-12 col-sm-6">
                        <q-input v-model.number="cameraForm.awbg_blue" type="number" label="AWBG Blue">
                          <q-tooltip>{{ cameraSettingDescription('awbg_blue') }}</q-tooltip>
                        </q-input>
                      </div>
                      <div class="col-12 col-sm-6">
                        <q-input v-model.number="cameraForm.jpeg_quality" type="number" label="JPEG Quality">
                          <q-tooltip>{{ cameraSettingDescription('jpeg_quality') }}</q-tooltip>
                        </q-input>
                      </div>
                      <div class="col-12 col-sm-6">
                        <q-input v-model.number="cameraForm.manual_focus" type="number" label="Manual Focus">
                          <q-tooltip>{{ cameraSettingDescription('manual_focus') }}</q-tooltip>
                        </q-input>
                      </div>
                      <div class="col-12">
                        <q-toggle v-model="cameraForm.AF" label="Autofocus">
                          <q-tooltip>{{ cameraSettingDescription('AF') }}</q-tooltip>
                        </q-toggle>
                      </div>
                    </template>
                  </div>
                  <div class="row justify-end q-gutter-sm q-mt-md">
                    <div class="col-auto">
                      <BaseButtonPrimary
                        icon="save"
                        label="Save"
                        :disable="!selectedCamera"
                        :loading="cameraSaving"
                        @click="saveCameraSettings"
                      />
                    </div>
                  </div>
                </BaseSection>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useQuasar } from 'quasar'
import { apiClient, updateApiClientConfig } from 'src/services/apiClient'
import { useApiConfigStore } from 'src/stores/apiConfig'
import { useDeviceStore } from 'src/stores/device'
import PowerControls from 'src/components/PowerControls.vue'
import BaseSection from 'components/base/BaseSection.vue'
import BaseVersionInfoCard from 'components/base/BaseVersionInfoCard.vue'
import BaseButtonPrimary from 'components/base/BaseButtonPrimary.vue'
import BaseButtonSecondary from 'components/base/BaseButtonSecondary.vue'
import BaseSelect from 'components/base/BaseSelect.vue'
import { fieldDescriptions, getFieldDescription } from 'src/generated/api/fieldDescriptions'
import {
  listConfigFiles,
  setConfigFile,
  saveDeviceConfig,
  reinitializeHardware,
  reboot,
  shutdown,
  getCameraNameSettings,
  updateCameraNameSettings,
  updateLightNameSettings,
  updateMotorNameSettings,
  type CameraSettings,
  type LightConfig,
  type MotorConfig
} from 'src/generated/api'

const $q = useQuasar()

const apiConfigStore = useApiConfigStore()

const scannerAddress = computed(() => apiConfigStore.baseURL.replace(/\/$/, ''))

const apiConfigForm = reactive({
  schema: apiConfigStore.schema,
  host: apiConfigStore.host,
  port: apiConfigStore.port,
  version: apiConfigStore.version,
  developerMode: apiConfigStore.developerMode
})

type DeviceConfigOption = { label: string; value: string; meta?: DeviceConfigListItem }

type DeviceConfigListItem = {
  filename: string
  path: string
  name: string
  model: string | null
  shield: string | null
}

const DEFAULT_CONFIG_FILENAME = 'device_config.json'

const configOptions = ref<DeviceConfigOption[]>([])
const configOptionsLoading = ref(false)
const selectedConfig = ref<string | null>(null)
const configApplying = ref(false)

const detectCameras = ref(false)
const saveConfigBeforePowerAction = ref(false)

const hardwareActions = reactive({
  save: false,
  reinitialize: false
})

type CameraOption = { label: string; value: string }

const deviceStore = useDeviceStore()
const { cameras, motors, lights, status: deviceStatus } = storeToRefs(deviceStore)

const cameraOptions = computed<CameraOption[]>(() =>
  Object.keys(cameras.value ?? {}).map((name) => ({ label: name, value: name }))
)
const cameraOptionsLoading = computed(() => deviceStatus.value !== 'open')
const selectedCamera = ref<string | null>(null)
const cameraLoading = ref(false)
const cameraSaving = ref(false)
const cameraForm = reactive<{ [K in keyof CameraSettings]?: CameraSettings[K] | null }>({})

type CameraSettingsField = keyof (typeof fieldDescriptions)['CameraSettings']

const cameraSettingDescription = (field: CameraSettingsField) => getFieldDescription('CameraSettings', field)

const motorNames = computed(() => Object.keys(motors.value ?? {}))
const motorForms = reactive<Record<string, MotorForm>>({})
const motorSaving = reactive<Record<string, boolean>>({})

type MotorConfigField = keyof (typeof fieldDescriptions)['MotorConfig']

const motorConfigDescription = (field: MotorConfigField) => getFieldDescription('MotorConfig', field)

const lightNames = computed(() => Object.keys(lights.value ?? {}))
const lightForms = reactive<Record<string, LightForm>>({})
const lightSaving = reactive<Record<string, boolean>>({})

type MotorForm = {
  direction_pin: number
  enable_pin: number
  step_pin: number
  acceleration: number | null
  max_speed: number | null
  direction: 1 | -1
  steps_per_rotation: number
  min_angle: number | null
  max_angle: number | null
}

type LightForm = {
  pins: string
}

const directionOptions = [
  { label: 'Forward (1)', value: 1 },
  { label: 'Reverse (-1)', value: -1 }
]

function resetCameraForm() {
  Object.assign(cameraForm, {
    shutter: null,
    saturation: null,
    contrast: null,
    awbg_red: null,
    awbg_blue: null,
    gain: null,
    jpeg_quality: null,
    AF: null,
    manual_focus: null
  })
}

function mapMotorConfig(config: MotorConfig | null | undefined): MotorForm {
  return {
    direction_pin: config?.direction_pin ?? 0,
    enable_pin: config?.enable_pin ?? 0,
    step_pin: config?.step_pin ?? 0,
    acceleration: config?.acceleration ?? null,
    max_speed: config?.max_speed ?? null,
    direction: (config?.direction ?? 1) as 1 | -1,
    steps_per_rotation: config?.steps_per_rotation ?? 0,
    min_angle: config?.min_angle ?? null,
    max_angle: config?.max_angle ?? null
  }
}

function mapLightConfig(config: LightConfig | null | undefined): LightForm {
  return {
    pins: (config?.pins ?? []).join(', ')
  }
}

async function loadDeviceConfigs() {
  configOptionsLoading.value = true
  try {
    const response = (await listConfigFiles({ client: apiClient })) as unknown as {
      status?: string
      configs?: DeviceConfigListItem[]
    }

    const isDefaultConfig = (item: DeviceConfigListItem) => {
      const filenameMatches = item.filename === DEFAULT_CONFIG_FILENAME
      const pathMatches = item.path?.includes(`/${DEFAULT_CONFIG_FILENAME}`) ?? false
      return filenameMatches || pathMatches
    }

    const options = (response?.configs ?? []).map((item) => {
      const optionLabelBase = item.name ?? item.filename
      const optionLabel = isDefaultConfig(item) ? `${optionLabelBase} (current)` : optionLabelBase

      return {
        label: optionLabel,
        value: item.filename,
        meta: item
      }
    })

    configOptions.value = options

    const defaultOption = options.find((option) => {
      if (!option.meta) {
        return option.value === DEFAULT_CONFIG_FILENAME
      }

      return (
        option.meta.filename === DEFAULT_CONFIG_FILENAME ||
        option.meta.path?.includes(`/${DEFAULT_CONFIG_FILENAME}`)
      )
    })
    selectedConfig.value = defaultOption?.value ?? options[0]?.value ?? null
  } catch (error) {
    configOptions.value = []
    selectedConfig.value = null
    console.error('Device configurations could not be loaded.', error)
  } finally {
    configOptionsLoading.value = false
  }
}

async function applySelectedConfig() {
  if (!selectedConfig.value) {
    return
  }

  configApplying.value = true
  try {
    await setConfigFile({
      client: apiClient,
      body: { config_file: selectedConfig.value }
    })
  } catch (error) {
    console.error('Configuration could not be applied.', error)
  } finally {
    configApplying.value = false
  }
}

async function loadCameraSettings(name: string) {
  cameraLoading.value = true
  resetCameraForm()
  try {
    const settings = await getCameraNameSettings({
      client: apiClient,
      path: { name }
    })

    Object.assign(cameraForm, {
      shutter: settings?.shutter ?? null,
      saturation: settings?.saturation ?? null,
      contrast: settings?.contrast ?? null,
      awbg_red: settings?.awbg_red ?? null,
      awbg_blue: settings?.awbg_blue ?? null,
      gain: settings?.gain ?? null,
      jpeg_quality: settings?.jpeg_quality ?? null,
      AF: settings?.AF ?? false,
      manual_focus: settings?.manual_focus ?? null
    })
  } catch (error) {
    console.error(`Settings for camera "${name}" could not be loaded.`, error)
  } finally {
    cameraLoading.value = false
  }
}

async function saveCameraSettings() {
  if (!selectedCamera.value) {
    return
  }

  cameraSaving.value = true
  try {
    const payloadEntries = Object.entries(cameraForm).filter(([, value]) => value !== undefined)
    const payload = Object.fromEntries(payloadEntries)

    await updateCameraNameSettings({
      client: apiClient,
      path: { name: selectedCamera.value },
      body: payload
    })
  } catch (error) {
    console.error('Camera settings could not be saved.', error)
  } finally {
    cameraSaving.value = false
  }
}

async function saveMotorSettings(name: string) {
  const form = motorForms[name]
  if (!form) {
    return
  }

  motorSaving[name] = true
  try {
    const payload: Record<string, unknown> = {
      direction_pin: form.direction_pin,
      enable_pin: form.enable_pin,
      step_pin: form.step_pin,
      steps_per_rotation: form.steps_per_rotation
    }

    if (form.acceleration !== null) payload.acceleration = form.acceleration
    if (form.max_speed !== null) payload.max_speed = form.max_speed
    if (form.direction !== undefined) payload.direction = form.direction
    if (form.min_angle !== null) payload.min_angle = form.min_angle
    if (form.max_angle !== null) payload.max_angle = form.max_angle

    const updated = await updateMotorNameSettings({
      client: apiClient,
      path: { name },
      body: payload
    })

    motorForms[name] = mapMotorConfig(updated.data)
  } catch (error) {
    console.error(`Motor "${name}" could not be saved.`, error)
  } finally {
    motorSaving[name] = false
  }
}

async function saveLightSettings(name: string) {
  const form = lightForms[name]
  if (!form) {
    return
  }

  lightSaving[name] = true
  try {
    const pinsArray = form.pins
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .map((value) => Number(value))
      .filter((value) => !Number.isNaN(value))

    const payload: Record<string, unknown> = {
      pins: pinsArray
    }

    const updated = await updateLightNameSettings({
      client: apiClient,
      path: { name },
      body: payload
    })

    lightForms[name] = mapLightConfig(updated.data)
  } catch (error) {
    console.error(`Light "${name}" could not be saved.`, error)
  } finally {
    lightSaving[name] = false
  }
}

watch(selectedCamera, (name) => {
  if (name) {
    loadCameraSettings(name)
  } else {
    resetCameraForm()
  }
})

watch(
  cameraOptions,
  (options) => {
    if (!selectedCamera.value && options.length > 0) {
      selectedCamera.value = options[0].value
      return
    }

    if (selectedCamera.value && !options.some((option) => option.value === selectedCamera.value)) {
      selectedCamera.value = options[0]?.value ?? null
    }
  },
  { immediate: true }
)

watch(
  motors,
  (current = {}) => {
    const names = new Set(Object.keys(current))

    Object.keys(motorForms).forEach((name) => {
      if (!names.has(name)) {
        delete motorForms[name]
        delete motorSaving[name]
      }
    })

    Object.entries(current).forEach(([name, status]) => {
      motorForms[name] = mapMotorConfig(status?.settings)
      if (!(name in motorSaving)) {
        motorSaving[name] = false
      }
    })
  },
  { immediate: true, deep: true }
)

watch(
  lights,
  (current = {}) => {
    const names = new Set(Object.keys(current))

    Object.keys(lightForms).forEach((name) => {
      if (!names.has(name)) {
        delete lightForms[name]
        delete lightSaving[name]
      }
    })

    Object.entries(current).forEach(([name, status]) => {
      lightForms[name] = mapLightConfig(status?.settings)
      if (!(name in lightSaving)) {
        lightSaving[name] = false
      }
    })
  },
  { immediate: true, deep: true }
)

async function saveApiConfig() {
  apiConfigStore.setConfig(apiConfigForm)
  updateApiClientConfig()
}

function resetApiConfigToWindow() {
  const loc = window.location
  const defaultPort = loc.port ? Number(loc.port) : loc.protocol === 'https:' ? 443 : 80
  apiConfigForm.schema = (loc.protocol.replace(':', '') as 'http' | 'https') ?? 'http'
  apiConfigForm.host = loc.hostname
  apiConfigForm.port = defaultPort
  apiConfigForm.version = apiConfigStore.version
  apiConfigForm.developerMode = false
}

async function saveCurrentConfig() {
  hardwareActions.save = true
  try {
    await saveDeviceConfig({ client: apiClient })
  } catch (error) {
    console.error('Configuration could not be saved.', error)
  } finally {
    hardwareActions.save = false
  }
}

async function handleReinitializeHardware() {
  hardwareActions.reinitialize = true
  try {
    await reinitializeHardware({
      client: apiClient,
      query: { detect_cameras: detectCameras.value }
    })
  } catch (error) {
    console.error('Hardware could not be reinitialized.', error)
  } finally {
    hardwareActions.reinitialize = false
  }
}

onMounted(async () => {
  await loadDeviceConfigs()
})
</script>

<style scoped>
.settings-card + .settings-card {
  margin-top: 16px;
}
</style>
