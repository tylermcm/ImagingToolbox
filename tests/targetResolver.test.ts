import { describe, expect, it } from 'vitest'
import {
  formatDecDegrees,
  formatRaHours,
  resolveTargetQuery,
  searchCatalogTargets,
} from '../src/domain/targetResolver'

describe('targetResolver', () => {
  it('finds catalog targets by name and alias', () => {
    const byName = searchCatalogTargets('M42', 1)
    const byAlias = searchCatalogTargets('Andromeda', 1)

    expect(byName[0]?.name).toContain('Orion Nebula')
    expect(byAlias[0]?.name).toContain('Andromeda Galaxy')
  })

  it('finds imported OpenNGC targets by compact and spaced catalog ids', () => {
    const compact = searchCatalogTargets('NGC1', 1)
    const spaced = searchCatalogTargets('NGC 1976', 1)

    expect(compact[0]?.id).toBe('ngc1')
    expect(spaced[0]?.name).toContain('Orion Nebula')
  })

  it('resolves custom coordinate strings', () => {
    const resolved = resolveTargetQuery('05:35:17 -05:23:28')
    expect(resolved).not.toBeNull()
    expect(resolved?.source).toBe('coordinates')
    expect(resolved?.raHours).toBeCloseTo(5.588, 3)
    expect(resolved?.decDeg).toBeCloseTo(-5.391, 3)
  })

  it('accepts decimal RA in degrees and converts to hours', () => {
    const resolved = resolveTargetQuery('83.82 -5.39')
    expect(resolved?.raHours).toBeCloseTo(5.588, 3)
    expect(resolved?.decDeg).toBeCloseTo(-5.39, 2)
  })

  it('formats equatorial coordinates in human-readable notation', () => {
    expect(formatRaHours(5.588)).toBe('05h 35m 17s')
    expect(formatDecDegrees(-5.391)).toBe('-05d 23m 28s')
  })
})
