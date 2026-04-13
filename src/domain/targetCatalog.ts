import importedOpenNgcCatalog from './openNgcDsoCatalogue.json'

export interface CatalogTarget {
  id: string
  name: string
  aliases: string[]
  raHours: number
  decDeg: number
}

interface ImportedDsoTarget {
  name: string
  catalogId: string
  ra: string
  dec: string
}

const CURATED_TARGET_CATALOG: CatalogTarget[] = [
  {
    id: 'm31',
    name: 'M31 Andromeda Galaxy',
    aliases: ['andromeda', 'ngc 224'],
    raHours: 0.712,
    decDeg: 41.269,
  },
  {
    id: 'm42',
    name: 'M42 Orion Nebula',
    aliases: ['orion nebula', 'ngc 1976'],
    raHours: 5.588,
    decDeg: -5.391,
  },
  {
    id: 'm43',
    name: 'M43 De Mairans Nebula',
    aliases: ['m 43', 'ngc 1982'],
    raHours: 5.591,
    decDeg: -5.267,
  },
  {
    id: 'ngc1980',
    name: 'NGC 1980 Lost Jewel Cluster',
    aliases: ['lost jewel cluster'],
    raHours: 5.587,
    decDeg: -5.945,
  },
  {
    id: 'ngc1981',
    name: 'NGC 1981',
    aliases: ['ngc 1981 cluster'],
    raHours: 5.592,
    decDeg: -4.425,
  },
  {
    id: 'ngc1977',
    name: 'NGC 1977 Running Man Nebula',
    aliases: ['running man nebula'],
    raHours: 5.594,
    decDeg: -4.835,
  },
  {
    id: 'ngc1999',
    name: 'NGC 1999',
    aliases: ['ngc 1999 reflection nebula'],
    raHours: 5.617,
    decDeg: -6.724,
  },
  {
    id: 'ngc2023',
    name: 'NGC 2023',
    aliases: ['ngc 2023 reflection nebula'],
    raHours: 5.700,
    decDeg: -2.256,
  },
  {
    id: 'ngc2024',
    name: 'NGC 2024 Flame Nebula',
    aliases: ['flame nebula'],
    raHours: 5.695,
    decDeg: -1.943,
  },
  {
    id: 'm78',
    name: 'M78 Reflection Nebula',
    aliases: ['ngc 2068'],
    raHours: 5.773,
    decDeg: 0.08,
  },
  {
    id: 'm45',
    name: 'M45 Pleiades',
    aliases: ['pleiades', 'seven sisters'],
    raHours: 3.792,
    decDeg: 24.117,
  },
  {
    id: 'ngc1499',
    name: 'NGC 1499 California Nebula',
    aliases: ['california nebula'],
    raHours: 4.03,
    decDeg: 36.37,
  },
  {
    id: 'ngc2237',
    name: 'NGC 2237 Rosette Nebula',
    aliases: ['rosette nebula', 'ngc 2244'],
    raHours: 6.529,
    decDeg: 4.95,
  },
  {
    id: 'ic434',
    name: 'IC 434 Horsehead Region',
    aliases: ['horsehead nebula', 'barnard 33'],
    raHours: 5.681,
    decDeg: -2.45,
  },
  {
    id: 'ngc7000',
    name: 'NGC 7000 North America Nebula',
    aliases: ['north america nebula'],
    raHours: 20.98,
    decDeg: 44.33,
  },
  {
    id: 'ic5070',
    name: 'IC 5070 Pelican Nebula',
    aliases: ['pelican nebula'],
    raHours: 20.85,
    decDeg: 44.35,
  },
  {
    id: 'ic1805',
    name: 'IC 1805 Heart Nebula',
    aliases: ['heart nebula'],
    raHours: 2.544,
    decDeg: 61.75,
  },
  {
    id: 'ic1848',
    name: 'IC 1848 Soul Nebula',
    aliases: ['soul nebula'],
    raHours: 2.88,
    decDeg: 60.45,
  },
  {
    id: 'm8',
    name: 'M8 Lagoon Nebula',
    aliases: ['lagoon nebula', 'ngc 6523'],
    raHours: 18.05,
    decDeg: -24.38,
  },
  {
    id: 'm20',
    name: 'M20 Trifid Nebula',
    aliases: ['trifid nebula', 'ngc 6514'],
    raHours: 18.034,
    decDeg: -22.97,
  },
  {
    id: 'm16',
    name: 'M16 Eagle Nebula',
    aliases: ['eagle nebula', 'ngc 6611'],
    raHours: 18.313,
    decDeg: -13.78,
  },
  {
    id: 'm17',
    name: 'M17 Omega Nebula',
    aliases: ['omega nebula', 'swan nebula', 'ngc 6618'],
    raHours: 18.34,
    decDeg: -16.17,
  },
  {
    id: 'ngc6960',
    name: 'NGC 6960 Veil Nebula',
    aliases: ['veil nebula', 'witchs broom'],
    raHours: 20.756,
    decDeg: 30.7,
  },
  {
    id: 'm51',
    name: 'M51 Whirlpool Galaxy',
    aliases: ['whirlpool galaxy', 'ngc 5194'],
    raHours: 13.497,
    decDeg: 47.195,
  },
  {
    id: 'm63',
    name: 'M63 Sunflower Galaxy',
    aliases: ['sunflower galaxy', 'ngc 5055'],
    raHours: 13.263,
    decDeg: 42.03,
  },
  {
    id: 'm94',
    name: 'M94 Crocs Eye Galaxy',
    aliases: ['cats eye galaxy', 'ngc 4736'],
    raHours: 12.845,
    decDeg: 41.12,
  },
  {
    id: 'm101',
    name: 'M101 Pinwheel Galaxy',
    aliases: ['pinwheel galaxy', 'ngc 5457'],
    raHours: 14.05,
    decDeg: 54.35,
  },
  {
    id: 'm102',
    name: 'M102 Spindle Galaxy',
    aliases: ['ngc 5866', 'spindle galaxy'],
    raHours: 15.11,
    decDeg: 55.76,
  },
  {
    id: 'ngc5474',
    name: 'NGC 5474',
    aliases: ['ngc 5474 galaxy'],
    raHours: 14.087,
    decDeg: 53.66,
  },
  {
    id: 'ngc5477',
    name: 'NGC 5477',
    aliases: ['ngc 5477 galaxy'],
    raHours: 14.08,
    decDeg: 54.46,
  },
  {
    id: 'ngc5585',
    name: 'NGC 5585',
    aliases: ['ngc 5585 galaxy'],
    raHours: 14.32,
    decDeg: 56.73,
  },
  {
    id: 'ngc5907',
    name: 'NGC 5907 Splinter Galaxy',
    aliases: ['splinter galaxy'],
    raHours: 15.263,
    decDeg: 56.33,
  },
  {
    id: 'm81',
    name: 'M81 Bodes Galaxy',
    aliases: ['bodes galaxy', 'ngc 3031'],
    raHours: 9.926,
    decDeg: 69.07,
  },
  {
    id: 'm82',
    name: 'M82 Cigar Galaxy',
    aliases: ['cigar galaxy', 'ngc 3034'],
    raHours: 9.936,
    decDeg: 69.68,
  },
  {
    id: 'm106',
    name: 'M106',
    aliases: ['ngc 4258'],
    raHours: 12.32,
    decDeg: 47.30,
  },
  {
    id: 'ngc4565',
    name: 'NGC 4565 Needle Galaxy',
    aliases: ['needle galaxy'],
    raHours: 12.60,
    decDeg: 25.99,
  },
  {
    id: 'm13',
    name: 'M13 Hercules Cluster',
    aliases: ['hercules cluster', 'ngc 6205'],
    raHours: 16.695,
    decDeg: 36.47,
  },
  {
    id: 'm27',
    name: 'M27 Dumbbell Nebula',
    aliases: ['dumbbell nebula', 'ngc 6853'],
    raHours: 19.993,
    decDeg: 22.72,
  },
  {
    id: 'm57',
    name: 'M57 Ring Nebula',
    aliases: ['ring nebula', 'ngc 6720'],
    raHours: 18.893,
    decDeg: 33.03,
  },
  {
    id: 'ngc6888',
    name: 'NGC 6888 Crescent Nebula',
    aliases: ['crescent nebula'],
    raHours: 20.21,
    decDeg: 38.35,
  },
  {
    id: 'ic1396',
    name: 'IC 1396 Elephants Trunk',
    aliases: ['elephants trunk nebula'],
    raHours: 21.65,
    decDeg: 57.50,
  },
  {
    id: 'ngc7822',
    name: 'NGC 7822',
    aliases: ['ced 214 region'],
    raHours: 0.05,
    decDeg: 67.50,
  },
  {
    id: 'sh2-155',
    name: 'Sh2-155 Cave Nebula',
    aliases: ['cave nebula'],
    raHours: 22.95,
    decDeg: 62.63,
  },
  {
    id: 'ngc7023',
    name: 'NGC 7023 Iris Nebula',
    aliases: ['iris nebula', 'ced 214'],
    raHours: 21.045,
    decDeg: 68.16,
  },
  {
    id: 'ic5146',
    name: 'IC 5146 Cocoon Nebula',
    aliases: ['cocoon nebula'],
    raHours: 21.88,
    decDeg: 47.27,
  },
]

