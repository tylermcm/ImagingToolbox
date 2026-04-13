import { describe, expect, it } from 'vitest'
import {
  calculateBaseReticleFrameSize,
  calculateEquipmentFitScale,
  calculateRotatedFrameBounds,
  calculateRotationFitZoomLimit,
  calculateReticleFrameSize,
  computeSkySpan,
  projectSkyObjects,
  remapPanForZoom,
} from '../src/domain/skyProjection'
import { resolveTargetQuery } from '../src/domain/targetResolver'

describe('skyProjection', () => {
  it('uses a static base sensor frame for a given viewport and sensor ratio', () => {
    const frame = calculateBaseReticleFrameSize(1200, 800, 22.3 / 14.9)

    expect(frame.widthPx).toBeCloseTo(312, 1)
    expect(frame.heightPx).toBeCloseTo(208.47, 1)
  })

  it('changes the sky span as equipment fov changes while the border stays fixed', () => {
    const frame = calculateBaseReticleFrameSize(1200, 800, 22.3 / 14.9)
    const wide = computeSkySpan(1200, 800, 2.323, 1.552, frame.widthPx, frame.heightPx)
    const narrow = computeSkySpan(1200, 800, 1.278, 0.854, frame.widthPx, frame.heightPx)

    expect(narrow.widthDeg).toBeLessThan(wide.widthDeg)
    expect(narrow.heightDeg).toBeLessThan(wide.heightDeg)
  })

  it('projects catalog objects near a resolved target', () => {
    const target = resolveTargetQuery('M42')
    const markers = projectSkyObjects(target, {
      centerRaDeg: target.raHours * 15,
      centerDecDeg: target.decDeg,
      viewWidthDeg: 8,
      viewHeightDeg: 6,
    })

    expect(markers.length).toBeGreaterThan(3)
    const primary = markers.find((marker) => marker.isPrimary)
    expect(primary).toBeDefined()
    expect(primary?.raHours).toBeCloseTo(target.raHours, 6)
    expect(primary?.decDeg).toBeCloseTo(target.decDeg, 6)
    expect(primary?.xNorm).toBeGreaterThanOrEqual(0)
    expect(primary?.xNorm).toBeLessThanOrEqual(1)
    expect(primary?.yNorm).toBeGreaterThanOrEqual(0)
    expect(primary?.yNorm).toBeLessThanOrEqual(1)
  })

  it('projects catalog labels from their sky coordinates as the viewer center changes', () => {
    const target = resolveTargetQuery('M42')
    const centered = projectSkyObjects(target, {
      centerRaDeg: target.raHours * 15,
      centerDecDeg: target.decDeg,
      viewWidthDeg: 8,
      viewHeightDeg: 6,
    })
    const shifted = projectSkyObjects(target, {
      centerRaDeg: target.raHours * 15 + 0.5,
      centerDecDeg: target.decDeg,
      viewWidthDeg: 8,
      viewHeightDeg: 6,
    })

    const centeredPrimary = centered.find((marker) => marker.isPrimary)
    const shiftedPrimary = shifted.find((marker) => marker.isPrimary)

    expect(centeredPrimary).toBeDefined()
    expect(shiftedPrimary).toBeDefined()
    expect(centeredPrimary?.xNorm).toBeCloseTo(0.5, 2)
    expect(shiftedPrimary?.xNorm).not.toBeCloseTo(centeredPrimary?.xNorm ?? 0)
  })

  it('does not pin offscreen catalog labels to the viewport edge', () => {
    const target = resolveTargetQuery('M42')
    const markers = projectSkyObjects(target, {
      centerRaDeg: target.raHours * 15,
      centerDecDeg: target.decDeg,
      viewWidthDeg: 2.5,
      viewHeightDeg: 2.5,
    })

    const offscreen = markers.find((marker) => marker.id === 'ngc2023')

    expect(offscreen).toBeDefined()
    expect(offscreen?.offscreen).toBe(true)
    expect(
      offscreen &&
        (offscreen.xNorm < 0 ||
          offscreen.xNorm > 1 ||
          offscreen.yNorm < 0 ||
          offscreen.yNorm > 1),
    ).toBe(true)
  })

  it('reports pan offsets when moved away from center', () => {
    const frame = calculateBaseReticleFrameSize(1000, 500, 22.3 / 14.9)
    const centered = computeSkySpan(1000, 500, 2.323, 1.552, frame.widthPx, frame.heightPx)
    const moved = computeSkySpan(
      1000,
      500,
      2.323,
      1.552,
      frame.widthPx,
      frame.heightPx,
      0.9,
      0.2,
    )

    expect(moved.offsetRaDeg).toBeGreaterThan(centered.offsetRaDeg)
    expect(moved.offsetDecDeg).toBeLessThan(centered.offsetDecDeg)
  })

  it('scales the centered sensor frame from the current zoom level', () => {
    const baseFrame = calculateBaseReticleFrameSize(1200, 800, 22.3 / 14.9)
    const frameAtOneX = calculateReticleFrameSize(baseFrame, 1, 1200, 800)
    const frameAtThreeX = calculateReticleFrameSize(baseFrame, 3, 1200, 800)

    expect(frameAtThreeX.widthPx).toBeGreaterThan(frameAtOneX.widthPx)
    expect(frameAtThreeX.heightPx).toBeGreaterThan(frameAtOneX.heightPx)
  })

  it('derives a different equipment fit scale when the equipment fov changes', () => {
    const baseFrame = calculateBaseReticleFrameSize(1200, 800, 22.3 / 14.9)
    const wideFit = calculateEquipmentFitScale(
      1200,
      800,
      2.323,
      1.552,
      baseFrame,
    )
    const narrowFit = calculateEquipmentFitScale(
      1200,
      800,
      1.278,
      0.854,
      baseFrame,
    )

    expect(narrowFit).toBeGreaterThan(wideFit)
  })

  it('reduces the allowed zoom when the sensor is rotated toward the viewport corners', () => {
    const baseFrame = calculateBaseReticleFrameSize(1200, 800, 22.3 / 14.9)
    const unrotatedBounds = calculateRotatedFrameBounds(baseFrame, 0)
    const rotatedBounds = calculateRotatedFrameBounds(baseFrame, 45)
    const unrotatedLimit = calculateRotationFitZoomLimit(1200, 800, baseFrame, 0)
    const rotatedLimit = calculateRotationFitZoomLimit(1200, 800, baseFrame, 45)

    expect(rotatedBounds.widthPx).toBeGreaterThan(unrotatedBounds.widthPx)
    expect(rotatedBounds.heightPx).toBeGreaterThan(unrotatedBounds.heightPx)
    expect(rotatedLimit).toBeLessThan(unrotatedLimit)
  })

  it('preserves the current sky offset while zooming when the new span can contain it', () => {
    const baseFrame = calculateBaseReticleFrameSize(1200, 800, 22.3 / 14.9)
    const currentFrame = calculateReticleFrameSize(baseFrame, 1, 1200, 800)
    const nextFrame = calculateReticleFrameSize(baseFrame, 2, 1200, 800)
    const before = computeSkySpan(
      1200,
      800,
      2.323,
      1.552,
      currentFrame.widthPx,
      currentFrame.heightPx,
      0.62,
      0.42,
    )
    const remapped = remapPanForZoom(
      1200,
      800,
      2.323,
      1.552,
      currentFrame,
      nextFrame,
      0.62,
      0.42,
    )
    const after = computeSkySpan(
      1200,
      800,
      2.323,
      1.552,
      nextFrame.widthPx,
      nextFrame.heightPx,
      remapped.xNorm,
      remapped.yNorm,
    )

    expect(after.offsetRaDeg).toBeCloseTo(before.offsetRaDeg, 6)
    expect(after.offsetDecDeg).toBeCloseTo(before.offsetDecDeg, 6)
  })
})
