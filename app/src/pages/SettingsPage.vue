<template>
  <BasePage class="settings-page" :center-content="false">
    <template #background>
      <BlurredSnapshotBackground
        v-if="backgroundPreviewUrl"
        :src="backgroundPreviewUrl"
        :alt="'Camera preview background'"
        :transition-ms="1200"
        :max-opacity="0.3"
        :orientation-flag="selectedCameraOrientationFlag"
      />
    </template>
    <div class="q-pa-md">
      <div class="row justify-center q-col-gutter-md">
        <div class="col-12">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6 col-lg-4">
              <BaseSectionGroup>
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
                      <q-select
                        v-model="apiConfigForm.version"
                        :options="apiVersionSelectOptions"
                        :loading="versionOptionsLoading"
                        label="Version"
                        emit-value
                        map-options
                        dropdown-icon="arrow_drop_down"
                        :popup-content-class="'api-version-select-menu'"
                        class="api-version-select"
                      />
                    </div>
                    <div class="col-12">
                      <q-toggle
                        v-model="apiConfigForm.developerMode"
                        label="Developer mode (connect directly to port)"
                        left-label
                      />
                    </div>
                    <div class="col-12">
                      <div class="row justify-end q-gutter-sm">
                        <BaseButtonSecondary
                          icon="restart_alt"
                          label="Reset"
                          @click="resetApiConfigToWindow"
                        />
                        <BaseButtonPrimary
                          icon="save"
                          label="Save"
                          @click="saveApiConfig"
                        />
                      </div>
                    </div>
                  </div>
                </BaseSection>

                <div class="non-frontend-settings">
                  <div
                    class="non-frontend-settings__content"
                    :class="{ 'non-frontend-settings__content--blurred': deviceStore.hasConnectionIssue }"
                  >
                    <BaseSectionGroup>
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
                        <div class="col-12">
                          <div class="row justify-end q-gutter-sm">
                            <BaseButtonSecondary
                              icon="refresh"
                              label="Reload"
                              :loading="configOptionsLoading"
                              @click="loadDeviceConfigs"
                            >
                              <q-tooltip>Reload available device configurations.</q-tooltip>
                            </BaseButtonSecondary>
                            <BaseButtonPrimary
                              icon="publish"
                              label="Apply"
                              :disable="scanLocked || !selectedConfig"
                              :loading="configApplying"
                              @click="applySelectedConfig"
                            >
                              <q-tooltip>
                                {{ scanLocked ? scanLockedTooltip : 'Apply the selected configuration file.' }}
                              </q-tooltip>
                            </BaseButtonPrimary>
                            <BaseButtonSecondary
                              icon="cached"
                              label="Reinitialize"
                              :disable="scanLocked"
                              :loading="reinitializeHardwareLoading"
                              @click="handleReinitializeHardware"
                            >
                              <q-tooltip>
                                {{ scanLocked ? scanLockedTooltip : 'Reinitialize hardware and detect cameras automatically.' }}
                              </q-tooltip>
                            </BaseButtonSecondary>
                          </div>
                        </div>
                      </div>
                    </BaseSection>

                    <BaseVersionInfoCard />

                    <BaseSection v-if="isNextApiTarget" title="Firmware Settings">
                      <div class="row q-col-gutter-sm" v-if="firmwareSettingsLoading">
                        <div class="col-12">
                          <q-skeleton type="rect" height="96px" />
                        </div>
                      </div>

                      <div class="row q-col-gutter-sm" v-else>
                        <div class="col-12">
                          <q-toggle
                            v-model="firmwareForm.qr_wifi_scan_enabled"
                            label="Auto-start QR WiFi scan task when offline"
                            left-label
                            :disable="firmwareSettingsSaving"
                            @update:model-value="(value: boolean) => handleFirmwareSettingChange('qr_wifi_scan_enabled', value)"
                          />
                        </div>
                        <div class="col-12">
                          <div class="row justify-end q-gutter-sm">
                            <BaseButtonSecondary
                              icon="refresh"
                              label="Reload"
                              :loading="firmwareSettingsLoading"
                              @click="loadFirmwareSettings(true)"
                            />
                            <BaseButtonPrimary
                              icon="save"
                              label="Save"
                              :loading="firmwareSettingsSaving"
                              @click="saveFirmwareSettings"
                            />
                          </div>
                        </div>
                        <div v-if="firmwareSettingsError" class="col-12">
                          <q-banner dense inline-actions class="bg-negative text-white">
                            {{ firmwareSettingsError }}
                          </q-banner>
                        </div>
                      </div>
                    </BaseSection>

                    <BaseSection title="OpenScanCloud Settings">
                      <div class="row q-col-gutter-sm">
                        <div class="col-12">
                          <q-toggle v-model="cloudToggle" label="Enable cloud" left-label />
                        </div>
                      </div>

                      <template v-if="cloudToggle">
                        <div class="row q-col-gutter-sm" v-if="cloudSettingsLoading">
                          <div class="col-12">
                            <q-skeleton type="rect" height="140px" />
                          </div>
                        </div>

                        <div class="row q-col-gutter-sm" v-else>
                          <div class="col-12">
                            <q-input v-model="cloudForm.token" label="Token" />
                          </div>
                          <div class="col-12">
                            <div class="row items-center q-col-gutter-sm">
                              <div class="col-auto">
                                <BaseButtonSecondary
                                  icon="sync"
                                  square
                                  :loading="cloudStatusLoading"
                                  @click="loadCloudStatus"
                                >
                                  <q-tooltip>Refresh token status.</q-tooltip>
                                </BaseButtonSecondary>
                              </div>
                              <div class="col">
                                <div class="text-body2">
                                  <span class="text-grey-7">Status:</span>
                                  <span
                                    v-if="tokenStatusView.expandable"
                                    class="q-ml-xs cursor-pointer"
                                    :class="tokenStatusView.isError ? 'text-negative' : 'text-grey-7'"
                                    @click="tokenStatusExpanded = !tokenStatusExpanded"
                                  >
                                    {{ tokenStatusView.summary }}
                                  </span>
                                  <span
                                    v-else
                                    class="q-ml-xs"
                                    :class="tokenStatusView.isError ? 'text-negative' : 'text-grey-7'"
                                  >
                                    {{ tokenStatusView.summary }}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div v-if="tokenStatusView.expandable && tokenStatusExpanded" class="q-mt-sm">
                              <div
                                v-for="detail in tokenStatusView.details"
                                :key="detail"
                                class="text-body2 text-grey-7"
                              >
                                {{ detail }}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div class="row justify-end q-gutter-sm q-mt-md">
                          <div class="col-auto">
                            <BaseButtonPrimary
                              icon="save"
                              label="Save"
                              :disable="!isCloudFormValid || cloudSettingsSaving"
                              :loading="cloudSettingsSaving"
                              @click="saveCloudSettings"
                            />
                          </div>
                        </div>
                      </template>
                    </BaseSection>
                  </BaseSectionGroup>
                  </div>

                  <div v-if="deviceStore.hasConnectionIssue" class="non-frontend-settings__overlay">
                    <q-card flat bordered class="q-pa-md">
                      <div class="q-gutter-y-sm">
                        <q-skeleton type="text" width="55%" />
                        <q-skeleton type="rect" height="32px" />
                        <q-skeleton type="rect" height="32px" />
                        <q-skeleton type="text" width="45%" />
                        <q-skeleton type="rect" height="120px" />
                      </div>
                    </q-card>
                  </div>
                </div>
              </BaseSectionGroup>
            </div>

            <div class="col-12 col-md-6 col-lg-4">
              <BaseSectionGroup class="non-frontend-settings">
                <div
                  class="non-frontend-settings__content"
                  :class="{ 'non-frontend-settings__content--blurred': deviceStore.hasConnectionIssue }"
                >
                  <BaseSection title="Motor Settings">
                  <div class="row q-col-gutter-md">
                    <div class="col-12" v-if="isNextApiTarget">
                      <div class="row justify-end">
                        <BaseButtonSecondary icon="add" label="Add motor" @click="addMotorDialog = true" />
                      </div>
                    </div>
                    <div class="col-12" v-if="motorNames.length === 0">
                      <q-banner dense>No motors found.</q-banner>
                    </div>

                    <div class="col-12" v-for="motorName in motorNames" :key="motorName">
                      <q-card flat bordered>
                        <q-card-section>
                          <div class="row items-center justify-between no-wrap motor-card__header">
                            <div class="column">
                              <div class="text-subtitle1">{{ motorName }}</div>
                              <div class="text-caption text-grey-7">
                                <template v-if="motorAngles[motorName] !== null && motorAngles[motorName] !== undefined">
                                  Angle: {{ formatMotorAngle(motorAngles[motorName]) }}
                                </template>
                                <template v-else>Angle unavailable</template>
                              </div>
                            </div>
                            <div class="motor-card__controls">
                              <q-btn-group unelevated rounded>
                                <BaseMotorButtonBar
                                  :motor-name="motorName"
                                  :step-degrees="motorStepDegrees(motorName)"
                                  :negative-icon="motorNegativeIcon(motorName)"
                                  :positive-icon="motorPositiveIcon(motorName)"
                                  :negative-tooltip="motorNegativeTooltip(motorName)"
                                  :positive-tooltip="motorPositiveTooltip(motorName)"
                                  :show-calibrate="motorShowCalibrate(motorName)"
                                  :calibrate-tooltip="motorCalibrateTooltip(motorName)"
                                  :disable="scanLocked || deviceStore.hasConnectionIssue || homeBusy || anyMotorBusy"
                                  :refresh-after-move="true"
                                  @busy-change="(busy) => handleMotorBusyChange(motorName, busy)"
                                  @calibrated="() => handleMotorCalibrated(motorName)"
                                />
                                <BaseButtonIconSecondary
                                  v-if="motorHasHome(motorName)"
                                  icon="home"
                                  size="sm"
                                  :disable="
                                    scanLocked ||
                                    deviceStore.hasConnectionIssue ||
                                    homeBusy ||
                                    anyMotorBusy
                                  "
                                  :loading="homeBusy"
                                  @click="handleMoveHome(motorName)"
                                >
                                  <q-tooltip anchor="bottom middle" self="top middle">
                                    Return to home position
                                  </q-tooltip>
                                </BaseButtonIconSecondary>
                              </q-btn-group>
                            </div>
                          </div>
                        </q-card-section>
                        <q-card-section class="q-pt-none" v-if="motorForms[motorName]">
                          <div class="row q-col-gutter-md">
                            <div class="col-12 col-md-6 col-lg-4">
                              <q-input
                                v-model.number="motorForms[motorName].direction_pin"
                                type="number"
                                label="Direction Pin"
                                @update:model-value="() => markMotorFormDirty(motorName)"
                              />
                            </div>
                            <div class="col-12 col-md-6 col-lg-4">
                              <q-input
                                v-model.number="motorForms[motorName].enable_pin"
                                type="number"
                                label="Enable Pin"
                                @update:model-value="() => markMotorFormDirty(motorName)"
                              />
                            </div>
                            <div class="col-12 col-md-6 col-lg-4">
                              <q-input
                                v-model.number="motorForms[motorName].step_pin"
                                type="number"
                                label="Step Pin"
                                @update:model-value="() => markMotorFormDirty(motorName)"
                              />
                            </div>
                            <div class="col-12 col-md-6 col-lg-4">
                              <q-input
                                v-model.number="motorForms[motorName].acceleration"
                                type="number"
                                label="Acceleration"
                                @update:model-value="() => markMotorFormDirty(motorName)"
                              >
                                <q-tooltip>{{ motorConfigDescription('acceleration') }}</q-tooltip>
                              </q-input>
                            </div>
                            <div class="col-12 col-md-6 col-lg-4">
                              <q-input
                                v-model.number="motorForms[motorName].max_speed"
                                type="number"
                                label="Max Speed"
                                @update:model-value="() => markMotorFormDirty(motorName)"
                              >
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
                                @update:model-value="() => markMotorFormDirty(motorName)"
                              />
                            </div>
                            <div class="col-12 col-md-6 col-lg-4">
                              <q-input
                                v-model.number="motorForms[motorName].steps_per_rotation"
                                type="number"
                                label="Steps per Rotation"
                                @update:model-value="() => markMotorFormDirty(motorName)"
                              >
                                <q-tooltip>{{ motorConfigDescription('steps_per_rotation') }}</q-tooltip>
                              </q-input>
                            </div>
                            <div class="col-12 col-md-6 col-lg-4">
                              <q-input
                                v-model.number="motorForms[motorName].min_angle"
                                type="number"
                                label="Min Angle"
                                @update:model-value="() => markMotorFormDirty(motorName)"
                              >
                                <q-tooltip>{{ motorConfigDescription('min_angle') }}</q-tooltip>
                              </q-input>
                            </div>
                            <div class="col-12 col-md-6 col-lg-4">
                              <q-input
                                v-model.number="motorForms[motorName].max_angle"
                                type="number"
                                label="Max Angle"
                                @update:model-value="() => markMotorFormDirty(motorName)"
                              >
                                <q-tooltip>{{ motorConfigDescription('max_angle') }}</q-tooltip>
                              </q-input>
                            </div>
                          </div>
                        </q-card-section>
                        <q-card-actions align="right">
                          <BaseButtonPrimary
                            icon="save"
                            label="Save"
                            :disable="scanLocked || motorControlBusy[motorName] === true"
                            :loading="motorSaving[motorName] === true"
                            @click="saveMotorSettings(motorName)"
                          >
                            <q-tooltip>
                              {{ scanLocked ? scanLockedTooltip : 'Save motor configuration.' }}
                            </q-tooltip>
                          </BaseButtonPrimary>
                        </q-card-actions>
                      </q-card>
                    </div>
                  </div>
                </BaseSection>

                <BaseSection v-if="isNextApiTarget" title="Endstop Settings">
                  <div class="row q-col-gutter-sm">
                    <div class="col-12">
                      <q-banner dense>Manage endstops via device configuration.</q-banner>
                    </div>
                    <div class="col-12">
                      <div class="row justify-end">
                        <BaseButtonSecondary icon="add_task" label="Add endstop" @click="addEndstopDialog = true" />
                      </div>
                    </div>
                  </div>
                </BaseSection>
                </div>

                <div v-if="deviceStore.hasConnectionIssue" class="non-frontend-settings__overlay">
                  <q-card flat bordered class="q-pa-md">
                    <div class="q-gutter-y-sm">
                      <q-skeleton type="text" width="40%" />
                      <q-skeleton type="rect" height="90px" />
                      <q-skeleton type="text" width="55%" />
                      <q-skeleton type="rect" height="48px" />
                    </div>
                  </q-card>
                </div>
              </BaseSectionGroup>
            </div>

            <div class="col-12 col-md-6 col-lg-4">
              <BaseSectionGroup class="non-frontend-settings">
                <div
                  class="non-frontend-settings__content"
                  :class="{ 'non-frontend-settings__content--blurred': deviceStore.hasConnectionIssue }"
                >
                  <BaseSectionGroup>
                    <BaseSection title="Light Settings">
                      <div class="row q-col-gutter-md">
                        <div class="col-12" v-if="isNextApiTarget">
                          <div class="row justify-end">
                            <BaseButtonSecondary icon="add" label="Add light" @click="addLightDialog = true" />
                          </div>
                        </div>
                        <div class="col-12" v-if="lightNames.length === 0">
                          <q-banner dense>No lights found.</q-banner>
                        </div>

                        <div class="col-12" v-for="lightName in lightNames" :key="lightName">
                          <q-card flat bordered>
                            <q-card-section>
                              <div class="row items-center justify-between no-wrap">
                                <div class="text-subtitle1">{{ lightName }}</div>
                                <div class="text-caption text-grey-7">
                                  <template v-if="lightStatuses[lightName] !== null && lightStatuses[lightName] !== undefined">
                                    Status: {{ formatLightStatus(lightStatuses[lightName]) }}
                                  </template>
                                  <template v-else>Status unavailable</template>
                                </div>
                              </div>
                            </q-card-section>
                            <q-card-section class="q-pt-none" v-if="lightForms[lightName]">
                              <div class="row q-col-gutter-sm">
                                <div class="col-12">
                                  <q-input
                                    v-model="lightForms[lightName].pins"
                                    label="Pins (comma-separated)"
                                    @update:model-value="() => markLightFormDirty(lightName)"
                                  />
                                </div>
                              </div>
                            </q-card-section>
                            <q-card-actions align="right">
                              <BaseButtonPrimary
                                icon="save"
                                label="Save"
                                :disable="scanLocked"
                                :loading="lightSaving[lightName] === true"
                                @click="saveLightSettings(lightName)"
                              >
                                <q-tooltip>
                                  {{ scanLocked ? scanLockedTooltip : 'Save light configuration.' }}
                                </q-tooltip>
                              </BaseButtonPrimary>
                            </q-card-actions>
                          </q-card>
                        </div>
                      </div>
                    </BaseSection>

                    <BaseSection title="Camera Settings">
                      <div class="row q-col-gutter-md">
                        <div class="col-12" v-if="isNextApiTarget">
                          <div class="row justify-end">
                            <BaseButtonSecondary icon="add_a_photo" label="Add camera" @click="addCameraDialog = true" />
                          </div>
                        </div>
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
                            <BaseButtonSecondary
                              icon="auto_awesome"
                              label="AWB Auto-Lock"
                              :disable="!selectedCamera || scanLocked"
                              :loading="cameraAwbCalibrating"
                              @click="calibrateCameraAwb"
                            >
                              <q-tooltip>
                                {{
                                  scanLocked
                                    ? scanLockedTooltip
                                    : 'Run automatic white balance calibration and lock the gains.'
                                }}
                              </q-tooltip>
                            </BaseButtonSecondary>
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
                            :disable="scanLocked || !selectedCamera"
                            :loading="cameraSaving"
                            @click="saveCameraSettings"
                          >
                            <q-tooltip>
                              {{ scanLocked ? scanLockedTooltip : 'Save camera configuration.' }}
                            </q-tooltip>
                          </BaseButtonPrimary>
                        </div>
                      </div>
                    </BaseSection>
                  </BaseSectionGroup>
                </div>

                <div v-if="deviceStore.hasConnectionIssue" class="non-frontend-settings__overlay">
                  <q-card flat bordered class="q-pa-md">
                    <div class="q-gutter-y-sm">
                      <q-skeleton type="text" width="45%" />
                      <q-skeleton type="rect" height="90px" />
                      <q-skeleton type="text" width="45%" />
                      <q-skeleton type="rect" height="150px" />
                    </div>
                  </q-card>
                </div>
              </BaseSectionGroup>
            </div>
          </div>
        </div>
      </div>
    </div>
  </BasePage>

  <q-dialog v-model="addMotorDialog" persistent>
    <q-card style="min-width: 520px">
      <q-card-section>
        <div class="text-h6">Add Motor</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <div class="row q-col-gutter-sm">
          <div class="col-12">
            <q-input v-model="addMotorForm.name" label="Name" autofocus />
          </div>
          <div class="col-6">
            <q-input v-model.number="addMotorForm.direction_pin" type="number" label="Direction Pin" />
          </div>
          <div class="col-6">
            <q-input v-model.number="addMotorForm.enable_pin" type="number" label="Enable Pin" />
          </div>
          <div class="col-6">
            <q-input v-model.number="addMotorForm.step_pin" type="number" label="Step Pin" />
          </div>
          <div class="col-6">
            <q-input
              v-model.number="addMotorForm.steps_per_rotation"
              type="number"
              label="Steps per Rotation"
            />
          </div>
          <div class="col-6">
            <q-input v-model.number="addMotorForm.acceleration" type="number" label="Acceleration" />
          </div>
          <div class="col-6">
            <q-input v-model.number="addMotorForm.max_speed" type="number" label="Max Speed" />
          </div>
          <div class="col-6">
            <q-select
              v-model="addMotorForm.direction"
              :options="directionOptions"
              label="Direction"
              emit-value
              map-options
            />
          </div>
          <div class="col-6">
            <q-input v-model.number="addMotorForm.min_angle" type="number" label="Min Angle" />
          </div>
          <div class="col-6">
            <q-input v-model.number="addMotorForm.max_angle" type="number" label="Max Angle" />
          </div>
          <div class="col-6">
            <q-input v-model.number="addMotorForm.home_angle" type="number" label="Home Angle" />
          </div>
        </div>
      </q-card-section>
      <q-card-actions align="right">
        <BaseButtonSecondary label="Cancel" @click="addMotorDialog = false" />
        <BaseButtonPrimary
          label="Add motor"
          icon="add"
          :disable="!isAddMotorFormValid"
          :loading="addMotorSaving"
          @click="handleAddMotor"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="addLightDialog" persistent>
    <q-card style="min-width: 420px">
      <q-card-section>
        <div class="text-h6">Add Light</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <div class="row q-col-gutter-sm">
          <div class="col-12">
            <q-input v-model="addLightForm.name" label="Name" autofocus />
          </div>
          <div class="col-12">
            <q-input v-model="addLightForm.pins" label="Pins (comma-separated)" />
          </div>
          <div class="col-12">
            <q-toggle v-model="addLightForm.pwm_support" label="PWM support" left-label />
          </div>
        </div>
      </q-card-section>
      <q-card-actions align="right">
        <BaseButtonSecondary label="Cancel" @click="addLightDialog = false" />
        <BaseButtonPrimary
          label="Add light"
          icon="add"
          :disable="!isAddLightFormValid"
          :loading="addLightSaving"
          @click="handleAddLight"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="addCameraDialog" persistent>
    <q-card style="min-width: 420px">
      <q-card-section>
        <div class="text-h6">Add Camera</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <div class="row q-col-gutter-sm">
          <div class="col-12">
            <q-input v-model="addCameraForm.name" label="Name" autofocus />
          </div>
          <div class="col-12">
            <q-input v-model="addCameraForm.type" label="Type (e.g. usb, rpi)" />
          </div>
          <div class="col-12">
            <q-input v-model="addCameraForm.path" label="Path / URL" />
          </div>
        </div>
      </q-card-section>
      <q-card-actions align="right">
        <BaseButtonSecondary label="Cancel" @click="addCameraDialog = false" />
        <BaseButtonPrimary
          label="Add camera"
          icon="add"
          :disable="!isAddCameraFormValid"
          :loading="addCameraSaving"
          @click="handleAddCamera"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="addEndstopDialog" persistent>
    <q-card style="min-width: 480px">
      <q-card-section>
        <div class="text-h6">Add Endstop</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <div class="row q-col-gutter-sm">
          <div class="col-12">
            <q-input v-model="addEndstopForm.name" label="Name" autofocus />
          </div>
          <div class="col-6">
            <q-input v-model.number="addEndstopForm.pin" type="number" label="Pin" />
          </div>
          <div class="col-6">
            <q-input
              v-model.number="addEndstopForm.angular_position"
              type="number"
              label="Angular Position"
            />
          </div>
          <div class="col-12">
            <q-input v-model="addEndstopForm.motor_name" label="Motor Name" />
          </div>
          <div class="col-6">
            <q-toggle v-model="addEndstopForm.pull_up" label="Pull-up" left-label />
          </div>
          <div class="col-6">
            <q-toggle v-model="addEndstopForm.active_high" label="Active high" left-label />
          </div>
          <div class="col-12">
            <q-input v-model.number="addEndstopForm.bounce_time" type="number" label="Bounce Time (s)" />
          </div>
        </div>
      </q-card-section>
      <q-card-actions align="right">
        <BaseButtonSecondary label="Cancel" @click="addEndstopDialog = false" />
        <BaseButtonPrimary
          label="Add endstop"
          icon="add"
          :disable="!isAddEndstopFormValid"
          :loading="addEndstopSaving"
          @click="handleAddEndstop"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { apiClient, getApiSdk, resolveApiTarget, updateApiClientConfig } from 'src/services/apiClient'
