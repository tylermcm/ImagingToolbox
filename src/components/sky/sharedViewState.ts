import { clamp } from '../../domain/framingMath'
import {
  MAX_ZOOM_FACTOR,
  MIN_ZOOM_FACTOR,
  calculateBaseReticleFrameSize,
  calculateEquipmentFitScale,
  calculateRotationFitZoomLimit,
  calculateReticleFrameSize,
  computeSkySpan,
  type SkySpan,
} from '../../domain/skyProjection'
import type { ResolvedTarget, ReticleState } from '../../domain/types'

interface BuildSkyViewStateArgs {
  widthPx: number
  heightPx: number
  sensorRatio: number
  horizontalFovDeg: number
  verticalFovDeg: number
  rotationFitPaddingRatio: number
  target: ResolvedTarget | null
}

interface DesiredSkyViewStateArgs extends BuildSkyViewStateArgs {
  reticle: ReticleState
}

interface ViewerSkyViewStateArgs extends BuildSkyViewStateArgs {
  userZoom: number
  rotationDeg: number
  viewerState: ViewerState
}

interface CommonStateArgs {
  widthPx: number
  heightPx: number
  sensorRatio: number
  horizontalFovDeg: number
  verticalFovDeg: number
  rotationFitPaddingRatio: number
  rotationDeg: number
}

export interface ViewerState {
  centerRaDeg: number
  centerDecDeg: number
  viewWidthDeg: number
  viewHeightDeg: number
}

export interface SkyViewState extends ViewerState {
  xNorm: number
  yNorm: number
  userZoom: number
  equipmentFitScale: number
  displayScale: number
  maxUserZoom: number
  baseReticleSize: {
    widthPx: number
    heightPx: number
  }
  reticleSize: {
    widthPx: number
    heightPx: number
  }
  skySpan: SkySpan
}

function wrapDegrees(value: number): number {
  return ((value % 360) + 360) % 360
}

function getFallbackCenter(target: ResolvedTarget | null) {
  return {
    centerRaDeg: target ? wrapDegrees(target.raHours * 15) : 0,
    centerDecDeg: target?.decDeg ?? 0,
  }
}

function computeMaxUserZoom(
  widthPx: number,
  heightPx: number,
  baseReticleSize: { widthPx: number; heightPx: number },
  rotationDeg: number,
  rotationFitPaddingRatio: number,
): number {
  const safeViewportRatio = clamp(1 - rotationFitPaddingRatio * 2, 0.2, 1)
  const widthBound =
    (Math.max(1, widthPx) * safeViewportRatio) / baseReticleSize.widthPx
  const heightBound =
    (Math.max(1, heightPx) * safeViewportRatio) / baseReticleSize.heightPx
  const rotationFitBound = calculateRotationFitZoomLimit(
    widthPx,
    heightPx,
    baseReticleSize,
    rotationDeg,
    rotationFitPaddingRatio,
  )

  return Math.max(
    MIN_ZOOM_FACTOR,
    Math.min(MAX_ZOOM_FACTOR, widthBound, heightBound, rotationFitBound),
  )
}

function buildCommonState({
  widthPx,
  heightPx,
  horizontalFovDeg,
  verticalFovDeg,
  rotationFitPaddingRatio,
  sensorRatio,
  rotationDeg,
}: CommonStateArgs) {
  const baseReticleSize = calculateBaseReticleFrameSize(
    widthPx,
    heightPx,
    sensorRatio,
  )
  const equipmentFitScale = calculateEquipmentFitScale(
    widthPx,
    heightPx,
    horizontalFovDeg,
    verticalFovDeg,
    baseReticleSize,
  )
  const maxUserZoom = computeMaxUserZoom(
    widthPx,
    heightPx,
    baseReticleSize,
    rotationDeg,
    rotationFitPaddingRatio,
  )

  return {
    baseReticleSize,
    equipmentFitScale,
    maxUserZoom,
  }
}

