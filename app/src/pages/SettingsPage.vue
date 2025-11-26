<template>
  <q-page>
    <div class="q-pa-md">
      <div class="row justify-center q-col-gutter-md">
        <div class="col-12 col-lg-8">
          <q-card flat bordered class="q-mb-lg">
            <q-card-section>
              <div class="text-h6">Allgemein</div>
            </q-card-section>
            <q-card-section class="q-pt-none">
              <div class="row q-col-gutter-md">
                <div class="col-12">
                  <q-input v-model="scannerAddress" label="Scanner Address" readonly />
                </div>

                <div class="col-12">
                  <div class="row q-col-gutter-sm items-end">
                    <div class="col-12 col-md-8">
                      <q-select
                        v-model="selectedConfig"
                        :options="configOptions"
                        label="Konfigurationsdatei"
                        :loading="configOptionsLoading"
                        emit-value
                        map-options
                        behavior="menu"
                        clearable
                      />
                    </div>
                    <div class="col-6 col-md-2">
                      <q-btn
                        outline
                        color="primary"
                        icon="refresh"
                        label="Neu laden"
                        :loading="configOptionsLoading"
                        @click="loadDeviceConfigs"
                      />
                    </div>
                    <div class="col-6 col-md-2">
                      <q-btn
                        color="primary"
                        icon="publish"
                        label="Setzen"
                        :disable="!selectedConfig"
                        :loading="configApplying"
                        @click="applySelectedConfig"
                      />
                    </div>
                  </div>
                </div>

                <div class="col-12 col-md-6">
                  <q-toggle v-model="detectCameras" label="Kameras bei Reinit erkennen" />
                </div>
                <div class="col-12 col-md-6">
                  <q-toggle
                    v-model="saveConfigBeforePowerAction"
                    label="Konfiguration vor Reboot/Shutdown speichern"
                  />
                </div>
              </div>
            </q-card-section>
            <q-card-actions class="row q-col-gutter-sm" align="right">
              <div class="col-12 col-md-3">
                <q-btn
                  v-ripple
                  class="full-width"
                  color="primary"
                  icon="save"
                  label="Config sichern"
                  :loading="hardwareActions.save"
                  @click="saveCurrentConfig"
                />
              </div>
              <div class="col-12 col-md-3">
                <q-btn
                  v-ripple
                  class="full-width"
                  color="warning"
                  icon="autorenew"
                  label="Hardware reinitialisieren"
                  :loading="hardwareActions.reinitialize"
                  @click="reinitializeHardware"
                />
              </div>
              <div class="col-12 col-md-3">
                <q-btn
                  v-ripple
                  class="full-width"
                  color="secondary"
                  icon="restart_alt"
                  label="Reboot"
                  :loading="hardwareActions.reboot"
                  @click="confirmReboot"
                />
              </div>
              <div class="col-12 col-md-3">
                <q-btn
                  v-ripple
                  class="full-width"
                  color="negative"
                  icon="power_settings_new"
                  label="Shutdown"
                  :loading="hardwareActions.shutdown"
                  @click="confirmShutdown"
                />
              </div>
            </q-card-actions>
          </q-card>

          <q-card flat bordered class="q-mb-lg">
            <q-card-section>
              <div class="text-h6">Kameraeinstellungen</div>
            </q-card-section>
            <q-card-section class="q-pt-none">
              <div class="row q-col-gutter-md">
                <div class="col-12">
                  <q-select
                    v-model="selectedCamera"
                    :options="cameraOptions"
                    label="Kamera"
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
                  <div class="col-6">
                    <q-input v-model.number="cameraForm.shutter" type="number" label="Shutter (µs)" />
                  </div>
                  <div class="col-6">
                    <q-input v-model.number="cameraForm.gain" type="number" label="Analogue Gain" />
                  </div>
                  <div class="col-6">
                    <q-input v-model.number="cameraForm.saturation" type="number" label="Saturation" />
                  </div>
                  <div class="col-6">
                    <q-input v-model.number="cameraForm.contrast" type="number" label="Contrast" />
                  </div>
                  <div class="col-6">
                    <q-input v-model.number="cameraForm.awbg_red" type="number" label="AWBG Red" />
                  </div>
                  <div class="col-6">
                    <q-input v-model.number="cameraForm.awbg_blue" type="number" label="AWBG Blue" />
                  </div>
                  <div class="col-6">
                    <q-input v-model.number="cameraForm.jpeg_quality" type="number" label="JPEG Quality" />
                  </div>
                  <div class="col-6">
                    <q-input v-model.number="cameraForm.manual_focus" type="number" label="Manual Focus" />
                  </div>
                  <div class="col-6">
                    <q-toggle v-model="cameraForm.AF" label="Autofokus" />
                  </div>
                </template>
              </div>
            </q-card-section>
            <q-card-actions align="right">
              <q-btn
                color="primary"
                icon="save"
                label="Speichern"
                :disable="!selectedCamera"
                :loading="cameraSaving"
                @click="saveCameraSettings"
              />
            </q-card-actions>
          </q-card>

          <q-card flat bordered class="q-mb-lg">
            <q-card-section>
              <div class="text-h6">Motoren</div>
            </q-card-section>
            <q-card-section class="q-pt-none">
              <div class="row q-col-gutter-md">
                <div class="col-12" v-if="motorNames.length === 0">
                  <q-banner dense>Keine Motoren gefunden.</q-banner>
                </div>

                <div class="col-12" v-for="motorName in motorNames" :key="motorName">
                  <q-card flat bordered>
                    <q-card-section>
                      <div class="text-subtitle1">{{ motorName }}</div>
                    </q-card-section>
                    <q-card-section class="q-pt-none" v-if="motorForms[motorName]">
                      <div class="row q-col-gutter-md">
                        <div class="col-4">
                          <q-input v-model.number="motorForms[motorName].direction_pin" type="number" label="Direction Pin" />
                        </div>
                        <div class="col-4">
                          <q-input v-model.number="motorForms[motorName].enable_pin" type="number" label="Enable Pin" />
                        </div>
                        <div class="col-4">
                          <q-input v-model.number="motorForms[motorName].step_pin" type="number" label="Step Pin" />
                        </div>
                        <div class="col-4">
                          <q-input v-model.number="motorForms[motorName].acceleration" type="number" label="Acceleration" />
                        </div>
                        <div class="col-4">
                          <q-input v-model.number="motorForms[motorName].max_speed" type="number" label="Max Speed" />
                        </div>
                        <div class="col-4">
                          <q-select
                            v-model="motorForms[motorName].direction"
                            :options="directionOptions"
                            label="Direction"
                            emit-value
                            map-options
                          />
                        </div>
                        <div class="col-4">
                          <q-input v-model.number="motorForms[motorName].steps_per_rotation" type="number" label="Steps per Rotation" />
                        </div>
                        <div class="col-4">
                          <q-input v-model.number="motorForms[motorName].min_angle" type="number" label="Min Angle" />
                        </div>
                        <div class="col-4">
                          <q-input v-model.number="motorForms[motorName].max_angle" type="number" label="Max Angle" />
                        </div>
                      </div>
                    </q-card-section>
                    <q-card-actions align="right">
                      <q-btn
                        color="primary"
                        icon="save"
                        label="Speichern"
                        :loading="motorSaving[motorName] === true"
                        @click="saveMotorSettings(motorName)"
                      />
                    </q-card-actions>
                  </q-card>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="q-mb-lg">
            <q-card-section>
              <div class="text-h6">Lichter</div>
            </q-card-section>
            <q-card-section class="q-pt-none">
              <div class="row q-col-gutter-md">
                <div class="col-12" v-if="lightNames.length === 0">
                  <q-banner dense>Keine Lichter gefunden.</q-banner>
                </div>

                <div class="col-12" v-for="lightName in lightNames" :key="lightName">
                  <q-card flat bordered>
                    <q-card-section>
                      <div class="text-subtitle1">{{ lightName }}</div>
                    </q-card-section>
                    <q-card-section class="q-pt-none" v-if="lightForms[lightName]">
                      <div class="row q-col-gutter-md">
                        <div class="col-6">
                          <q-input v-model.number="lightForms[lightName].pin" type="number" label="Pin" clearable />
                        </div>
                        <div class="col-6">
                          <q-input
                            v-model="lightForms[lightName].pins"
                            label="Pins (kommagetrennt)"
                          />
                        </div>
                        <div class="col-12">
                          <q-toggle v-model="lightForms[lightName].pwm" label="PWM aktiviert" />
                        </div>
                      </div>
                    </q-card-section>
                    <q-card-actions align="right">
                      <q-btn
                        color="primary"
                        icon="save"
                        label="Speichern"
                        :loading="lightSaving[lightName] === true"
                        @click="saveLightSettings(lightName)"
                      />
                    </q-card-actions>
                  </q-card>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { API_BASE_URL, apiClient } from 'src/services/apiClient'