import { useApiConfigStore } from 'src/stores/apiConfig'
import { useDeviceStore } from 'src/stores/device'
import { useCameraStore } from 'src/stores/camera'
import { useTaskStore } from 'src/stores/tasks'
import { useFirmwareSettingsStore } from 'src/stores/firmwareSettings'
import { versionToApiTarget } from 'src/generated/api/versioned.gen'
import BaseSection from 'components/base/BaseSection.vue'
import BaseSectionGroup from 'components/base/BaseSectionGroup.vue'
import BaseVersionInfoCard from 'components/base/BaseVersionInfoCard.vue'
import BaseButtonPrimary from 'components/base/BaseButtonPrimary.vue'
import BaseButtonSecondary from 'components/base/BaseButtonSecondary.vue'
import BaseButtonIconSecondary from 'components/base/BaseButtonIconSecondary.vue'
import BaseMotorButtonBar from 'components/base/BaseMotorButtonBar.vue'
import BaseSelect from 'components/base/BaseSelect.vue'
import BasePage from 'components/base/BasePage.vue'
import BlurredSnapshotBackground from 'components/background/BlurredSnapshotBackground.vue'
import { fieldDescriptions, getFieldDescription } from 'src/generated/api/fieldDescriptions'
import { fieldDefaults } from 'src/generated/api/fieldDefaults'
import type {
  AutoCalibrateAwbResponse,
  CameraSettings,
  CloudSettings,
  CloudSettingsResponse,
  CloudStatusResponse,
  DeviceConfigResponse,
  FirmwareSettings,
  LightConfig,
  MotorConfig,
  PersistedCameraConfig,
  PersistedEndstopConfig,
  ScannerDeviceConfigInput
} from 'src/generated/api'

