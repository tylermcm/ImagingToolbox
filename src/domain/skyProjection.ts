import { RESOLVER_TARGET_CATALOG } from './targetCatalog'
import type { ResolvedTarget } from './types'

export interface SkySpan {
  baseWidthDeg: number
  baseHeightDeg: number
  widthDeg: number
  heightDeg: number
  offsetRaDeg: number
  offsetDecDeg: number
  zoomFactor: number
}

export interface SkyProjectionContext {
  centerRaDeg: number
  centerDecDeg: number
  viewWidthDeg: number
  viewHeightDeg: number
}

export interface SkyObjectMarker {
  id: string
  name: string
  raHours: number
  decDeg: number
  xNorm: number
  yNorm: number
  isPrimary: boolean
  offscreen: boolean
}

export interface FrameSize {
  widthPx: number
  heightPx: number
}

interface PanCoordinates {
  xNorm: number
  yNorm: number
}

export const MIN_ZOOM_FACTOR = 0.45
export const MAX_ZOOM_FACTOR = 20
export const ROTATION_FIT_PADDING_RATIO = 0.1

function shortestDeltaDegrees(left: number, right: number): number {
  return ((left - right + 540) % 360) - 180
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180
}

function angularSeparationDegrees(
  leftRaDeg: number,
  leftDecDeg: number,
  rightRaDeg: number,
  rightDecDeg: number,
): number {
  const leftDecRad = toRadians(leftDecDeg)
  const rightDecRad = toRadians(rightDecDeg)
  const deltaRa = shortestDeltaDegrees(leftRaDeg, rightRaDeg)
  const deltaRaRad = toRadians(deltaRa)
  const sinLeftDec = Math.sin(leftDecRad)
  const cosLeftDec = Math.cos(leftDecRad)
  const sinRightDec = Math.sin(rightDecRad)
  const cosRightDec = Math.cos(rightDecRad)
  const cosine =
    sinLeftDec * sinRightDec + cosLeftDec * cosRightDec * Math.cos(deltaRaRad)

  return (
    (Math.acos(clamp(cosine, -1, 1)) * 180) / Math.PI
  )
}

function projectSkyPoint(
  objectRaDeg: number,
  objectDecDeg: number,
  projection: SkyProjectionContext,
): { xNorm: number; yNorm: number; distanceDeg: number } | null {
  const safeViewWidthDeg = Math.max(1e-6, projection.viewWidthDeg)
  const safeViewHeightDeg = Math.max(1e-6, projection.viewHeightDeg)
  const deltaRaRad = toRadians(
    shortestDeltaDegrees(objectRaDeg, projection.centerRaDeg),
  )
  const objectDecRad = toRadians(objectDecDeg)
  const centerDecRad = toRadians(projection.centerDecDeg)
  const sinObjectDec = Math.sin(objectDecRad)
  const cosObjectDec = Math.cos(objectDecRad)
  const sinCenterDec = Math.sin(centerDecRad)
  const cosCenterDec = Math.cos(centerDecRad)
  const cosDeltaRa = Math.cos(deltaRaRad)
  const denominator =
    sinCenterDec * sinObjectDec + cosCenterDec * cosObjectDec * cosDeltaRa

  if (!Number.isFinite(denominator) || Math.abs(denominator) < 1e-8) {
    return null
  }

  const xTan = (cosObjectDec * Math.sin(deltaRaRad)) / denominator
  const yTan =
    (cosCenterDec * sinObjectDec -
      sinCenterDec * cosObjectDec * cosDeltaRa) /
    denominator
  const halfWidthTan = Math.tan(toRadians(safeViewWidthDeg / 2))
  const halfHeightTan = Math.tan(toRadians(safeViewHeightDeg / 2))

  if (
    !Number.isFinite(halfWidthTan) ||
    !Number.isFinite(halfHeightTan) ||
    halfWidthTan <= 0 ||
    halfHeightTan <= 0
  ) {
    return null
  }

  return {
    xNorm: 0.5 + xTan / (2 * halfWidthTan),
    yNorm: 0.5 - yTan / (2 * halfHeightTan),
    distanceDeg: angularSeparationDegrees(
      objectRaDeg,
      objectDecDeg,
      projection.centerRaDeg,
      projection.centerDecDeg,
    ),
  }
}

function prioritizePrimaryMarkers(markers: SkyObjectMarker[]): SkyObjectMarker[] {
  const sorted = [...markers]
  const primaryIndex = sorted.findIndex((marker) => marker.isPrimary)
  if (primaryIndex > 0) {
    const [primary] = sorted.splice(primaryIndex, 1)
    sorted.unshift(primary)
  }

  return sorted
}

