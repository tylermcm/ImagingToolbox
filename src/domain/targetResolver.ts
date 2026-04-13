import { RESOLVER_TARGET_CATALOG, type CatalogTarget } from './targetCatalog'
import type { ResolvedTarget } from './types'

function toResolvedCatalogTarget(target: CatalogTarget): ResolvedTarget {
  return {
    ...target,
    source: 'catalog',
  }
}

function normalizeSearch(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

function compactSearch(text: string): string {
  return normalizeSearch(text).replace(/[^a-z0-9]+/g, '')
}

interface SearchableCatalogTarget {
  target: CatalogTarget
  normalizedFields: string[]
  compactFields: string[]
}

const SEARCHABLE_TARGET_CATALOG: SearchableCatalogTarget[] =
  RESOLVER_TARGET_CATALOG.map((target) => {
    const normalizedFields = [
      normalizeSearch(target.name),
      ...target.aliases.map((alias) => normalizeSearch(alias)),
    ]

    return {
      target,
      normalizedFields,
      compactFields: normalizedFields.map((field) => compactSearch(field)),
    }
  })

function scoreCatalogTarget(target: SearchableCatalogTarget, query: string): number {
  const normalizedName = normalizeSearch(target.target.name)
  const tokens = query.split(' ')
  const compactQuery = compactSearch(query)
  const allFields = target.normalizedFields
  const compactFields = target.compactFields

  if (allFields.includes(query)) {
    return 100
  }
  if (compactQuery.length > 0 && compactFields.includes(compactQuery)) {
    return 95
  }
  if (allFields.some((field) => field.startsWith(query))) {
    return 80
  }
  if (
    compactQuery.length > 0 &&
    compactFields.some((field) => field.startsWith(compactQuery))
  ) {
    return 75
  }
  if (allFields.some((field) => field.includes(query))) {
    return 60
  }
  if (
    compactQuery.length > 0 &&
    compactFields.some((field) => field.includes(compactQuery))
  ) {
    return 55
  }
  if (tokens.length > 1 && tokens.every((token) => normalizedName.includes(token))) {
    return 40
  }
  return 0
}

function wrapHours(hours: number): number {
  return ((hours % 24) + 24) % 24
}

function normalizeSexagesimal(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[hmsd'"]/g, ':')
    .replace(/\s+/g, ':')
    .replace(/:+/g, ':')
    .replace(/^:/, '')
    .replace(/:$/, '')
}

function parseSexagesimal(text: string): number | null {
  const parts = normalizeSexagesimal(text)
    .split(':')
    .filter((part) => part.length > 0)
  if (parts.length === 0 || parts.length > 3) {
    return null
  }

  const first = Number.parseFloat(parts[0])
  const minutes = parts.length >= 2 ? Number.parseFloat(parts[1]) : 0
  const seconds = parts.length === 3 ? Number.parseFloat(parts[2]) : 0

  if (
    !Number.isFinite(first) ||
    !Number.isFinite(minutes) ||
    !Number.isFinite(seconds)
  ) {
    return null
  }
  if (minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) {
    return null
  }

  const sign = first < 0 || parts[0].startsWith('-') ? -1 : 1
  const absolute = Math.abs(first) + minutes / 60 + seconds / 3600
  return sign * absolute
}

function splitCoordinateParts(query: string): [string, string] | null {
  const commaSeparated = query
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  if (commaSeparated.length === 2) {
    return [commaSeparated[0], commaSeparated[1]]
  }

  const tokens = query.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 2) {
    return [tokens[0], tokens[1]]
  }
  if (tokens.length === 6) {
    return [tokens.slice(0, 3).join(':'), tokens.slice(3).join(':')]
  }

  return null
}

function parseRightAscension(part: string): number | null {
  if (part.includes(':') || /[hms]/i.test(part)) {
    const parsed = parseSexagesimal(part)
    if (parsed === null) {
      return null
    }
    return wrapHours(parsed)
  }

  const parsed = Number.parseFloat(part)
  if (!Number.isFinite(parsed)) {
    return null
  }

  const asHours = Math.abs(parsed) > 24 ? parsed / 15 : parsed
  return wrapHours(asHours)
}

function parseDeclination(part: string): number | null {
  if (part.includes(':') || /[dms'"]/.test(part)) {
    const parsed = parseSexagesimal(part)
    if (parsed === null) {
      return null
    }
    return parsed
  }

  const parsed = Number.parseFloat(part)
  if (!Number.isFinite(parsed)) {
    return null
  }
  return parsed
}

function parseCoordinateTarget(query: string): ResolvedTarget | null {
  const parts = splitCoordinateParts(query)
  if (!parts) {
    return null
  }

  const raHours = parseRightAscension(parts[0])
  const decDeg = parseDeclination(parts[1])
  if (raHours === null || decDeg === null) {
    return null
  }
  if (decDeg < -90 || decDeg > 90) {
    return null
  }

  const formattedRa = formatRaHours(raHours)
  const formattedDec = formatDecDegrees(decDeg)
  return {
    id: `custom-${raHours.toFixed(6)}-${decDeg.toFixed(6)}`,
    name: `Custom ${formattedRa} ${formattedDec}`,
    aliases: ['custom coordinates'],
    raHours,
    decDeg,
    source: 'coordinates',
  }
}

export function searchCatalogTargets(
  query: string,
  limit = 6,
): ResolvedTarget[] {
  const normalizedQuery = normalizeSearch(query)
  if (!normalizedQuery) {
    return []
  }

  return SEARCHABLE_TARGET_CATALOG.map((target) => ({
    target,
    score: scoreCatalogTarget(target, normalizedQuery),
  }))
    .filter((entry) => entry.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.target.target.name.localeCompare(right.target.target.name),
    )
    .slice(0, limit)
    .map((entry) => toResolvedCatalogTarget(entry.target.target))
}

export function resolveTargetQuery(query: string): ResolvedTarget | null {
  const trimmed = query.trim()
  if (!trimmed) {
    return null
  }

  const coordinateTarget = parseCoordinateTarget(trimmed)
  if (coordinateTarget) {
    return coordinateTarget
  }

  const [bestMatch] = searchCatalogTargets(trimmed, 1)
  return bestMatch ?? null
}

export function formatRaHours(raHours: number): string {
  const wrapped = wrapHours(raHours)
  const totalSeconds = Math.round(wrapped * 3600)
  const hours = Math.floor(totalSeconds / 3600) % 24
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`
}

export function formatDecDegrees(decDeg: number): string {
  const sign = decDeg >= 0 ? '+' : '-'
  const absolute = Math.abs(decDeg)
  const totalArcSeconds = Math.round(absolute * 3600)
  const degrees = Math.floor(totalArcSeconds / 3600)
  const arcMinutes = Math.floor((totalArcSeconds % 3600) / 60)
  const arcSeconds = totalArcSeconds % 60

  return `${sign}${degrees.toString().padStart(2, '0')}d ${arcMinutes.toString().padStart(2, '0')}m ${arcSeconds.toString().padStart(2, '0')}s`
}