const apiConfigStore = useApiConfigStore()
const cameraStore = useCameraStore()
const taskStore = useTaskStore()
const firmwareSettingsStore = useFirmwareSettingsStore()
const apiSdk = () => getApiSdk()
void taskStore.ensureConnected()
const { activeScanTaskId } = storeToRefs(taskStore)
const scanLocked = computed(() => Boolean(activeScanTaskId.value))
const scanLockedTooltip = 'Unavailable while a scan is running.'

const isNextApiTarget = computed(() => resolveApiTarget(apiConfigStore.version) === 'next')

const scannerAddress = computed(() => apiConfigStore.baseURL.replace(/\/$/, ''))

const apiConfigForm = reactive({
  schema: apiConfigStore.schema,
  host: apiConfigStore.host,
  port: apiConfigStore.port,
  version: apiConfigStore.version,
  developerMode: apiConfigStore.developerMode
})

const versionOptions = ref<string[]>([])
const versionOptionsLoading = ref(false)
const apiVersionSelectOptions = computed(() =>
  versionOptions.value.map((version) => ({ label: version, value: version }))
)

const CLOUD_DEFAULTS = {
  host: 'http://openscanfeedback.dnsuser.de:1334/',
  user: 'openscan',
  password: 'free',
  splitSize: 200_000_000
} as const