export function buildDesiredSkyViewState({
  widthPx,
  heightPx,
  sensorRatio,
  horizontalFovDeg,
  verticalFovDeg,
  rotationFitPaddingRatio,
  target,
  reticle,
}: DesiredSkyViewStateArgs): SkyViewState {
  const { baseReticleSize, equipmentFitScale, maxUserZoom } = buildCommonState({
    widthPx,
    heightPx,
    horizontalFovDeg,
    verticalFovDeg,
    rotationFitPaddingRatio,
    sensorRatio,
    rotationDeg: reticle.rotationDeg,
  })
  const userZoom = clamp(
    reticle.zoomFactor,
    MIN_ZOOM_FACTOR,
    maxUserZoom,
  )
  const reticleSize = calculateReticleFrameSize(
    baseReticleSize,
    userZoom,
    widthPx,
    heightPx,
  )
  const fallbackCenter = getFallbackCenter(target)
  const centerRaDeg = Number.isFinite(reticle.centerRaDeg)
    ? wrapDegrees(reticle.centerRaDeg)
    : fallbackCenter.centerRaDeg
  const centerDecDeg = clamp(
    Number.isFinite(reticle.centerDecDeg)
      ? reticle.centerDecDeg
      : fallbackCenter.centerDecDeg,
    -90,
    90,
  )
  const skySpan = computeSkySpan(
    widthPx,
    heightPx,
    horizontalFovDeg,
    verticalFovDeg,
    reticleSize.widthPx,
    reticleSize.heightPx,
    0.5,
    0.5,
  )

  return {
    centerRaDeg,
    centerDecDeg,
    viewWidthDeg: skySpan.widthDeg,
    viewHeightDeg: skySpan.heightDeg,
    xNorm: 0.5,
    yNorm: 0.5,
    userZoom,
    equipmentFitScale,
    displayScale: equipmentFitScale * userZoom,
    maxUserZoom,
    baseReticleSize,
    reticleSize,
    skySpan,
  }
}

export function buildSkyViewStateFromViewer({
  widthPx,
  heightPx,
  sensorRatio,
  horizontalFovDeg,
  verticalFovDeg,
  rotationFitPaddingRatio,
  target,
  userZoom,
  rotationDeg,
  viewerState,
}: ViewerSkyViewStateArgs): SkyViewState {
  const { baseReticleSize, equipmentFitScale, maxUserZoom } = buildCommonState({
    widthPx,
    heightPx,
    horizontalFovDeg,
    verticalFovDeg,
    rotationFitPaddingRatio,
    sensorRatio,
    rotationDeg,
  })
  const clampedUserZoom = clamp(userZoom, MIN_ZOOM_FACTOR, maxUserZoom)
  const reticleSize = calculateReticleFrameSize(
    baseReticleSize,
    clampedUserZoom,
    widthPx,
    heightPx,
  )

  const fallbackCenter = getFallbackCenter(target)
  const centerRaDeg = Number.isFinite(viewerState.centerRaDeg)
    ? wrapDegrees(viewerState.centerRaDeg)
    : fallbackCenter.centerRaDeg
  const centerDecDeg = clamp(
    Number.isFinite(viewerState.centerDecDeg)
      ? viewerState.centerDecDeg
      : fallbackCenter.centerDecDeg,
    -90,
    90,
  )

  return {
    centerRaDeg,
    centerDecDeg,
    viewWidthDeg: viewerState.viewWidthDeg,
    viewHeightDeg: viewerState.viewHeightDeg,
    xNorm: 0.5,
    yNorm: 0.5,
    userZoom: clampedUserZoom,
    equipmentFitScale,
    displayScale: equipmentFitScale * clampedUserZoom,
    maxUserZoom,
    baseReticleSize,
    reticleSize,
    skySpan: {
      baseWidthDeg: viewerState.viewWidthDeg * clampedUserZoom,
      baseHeightDeg: viewerState.viewHeightDeg * clampedUserZoom,
      widthDeg: viewerState.viewWidthDeg,
      heightDeg: viewerState.viewHeightDeg,
      offsetRaDeg: 0,
      offsetDecDeg: 0,
      zoomFactor: clampedUserZoom,
    },
  }
}