import {
  listConfigFiles,
  setConfigFile,
  saveDeviceConfig,
  reinitializeHardware,
  reboot,
  shutdown,
  getCameras,
  getLights,
  getMotors,
  getCameraNameSettings,
  updateCameraNameSettings,
  updateLightNameSettings,
  updateMotorNameSettings,
  type CameraSettings,
  type LightConfig,
  type LightStatusResponse,
  type MotorConfig,
  type MotorStatusResponse
} from 'src/generated/api'

const $q = useQuasar()

const scannerAddress = computed(() => API_BASE_URL.replace(/\/$/, ''))

type DeviceConfigOption = { label: string; value: string; meta?: DeviceConfigListItem }

type DeviceConfigListItem = {
  filename: string
  path: string
  name: string
  model: string | null
  shield: string | null
}

const configOptions = ref<DeviceConfigOption[]>([])
const configOptionsLoading = ref(false)
const selectedConfig = ref<string | null>(null)
const configApplying = ref(false)

const detectCameras = ref(false)
const saveConfigBeforePowerAction = ref(false)

const hardwareActions = reactive({
  save: false,
  reinitialize: false,
  reboot: false,
  shutdown: false
})

type CameraOption = { label: string; value: string }

const cameraOptions = ref<CameraOption[]>([])
const cameraOptionsLoading = ref(false)
const selectedCamera = ref<string | null>(null)
const cameraLoading = ref(false)
const cameraSaving = ref(false)
const cameraForm = reactive<{ [K in keyof CameraSettings]?: CameraSettings[K] | null }>({})

