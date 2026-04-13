import importedCatalogData from './equipmentCatalogData.json'
import type { EquipmentConfig } from './types'

export type CameraCategory = 'Astro camera' | 'Mirrorless' | 'DSLR' | 'Camera'
export type OpticsCategory = 'Scope' | 'Lens'

interface ImportedScopeEntry {
  id: string
  name: string
  manufacturer?: string
  kind: string
  apertureMm?: number
  focalLengthMm: number
  focalRatio?: number
  sourceUrl: string
  source?: string
  notes?: string
}

interface ImportedLensEntry {
  id: string
  name: string
  manufacturer?: string
  mounts?: string[]
  cropFactor?: number
  focalLengthMinMm: number
  focalLengthMaxMm: number
  maxApertureMinF?: number
  maxApertureMaxF?: number
  sourceUrl: string
  source?: string
  notes?: string
}

interface ImportedCameraEntry {
  id: string
  name: string
  manufacturer?: string
  category?: string
  mount?: string
  cropFactor?: number
  sensorWidthMm: number
  sensorHeightMm: number
  pixelSizeUm?: number | null
  imageWidthPx?: number | null
  imageHeightPx?: number | null
  sourceUrl: string
  source?: string
  notes?: string
}

interface ImportedCatalogData {
  scopes: ImportedScopeEntry[]
  lenses: ImportedLensEntry[]
  cameras: ImportedCameraEntry[]
  astroCameras: ImportedCameraEntry[]
}

export interface OpticsCatalogEntry {
  id: string
  name: string
  manufacturer: string
  category: OpticsCategory
  kind: string
  focalLengthMm: number
  focalLengthLabel: string
  sourceUrl: string
  source: string
  notes?: string
}

export interface ScopeCatalogEntry extends OpticsCatalogEntry {
  category: 'Scope'
}

export interface LensCatalogEntry extends OpticsCatalogEntry {
  category: 'Lens'
}

export interface CameraCatalogEntry {
  id: string
  name: string
  manufacturer: string
  category: CameraCategory
  mount?: string
  sensorWidthMm: number
  sensorHeightMm: number
  imageWidthPx: number | null
  imageHeightPx: number | null
  pixelSizeUm: number | null
  sourceUrl: string
  source: string
  notes?: string
}

const catalogData = importedCatalogData as ImportedCatalogData

function derivePixelSizeUm(sensorWidthMm: number, imageWidthPx: number): number {
  return Number(((sensorWidthMm / imageWidthPx) * 1000).toFixed(2))
}

function normalizeCameraCategory(value: string | undefined): CameraCategory {
  if (value === 'Astro camera' || value === 'Mirrorless' || value === 'DSLR') {
    return value
  }

  return 'Camera'
}

function resolvePixelSizeUm(entry: ImportedCameraEntry): number | null {
  if (Number.isFinite(entry.pixelSizeUm) && (entry.pixelSizeUm ?? 0) > 0) {
    return Number(entry.pixelSizeUm)
  }

  if (
    Number.isFinite(entry.sensorWidthMm) &&
    Number.isFinite(entry.imageWidthPx) &&
    (entry.imageWidthPx ?? 0) > 0
  ) {
    return derivePixelSizeUm(entry.sensorWidthMm, entry.imageWidthPx ?? 0)
  }

  return null
}

function buildScopeEntry(entry: ImportedScopeEntry): ScopeCatalogEntry {
  return {
    id: entry.id,
    name: entry.name,
    manufacturer: entry.manufacturer ?? 'Unknown',
    category: 'Scope',
    kind: entry.kind,
    focalLengthMm: entry.focalLengthMm,
    focalLengthLabel: `${entry.focalLengthMm} mm`,
    sourceUrl: entry.sourceUrl,
    source: entry.source ?? 'Imported equipment catalog',
    notes: entry.notes,
  }
}

function buildLensEntry(entry: ImportedLensEntry): LensCatalogEntry {
  const isZoomLens = entry.focalLengthMinMm !== entry.focalLengthMaxMm
  const focalLengthLabel = isZoomLens
    ? `${entry.focalLengthMinMm}-${entry.focalLengthMaxMm} mm`
    : `${entry.focalLengthMaxMm} mm`

  return {
    id: entry.id,
    name: entry.name,
    manufacturer: entry.manufacturer ?? 'Unknown',
    category: 'Lens',
    kind: isZoomLens ? 'Zoom lens' : 'Prime lens',
    focalLengthMm: entry.focalLengthMaxMm,
    focalLengthLabel,
    sourceUrl: entry.sourceUrl,
    source: entry.source ?? 'Imported equipment catalog',
    notes: entry.notes,
  }
}