function normalizeCatalogId(value: string): string {
  return value.trim().toLowerCase()
}

function parseSexagesimal(value: string): number | null {
  const parts = value
    .trim()
    .split(':')
    .map((part) => Number.parseFloat(part))

  if (
    parts.length !== 3 ||
    parts.some((part) => !Number.isFinite(part))
  ) {
    return null
  }

  const [first, minutes, seconds] = parts
  const sign = first < 0 || value.trim().startsWith('-') ? -1 : 1
  const absolute = Math.abs(first) + minutes / 60 + seconds / 3600
  return sign * absolute
}

function parseRightAscensionHours(value: string): number | null {
  const parsed = parseSexagesimal(value)
  if (parsed === null) {
    return null
  }

  return ((parsed % 24) + 24) % 24
}

function parseDeclinationDegrees(value: string): number | null {
  const parsed = parseSexagesimal(value)
  if (parsed === null || parsed < -90 || parsed > 90) {
    return null
  }

  return parsed
}

function buildCatalogIdAliases(catalogId: string): string[] {
  const trimmed = catalogId.trim()
  const aliases = new Set<string>()
  if (!trimmed) {
    return []
  }

  aliases.add(trimmed)
  aliases.add(trimmed.replace(/([A-Za-z]+)(\d+)/g, '$1 $2'))
  aliases.add(trimmed.replace(/-/g, ' '))
  aliases.add(trimmed.replace(/\s+/g, ''))

  return [...aliases].filter(Boolean)
}

