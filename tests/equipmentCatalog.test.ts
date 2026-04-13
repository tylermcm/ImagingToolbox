import { describe, expect, it } from 'vitest'
import {
  buildCatalogEquipmentConfig,
  buildCatalogPresetName,
  COMMON_CAMERA_CATALOG,
  COMMON_LENS_CATALOG,
  COMMON_OPTICS_CATALOG,
  COMMON_SCOPE_CATALOG,
} from '../src/domain/equipmentCatalog'

describe('equipmentCatalog', () => {
  it('builds a combined equipment config from a common scope and camera', () => {
    const config = buildCatalogEquipmentConfig(
      'altair-66ed-r',
      'zwo-asi2600mc-pro',
    )

    expect(config).toEqual({
      focalLengthMm: 400,
      multiplier: 1,
      sensorWidthMm: 23.5,
      sensorHeightMm: 15.7,
      pixelSizeUm: 3.76,
    })
  })

  it('builds a readable preset name from the catalog selection', () => {
    expect(
      buildCatalogPresetName('altair-starwave-80ed-r', 'canon-eos-m'),
    ).toBe('Altair Starwave 80ED-R + Canon EOS M')
  })

  it('keeps the full imported optics catalog available for presets', () => {
    expect(COMMON_SCOPE_CATALOG.length).toBeGreaterThanOrEqual(10)
    expect(COMMON_LENS_CATALOG.length).toBeGreaterThanOrEqual(50)
    expect(COMMON_OPTICS_CATALOG.length).toBe(
      COMMON_SCOPE_CATALOG.length + COMMON_LENS_CATALOG.length,
    )
  })

  it('includes dedicated astro, mirrorless, and dslr cameras in the imported database', () => {
    const categories = new Set(COMMON_CAMERA_CATALOG.map((camera) => camera.category))

    expect(categories.has('Astro camera')).toBe(true)
    expect(categories.has('Mirrorless')).toBe(true)
    expect(categories.has('DSLR')).toBe(true)
    expect(COMMON_CAMERA_CATALOG.length).toBeGreaterThanOrEqual(100)
  })

  it('falls back to the current pixel size when the selected camera does not provide one', () => {
    const config = buildCatalogEquipmentConfig(
      'canon-canon-rf-50mm-f-1-8-stm-canon-rf',
      'canon-eos-m',
      3.76,
    )

    expect(config).toEqual({
      focalLengthMm: 50,
      multiplier: 1,
      sensorWidthMm: 22.32,
      sensorHeightMm: 14.88,
      pixelSizeUm: 3.76,
    })
  })
})
