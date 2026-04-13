import { describe, expect, it } from 'vitest'
import {
  calculateFovDegrees,
  calculateImageScaleArcsecPerPixel,
  calculateImagingMetrics,
} from '../src/domain/framingMath'

describe('framingMath', () => {
  it('calculates FOV using sensor size and focal length', () => {
    const horizontal = calculateFovDegrees(22.3, 550)
    const vertical = calculateFovDegrees(14.9, 550)

    expect(horizontal).toBeCloseTo(2.323, 3)
    expect(vertical).toBeCloseTo(1.552, 3)
  })

  it('calculates image scale in arcsec per pixel', () => {
    const imageScale = calculateImageScaleArcsecPerPixel(3.76, 550)
    expect(imageScale).toBeCloseTo(1.41, 2)
  })

  it('returns complete metrics for a camera and scope combination', () => {
    const metrics = calculateImagingMetrics({
      focalLengthMm: 550,
      multiplier: 1,
      sensorWidthMm: 22.3,
      sensorHeightMm: 14.9,
      pixelSizeUm: 3.76,
    })

    expect(metrics.effectiveFocalLengthMm).toBe(550)
    expect(metrics.horizontalFovDeg).toBeCloseTo(2.323, 3)
    expect(metrics.verticalFovDeg).toBeCloseTo(1.552, 3)
    expect(metrics.diagonalFovDeg).toBeCloseTo(2.793, 3)
    expect(metrics.imageScaleArcsecPerPixel).toBeCloseTo(1.41, 2)
  })
})