function splitNames(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

function toImportedCatalogTarget(entry: ImportedDsoTarget): CatalogTarget | null {
  const raHours = parseRightAscensionHours(entry.ra)
  const decDeg = parseDeclinationDegrees(entry.dec)
  if (raHours === null || decDeg === null) {
    return null
  }

  const names = splitNames(entry.name)
  const displayName = names[0] ?? entry.catalogId
  const aliasSet = new Set<string>([
    ...buildCatalogIdAliases(entry.catalogId),
    ...names,
  ])
  aliasSet.delete(displayName)

  return {
    id: normalizeCatalogId(entry.catalogId),
    name: displayName,
    aliases: [...aliasSet],
    raHours,
    decDeg,
  }
}

const importedResolverTargets = (importedOpenNgcCatalog as ImportedDsoTarget[])
  .map(toImportedCatalogTarget)
  .filter((entry): entry is CatalogTarget => entry !== null)

const resolverTargetMap = new Map<string, CatalogTarget>()

for (const target of importedResolverTargets) {
  resolverTargetMap.set(target.id, target)
}

for (const target of CURATED_TARGET_CATALOG) {
  resolverTargetMap.set(normalizeCatalogId(target.id), target)
}

export const TARGET_CATALOG: CatalogTarget[] = CURATED_TARGET_CATALOG
export const RESOLVER_TARGET_CATALOG: CatalogTarget[] = [...resolverTargetMap.values()]
