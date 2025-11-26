<template>
    <q-card class="scan-settings-card">
        <q-form @submit="onSubmit">
            <q-card-section>
                <div class="text-h6">Scan Settings</div>
            </q-card-section>
            <q-card-section class="q-pt-none">
                <div class="q-pa-md q-col-gutter-md" style="max-width: 400px">
                    <div class="row q-col-gutter-lg">
                        <div class="col-10">
                            <q-input clearable v-model="project_name" label="Project Name" lazy-rules
                                :rules="[(val: string | any[]) => val && val.length > 0 || 'Please type something']" />
                        </div>
                        <div class="col-2">
                            <q-btn round icon="casino" color="primary" style="margin-top:10px" @click="random_name" />
                        </div>
                    </div>

                    <div class="row q-col-gutter-lg">
                        <div class="col-6">
                            <q-select v-model="camera" :options="cameras" label="Camera" />
                        </div>
                        <div class="col-6">
                            <q-toggle v-model="ring_light" label="Ring Light" @update:model-value="toggle_lights" />
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-12">
                            Rotor:
                        </div>
                        <div class="col-12">
                            <q-btn-group>
                                <q-btn flat icon="arrow_upward" @click="move_motor('rotor', -rotor_increment)" />
                                <q-input v-model.number="rotor_increment" type="number" min="1" max="359"
                                    label="Increment" />
                                <q-btn flat icon="arrow_downward" @click="move_motor('rotor', rotor_increment)" />
                                <q-btn color="primary" icon="home" @click="home_motor('rotor')" />
                            </q-btn-group>
                        </div>
                        <div class="col-12">
                            <div class="q-pa-md">
                                <q-range v-model="rotor_range" :min="0" :max="360" :step="10" label-always />
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-12">
                            Turntable:
                        </div>
                        <div class="col-12">
                            <q-btn-group>
                                <q-btn flat icon="arrow_upward" @click="move_motor('turntable', -turntable_increment)" />
                                <q-input v-model.number="turntable_increment" type="number" min="1" max="359"
                                    label="Increment" />
                                <q-btn flat icon="arrow_downward" @click="move_motor('turntable', turntable_increment)" />
                                <q-btn color="primary" icon="home" @click="home_motor('turntable')" />
                            </q-btn-group>
                        </div>
                        <div class="col-12">
                            <div class="q-pa-md">
                                <q-range v-model="turntable_range" :min="0" :max="360" :step="10" label-always />
                            </div>
                        </div>
                    </div>

                    <q-select v-model="method" :options="path_methods" label="Path method" /><br />

                    <q-input type="number" min="1" v-model="points" label="Number of pictures" lazy-rules
                        :rules="[(val: number) => val && val > 0 || 'Please type a number > 0']" />
                    <q-toggle v-model="upload" label="Upload to OpenScan Cloud" />
                </div>

            </q-card-section>
            <q-separator inset />
            <q-card-section align="right">
                <q-btn color="primary" icon-right="send" label="Scan" type="submit" :disable="scanning" />
            </q-card-section>
        </q-form>
    </q-card>
</template>

<script setup lang="ts">

import { QSelectProps, useQuasar } from 'quasar'
import { ref, computed, onMounted } from 'vue'
import { apiClient } from 'src/services/apiClient'
import {
    addScanWithDescription,
    getLights,
    moveMotorByDegree,
    moveMotorToHomePosition,
    turnOffLight,
    turnOnLight,
    type ScanSetting
} from 'src/generated/api'
import { ScanSettingsModel } from './models';
import generateDashedName from 'src/utils/randomName'

const $q = useQuasar()

interface ScanSettingsProp {
    settings: ScanSettingsModel
    cameras: QSelectProps['options']
    path_methods: QSelectProps['options']
    scanning: boolean
}

const props = defineProps<ScanSettingsProp>()

const emit = defineEmits(['update:camera', 'update:scanning', 'upload:project'])

const camera = computed({
    get() {
        return props.settings.camera
    },
    set(value) {
        emit('update:camera', value)
    }
})

const project_name = ref(props.settings.project_name)
const method = ref(props.settings.method)
const points = ref(props.settings.points)
const upload = ref(true)
const ring_light = ref(false)
const ring_light_name = ref<string | null>(null)

const rotor_increment = ref(10)
const turntable_increment = ref(10)

const rotor_range = ref({ min: 0, max: 360 })
const turntable_range = ref({ min: 0, max: 360 })

const onSubmit = async () => {
    const success = await run_scan()

    if (success && upload.value) {
        emit('upload:project', project_name.value)
    }
}

async function toggle_lights(value: boolean) {
    try {
        if (value) {
            await turnOnLight({ client: apiClient, path: { light_name: ring_light_name.value! } })
        } else {
            await turnOffLight({ client: apiClient, path: { light_name: ring_light_name.value! } })
        }
    } catch (error) {
        ring_light.value = !value
        $q.notify({ type: 'negative', message: 'Licht konnte nicht geschaltet werden.' })
    }
}

const load_ring_light = async () => {
    try {
        const lights = await getLights({ client: apiClient })
        const firstLight = Object.values(lights ?? {})[0]
        if (firstLight) {
            ring_light_name.value = firstLight.name
            ring_light.value = firstLight.is_on
        }
    } catch (error) {
        $q.notify({ type: 'negative', message: 'Lichtstatus konnte nicht geladen werden.' })
    }
}

onMounted(() => {
    load_ring_light()
})

async function move_motor(motor: string, degrees: number) {
    try {
        await moveMotorByDegree({
            client: apiClient,
            path: { motor_name: motor },
            body: { degrees }
        })
    } catch (error) {
        $q.notify({ type: 'negative', message: `Motor "${motor}" konnte nicht bewegt werden.` })
    }
}

async function home_motor(motor: string) {
    try {
        await moveMotorToHomePosition({
            client: apiClient,
            path: { motor_name: motor }
        })
    } catch (error) {
        $q.notify({ type: 'negative', message: `Motor "${motor}" konnte nicht referenziert werden.` })
    }
}

async function run_scan(): Promise<boolean> {
    if (!camera.value?.value) {
        $q.notify({ type: 'negative', message: 'Bitte zuerst eine Kamera auswählen.' })
        return false
    }

    const selectedMethod = method.value?.value ?? 'fibonacci'
    const scanSettingsPayload: ScanSetting = {
        path_method: selectedMethod as ScanSetting['path_method'],
        points: points.value,
        image_format: 'jpeg'
    }

    emit('update:scanning', true)

    try {
        await addScanWithDescription({
            client: apiClient,
            path: { project_name: project_name.value },
            query: { camera_name: camera.value.value },
            body: scanSettingsPayload
        })

        $q.notify({
            type: 'positive',
            message: 'Scan wurde gestartet.'
        })

        return true
    } catch (error) {
        $q.notify({ type: 'negative', message: 'Scan konnte nicht gestartet werden.' })
        return false
    } finally {
        emit('update:scanning', false)
    }
}

function random_name() {
    project_name.value = generateDashedName()
}

</script>