const motorNames = ref<string[]>([])
const motorForms = reactive<Record<string, MotorForm>>({})
const motorSaving = reactive<Record<string, boolean>>({})

const lightNames = ref<string[]>([])
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
  pin: number | null
  pins: string
  pwm: boolean
}

const directionOptions = [
  { label: 'Vorwärts (1)', value: 1 },
  { label: 'Rückwärts (-1)', value: -1 }
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
    pin: config?.pin ?? null,
    pins: (config?.pins ?? []).join(', '),
    pwm: config?.pwm ?? false
  }
}

async function loadCameraOptions() {
  cameraOptionsLoading.value = true
  try {
    const data = await getCameras({ client: apiClient })
    const options = Object.keys(data ?? {}).map((name) => ({ label: name, value: name }))
    cameraOptions.value = options
    selectedCamera.value = options[0]?.value ?? null
  } catch (error) {
    cameraOptions.value = []
    $q.notify({ type: 'negative', message: 'Kameras konnten nicht geladen werden.' })
  } finally {
    cameraOptionsLoading.value = false
  }
}

async function loadDeviceConfigs() {
  configOptionsLoading.value = true
  try {
    const response = (await listConfigFiles({ client: apiClient })) as unknown as {
      status?: string
      configs?: DeviceConfigListItem[]
    }

    const options = (response?.configs ?? []).map((item) => ({
      label: item.name ?? item.filename,
      value: item.filename,
      meta: item
    }))

    configOptions.value = options

    if (options.length > 0) {
      selectedConfig.value = options[0].value
    } else {
      selectedConfig.value = null
    }
  } catch (error) {
    configOptions.value = []
    selectedConfig.value = null
    $q.notify({ type: 'negative', message: 'Gerätekonfigurationen konnten nicht geladen werden.' })
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

    $q.notify({ type: 'positive', message: 'Konfiguration angewendet. Hardware ggf. neu initialisieren.' })
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Konfiguration konnte nicht gesetzt werden.' })
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
      path: { camera_name: name },
      query: { name }
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
    $q.notify({ type: 'negative', message: `Einstellungen für Kamera "${name}" konnten nicht geladen werden.` })
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
      path: { camera_name: selectedCamera.value },
      query: { name: selectedCamera.value },
      body: payload
    })

    $q.notify({ type: 'positive', message: 'Kameraeinstellungen gespeichert.' })
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Kameraeinstellungen konnten nicht gespeichert werden.' })
  } finally {
    cameraSaving.value = false
  }
}

