import type { EquipmentConfig } from './types'

export interface ImagingMetrics {
  effectiveFocalLengthMm: number
  horizontalFovDeg: number
  verticalFovDeg: number
  diagonalFovDeg: number
  imageScaleArcsecPerPixel: number
}

const ARCSEC_PER_RADIAN = 206_264.806
const MICRONS_PER_MM = 1_000

function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI
}

function safePositive(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function normalizeDegrees(angleDeg: number): number {
  const normalized = ((angleDeg + 180) % 360 + 360) % 360 - 180
  return Number(normalized.toFixed(3))
}

export function calculateFovDegrees(
  sensorDimensionMm: number,
  effectiveFocalLengthMm: number,
): number {
  const sensor = safePositive(sensorDimensionMm)
  const focalLength = safePositive(effectiveFocalLengthMm)
  if (sensor === 0 || focalLength === 0) {
    return 0
  }

  return radiansToDegrees(2 * Math.atan(sensor / (2 * focalLength)))
}

export function calculateImageScaleArcsecPerPixel(
  pixelSizeUm: number,
  effectiveFocalLengthMm: number,
): number {
  const pixelSize = safePositive(pixelSizeUm)
  const focalLength = safePositive(effectiveFocalLengthMm)
  if (pixelSize === 0 || focalLength === 0) {
    return 0
  }

  return (ARCSEC_PER_RADIAN * (pixelSize / MICRONS_PER_MM)) / focalLength
}

export function calculateImagingMetrics(
  equipment: EquipmentConfig,
): ImagingMetrics {
  const focalLength = safePositive(equipment.focalLengthMm)
  const multiplier = safePositive(equipment.multiplier)
  const effectiveFocalLengthMm = focalLength * multiplier

  const horizontalFovDeg = calculateFovDegrees(
    equipment.sensorWidthMm,
    effectiveFocalLengthMm,
  )
  const verticalFovDeg = calculateFovDegrees(
    equipment.sensorHeightMm,
    effectiveFocalLengthMm,
  )
  const diagonalFovDeg = calculateFovDegrees(
    Math.hypot(equipment.sensorWidthMm, equipment.sensorHeightMm),
    effectiveFocalLengthMm,
  )

  const imageScaleArcsecPerPixel = calculateImageScaleArcsecPerPixel(
    equipment.pixelSizeUm,
    effectiveFocalLengthMm,
  )

  return {
    effectiveFocalLengthMm,
    horizontalFovDeg,
    verticalFovDeg,
    diagonalFovDeg,
    imageScaleArcsecPerPixel,
  }
}