const defaultSplitSize = CLOUD_DEFAULTS.splitSize
const BYTES_PER_GIGABYTE = 1024 ** 3
const CLOUD_TOKEN_PATTERN = /^[a-zA-Z0-9]{32}$/

const cloudToggle = ref(apiConfigStore.cloudEnabled ?? false)
const cloudSettingsLoading = ref(false)
const cloudSettingsSaving = ref(false)
const cloudSettingsLoaded = ref(false)
const cloudStatusLoading = ref(false)
const cloudStatus = ref<CloudStatusResponse | null>(null)

type FirmwareForm = {
  enable_cloud: boolean
  qr_wifi_scan_enabled: boolean
}

const firmwareForm = reactive<FirmwareForm>({
  enable_cloud: cloudToggle.value,
  qr_wifi_scan_enabled: false
})

const firmwareSettingsLoading = computed(() => firmwareSettingsStore.loading)
const firmwareSettingsSaving = computed(() => firmwareSettingsStore.saving)
const firmwareSettingsError = computed(() => firmwareSettingsStore.error)
const firmwareSettingsInitialized = ref(false)

type CloudForm = {
  host: string
  user: string
  password: string
  token: string
  split_size: number | null
}

const cloudForm = reactive<CloudForm>({
  host: CLOUD_DEFAULTS.host,
  user: CLOUD_DEFAULTS.user,
  password: CLOUD_DEFAULTS.password,
  token: '',
  split_size: defaultSplitSize
})

function applyFirmwareSettingsToForm(settings: Partial<FirmwareSettings> | null | undefined) {
  const enableCloud = Boolean(settings?.enable_cloud ?? false)
  const qrEnabled = Boolean(settings?.qr_wifi_scan_enabled ?? false)

  firmwareForm.enable_cloud = enableCloud
  firmwareForm.qr_wifi_scan_enabled = qrEnabled
  cloudToggle.value = enableCloud
}

async function loadFirmwareSettings(force = false) {
  if (!isNextApiTarget.value) {
    firmwareSettingsStore.resetState()
    firmwareSettingsInitialized.value = false
    return
  }

  const settings = await firmwareSettingsStore.fetch(force)
  applyFirmwareSettingsToForm(settings ?? null)
  firmwareSettingsInitialized.value = true
}

async function saveFirmwareSettings() {
  if (!isNextApiTarget.value) {
    return
  }

  const payload: FirmwareSettings = {
    enable_cloud: firmwareForm.enable_cloud,
    qr_wifi_scan_enabled: firmwareForm.qr_wifi_scan_enabled
  }

  await firmwareSettingsStore.replace(payload)
}

async function handleFirmwareSettingChange<K extends keyof FirmwareForm>(key: K, value: FirmwareForm[K]) {
  if (!isNextApiTarget.value || !firmwareSettingsInitialized.value) {
    firmwareForm[key] = value
    return
  }

  firmwareForm[key] = value
  await firmwareSettingsStore.updateSetting(
    key as keyof FirmwareSettings,
    value as FirmwareSettings[keyof FirmwareSettings]
  )
}

const hasPersistedCloudToken = () => cloudForm.token.trim().length > 0

function syncCloudEnabledFlag() {
  const shouldEnable = cloudToggle.value && hasPersistedCloudToken()
  if (apiConfigStore.cloudEnabled !== shouldEnable) {
    apiConfigStore.setConfig({ cloudEnabled: shouldEnable })
  }
}

async function calibrateCameraAwb() {
  if (!selectedCamera.value || scanLocked.value || cameraAwbCalibrating.value) {
    return
  }

  cameraAwbCalibrating.value = true
  try {
    const response = await apiSdk().autoCalibrateAwb({
      client: apiClient,
      path: { camera_name: selectedCamera.value },
      body: awbCalibrationDefaults ? { ...awbCalibrationDefaults } : undefined
    })

    const result = ((response?.data ?? response) as AutoCalibrateAwbResponse | undefined) ?? null
    if (result) {
      cameraForm.awbg_red = result.red_gain
      cameraForm.awbg_blue = result.blue_gain
    }
    await saveCurrentConfig()
  } catch (error) {
    console.error('Camera AWB calibration failed.', error)
  } finally {
    cameraAwbCalibrating.value = false
  }
}

const isCloudTokenValid = computed(() => CLOUD_TOKEN_PATTERN.test(cloudForm.token.trim()))

const isCloudFormValid = computed(() => {
  if (!cloudToggle.value) {
    return false
  }

  const splitSizeValid =
    cloudForm.split_size === null ||
    (Number.isFinite(cloudForm.split_size) && (cloudForm.split_size ?? 0) > 0)

  return isCloudTokenValid.value && splitSizeValid
})

type TokenStatusView = {
  summary: string
  details: string[]
  expandable: boolean
  isError: boolean
}

const tokenStatusExpanded = ref(false)

