import { useEffect, useMemo, useState } from 'react'
import {
  buildCatalogEquipmentConfig,
  buildCatalogPresetName,
  COMMON_CAMERA_CATALOG,
  COMMON_OPTICS_CATALOG,
  type CameraCatalogEntry,
  findCatalogCameraById,
  type OpticsCatalogEntry,
} from '../domain/equipmentCatalog'
import {
  calculateImagingMetrics,
  clamp,
  normalizeDegrees,
  type ImagingMetrics,
} from '../domain/framingMath'
import { MAX_ZOOM_FACTOR, MIN_ZOOM_FACTOR } from '../domain/skyProjection'
import { readStorageJson, writeStorageJson } from '../domain/storage'
import {
  formatDecDegrees,
  formatRaHours,
  resolveTargetQuery,
  searchCatalogTargets,
} from '../domain/targetResolver'
import {
  DEFAULT_SKY_SURVEY_OPTION,
  getSkySurveyConfig,
  type SkySurveyOption,
} from '../domain/skySurvey'
import type {
  EquipmentConfig,
  EquipmentPreset,
  FramingSettings,
  FramingSession,
  ResolvedTarget,
  ReticleState,
} from '../domain/types'

const PRESET_STORAGE_KEY = 'imaging-toolbox.presets.v1'
const SESSION_STORAGE_KEY = 'imaging-toolbox.sessions.v1'
const SETTINGS_STORAGE_KEY = 'imaging-toolbox.settings.v1'
const RECENT_TARGETS_STORAGE_KEY = 'imaging-toolbox.recent-targets.v1'
const DEFAULT_QUERY = 'M42'
const DEFAULT_RESOLVED_TARGET = resolveTargetQuery(DEFAULT_QUERY)
const RECENT_TARGET_LIMIT = 6

const DEFAULT_EQUIPMENT: EquipmentConfig = {
  focalLengthMm: 550,
  multiplier: 1,
  sensorWidthMm: 22.3,
  sensorHeightMm: 14.9,
  pixelSizeUm: 3.76,
}

const DEFAULT_SETTINGS: FramingSettings = {
  defaultZoomFactor: 2.75,
  zoomStepMultiplier: 1.18,
  panSpeed: 1,
  rotationFitPaddingRatio: 0.1,
  showNearbyObjectLabels: false,
  nearbyObjectLabelSizePx: 16,
  nearbyObjectLabelColor: '#fff1c8',
  showFramingReadout: false,
  showRecentTargets: false,
  showCopyableFramingSummary: false,
  skySurvey: DEFAULT_SKY_SURVEY_OPTION,
}

function wrapRaDegrees(value: number): number {
  return ((value % 360) + 360) % 360
}

function normalizeHexColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback
  }

  const normalized = value.trim().toLowerCase()
  return /^(?:#[0-9a-f]{3}|#[0-9a-f]{6})$/.test(normalized)
    ? normalized
    : fallback
}

function createDefaultReticle(
  target: ResolvedTarget | null,
  defaultZoomFactor: number,
): ReticleState {
  return {
    centerRaDeg: target ? wrapRaDegrees(target.raHours * 15) : 0,
    centerDecDeg: target?.decDeg ?? 0,
    xNorm: 0.5,
    yNorm: 0.5,
    zoomFactor: clamp(defaultZoomFactor, MIN_ZOOM_FACTOR, MAX_ZOOM_FACTOR),
    rotationDeg: 0,
  }
}

