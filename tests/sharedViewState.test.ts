import { describe, expect, it } from 'vitest'
import { buildDesiredSkyViewState } from '../src/components/sky/sharedViewState'
import { resolveTargetQuery } from '../src/domain/targetResolver'

describe('sharedViewState', () => {
  it('uses the persisted sky center instead of snapping back to the resolved target', () => {
    const target = resolveTargetQuery('M42')
    const state = buildDesiredSkyViewState({
      widthPx: 1200,
      heightPx: 800,
      sensorRatio: 22.3 / 14.9,
      horizontalFovDeg: 2.323,
      verticalFovDeg: 1.552,
      rotationFitPaddingRatio: 0.1,
      target,
      reticle: {
        centerRaDeg: 120.25,
        centerDecDeg: 18.5,
        xNorm: 0.5,
        yNorm: 0.5,
        zoomFactor: 2.75,
        rotationDeg: 0,
      },
    })

    expect(state.centerRaDeg).toBeCloseTo(120.25, 6)
    expect(state.centerDecDeg).toBeCloseTo(18.5, 6)
  })
})