function normalizeApiVersion(version: string | null | undefined) {
  const raw = (version ?? '').trim()
  if (!raw) return ''
  if (/^v(latest|next)$/i.test(raw)) {
    return raw.toLowerCase().replace(/^v/, '')
  }
  const prefixed = raw.startsWith('v') ? raw : `v${raw}`
  return prefixed.replace(/_/g, '.')
}

function collectSupportedVersions() {
  return Object.keys(versionToApiTarget)
}

function sortVersions(values: string[]) {
  const special = ['latest', 'next']
  const specials = values
    .map((v) => v.toLowerCase())
    .filter((v) => special.includes(v))
  const numeric = values
    .map((v) => (v.toLowerCase().startsWith('v') ? v.slice(1) : v))
    .filter((v) => !special.includes(v.toLowerCase()))
    .sort((a, b) => {
      const aNum = Number(a.replace(/^v/i, ''))
      const bNum = Number(b.replace(/^v/i, ''))
      return bNum - aNum
    })
  return [...new Set([...specials, ...numeric])]
}

async function loadVersionOptions() {
  versionOptionsLoading.value = true
  const supported = new Set<string>(collectSupportedVersions())

  try {
    const baseHost = `${apiConfigForm.schema}://${apiConfigForm.host}${
      apiConfigForm.developerMode && apiConfigForm.port ? `:${apiConfigForm.port}` : ''
    }`
    const response = await fetch(`${baseHost}/api/versions`)
    if (response.ok) {
      const payload = (await response.json()) as { versions?: string[]; latest?: string }
      payload.versions?.forEach((v) => {
        const normalized = normalizeApiVersion(v)
        if (normalized && collectSupportedVersions().includes(normalized)) {
          supported.add(normalized)
        }
      })
      const normalizedLatest = normalizeApiVersion(payload.latest)
      if (normalizedLatest && collectSupportedVersions().includes(normalizedLatest)) {
        supported.add(normalizedLatest)
      }
    }
  } catch (error) {
    console.warn('Could not load versions from backend.', error)
  } finally {
    const current = normalizeApiVersion(apiConfigForm.version)
    if (current) {
      supported.add(current)
    }
    versionOptions.value = sortVersions(Array.from(supported))
    versionOptionsLoading.value = false
  }
}

const tokenStatusView = computed<TokenStatusView>(() => {
  if (!cloudToggle.value) {
    return {
      summary: 'Enable cloud to view token status.',
      details: [],
      expandable: false,
      isError: false
    }
  }

  if (cloudStatusLoading.value) {
    return {
      summary: 'Refreshing token status…',
      details: [],
      expandable: false,
      isError: false
    }
  }

  const info = cloudStatus.value?.token_info as Record<string, unknown> | null | undefined
  if (!info) {
    const fallback = cloudStatus.value?.message ?? 'Token status unavailable. Refresh to try again.'
    const details = createCloudStatusDetailsFromMessage(fallback)
    return {
      summary: 'ERROR',
      details,
      expandable: details.length > 0,
      isError: true
    }
  }

  const infoStatus = getTokenInfoStringField(info, 'status')
  const normalizedStatus = infoStatus?.toLowerCase() ?? ''
  const credits =
    getTokenInfoNumberField(info, 'credits') ?? getTokenInfoNumberField(info, 'credit')
  const overallStatus = getCloudStatusString(cloudStatus.value?.status)
  const isOk =
    normalizedStatus === 'ok' ||
    normalizedStatus === 'ready' ||
    normalizedStatus === 'active' ||
    normalizedStatus === 'valid' ||
    overallStatus === 'online' ||
    (!infoStatus && credits !== null)

  const details: string[] = []
  const message = getTokenInfoStringField(info, 'message')
  if (message) {
    details.push(message)
  }

  const assignedTo = getTokenInfoStringField(info, 'assigned_to')
  if (assignedTo) {
    details.push(`Assigned to ${assignedTo}`)
  }

  const expiresAt = getTokenInfoStringField(info, 'expires_at')
  if (expiresAt) {
    const expiresDate = new Date(expiresAt)
    const label =
      !Number.isNaN(expiresDate.valueOf()) && expiresDate.getFullYear() > 1970
        ? expiresDate.toLocaleString()
        : expiresAt
    details.push(`Expires: ${label}`)
  }

  const queueEstimate = formatQueueEstimate(cloudStatus.value?.queue_estimate)
  if (queueEstimate) {
    details.push(queueEstimate)
  }

  const formattedCredits =
    typeof credits === 'number' ? formatCreditsAsGigabytes(credits) : null

  if (isOk) {
    const creditsLabel = formattedCredits ? `${formattedCredits}` : null
    return {
      summary: ['OK', creditsLabel].filter(Boolean).join(', '),
      details,
      expandable: false,
      isError: false
    }
  }

  if (formattedCredits) {
    details.push(`Credits: ${formattedCredits}`)
  }

  if (details.length === 0) {
    details.push(cloudStatus.value?.message ?? 'No additional information provided.')
  }

  return {
    summary: 'ERROR',
    details,
    expandable: true,
    isError: true
  }
})