function buildCameraEntry(entry: ImportedCameraEntry): CameraCatalogEntry {
  return {
    id: entry.id,
    name: entry.name,
    manufacturer: entry.manufacturer ?? 'Unknown',
    category: normalizeCameraCategory(entry.category),
    mount: entry.mount,
    sensorWidthMm: entry.sensorWidthMm,
    sensorHeightMm: entry.sensorHeightMm,
    imageWidthPx: entry.imageWidthPx ?? null,
    imageHeightPx: entry.imageHeightPx ?? null,
    pixelSizeUm: resolvePixelSizeUm(entry),
    sourceUrl: entry.sourceUrl,
    source: entry.source ?? 'Imported equipment catalog',
    notes: entry.notes,
  }
}

function compareCatalogEntries(left: { manufacturer: string; name: string }, right: { manufacturer: string; name: string }) {
  return left.manufacturer.localeCompare(right.manufacturer) ||
    left.name.localeCompare(right.name)
}

const importedScopes = catalogData.scopes.map(buildScopeEntry)
const importedLenses = catalogData.lenses.map(buildLensEntry)
const importedCameraEntries = [...catalogData.cameras, ...catalogData.astroCameras]

const mergedCameraMap = new Map<string, CameraCatalogEntry>()
for (const entry of importedCameraEntries) {
  mergedCameraMap.set(entry.id, buildCameraEntry(entry))
}

export const COMMON_SCOPE_CATALOG: ScopeCatalogEntry[] = importedScopes.toSorted(
  compareCatalogEntries,
)

export const COMMON_LENS_CATALOG: LensCatalogEntry[] = importedLenses.toSorted(
  compareCatalogEntries,
)

export const COMMON_OPTICS_CATALOG: OpticsCatalogEntry[] = [
  ...COMMON_SCOPE_CATALOG,
  ...COMMON_LENS_CATALOG,
]

export const COMMON_CAMERA_CATALOG: CameraCatalogEntry[] = [...mergedCameraMap.values()]
  .filter(
    (camera) =>
      Number.isFinite(camera.sensorWidthMm) &&
      camera.sensorWidthMm > 0 &&
      Number.isFinite(camera.sensorHeightMm) &&
      camera.sensorHeightMm > 0,
  )
  .toSorted(compareCatalogEntries)

export function findCatalogOpticsById(opticsId: string): OpticsCatalogEntry | null {
  return COMMON_OPTICS_CATALOG.find((entry) => entry.id === opticsId) ?? null
}

export function findCatalogCameraById(cameraId: string): CameraCatalogEntry | null {
  return COMMON_CAMERA_CATALOG.find((entry) => entry.id === cameraId) ?? null
}

export function buildCatalogEquipmentConfig(
  opticsId: string,
  cameraId: string,
  fallbackPixelSizeUm = 0,
): EquipmentConfig | null {
  const optics = findCatalogOpticsById(opticsId)
  const camera = findCatalogCameraById(cameraId)

  if (!optics || !camera) {
    return null
  }

  const resolvedPixelSizeUm =
    camera.pixelSizeUm && camera.pixelSizeUm > 0
      ? camera.pixelSizeUm
      : fallbackPixelSizeUm

  if (!(resolvedPixelSizeUm > 0)) {
    return null
  }

  return {
    focalLengthMm: optics.focalLengthMm,
    multiplier: 1,
    sensorWidthMm: camera.sensorWidthMm,
    sensorHeightMm: camera.sensorHeightMm,
    pixelSizeUm: resolvedPixelSizeUm,
  }
}

export function buildCatalogPresetName(
  opticsId: string,
  cameraId: string,
): string | null {
  const optics = findCatalogOpticsById(opticsId)
  const camera = findCatalogCameraById(cameraId)

  if (!optics || !camera) {
    return null
  }

  return `${optics.name} + ${camera.name}`
}
