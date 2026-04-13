import type { SkySurveyOption } from './skySurvey'

export interface EquipmentConfig {
  focalLengthMm: number
  multiplier: number
  sensorWidthMm: number
  sensorHeightMm: number
  pixelSizeUm: number
}

export interface ResolvedTarget {
  id: string
  name: string
  aliases: string[]
  raHours: number
  decDeg: number
  source: 'catalog' | 'coordinates'
}

export interface ReticleState {
  centerRaDeg: number
  centerDecDeg: number
  xNorm: number
  yNorm: number
  zoomFactor: number
  rotationDeg: number
}

export interface FramingSettings {
  defaultZoomFactor: number
  zoomStepMultiplier: number
  panSpeed: number
  rotationFitPaddingRatio: number
  showNearbyObjectLabels: boolean
  nearbyObjectLabelSizePx: number
  nearbyObjectLabelColor: string
  showFramingReadout: boolean
  showRecentTargets: boolean
  showCopyableFramingSummary: boolean
  skySurvey: SkySurveyOption
}

export interface EquipmentPreset {
  id: string
  name: string
  equipment: EquipmentConfig
  createdAt: string
}

export interface FramingSession {
  id: string
  name: string
  targetQuery: string
  target: ResolvedTarget | null
  equipment: EquipmentConfig
  reticle: ReticleState
  createdAt: string
  updatedAt: string
}