function getTokenInfoStringField(
  info: Record<string, unknown> | null | undefined,
  field: string
): string | null {
  if (!info || typeof info !== 'object') {
    return null
  }

  const raw = info[field]
  if (typeof raw !== 'string') {
    return null
  }

  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

function getTokenInfoNumberField(
  info: Record<string, unknown> | null | undefined,
  field: string
): number | null {
  if (!info || typeof info !== 'object') {
    return null
  }

  const raw = info[field]
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw
  }

  if (typeof raw === 'string') {
    const parsed = Number(raw)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

function createCloudStatusDetailsFromMessage(message: string): string[] {
  const parts = message
    .split(' | ')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)

  const extracted = parts.map((part) => {
    const idx = part.indexOf(': ')
    return idx >= 0 ? part.slice(idx + 2).trim() : part
  })

  return Array.from(new Set(extracted))
}

function formatQueueEstimate(queueEstimate: Record<string, unknown> | null | undefined): string | null {
  if (!queueEstimate) {
    return null
  }

  const seconds = getTokenInfoNumberField(queueEstimate, 'estimated_time_seconds')
  if (typeof seconds === 'number') {
    if (seconds <= 0) {
      return 'Queue: ready'
    }

    const minutes = Math.ceil(seconds / 60)
    if (minutes < 1) {
      return `Queue: ${seconds}s`
    }
    return `Queue: ~${minutes} min`
  }

  const message = getTokenInfoStringField(queueEstimate, 'message')
  return message ? `Queue: ${message}` : null
}

function formatCreditsAsGigabytes(credits: number): string {
  const gigabytes = credits / BYTES_PER_GIGABYTE
  return `${new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(gigabytes)} GB`
}

function getCloudStatusString(status: Record<string, unknown> | null | undefined): string | null {
  if (!status || typeof status !== 'object') {
    return null
  }

  const value = status['status']
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed.toLowerCase() : null
}

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

const reinitializeHardwareLoading = ref(false)

type CameraOption = { label: string; value: string }

const deviceStore = useDeviceStore()
const { cameras, motors, lights, status: deviceStatus } = storeToRefs(deviceStore)

const ROTOR_MOTOR = 'rotor'
const TURNTABLE_MOTOR = 'turntable'

const selectedCamera = ref<string | null>(null)
const cameraAwbCalibrating = ref(false)
const homeBusy = ref(false)

const selectedSettingsCamera = computed(() => selectedCamera.value ?? cameraStore.selectedCamera)

const backgroundPreviewUrl = computed(() => {
  const cameraName = selectedSettingsCamera.value
  return cameraName ? cameraStore.getPreviewUrl(cameraName, 10) : null
})

const selectedCameraOrientationFlag = computed(() => {
  const cameraName = selectedSettingsCamera.value
  if (!cameraName) {
    return null
  }
  return deviceStore.getCamera(cameraName)?.settings?.orientation_flag ?? null
})

const cameraOptions = computed<CameraOption[]>(() =>
  Object.keys(cameras.value ?? {}).map((name) => ({ label: name, value: name }))
)
const cameraOptionsLoading = computed(() => deviceStatus.value !== 'open')
const cameraLoading = ref(false)
const cameraSaving = ref(false)
const cameraForm = reactive<{ [K in keyof CameraSettings]?: CameraSettings[K] | null }>({})

type CameraSettingsField = keyof (typeof fieldDescriptions)['CameraSettings']

const cameraSettingDescription = (field: CameraSettingsField) => getFieldDescription('CameraSettings', field)

const motorNames = computed(() => Object.keys(motors.value ?? {}))
const motorAngles = computed<Record<string, number | null>>(() => {
  const current = motors.value ?? {}
  return Object.fromEntries(
    Object.entries(current).map(([name, status]) => [name, typeof status?.angle === 'number' ? status.angle : null])
  )
})
const motorForms = reactive<Record<string, MotorForm>>({})
const motorSaving = reactive<Record<string, boolean>>({})
const motorFormDirty = reactive<Record<string, boolean>>({})
const motorControlBusy = reactive<Record<string, boolean>>({})
const anyMotorBusy = computed(() => Object.values(motorControlBusy).some((busy) => busy))

type MotorConfigField = keyof (typeof fieldDescriptions)['MotorConfig']

const motorConfigDescription = (field: MotorConfigField) => getFieldDescription('MotorConfig', field)

const lightNames = computed(() => Object.keys(lights.value ?? {}))
const lightStatuses = computed<Record<string, boolean | null>>(() => {
  const current = lights.value ?? {}
  return Object.fromEntries(
    Object.entries(current).map(([name, status]) => [name, typeof status?.is_on === 'boolean' ? status.is_on : null])
  )
})
const lightForms = reactive<Record<string, LightForm>>({})
const lightSaving = reactive<Record<string, boolean>>({})
const lightFormDirty = reactive<Record<string, boolean>>({})

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

type AddMotorForm = {
  name: string
  direction_pin: number | null
  enable_pin: number | null
  step_pin: number | null
  steps_per_rotation: number | null
  acceleration: number | null
  max_speed: number | null
  direction: 1 | -1
  min_angle: number | null
  max_angle: number | null
  home_angle: number | null
}

type AddLightForm = {
  name: string
  pins: string
  pwm_support: boolean
}

type AddCameraForm = {
  name: string
  type: string
  path: string
}

type AddEndstopForm = {
  name: string
  pin: number | null
  angular_position: number | null
  motor_name: string
  pull_up: boolean | null
  bounce_time: number | null
  active_high: boolean | null
}

const directionOptions = [
  { label: 'Forward (1)', value: 1 },
  { label: 'Reverse (-1)', value: -1 }
]

const addMotorDialog = ref(false)
const addLightDialog = ref(false)
const addCameraDialog = ref(false)
const addEndstopDialog = ref(false)

const addMotorForm = reactive<AddMotorForm>({
  name: '',
  direction_pin: null,
  enable_pin: null,
  step_pin: null,
  steps_per_rotation: null,
  acceleration: fieldDefaults.MotorConfig?.acceleration ?? null,
  max_speed: fieldDefaults.MotorConfig?.max_speed ?? null,
  direction: (fieldDefaults.MotorConfig?.direction ?? 1) as 1 | -1,
  min_angle: fieldDefaults.MotorConfig?.min_angle ?? null,
  max_angle: fieldDefaults.MotorConfig?.max_angle ?? null,
  home_angle: fieldDefaults.MotorConfig?.home_angle ?? null
})

const addLightForm = reactive<AddLightForm>({
  name: '',
  pins: '',
  pwm_support: fieldDefaults.LightConfig?.pwm_support ?? false
})

const addCameraForm = reactive<AddCameraForm>({
  name: '',
  type: '',
  path: ''
})

const addEndstopForm = reactive<AddEndstopForm>({
  name: '',
  pin: null,
  angular_position: null,
  motor_name: '',
  pull_up: fieldDefaults.EndstopConfig?.pull_up ?? true,
  bounce_time: fieldDefaults.EndstopConfig?.bounce_time ?? null,
  active_high: fieldDefaults.EndstopConfig?.active_high ?? false
})

const addMotorSaving = ref(false)
const addLightSaving = ref(false)
const addCameraSaving = ref(false)
const addEndstopSaving = ref(false)

const isAddMotorFormValid = computed(() => {
  return (
    addMotorForm.name.trim().length > 0 &&
    addMotorForm.direction_pin !== null &&
    addMotorForm.enable_pin !== null &&
    addMotorForm.step_pin !== null &&
    addMotorForm.steps_per_rotation !== null
  )
})

const isAddLightFormValid = computed(() => {
  return addLightForm.name.trim().length > 0 && addLightForm.pins.trim().length > 0
})

const isAddCameraFormValid = computed(() => {
  return (
    addCameraForm.name.trim().length > 0 &&
    addCameraForm.type.trim().length > 0 &&
    addCameraForm.path.trim().length > 0
  )
})

const isAddEndstopFormValid = computed(() => {
  return (
    addEndstopForm.name.trim().length > 0 &&
    addEndstopForm.motor_name.trim().length > 0 &&
    addEndstopForm.pin !== null &&
    addEndstopForm.angular_position !== null
  )
})

function formatMotorAngle(angle: number) {
  return `${angle.toFixed(1)}°`
}

function motorHasHome(name: string) {
  return name === ROTOR_MOTOR || name === TURNTABLE_MOTOR
}

function motorStepDegrees(name: string) {
  if (name === TURNTABLE_MOTOR) {
    return 20
  }
  if (name === ROTOR_MOTOR) {
    return 10
  }
  return 10
}

function motorNegativeIcon(name: string) {
  if (name === ROTOR_MOTOR) {
    return 'keyboard_arrow_up'
  }
  return 'keyboard_arrow_left'
}

function motorPositiveIcon(name: string) {
  if (name === ROTOR_MOTOR) {
    return 'keyboard_arrow_down'
  }
  return 'keyboard_arrow_right'
}

function motorNegativeTooltip(name: string) {
  if (name === ROTOR_MOTOR) {
    return 'Move rotor up'
  }
  if (name === TURNTABLE_MOTOR) {
    return 'Rotate turntable left'
  }
  return `Move ${name} negatively`
}

function motorPositiveTooltip(name: string) {
  if (name === ROTOR_MOTOR) {
    return 'Move rotor down'
  }
  if (name === TURNTABLE_MOTOR) {
    return 'Rotate turntable right'
  }
  return `Move ${name} positively`
}

function motorShowCalibrate(name: string) {
  return name === ROTOR_MOTOR
}

function motorCalibrateTooltip(name: string) {
  if (name !== ROTOR_MOTOR) {
    return undefined
  }
  return 'Calibrate rotor via endstop to re-establish the home position.'
}

async function handleMotorCalibrated(name: string) {
  try {
    await deviceStore.refreshFromRest()
  } catch (error) {
    console.error(`Motor "${name}" calibration refresh failed.`, error)
  }
}

async function handleMoveHome(motorName: string) {
  if (homeBusy.value) {
    return
  }

  homeBusy.value = true
  try {
    await deviceStore.ensureConnected()
    await apiSdk().motorMoveHome({
      client: apiClient,
      path: { motor_name: motorName }
    })
    await deviceStore.refreshFromRest()
  } catch (error) {
    console.error(`Failed to move ${motorName} to home position.`, error)
  } finally {
    homeBusy.value = false
  }
}

function formatLightStatus(isOn: boolean) {
  return isOn ? 'On' : 'Off'
}

const awbCalibrationDefaults = fieldDefaults.AutoCalibrateAwbRequest ?? null

function createEmptyCloudForm(): CloudForm {
  return {
    host: CLOUD_DEFAULTS.host,
    user: CLOUD_DEFAULTS.user,
    password: CLOUD_DEFAULTS.password,
    token: '',
    split_size: defaultSplitSize
  }
}

function applyCloudSettingsToForm(settings: Partial<CloudSettings> | null | undefined) {
  const next = createEmptyCloudForm()
  if (settings) {
    next.host = typeof settings.host === 'string' && settings.host.length > 0 ? settings.host : next.host
    next.token = typeof settings.token === 'string' ? settings.token : ''
    next.split_size =
      typeof settings.split_size === 'number' && Number.isFinite(settings.split_size)
        ? settings.split_size
        : null
  }

  Object.assign(cloudForm, next)
  cloudForm.user = CLOUD_DEFAULTS.user
  cloudForm.password = CLOUD_DEFAULTS.password
  syncCloudEnabledFlag()
}

async function loadCloudSettings() {
  if (cloudSettingsLoading.value) {
    return
  }

  cloudSettingsLoading.value = true
  try {
    const response = await apiSdk().getCloudSettings({ client: apiClient })
    const settings = ((response?.data ?? response) as CloudSettingsResponse | undefined)?.settings as
      | Partial<CloudSettings>
      | null
    applyCloudSettingsToForm(settings)
  } catch (error) {
    console.error('Cloud settings could not be loaded.', error)
    applyCloudSettingsToForm(null)
  } finally {
    cloudSettingsLoading.value = false
    cloudSettingsLoaded.value = true
  }
}

async function loadCloudStatus() {
  if (!cloudToggle.value || cloudStatusLoading.value) {
    return
  }

  cloudStatusLoading.value = true
  try {
    const response = await apiSdk().getCloudStatus({ client: apiClient })
    const status = ((response?.data ?? response) as CloudStatusResponse | undefined) ?? null
    cloudStatus.value = status
  } catch (error) {
    console.error('Cloud status could not be loaded.', error)
    cloudStatus.value = null
  } finally {
    cloudStatusLoading.value = false
  }
}

async function saveCloudSettings() {
  if (!isCloudFormValid.value) {
    return
  }

  cloudSettingsSaving.value = true
  try {
    const payload: CloudSettings = {
      host: cloudForm.host.trim(),
      user: cloudForm.user.trim(),
      password: cloudForm.password,
      token: cloudForm.token.trim()
    }

    if (cloudForm.split_size !== null) {
      payload.split_size = cloudForm.split_size
    }

    await apiSdk().updateCloudSettings({
      client: apiClient,
      body: payload
    })
    cloudForm.host = payload.host
    cloudForm.user = payload.user
    cloudForm.password = payload.password
    cloudForm.token = payload.token
    if (payload.split_size !== undefined) {
      cloudForm.split_size = payload.split_size
    }
    syncCloudEnabledFlag()
    await saveCurrentConfig()
  } catch (error) {
    console.error('Cloud settings could not be saved.', error)
  } finally {
    cloudSettingsSaving.value = false
  }
}

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

function resetAddMotorForm() {
  Object.assign(addMotorForm, {
    name: '',
    direction_pin: null,
    enable_pin: null,
    step_pin: null,
    steps_per_rotation: null,
    acceleration: fieldDefaults.MotorConfig?.acceleration ?? null,
    max_speed: fieldDefaults.MotorConfig?.max_speed ?? null,
    direction: (fieldDefaults.MotorConfig?.direction ?? 1) as 1 | -1,
    min_angle: fieldDefaults.MotorConfig?.min_angle ?? null,
    max_angle: fieldDefaults.MotorConfig?.max_angle ?? null,
    home_angle: fieldDefaults.MotorConfig?.home_angle ?? null
  })
}

function resetAddLightForm() {
  Object.assign(addLightForm, {
    name: '',
    pins: '',
    pwm_support: fieldDefaults.LightConfig?.pwm_support ?? false
  })
}

function resetAddCameraForm() {
  Object.assign(addCameraForm, {
    name: '',
    type: '',
    path: ''
  })
}

function resetAddEndstopForm() {
  Object.assign(addEndstopForm, {
    name: '',
    pin: null,
    angular_position: null,
    motor_name: '',
    pull_up: fieldDefaults.EndstopConfig?.pull_up ?? true,
    bounce_time: fieldDefaults.EndstopConfig?.bounce_time ?? null,
    active_high: fieldDefaults.EndstopConfig?.active_high ?? false
  })
}

async function fetchCurrentConfig(): Promise<ScannerDeviceConfigInput | null> {
  if (!isNextApiTarget.value) {
    return null
  }

  try {
    const response = await getApiSdk('next').getCurrentConfig({ client: apiClient })
    const payload = (response?.data ?? response) as DeviceConfigResponse | null
    const baseConfig = (payload?.config ?? null) as ScannerDeviceConfigInput | null

    if (!baseConfig) {
      return null
    }

    return {
      ...baseConfig,
      motors: { ...(baseConfig.motors ?? {}) },
      lights: { ...(baseConfig.lights ?? {}) },
      cameras: { ...(baseConfig.cameras ?? {}) },
      endstops: baseConfig.endstops ? { ...baseConfig.endstops } : {}
    }
  } catch (error) {
    console.error('Current device config could not be loaded.', error)
    return null
  }
}

async function persistConfig(config: ScannerDeviceConfigInput) {
  return getApiSdk('next').addConfigJson({
    client: apiClient,
    body: {
      config_data: config,
      filename: { config_file: DEFAULT_CONFIG_FILENAME }
    }
  })
}

async function updateConfigWithMutation(mutator: (config: ScannerDeviceConfigInput) => void) {
  const current = await fetchCurrentConfig()
  if (!current) {
    return false
  }

  const nextConfig: ScannerDeviceConfigInput = {
    ...current,
    motors: { ...(current.motors ?? {}) },
    lights: { ...(current.lights ?? {}) },
    cameras: { ...(current.cameras ?? {}) },
    endstops: current.endstops ? { ...(current.endstops ?? {}) } : {}
  }

  mutator(nextConfig)
  await persistConfig(nextConfig)
  await deviceStore.refreshFromRest()
  await loadDeviceConfigs()
  return true
}

async function handleAddMotor() {
  if (!isAddMotorFormValid.value || addMotorSaving.value || !isNextApiTarget.value) {
    return
  }

  addMotorSaving.value = true
  try {
    await updateConfigWithMutation((config) => {
      const motors = config.motors ?? {}
      config.motors = motors
      motors[addMotorForm.name.trim()] = {
        direction_pin: addMotorForm.direction_pin ?? 0,
        enable_pin: addMotorForm.enable_pin ?? 0,
        step_pin: addMotorForm.step_pin ?? 0,
        steps_per_rotation: addMotorForm.steps_per_rotation ?? 0,
        acceleration: addMotorForm.acceleration ?? undefined,
        max_speed: addMotorForm.max_speed ?? undefined,
        direction: addMotorForm.direction,
        min_angle: addMotorForm.min_angle ?? undefined,
        max_angle: addMotorForm.max_angle ?? undefined,
        home_angle: addMotorForm.home_angle ?? undefined
      }
    })

    addMotorDialog.value = false
    resetAddMotorForm()
  } catch (error) {
    console.error('Motor could not be added.', error)
  } finally {
    addMotorSaving.value = false
  }
}

async function handleAddLight() {
  if (!isAddLightFormValid.value || addLightSaving.value || !isNextApiTarget.value) {
    return
  }

  addLightSaving.value = true
  try {
    const pins = addLightForm.pins
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value))

    await updateConfigWithMutation((config) => {
      const lights = config.lights ?? {}
      config.lights = lights
      lights[addLightForm.name.trim()] = {
        pins,
        pwm_support: addLightForm.pwm_support
      }
    })

    addLightDialog.value = false
    resetAddLightForm()
  } catch (error) {
    console.error('Light could not be added.', error)
  } finally {
    addLightSaving.value = false
  }
}

