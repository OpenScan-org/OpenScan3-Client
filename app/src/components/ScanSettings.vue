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
import { ref, computed } from 'vue'
import { api } from 'boot/axios'
import { ScanSettingsModel } from './models';
import generate from 'project-name-generator'

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

const rotor_increment = ref(10)
const turntable_increment = ref(10)

const rotor_range = ref({ min: 0, max: 360 })
const turntable_range = ref({ min: 0, max: 360 })

function onSubmit() {
    $q.notify({
        color: 'green-4',
        textColor: 'white',
        icon: 'cloud_done',
        message: 'Started scanning'
    })
    run_scan();
    if (upload.value) {
        emit('upload:project', project_name.value)
    }
}

function toggle_lights() {
    api.post(`/ring_light/`, { status: ring_light.value })
}

function move_motor(motor: string, degrees: number) {
    api.post(`/motors/${motor}/move`, { degrees: degrees })
}

function home_motor(motor: string) {
    api.post(`/motors/${motor}/home`)
}

function run_scan() {
    emit('update:scanning', true)
    const response = api.post('/scan', {
        'project_name': project_name.value,
        'camera_id': camera.value.value,
        'method': method.value.value,
        'points': points.value
    }, { responseType: 'stream' })
        .then((response) => {
            const stream = response.data;

            stream.on('data', (data: any) => {
                console.log(data);
            });

            stream.on('end', () => {
                console.log("stream done")
                emit('update:scanning', false)
            });
        })
}

function random_name() {
    project_name.value = generate().dashed
}

</script>