export function calculateBaseReticleFrameSize(
  widthPx: number,
  heightPx: number,
  sensorRatio: number,
): FrameSize {
  const safeWidth = Math.max(1, widthPx)
  const safeHeight = Math.max(1, heightPx)
  const safeRatio = Number.isFinite(sensorRatio) && sensorRatio > 0 ? sensorRatio : 1
  const maxFrameWidth = clamp(safeWidth * 0.26, 120, safeWidth * 0.38)
  const maxFrameHeight = clamp(safeHeight * 0.34, 88, safeHeight * 0.44)

  if (safeRatio >= 1) {
    const width = Math.min(maxFrameWidth, maxFrameHeight * safeRatio)
    return {
      widthPx: width,
      heightPx: width / safeRatio,
    }
  }

  const height = Math.min(maxFrameHeight, maxFrameWidth / safeRatio)
  return {
    widthPx: height * safeRatio,
    heightPx: height,
  }
}

export function calculateReticleFrameSize(
  baseFrame: FrameSize,
  zoomFactor: number,
  viewportWidthPx: number,
  viewportHeightPx: number,
): FrameSize {
  const safeViewportWidth = Math.max(1, viewportWidthPx)
  const safeViewportHeight = Math.max(1, viewportHeightPx)
  const safeZoom = clamp(zoomFactor, MIN_ZOOM_FACTOR, MAX_ZOOM_FACTOR)

  return {
    widthPx: clamp(baseFrame.widthPx * safeZoom, 24, safeViewportWidth * 0.96),
    heightPx: clamp(baseFrame.heightPx * safeZoom, 24, safeViewportHeight * 0.96),
  }
}

export function calculateRotatedFrameBounds(
  frame: FrameSize,
  rotationDeg: number,
): FrameSize {
  const radians = (rotationDeg * Math.PI) / 180
  const absCos = Math.abs(Math.cos(radians))
  const absSin = Math.abs(Math.sin(radians))

  return {
    widthPx: frame.widthPx * absCos + frame.heightPx * absSin,
    heightPx: frame.widthPx * absSin + frame.heightPx * absCos,
  }
}

export function calculateRotationFitZoomLimit(
  viewportWidthPx: number,
  viewportHeightPx: number,
  baseFrame: FrameSize,
  rotationDeg: number,
  paddingRatio = ROTATION_FIT_PADDING_RATIO,
): number {
  const safeViewportWidth = Math.max(1, viewportWidthPx)
  const safeViewportHeight = Math.max(1, viewportHeightPx)
  const insetRatio = clamp(1 - paddingRatio * 2, 0.2, 1)
  const availableWidth = safeViewportWidth * insetRatio
  const availableHeight = safeViewportHeight * insetRatio
  const rotatedBounds = calculateRotatedFrameBounds(baseFrame, rotationDeg)
  const widthBound = availableWidth / Math.max(1, rotatedBounds.widthPx)
  const heightBound = availableHeight / Math.max(1, rotatedBounds.heightPx)

  return Math.max(MIN_ZOOM_FACTOR, Math.min(MAX_ZOOM_FACTOR, widthBound, heightBound))
}

export function calculateEquipmentFitScale(
  viewportWidthPx: number,
  viewportHeightPx: number,
  horizontalFovDeg: number,
  verticalFovDeg: number,
  baseFrame: FrameSize,
): number {
  const baseSpan = computeSkySpan(
    viewportWidthPx,
    viewportHeightPx,
    horizontalFovDeg,
    verticalFovDeg,
    baseFrame.widthPx,
    baseFrame.heightPx,
    0.5,
    0.5,
  )

  return baseSpan.widthDeg > 0
    ? Math.max(1e-6, Math.max(1, viewportWidthPx) / baseSpan.widthDeg)
    : 1
}

export function computeSkySpan(
  widthPx: number,
  heightPx: number,
  horizontalFovDeg: number,
  verticalFovDeg: number,
  frameWidthPx: number,
  frameHeightPx: number,
  panXNorm = 0.5,
  panYNorm = 0.5,
): SkySpan {
  const safeWidth = Math.max(1, widthPx)
  const safeHeight = Math.max(1, heightPx)
  const safeFrameWidth = clamp(frameWidthPx, 24, safeWidth * 0.96)
  const safeFrameHeight = clamp(frameHeightPx, 24, safeHeight * 0.96)
  const frameWidthRatio = clamp(safeFrameWidth / safeWidth, 0.05, 0.96)
  const frameHeightRatio = clamp(safeFrameHeight / safeHeight, 0.05, 0.96)
  const widthFromHorizontal =
    horizontalFovDeg > 0 ? horizontalFovDeg / frameWidthRatio : 0
  const widthFromVertical =
    verticalFovDeg > 0
      ? (verticalFovDeg / frameHeightRatio) * (safeWidth / safeHeight)
      : 0
  const baseWidthDeg = Math.max(widthFromHorizontal, widthFromVertical, 0.3)
  const baseHeightDeg = baseWidthDeg * (safeHeight / safeWidth)
  const maxOffsetRaDeg = baseWidthDeg * 3
  const maxOffsetDecDeg = baseHeightDeg * 3

  return {
    baseWidthDeg,
    baseHeightDeg,
    widthDeg: baseWidthDeg,
    heightDeg: baseHeightDeg,
    offsetRaDeg: (panXNorm * 2 - 1) * maxOffsetRaDeg,
    offsetDecDeg: (panYNorm * 2 - 1) * maxOffsetDecDeg,
    zoomFactor: 1,
  }
}