async function handleAddCamera() {
  if (!isAddCameraFormValid.value || addCameraSaving.value || !isNextApiTarget.value) {
    return
  }

  addCameraSaving.value = true
  try {
    await updateConfigWithMutation((config) => {
      const cameras = config.cameras ?? {}
      config.cameras = cameras
      cameras[addCameraForm.name.trim()] = {
        type: addCameraForm.type.trim(),
        path: addCameraForm.path.trim(),
        settings: {}
      } as PersistedCameraConfig
    })

    addCameraDialog.value = false
    resetAddCameraForm()
  } catch (error) {
    console.error('Camera could not be added.', error)
  } finally {
    addCameraSaving.value = false
  }
}

async function handleAddEndstop() {
  if (!isAddEndstopFormValid.value || addEndstopSaving.value || !isNextApiTarget.value) {
    return
  }

  addEndstopSaving.value = true
  try {
    await updateConfigWithMutation((config) => {
      const endstops = (config.endstops ?? {}) as Record<string, PersistedEndstopConfig>
      config.endstops = endstops
      endstops[addEndstopForm.name.trim()] = {
        settings: {
          pin: addEndstopForm.pin ?? 0,
          angular_position: addEndstopForm.angular_position ?? 0,
          motor_name: addEndstopForm.motor_name.trim(),
          pull_up: addEndstopForm.pull_up ?? undefined,
          bounce_time: addEndstopForm.bounce_time ?? undefined,
          active_high: addEndstopForm.active_high ?? undefined
        }
      }
    })

    addEndstopDialog.value = false
    resetAddEndstopForm()
  } catch (error) {
    console.error('Endstop could not be added.', error)
  } finally {
    addEndstopSaving.value = false
  }
}

