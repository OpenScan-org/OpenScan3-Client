import { defineStore } from 'pinia'

type FrontendSettingsState = {
  backgroundCameraPreviewEnabled: boolean
  movementStepSettings: MotorMovementStepSettings
}

export type MovementStepLevel = 'fine' | 'medium' | 'coarse'
export type ConfigurableMotorName = 'turntable' | 'rotor'
export type MotorMovementSteps = Record<MovementStepLevel, number>
export type MotorMovementStepSettings = Record<ConfigurableMotorName, MotorMovementSteps>

export const DEFAULT_MOTOR_MOVEMENT_STEPS: MotorMovementStepSettings = {
  turntable: { fine: 15, medium: 30, coarse: 90 },
  rotor: { fine: 5, medium: 15, coarse: 30 }
}

function createDefaultMovementStepSettings(): MotorMovementStepSettings {
  return {
    turntable: { ...DEFAULT_MOTOR_MOVEMENT_STEPS.turntable },
    rotor: { ...DEFAULT_MOTOR_MOVEMENT_STEPS.rotor }
  }
}

const STORAGE_KEY = 'frontendSettings'

function loadInitialState(): FrontendSettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {
        backgroundCameraPreviewEnabled: true,
        movementStepSettings: createDefaultMovementStepSettings()
      }
    }

    const parsed = JSON.parse(raw) as Partial<FrontendSettingsState> & {
      movementStepSettings?: Partial<MotorMovementStepSettings>
    }
    return {
      backgroundCameraPreviewEnabled: parsed?.backgroundCameraPreviewEnabled ?? true,
      movementStepSettings: normalizeMovementStepSettings(parsed?.movementStepSettings)
    }
  } catch (error) {
    console.warn('Failed to load frontend settings.', error)
    return {
      backgroundCameraPreviewEnabled: true,
      movementStepSettings: createDefaultMovementStepSettings()
    }
  }
}

function normalizeMovementStep(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 360
    ? Math.round(value)
    : fallback
}

function normalizeMovementStepSettings(
  settings?: Partial<MotorMovementStepSettings>
): MotorMovementStepSettings {
  return {
    turntable: {
      fine: normalizeMovementStep(settings?.turntable?.fine, DEFAULT_MOTOR_MOVEMENT_STEPS.turntable.fine),
      medium: normalizeMovementStep(settings?.turntable?.medium, DEFAULT_MOTOR_MOVEMENT_STEPS.turntable.medium),
      coarse: normalizeMovementStep(settings?.turntable?.coarse, DEFAULT_MOTOR_MOVEMENT_STEPS.turntable.coarse)
    },
    rotor: {
      fine: normalizeMovementStep(settings?.rotor?.fine, DEFAULT_MOTOR_MOVEMENT_STEPS.rotor.fine),
      medium: normalizeMovementStep(settings?.rotor?.medium, DEFAULT_MOTOR_MOVEMENT_STEPS.rotor.medium),
      coarse: normalizeMovementStep(settings?.rotor?.coarse, DEFAULT_MOTOR_MOVEMENT_STEPS.rotor.coarse)
    }
  }
}

function persistState(state: FrontendSettingsState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.warn('Failed to persist frontend settings.', error)
  }
}

export const useFrontendSettingsStore = defineStore('frontendSettings', {
  state: (): FrontendSettingsState => loadInitialState(),
  actions: {
    setBackgroundCameraPreviewEnabled(enabled: boolean) {
      this.backgroundCameraPreviewEnabled = enabled
      persistState(this.$state)
    },
    setMovementStep(motorName: ConfigurableMotorName, level: MovementStepLevel, value: number) {
      if (!Number.isFinite(value) || value < 1 || value > 360) {
        return
      }

      this.movementStepSettings[motorName][level] = Math.round(value)
      persistState(this.$state)
    }
  }
})
