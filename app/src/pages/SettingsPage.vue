<template>
    <q-page>
        <div class="q-pa-md">
            <div class="row justify-center">
                <div class="col-8">
                    <q-card class="project-card">
                        <q-card-section>
                            <div class="text-h6">Scanner Settings</div>
                        </q-card-section>
                        <q-card-section class="q-pt-none">
                            <div class="col-12 q-pa-md q-col-gutter-md">
                                <div class="row">
                                    <div class="col-12 q-pa-md q-col-gutter-md">
                                        <q-input v-model="scanner_address" label="Scanner Address" />
                                    </div>
                                    <div class="col-12 q-pa-md q-col-gutter-md">
                                    <q-input v-model="projects_root" label="Projects Root" />
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-12 q-col-gutter-md">
                                        <div class="row">
                                            <div class="text-h6">Pin settings</div>
                                        </div>
                                        <div class="row q-col-gutter-md">
                                            <div class="col-6">
                                                <q-card class="project-card">
                                                    <q-card-section>
                                                        <div class="text-h7">Rotor</div>
                                                    </q-card-section>
                                                    <q-card-section class="q-pt-none">
                                                        <div class="row q-col-gutter-md">
                                                            <div class="col-6">
                                                                <q-input v-model="rotor_dir_pin"
                                                                    label="Direction Pin" />
                                                            </div>
                                                            <div class="col-6">
                                                                <q-input v-model="rotor_enable_pin" label="Enable Pin" />
                                                            </div>
                                                            <div class="col-6">
                                                                <q-input v-model="rotor_step_pin" label="Step Pin" />
                                                            </div>
                                                        </div>

                                                        <div class="row q-col-gutter-md">
                                                            <div class="col-6">
                                                                <q-input v-model="rotor_accel"
                                                                    label="Acceleration" />
                                                            </div>
                                                            <div class="col-6">
                                                                <q-input v-model="rotor_accel_ramp"
                                                                    label="Acceleration Ramp" />
                                                            </div>
                                                            <div class="col-6">
                                                                <q-input v-model="rotor_delay" label="Delay" />
                                                            </div>
                                                            <div class="col-6">
                                                                <q-input v-model="rotor_direction" label="Direction" />
                                                            </div>
                                                            <div class="col-6">
                                                                <q-input v-model="rotor_spr"
                                                                    label="Steps Per Rotation" />
                                                            </div>
                                                        </div>
                                                    </q-card-section>
                                                </q-card>

                                            </div>
                                            <div class="col-6">
                                                <q-card class="project-card">
                                                    <q-card-section>
                                                        <div class="text-h7">Turntable</div>
                                                    </q-card-section>
                                                    <q-card-section class="q-pt-none">
                                                        <div class="row q-col-gutter-md">
                                                            <div class="col-6">
                                                                <q-input v-model="turntable_dir_pin"
                                                                    label="Direction Pin" />
                                                            </div>
                                                            <div class="col-6">
                                                                <q-input v-model="turntable_enable_pin" label="Enable Pin" />
                                                            </div>
                                                            <div class="col-6">
                                                                <q-input v-model="turntable_step_pin" label="Step Pin" />
                                                            </div>
                                                        </div>

                                                        <div class="row q-col-gutter-md">
                                                            <div class="col-6">
                                                                <q-input v-model="turntable_accel"
                                                                    label="Acceleration" />
                                                            </div>
                                                            <div class="col-6">
                                                                <q-input v-model="turntable_accel_ramp"
                                                                    label="Acceleration Ramp" />
                                                            </div>
                                                            <div class="col-6">
                                                                <q-input v-model="turntable_delay" label="Delay" />
                                                            </div>
                                                            <div class="col-6">
                                                                <q-input v-model="turntable_direction" label="Direction" />
                                                            </div>
                                                            <div class="col-6">
                                                                <q-input v-model="turntable_spr"
                                                                    label="Steps Per Rotation" />
                                                            </div>
                                                        </div>
                                                    </q-card-section>
                                                </q-card>
                                            </div>
                                            <div class="col-6">
                                                <q-card class="project-card">
                                                    <q-card-section>
                                                        <div class="text-h7">Ring Light</div>
                                                    </q-card-section>
                                                    <q-card-section class="q-pt-none">
                                                        <q-input v-model="ringlight_pin" label="Pin" />
                                                    </q-card-section>
                                                </q-card>
                                            </div>
                                            <div class="col-6">
                                                <q-card class="project-card">
                                                    <q-card-section>
                                                        <div class="text-h7">External Camera</div>
                                                    </q-card-section>
                                                    <q-card-section class="q-pt-none">
                                                        <q-input v-model="external_camera_pin" label="Pin" />
                                                    </q-card-section>
                                                </q-card>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-2">

                                    </div>
                                    <div class="col-2">

                                    </div>
                                </div>
                            </div>
                        </q-card-section>
                        <q-separator inset />
                        <q-card-actions align="right">
                            <q-btn icon="download" color="secondary" :disabled="true">Install drivers</q-btn>
                            <q-btn icon="handyman" color="secondary" :disabled="true">Check for updates</q-btn>
                            <q-btn color="primary" icon-right="save" label="Save" type="submit" />
                        </q-card-actions>
                    </q-card>
                </div>
            </div>
        </div>
    </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const scanner_address = ref('openscan.local')
const projects_root = ref('/home/pi/OpenScan3/projects/')

const rotor_dir_pin = ref(0)
const rotor_enable_pin = ref(0)
const rotor_step_pin = ref(0)
const rotor_accel = ref(0)
const rotor_accel_ramp = ref(0)
const rotor_delay = ref(0)
const rotor_direction = ref(0)
const rotor_spr = ref(0)

const turntable_dir_pin = ref(0)
const turntable_enable_pin = ref(0)
const turntable_step_pin = ref(0)
const turntable_accel = ref(0)
const turntable_accel_ramp = ref(0)
const turntable_delay = ref(0)
const turntable_direction = ref(0)
const turntable_spr = ref(0)

const ringlight_pin = ref(12)
const external_camera_pin = ref(12)
</script>