async function loadDeviceConfigs() {
  configOptionsLoading.value = true
  try {
    const response = await apiSdk().listConfigFiles({ client: apiClient })
    const payload = (response?.data ?? response) as { status?: string; configs?: DeviceConfigListItem[] }

    const isDefaultConfig = (item: DeviceConfigListItem) => {
      const filenameMatches = item.filename === DEFAULT_CONFIG_FILENAME
      const pathMatches = item.path?.includes(`/${DEFAULT_CONFIG_FILENAME}`) ?? false
      return filenameMatches || pathMatches
    }

    const options = (payload?.configs ?? []).map((item) => {
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
    await apiSdk().setConfigFile({
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
    const response = await apiSdk().getCameraNameSettings({
      client: apiClient,
      path: { name }
    })
    const settings = ((response?.data ?? response) as CameraSettings | undefined) ?? null

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

    await apiSdk().updateCameraNameSettings({
      client: apiClient,
      path: { name: selectedCamera.value },
      body: payload
    })
    await saveCurrentConfig()
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

    const updated = await apiSdk().updateMotorNameSettings({
      client: apiClient,
      path: { name },
      body: payload
    })

    motorForms[name] = mapMotorConfig(updated.data)
    motorFormDirty[name] = false
    await saveCurrentConfig()
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

    const updated = await apiSdk().updateLightNameSettings({
      client: apiClient,
      path: { name },
      body: payload
    })

    lightForms[name] = mapLightConfig(updated.data)
    lightFormDirty[name] = false
    await saveCurrentConfig()
  } catch (error) {
    console.error(`Light "${name}" could not be saved.`, error)
  } finally {
    lightSaving[name] = false
  }
}

function markMotorFormDirty(name: string) {
  motorFormDirty[name] = true
}

function markLightFormDirty(name: string) {
  lightFormDirty[name] = true
}

watch(selectedCamera, (name) => {
  if (name) {
    loadCameraSettings(name)
  } else {
    resetCameraForm()
  }
})

watch(addMotorDialog, (open) => {
  if (!open) {
    resetAddMotorForm()
  }
})

watch(addLightDialog, (open) => {
  if (!open) {
    resetAddLightForm()
  }
})

watch(addCameraDialog, (open) => {
  if (!open) {
    resetAddCameraForm()
  }
})

watch(addEndstopDialog, (open) => {
  if (!open) {
    resetAddEndstopForm()
  }
})

watch(
  () => firmwareSettingsStore.settings,
  (settings) => {
    if (!isNextApiTarget.value) {
      return
    }
    applyFirmwareSettingsToForm(settings ?? null)
    firmwareSettingsInitialized.value = true
  },
  { deep: true }
)

watch(isNextApiTarget, (isNext) => {
  if (isNext) {
    void loadFirmwareSettings(true)
  } else {
    firmwareSettingsStore.resetState()
    firmwareSettingsInitialized.value = false
    firmwareForm.qr_wifi_scan_enabled = false
    firmwareForm.enable_cloud = cloudToggle.value = apiConfigStore.cloudEnabled ?? false
  }
})

watch(
  cloudToggle,
  (enabled) => {
    if (isNextApiTarget.value) {
      firmwareForm.enable_cloud = enabled
      if (firmwareSettingsInitialized.value) {
        void firmwareSettingsStore.updateSetting('enable_cloud', enabled)
      }
    }

    if (!enabled) {
      if (apiConfigStore.cloudEnabled) {
        apiConfigStore.setConfig({ cloudEnabled: false })
      }
      cloudStatus.value = null
      return
    }

    if (!cloudSettingsLoaded.value) {
      void loadCloudSettings()
    }

    void loadCloudStatus()
  },
  { immediate: true }
)

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
        delete motorFormDirty[name]
      }
    })

    Object.entries(current).forEach(([name, status]) => {
      const mapped = mapMotorConfig(status?.settings)
      if (!(name in motorForms) || motorFormDirty[name] !== true) {
        motorForms[name] = mapped
      }
      if (!(name in motorSaving)) {
        motorSaving[name] = false
      }
      if (!(name in motorFormDirty)) {
        motorFormDirty[name] = false
      }
      if (!(name in motorControlBusy)) {
        motorControlBusy[name] = false
      }
    })
  },
  { immediate: true, deep: true }
)

function handleMotorBusyChange(name: string, busy: boolean) {
  motorControlBusy[name] = busy
}

watch(
  lights,
  (current = {}) => {
    const names = new Set(Object.keys(current))

    Object.keys(lightForms).forEach((name) => {
      if (!names.has(name)) {
        delete lightForms[name]
        delete lightSaving[name]
        delete lightFormDirty[name]
      }
    })

    Object.entries(current).forEach(([name, status]) => {
      const mapped = mapLightConfig(status?.settings)
      if (!(name in lightForms) || lightFormDirty[name] !== true) {
        lightForms[name] = mapped
      }
      if (!(name in lightSaving)) {
        lightSaving[name] = false
      }
      if (!(name in lightFormDirty)) {
        lightFormDirty[name] = false
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
  try {
    await apiSdk().saveDeviceConfig({ client: apiClient })
  } catch (error) {
    console.error('Configuration could not be saved.', error)
  }
}

async function handleReinitializeHardware() {
  if (reinitializeHardwareLoading.value) {
    return
  }

  reinitializeHardwareLoading.value = true
  try {
    await apiSdk().reinitializeHardware({
      client: apiClient,
      query: { detect_cameras: true }
    })
  } catch (error) {
    console.error('Hardware could not be reinitialized.', error)
  } finally {
    reinitializeHardwareLoading.value = false
  }
}

onMounted(async () => {
  await loadVersionOptions()
  await loadDeviceConfigs()
  if (isNextApiTarget.value) {
    await loadFirmwareSettings()
  }
})

watch(
  () => [apiConfigForm.schema, apiConfigForm.host, apiConfigForm.port, apiConfigForm.developerMode],
  () => {
    void loadVersionOptions()
  }
)
</script>

<style scoped>
.settings-page {
  position: relative;
  overflow: hidden;
}

.settings-background {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
}

.settings-background__image {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 120vmax;
  height: 120vmax;
  object-fit: cover;
  filter: blur(10px);
  opacity: 0;
  transform: translate(-50%, -50%);
  transition: opacity 600ms ease;
}

.settings-background__image--visible {
  opacity: 0.3;
}

.settings-card + .settings-card {
  margin-top: 16px;
}

.non-frontend-settings {
  position: relative;
}

.non-frontend-settings__content--blurred {
  filter: blur(2px);
  opacity: 0.55;
  pointer-events: none;
}

.non-frontend-settings__overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: stretch;
}

.non-frontend-settings__overlay > .q-card {
  width: 100%;
}
</style>