async function loadMotors() {
  try {
    const data = await getMotors({ client: apiClient })
    const entries = Object.entries<MotorStatusResponse>(data ?? {})
    motorNames.value = entries.map(([name]) => name)
    entries.forEach(([name, status]) => {
      motorForms[name] = mapMotorConfig(status?.settings)
      motorSaving[name] = false
    })
  } catch (error) {
    motorNames.value = []
    $q.notify({ type: 'negative', message: 'Motoren konnten nicht geladen werden.' })
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
      path: { motor_name: name },
      query: { name },
      body: payload
    })

    motorForms[name] = mapMotorConfig(updated)
    $q.notify({ type: 'positive', message: `Motor "${name}" gespeichert.` })
  } catch (error) {
    $q.notify({ type: 'negative', message: `Motor "${name}" konnte nicht gespeichert werden.` })
  } finally {
    motorSaving[name] = false
  }
}

async function loadLights() {
  try {
    const data = await getLights({ client: apiClient })
    const entries = Object.entries<LightStatusResponse>(data ?? {})
    lightNames.value = entries.map(([name]) => name)
    entries.forEach(([name, status]) => {
      lightForms[name] = mapLightConfig(status?.settings)
      lightSaving[name] = false
    })
  } catch (error) {
    lightNames.value = []
    $q.notify({ type: 'negative', message: 'Lichter konnten nicht geladen werden.' })
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
      pwm: form.pwm
    }

    payload.pin = form.pin ?? null
    payload.pins = pinsArray

    const updated = await updateLightNameSettings({
      client: apiClient,
      path: { light_name: name },
      query: { name },
      body: payload
    })

    lightForms[name] = mapLightConfig(updated)
    $q.notify({ type: 'positive', message: `Licht "${name}" gespeichert.` })
  } catch (error) {
    $q.notify({ type: 'negative', message: `Licht "${name}" konnte nicht gespeichert werden.` })
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

async function saveCurrentConfig() {
  hardwareActions.save = true
  try {
    await saveDeviceConfig({ client: apiClient })
    $q.notify({ type: 'positive', message: 'Aktuelle Konfiguration gespeichert.' })
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Konfiguration konnte nicht gespeichert werden.' })
  } finally {
    hardwareActions.save = false
  }
}

async function reinitializeHardware() {
  hardwareActions.reinitialize = true
  try {
    await reinitializeHardware({
      client: apiClient,
      query: { detect_cameras: detectCameras.value }
    })
    $q.notify({ type: 'positive', message: 'Hardware wird neu initialisiert.' })
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Hardware konnte nicht neu initialisiert werden.' })
  } finally {
    hardwareActions.reinitialize = false
  }
}

function confirmReboot() {
  $q.dialog({
    title: 'Reboot bestätigen',
    message: 'Der Scanner wird neu gestartet. Fortfahren?',
    cancel: true,
    persistent: true
  }).onOk(rebootDevice)
}

function confirmShutdown() {
  $q.dialog({
    title: 'Shutdown bestätigen',
    message: 'Der Scanner wird heruntergefahren. Fortfahren?',
    cancel: true,
    persistent: true
  }).onOk(shutdownDevice)
}

async function rebootDevice() {
  hardwareActions.reboot = true
  try {
    await reboot({
      client: apiClient,
      query: { save_config: saveConfigBeforePowerAction.value }
    })
    $q.notify({ type: 'positive', message: 'Reboot ausgelöst.' })
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Reboot konnte nicht ausgelöst werden.' })
  } finally {
    hardwareActions.reboot = false
  }
}

async function shutdownDevice() {
  hardwareActions.shutdown = true
  try {
    await shutdown({
      client: apiClient,
      query: { save_config: saveConfigBeforePowerAction.value }
    })
    $q.notify({ type: 'positive', message: 'Shutdown ausgelöst.' })
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Shutdown konnte nicht ausgelöst werden.' })
  } finally {
    hardwareActions.shutdown = false
  }
}

onMounted(async () => {
  await loadDeviceConfigs()
  await loadCameraOptions()
  await Promise.all([loadMotors(), loadLights()])
})
</script>

<style scoped>
.settings-card + .settings-card {
  margin-top: 16px;
}
</style>