function normalizeReticleState(
  value: Partial<ReticleState> | null | undefined,
  target: ResolvedTarget | null = null,
  defaultZoomFactor = DEFAULT_SETTINGS.defaultZoomFactor,
): ReticleState {
  const fallback = createDefaultReticle(target, defaultZoomFactor)

  return {
    centerRaDeg: wrapRaDegrees(value?.centerRaDeg ?? fallback.centerRaDeg),
    centerDecDeg: clamp(value?.centerDecDeg ?? fallback.centerDecDeg, -90, 90),
    xNorm: clamp(value?.xNorm ?? fallback.xNorm, 0, 1),
    yNorm: clamp(value?.yNorm ?? fallback.yNorm, 0, 1),
    zoomFactor: clamp(
      value?.zoomFactor ?? fallback.zoomFactor,
      MIN_ZOOM_FACTOR,
      MAX_ZOOM_FACTOR,
    ),
    rotationDeg: normalizeDegrees(value?.rotationDeg ?? fallback.rotationDeg),
  }
}

function normalizeSettings(
  value: Partial<FramingSettings> | null | undefined,
): FramingSettings {
  return {
    defaultZoomFactor: clamp(
      value?.defaultZoomFactor ?? DEFAULT_SETTINGS.defaultZoomFactor,
      MIN_ZOOM_FACTOR,
      MAX_ZOOM_FACTOR,
    ),
    zoomStepMultiplier: clamp(
      value?.zoomStepMultiplier ?? DEFAULT_SETTINGS.zoomStepMultiplier,
      1.02,
      2,
    ),
    panSpeed: clamp(value?.panSpeed ?? DEFAULT_SETTINGS.panSpeed, 0.25, 3),
    rotationFitPaddingRatio: clamp(
      value?.rotationFitPaddingRatio ?? DEFAULT_SETTINGS.rotationFitPaddingRatio,
      0,
      0.3,
    ),
    showNearbyObjectLabels: value?.showNearbyObjectLabels ?? DEFAULT_SETTINGS.showNearbyObjectLabels,
    nearbyObjectLabelSizePx: clamp(
      value?.nearbyObjectLabelSizePx ?? DEFAULT_SETTINGS.nearbyObjectLabelSizePx,
      8,
      24,
    ),
    nearbyObjectLabelColor: normalizeHexColor(
      value?.nearbyObjectLabelColor,
      DEFAULT_SETTINGS.nearbyObjectLabelColor,
    ),
    showFramingReadout: value?.showFramingReadout ?? DEFAULT_SETTINGS.showFramingReadout,
    showRecentTargets: value?.showRecentTargets ?? DEFAULT_SETTINGS.showRecentTargets,
    showCopyableFramingSummary:
      value?.showCopyableFramingSummary ?? DEFAULT_SETTINGS.showCopyableFramingSummary,
    skySurvey: (value?.skySurvey ?? DEFAULT_SETTINGS.skySurvey) as SkySurveyOption,
  }
}

function normalizeSession(
  entry: FramingSession,
  defaultZoomFactor: number,
): FramingSession {
  return {
    ...entry,
    reticle: normalizeReticleState(entry.reticle, entry.target, defaultZoomFactor),
  }
}

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  const random = Math.floor(Math.random() * 1_000_000)
  return `${prefix}-${Date.now()}-${random}`
}

function upsertRecentTargets(
  previous: ResolvedTarget[],
  nextTarget: ResolvedTarget,
): ResolvedTarget[] {
  return [nextTarget, ...previous.filter((entry) => entry.id !== nextTarget.id)].slice(
    0,
    RECENT_TARGET_LIMIT,
  )
}

interface FramingState {
  targetQuery: string
  setTargetQuery: (query: string) => void
  targetSuggestions: ResolvedTarget[]
  resolvedTarget: ResolvedTarget | null
  resolveTargetFromQuery: () => void
  selectSuggestedTarget: (target: ResolvedTarget) => void
  equipment: EquipmentConfig
  updateEquipmentField: (key: keyof EquipmentConfig, value: number) => void
  catalogOptics: OpticsCatalogEntry[]
  catalogCameras: CameraCatalogEntry[]
  applyCatalogSetup: (opticsId: string, cameraId: string) => void
  metrics: ImagingMetrics
  reticle: ReticleState
  updateViewport: (centerRaDeg: number, centerDecDeg: number, zoomFactor: number) => void
  updateReticleRotation: (rotationDeg: number) => void
  settings: FramingSettings
  updateSettingsField: <K extends keyof FramingSettings>(
    key: K,
    value: FramingSettings[K],
  ) => void
  resetSettings: () => void
  recentTargets: ResolvedTarget[]
  presets: EquipmentPreset[]
  savePreset: (name: string) => boolean
  loadPreset: (id: string) => void
  deletePreset: (id: string) => void
  sessions: FramingSession[]
  saveSession: (name: string) => boolean
  loadSession: (id: string) => void
  deleteSession: (id: string) => void
  resetFraming: () => void
  framingSummaryText: string
  copyFramingSummary: () => Promise<void>
  statusMessage: string
}