export function remapPanForZoom(
  widthPx: number,
  heightPx: number,
  horizontalFovDeg: number,
  verticalFovDeg: number,
  currentFrame: FrameSize,
  nextFrame: FrameSize,
  panXNorm: number,
  panYNorm: number,
): PanCoordinates {
  const currentSpan = computeSkySpan(
    widthPx,
    heightPx,
    horizontalFovDeg,
    verticalFovDeg,
    currentFrame.widthPx,
    currentFrame.heightPx,
    panXNorm,
    panYNorm,
  )
  const nextSpan = computeSkySpan(
    widthPx,
    heightPx,
    horizontalFovDeg,
    verticalFovDeg,
    nextFrame.widthPx,
    nextFrame.heightPx,
    0.5,
    0.5,
  )
  const nextMaxOffsetRaDeg = nextSpan.widthDeg * 3
  const nextMaxOffsetDecDeg = nextSpan.heightDeg * 3

  return {
    xNorm:
      nextMaxOffsetRaDeg > 0
        ? clamp(0.5 + currentSpan.offsetRaDeg / (nextMaxOffsetRaDeg * 2), 0, 1)
        : 0.5,
    yNorm:
      nextMaxOffsetDecDeg > 0
        ? clamp(0.5 + currentSpan.offsetDecDeg / (nextMaxOffsetDecDeg * 2), 0, 1)
        : 0.5,
  }
}

export function projectSkyObjects(
  target: ResolvedTarget | null,
  projection: SkyProjectionContext,
  limit = 14,
): SkyObjectMarker[] {
  if (!target) {
    return []
  }

  const includeTargetMarker = !RESOLVER_TARGET_CATALOG.some((entry) => entry.id === target.id)
  const projectedMarkers = RESOLVER_TARGET_CATALOG.map((entry) => {
    const projectionResult = projectSkyPoint(
      entry.raHours * 15,
      entry.decDeg,
      projection,
    )

    if (!projectionResult) {
      return null
    }

    return {
      id: entry.id,
      name: entry.name,
      raHours: entry.raHours,
      decDeg: entry.decDeg,
      xNorm: projectionResult.xNorm,
      yNorm: projectionResult.yNorm,
      distance: projectionResult.distanceDeg,
      isPrimary: entry.id === target.id,
    }
  }).filter((entry): entry is {
    id: string
    name: string
    raHours: number
    decDeg: number
    xNorm: number
    yNorm: number
    distance: number
    isPrimary: boolean
  } => entry !== null)

  if (includeTargetMarker) {
    const targetProjection = projectSkyPoint(
      target.raHours * 15,
      target.decDeg,
      projection,
    )

    if (targetProjection) {
      projectedMarkers.unshift({
        id: target.id,
        name: target.name,
        raHours: target.raHours,
        decDeg: target.decDeg,
        xNorm: targetProjection.xNorm,
        yNorm: targetProjection.yNorm,
        distance: targetProjection.distanceDeg,
        isPrimary: true,
      })
    }
  }

  const inView = prioritizePrimaryMarkers(
    projectedMarkers
      .filter((entry) => entry.xNorm >= 0 && entry.xNorm <= 1)
      .filter((entry) => entry.yNorm >= 0 && entry.yNorm <= 1)
      .sort((left, right) => left.distance - right.distance)
      .map((entry) => ({
        id: entry.id,
        name: entry.name,
        raHours: entry.raHours,
        decDeg: entry.decDeg,
        xNorm: entry.xNorm,
        yNorm: entry.yNorm,
        isPrimary: entry.isPrimary,
        offscreen: false,
      })),
  ).slice(0, limit)

  const edgeMarkers = prioritizePrimaryMarkers(
    projectedMarkers
      .filter((entry) => entry.xNorm >= -1 && entry.xNorm <= 2)
      .filter((entry) => entry.yNorm >= -1 && entry.yNorm <= 2)
      .filter(
        (entry) =>
          entry.xNorm < 0 ||
          entry.xNorm > 1 ||
          entry.yNorm < 0 ||
          entry.yNorm > 1,
      )
      .sort((left, right) => left.distance - right.distance)
      .map((entry) => ({
        id: entry.id,
        name: entry.name,
        raHours: entry.raHours,
        decDeg: entry.decDeg,
        // Keep the raw sky projection so labels stay tied to the object's
        // coordinates and get clipped by the viewport instead of pinning to an edge.
        xNorm: entry.xNorm,
        yNorm: entry.yNorm,
        isPrimary: entry.isPrimary,
        offscreen: true,
      })),
  ).slice(0, 8)

  const combined = [...inView, ...edgeMarkers]
  if (combined.some((entry) => entry.isPrimary)) {
    return combined
  }

  return combined
}