export function useFramingState(): FramingState {
  const [targetQuery, setTargetQuery] = useState(DEFAULT_QUERY)
  const [resolvedTarget, setResolvedTarget] = useState<ResolvedTarget | null>(
    DEFAULT_RESOLVED_TARGET,
  )
  const [settings, setSettings] = useState<FramingSettings>(() =>
    normalizeSettings(readStorageJson(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS)),
  )
  const [equipment, setEquipment] = useState<EquipmentConfig>(DEFAULT_EQUIPMENT)
  const [reticle, setReticle] = useState<ReticleState>(() =>
    createDefaultReticle(DEFAULT_RESOLVED_TARGET, settings.defaultZoomFactor),
  )
  const [presets, setPresets] = useState<EquipmentPreset[]>(() =>
    readStorageJson(PRESET_STORAGE_KEY, []),
  )
  const [sessions, setSessions] = useState<FramingSession[]>(() =>
    readStorageJson<FramingSession[]>(SESSION_STORAGE_KEY, []).map((entry) =>
      normalizeSession(entry, settings.defaultZoomFactor),
    ),
  )
  const [recentTargets, setRecentTargets] = useState<ResolvedTarget[]>(() =>
    readStorageJson<ResolvedTarget[]>(RECENT_TARGETS_STORAGE_KEY, []),
  )
  const [statusMessage, setStatusMessage] = useState(
    resolvedTarget ? `Resolved ${resolvedTarget.name}.` : 'Ready. Resolve a target and pan the sky.',
  )

  useEffect(() => {
    writeStorageJson(PRESET_STORAGE_KEY, presets)
  }, [presets])

  useEffect(() => {
    writeStorageJson(SESSION_STORAGE_KEY, sessions)
  }, [sessions])

  useEffect(() => {
    writeStorageJson(RECENT_TARGETS_STORAGE_KEY, recentTargets)
  }, [recentTargets])

  useEffect(() => {
    writeStorageJson(SETTINGS_STORAGE_KEY, settings)
  }, [settings])

  const targetSuggestions = useMemo(
    () => searchCatalogTargets(targetQuery),
    [targetQuery],
  )
  const metrics = useMemo(() => calculateImagingMetrics(equipment), [equipment])
  const surveyConfig = useMemo(
    () => getSkySurveyConfig(settings.skySurvey),
    [settings.skySurvey],
  )
  const framingSummaryText = useMemo(() => {
    const targetLabel = resolvedTarget
      ? `${resolvedTarget.name} (${formatRaHours(resolvedTarget.raHours)} | ${formatDecDegrees(resolvedTarget.decDeg)})`
      : 'Unresolved target'

    return [
      `Target: ${targetLabel}`,
      `Center: ${formatRaHours(reticle.centerRaDeg / 15)} | ${formatDecDegrees(reticle.centerDecDeg)}`,
      `Equipment: ${equipment.focalLengthMm.toFixed(1)} mm, ${equipment.multiplier.toFixed(2)}x reducer/barlow, ${equipment.sensorWidthMm.toFixed(2)} x ${equipment.sensorHeightMm.toFixed(2)} mm sensor, ${equipment.pixelSizeUm.toFixed(2)} um pixels`,
      `Effective focal length: ${metrics.effectiveFocalLengthMm.toFixed(1)} mm`,
      `Field of view: ${metrics.horizontalFovDeg.toFixed(3)} x ${metrics.verticalFovDeg.toFixed(3)} deg`,
      `Image scale: ${metrics.imageScaleArcsecPerPixel.toFixed(3)} arcsec/px`,
      `Zoom: ${reticle.zoomFactor.toFixed(2)}x`,
      `Rotation: ${reticle.rotationDeg.toFixed(1)} deg`,
      `Survey: ${surveyConfig.label}`,
    ].join('\n')
  }, [equipment, metrics, reticle, resolvedTarget, surveyConfig.label])

  const recordRecentTarget = (target: ResolvedTarget | null): void => {
    if (!target) {
      return
    }

    setRecentTargets((previous) => upsertRecentTargets(previous, target))
  }

  const copyFramingSummary = async (): Promise<void> => {
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        window.isSecureContext
      ) {
        await navigator.clipboard.writeText(framingSummaryText)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = framingSummaryText
        textarea.setAttribute('readonly', 'true')
        textarea.style.position = 'fixed'
        textarea.style.left = '-9999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        textarea.remove()
      }

      setStatusMessage('Copied framing summary to clipboard.')
    } catch {
      setStatusMessage('Unable to copy framing summary.')
    }
  }

  const resolveTargetFromQuery = (): void => {
    const resolved = resolveTargetQuery(targetQuery)
    if (!resolved) {
      setStatusMessage(
        'Unable to resolve target. Try a catalog target name or RA/Dec coordinates.',
      )
      return
    }

    setResolvedTarget(resolved)
    setReticle((previous) => ({
      ...previous,
      centerRaDeg: wrapRaDegrees(resolved.raHours * 15),
      centerDecDeg: resolved.decDeg,
      xNorm: 0.5,
      yNorm: 0.5,
    }))
    recordRecentTarget(resolved)
    setStatusMessage(`Resolved ${resolved.name}.`)
  }

  const selectSuggestedTarget = (target: ResolvedTarget): void => {
    setTargetQuery(target.name)
    setResolvedTarget(target)
    setReticle((previous) => ({
      ...previous,
      centerRaDeg: wrapRaDegrees(target.raHours * 15),
      centerDecDeg: target.decDeg,
      xNorm: 0.5,
      yNorm: 0.5,
    }))
    recordRecentTarget(target)
    setStatusMessage(`Selected ${target.name}.`)
  }

  const updateEquipmentField = (
    key: keyof EquipmentConfig,
    value: number,
  ): void => {
    const nextValue = Number.isFinite(value) ? value : 0
    setEquipment((previous) => ({
      ...previous,
      [key]: nextValue,
    }))
  }

  const applyCatalogSetup = (opticsId: string, cameraId: string): void => {
    const nextEquipment = buildCatalogEquipmentConfig(
      opticsId,
      cameraId,
      equipment.pixelSizeUm,
    )
    const presetName = buildCatalogPresetName(opticsId, cameraId)
    const selectedCamera = findCatalogCameraById(cameraId)

    if (!nextEquipment || !presetName) {
      setStatusMessage('Unable to load the selected catalog equipment.')
      return
    }

    setEquipment(nextEquipment)
    setStatusMessage(
      selectedCamera?.pixelSizeUm
        ? `Loaded catalog setup "${presetName}".`
        : `Loaded catalog setup "${presetName}". Pixel size was unavailable, so the current pixel size was kept.`,
    )
  }

  const updateViewport = (
    centerRaDeg: number,
    centerDecDeg: number,
    zoomFactor: number,
  ): void => {
    setReticle((previous) => ({
      ...previous,
      centerRaDeg: wrapRaDegrees(centerRaDeg),
      centerDecDeg: clamp(centerDecDeg, -90, 90),
      xNorm: 0.5,
      yNorm: 0.5,
      zoomFactor: clamp(zoomFactor, MIN_ZOOM_FACTOR, MAX_ZOOM_FACTOR),
    }))
  }

  const updateReticleRotation = (rotationDeg: number): void => {
    setReticle((previous) => ({
      ...previous,
      rotationDeg: normalizeDegrees(rotationDeg),
    }))
  }

  const updateSettingsField = <K extends keyof FramingSettings>(
    key: K,
    value: FramingSettings[K],
  ): void => {
    setSettings((previous) =>
      normalizeSettings({
        ...previous,
        [key]: value,
      }),
    )
  }

  const resetSettings = (): void => {
    setSettings(DEFAULT_SETTINGS)
    setStatusMessage('Reset viewport settings to defaults.')
  }

  const resetFraming = (): void => {
    setTargetQuery(DEFAULT_QUERY)
    setResolvedTarget(DEFAULT_RESOLVED_TARGET)
    setEquipment({ ...DEFAULT_EQUIPMENT })
    setReticle(
      createDefaultReticle(DEFAULT_RESOLVED_TARGET, settings.defaultZoomFactor),
    )
    recordRecentTarget(DEFAULT_RESOLVED_TARGET)
    setStatusMessage(`Reset to default ${DEFAULT_QUERY} framing.`)
  }

  const savePreset = (name: string): boolean => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setStatusMessage('Preset name is required.')
      return false
    }

    const preset: EquipmentPreset = {
      id: generateId('preset'),
      name: trimmedName,
      equipment: { ...equipment },
      createdAt: new Date().toISOString(),
    }
    setPresets((previous) => [preset, ...previous])
    setStatusMessage(`Saved equipment preset "${trimmedName}".`)
    return true
  }

  const loadPreset = (id: string): void => {
    const preset = presets.find((entry) => entry.id === id)
    if (!preset) {
      return
    }

    setEquipment(preset.equipment)
    setStatusMessage(`Loaded preset "${preset.name}".`)
  }

  const deletePreset = (id: string): void => {
    setPresets((previous) => previous.filter((entry) => entry.id !== id))
    setStatusMessage('Deleted equipment preset.')
  }

  const saveSession = (name: string): boolean => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setStatusMessage('Session name is required.')
      return false
    }

    const now = new Date().toISOString()
    const session: FramingSession = {
      id: generateId('session'),
      name: trimmedName,
      targetQuery,
      target: resolvedTarget,
      equipment: { ...equipment },
      reticle: { ...reticle },
      createdAt: now,
      updatedAt: now,
    }
    setSessions((previous) => [session, ...previous])
    setStatusMessage(`Saved framing session "${trimmedName}".`)
    return true
  }

  const loadSession = (id: string): void => {
    const session = sessions.find((entry) => entry.id === id)
    if (!session) {
      return
    }

    setTargetQuery(session.targetQuery)
    setResolvedTarget(session.target)
    setEquipment(session.equipment)
    setReticle(
      normalizeReticleState(
        session.reticle,
        session.target,
        settings.defaultZoomFactor,
      ),
    )
    recordRecentTarget(session.target)
    setStatusMessage(`Loaded session "${session.name}".`)
  }

  const deleteSession = (id: string): void => {
    setSessions((previous) => previous.filter((entry) => entry.id !== id))
    setStatusMessage('Deleted framing session.')
  }

  return {
    targetQuery,
    setTargetQuery,
    targetSuggestions,
    resolvedTarget,
    resolveTargetFromQuery,
    selectSuggestedTarget,
    equipment,
    updateEquipmentField,
    catalogOptics: COMMON_OPTICS_CATALOG,
    catalogCameras: COMMON_CAMERA_CATALOG,
    applyCatalogSetup,
    metrics,
    reticle,
    updateViewport,
    updateReticleRotation,
    settings,
    updateSettingsField,
    resetSettings,
    recentTargets,
    presets,
    savePreset,
    loadPreset,
    deletePreset,
    sessions,
    saveSession,
    loadSession,
    deleteSession,
    resetFraming,
    framingSummaryText,
    copyFramingSummary,
    statusMessage,
  }
}
