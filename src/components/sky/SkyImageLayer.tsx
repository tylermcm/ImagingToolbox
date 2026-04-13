import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import { clamp } from '../../domain/framingMath'
import type {
  Aladin,
  AladinInitOptions,
  AladinCatalog,
  AladinModule,
} from 'aladin-lite'
import type { SkyObjectMarker } from '../../domain/skyProjection'
import type { SkyViewState, ViewerState } from './sharedViewState'

interface SkyImageLayerProps {
  containerId: string
  desiredViewState: SkyViewState
  nearbyObjectMarkers: SkyObjectMarker[]
  nearbyObjectLabelSizePx: number
  nearbyObjectLabelColor: string
  surveyId: string
  surveyColormap: 'native' | 'grayscale'
  panSpeed: number
  onViewerStateChange: (state: ViewerState) => void
}

export interface SkyImageLayerHandle {
  setView: (nextView: Pick<SkyViewState, 'centerRaDeg' | 'centerDecDeg' | 'viewWidthDeg'>) => void
}

type AladinView = Aladin & {
  setImageSurvey?: (surveyId: string) => void
  getBaseImageLayer?: () => { setColormap?: (name: 'native' | 'grayscale') => void } | null
}

const CENTER_EPSILON_DEG = 1e-4
const FOV_EPSILON_DEG = 1e-4
const NEARBY_NEARBY_COLOR = '#ffc57d'
const NEARBY_PRIMARY_COLOR = '#6be7cc'
const NEARBY_LABEL_FONT_FAMILY = '"Space Grotesk", sans-serif'

function wrapDegrees(value: number): number {
  return ((value % 360) + 360) % 360
}

function shortestDeltaDegrees(left: number, right: number): number {
  return ((left - right + 540) % 360) - 180
}

function shouldSyncView(
  aladin: Aladin,
  nextView: Pick<SkyViewState, 'centerRaDeg' | 'centerDecDeg' | 'viewWidthDeg'>,
): boolean {
  const [currentRaDeg, currentDecDeg] = aladin.getRaDec()
  const [currentWidthDeg] = aladin.getFov()

  return (
    Math.abs(shortestDeltaDegrees(currentRaDeg, nextView.centerRaDeg)) >
      CENTER_EPSILON_DEG ||
    Math.abs(currentDecDeg - nextView.centerDecDeg) > CENTER_EPSILON_DEG ||
    Math.abs(currentWidthDeg - nextView.viewWidthDeg) > FOV_EPSILON_DEG
  )
}

export const SkyImageLayer = forwardRef<SkyImageLayerHandle, SkyImageLayerProps>(
  function SkyImageLayer(
    {
      containerId,
      desiredViewState,
      nearbyObjectMarkers,
      nearbyObjectLabelSizePx,
      nearbyObjectLabelColor,
      surveyId,
      surveyColormap,
      panSpeed,
      onViewerStateChange,
    },
    ref,
  ) {
    const hostRef = useRef<HTMLDivElement | null>(null)
    const aladinRef = useRef<AladinView | null>(null)
    const aladinModuleRef = useRef<AladinModule | null>(null)
    const desiredViewRef = useRef(desiredViewState)
    const onViewerStateChangeRef = useRef(onViewerStateChange)
    const nearbyObjectMarkersRef = useRef(nearbyObjectMarkers)
    const nearbyObjectLabelSizePxRef = useRef(nearbyObjectLabelSizePx)
    const nearbyObjectLabelColorRef = useRef(nearbyObjectLabelColor)
    const animationFrameRef = useRef<number | null>(null)
    const panSpeedRef = useRef(panSpeed)
    const surveyIdRef = useRef(surveyId)
    const surveyColormapRef = useRef(surveyColormap)
    const surveySelectionRef = useRef<{ surveyId: string; colormap: 'native' | 'grayscale' } | null>(null)
    const userMovementTimeoutRef = useRef<number | null>(null)
    const userMovementActiveRef = useRef(false)
    const lastCenterRef = useRef<Pick<ViewerState, 'centerRaDeg' | 'centerDecDeg'> | null>(
      null,
    )
    const nearbyCatalogRef = useRef<AladinCatalog | null>(null)
    const nearbyCatalogSignatureRef = useRef('')
    const suppressPanAdjustmentRef = useRef(false)
    const suppressReleaseFrameRef = useRef<number | null>(null)

    desiredViewRef.current = desiredViewState
    nearbyObjectMarkersRef.current = nearbyObjectMarkers
    nearbyObjectLabelSizePxRef.current = nearbyObjectLabelSizePx
    nearbyObjectLabelColorRef.current = nearbyObjectLabelColor
    panSpeedRef.current = panSpeed
    surveyIdRef.current = surveyId
    surveyColormapRef.current = surveyColormap
    onViewerStateChangeRef.current = onViewerStateChange

    const buildNearbyLabelFont = useCallback(
      (sizePx: number) => `600 ${Math.max(8, Math.min(24, sizePx))}px ${NEARBY_LABEL_FONT_FAMILY}`,
      [],
    )

    const buildNearbyCatalogSignature = useCallback(
      (markers: SkyObjectMarker[], sizePx: number, color: string) =>
        markers
          .map(
            (marker) =>
              `${marker.id}:${marker.name}:${marker.raHours.toFixed(6)}:${marker.decDeg.toFixed(6)}:${marker.isPrimary ? 1 : 0}`,
          )
          .sort()
          .join('|')
          .concat(`|size:${Math.max(8, Math.min(24, sizePx))}|color:${color.toLowerCase()}`),
      [],
    )

    const buildNearbyCatalogSources = useCallback(
      (module: AladinModule, markers: SkyObjectMarker[]) =>
        markers.map((marker) => {
          const source = module.source(
            marker.raHours * 15,
            marker.decDeg,
            {
              id: marker.id,
              name: marker.name,
              isPrimary: marker.isPrimary,
            },
          )
          source.setColor(marker.isPrimary ? NEARBY_PRIMARY_COLOR : NEARBY_NEARBY_COLOR)
          source.setSize(marker.isPrimary ? 9 : 7)
          return source
        }),
      [],
    )

    const syncNearbyCatalog = useCallback(
      (aladin: AladinView) => {
        const module = aladinModuleRef.current
        if (!module) {
          return
        }

        const markers = nearbyObjectMarkersRef.current
        const labelSizePx = nearbyObjectLabelSizePxRef.current
        const labelColor = nearbyObjectLabelColorRef.current
        const signature = buildNearbyCatalogSignature(markers, labelSizePx, labelColor)
        const currentCatalog = nearbyCatalogRef.current

        if (markers.length === 0) {
          if (currentCatalog) {
            aladin.removeOverlay(currentCatalog)
            nearbyCatalogRef.current = null
            nearbyCatalogSignatureRef.current = ''
          }
          return
        }

        if (currentCatalog && nearbyCatalogSignatureRef.current === signature) {
          return
        }

        const sources = buildNearbyCatalogSources(module, markers)
        const labelFont = buildNearbyLabelFont(labelSizePx)

        if (currentCatalog) {
          aladin.removeOverlay(currentCatalog)
          nearbyCatalogRef.current = null
        }

        const catalog = module.catalog({
          name: 'Nearby objects',
          color: NEARBY_NEARBY_COLOR,
          sourceSize: 7,
          shape: 'circle',
          displayLabel: true,
          labelColor,
          labelFont,
          labelColumn: 'name',
          readOnly: true,
        })
        catalog.addSources(sources)
        aladin.addCatalog(catalog)
        nearbyCatalogRef.current = catalog

        nearbyCatalogSignatureRef.current = signature
      },
      [buildNearbyCatalogSignature, buildNearbyCatalogSources, buildNearbyLabelFont],
    )

    const markUserMovement = useCallback(() => {
      userMovementActiveRef.current = true
      if (userMovementTimeoutRef.current !== null) {
        window.clearTimeout(userMovementTimeoutRef.current)
      }

      userMovementTimeoutRef.current = window.setTimeout(() => {
        userMovementTimeoutRef.current = null
        userMovementActiveRef.current = false
      }, 120)
    }, [])

    const applySurveySelection = useCallback(
      (aladin: AladinView, nextSurveyId: string, nextColormap: 'native' | 'grayscale') => {
        const previousSelection = surveySelectionRef.current
        if (
          previousSelection &&
          previousSelection.surveyId === nextSurveyId &&
          previousSelection.colormap === nextColormap
        ) {
          return
        }

        aladin.setImageSurvey?.(nextSurveyId)
        const baseImageLayer = aladin.getBaseImageLayer?.()
        baseImageLayer?.setColormap?.(nextColormap)
        surveySelectionRef.current = {
          surveyId: nextSurveyId,
          colormap: nextColormap,
        }
      },
      [],
    )

    const releasePanSuppression = useCallback(() => {
      if (suppressReleaseFrameRef.current !== null) {
        window.cancelAnimationFrame(suppressReleaseFrameRef.current)
      }

      suppressReleaseFrameRef.current = window.requestAnimationFrame(() => {
        suppressReleaseFrameRef.current = null
        suppressPanAdjustmentRef.current = false
      })
    }, [])

    const emitViewerState = useCallback((override: Partial<ViewerState> = {}) => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
      }

      animationFrameRef.current = window.requestAnimationFrame(() => {
        animationFrameRef.current = null
        const aladin = aladinRef.current
        if (!aladin) {
          return
        }

        const [currentRaDeg, currentDecDeg] = aladin.getRaDec()
        const [viewWidthDeg, viewHeightDeg] = aladin.getFov()
        const nextState = {
          centerRaDeg: wrapDegrees(override.centerRaDeg ?? currentRaDeg),
          centerDecDeg: override.centerDecDeg ?? currentDecDeg,
          viewWidthDeg: override.viewWidthDeg ?? viewWidthDeg,
          viewHeightDeg: override.viewHeightDeg ?? viewHeightDeg,
        }

        lastCenterRef.current = {
          centerRaDeg: nextState.centerRaDeg,
          centerDecDeg: nextState.centerDecDeg,
        }

        onViewerStateChangeRef.current(nextState)
      })
    }, [])

    const applyProgrammaticView = useCallback((
      aladin: AladinView,
      nextView: Pick<SkyViewState, 'centerRaDeg' | 'centerDecDeg' | 'viewWidthDeg'>,
    ) => {
      suppressPanAdjustmentRef.current = true
      aladin.setFov(nextView.viewWidthDeg)
      aladin.gotoRaDec(nextView.centerRaDeg, nextView.centerDecDeg)
      emitViewerState({
        centerRaDeg: nextView.centerRaDeg,
        centerDecDeg: nextView.centerDecDeg,
        viewWidthDeg: nextView.viewWidthDeg,
      })
      releasePanSuppression()
    }, [emitViewerState, releasePanSuppression])

    useImperativeHandle(ref, () => ({
      setView: (nextView) => {
        const aladin = aladinRef.current
        if (!aladin || !shouldSyncView(aladin, nextView)) {
          return
        }

        applyProgrammaticView(aladin, nextView)
      },
    }))

    useEffect(() => {
      let cancelled = false
      const hostElement = hostRef.current

      const initialize = async () => {
        const module = await import('aladin-lite')
        const A = module.default
        await A.init
        if (cancelled || !hostElement) {
          return
        }
        aladinModuleRef.current = A

        const options: AladinInitOptions = {
          target: `${desiredViewRef.current.centerRaDeg} ${desiredViewRef.current.centerDecDeg}`,
          fov: desiredViewRef.current.viewWidthDeg,
          survey: surveyIdRef.current,
          projection: 'TAN',
          showReticle: false,
          showZoomControl: false,
          showFullscreenControl: false,
          showLayersControl: false,
          showGotoControl: false,
          showProjectionControl: false,
          showFrame: false,
          showCooGrid: false,
        }
        const aladin = A.aladin(`#${containerId}`, options) as AladinView
        aladinRef.current = aladin
        applySurveySelection(
          aladin,
          surveyIdRef.current,
          surveyColormapRef.current,
        )
        syncNearbyCatalog(aladin)
        emitViewerState()

        const handlePositionChange = () => {
          const activeAladin = aladinRef.current
          if (!activeAladin) {
            return
          }

          if (!suppressPanAdjustmentRef.current) {
            markUserMovement()
          }

          if (
            suppressPanAdjustmentRef.current ||
            Math.abs(panSpeedRef.current - 1) < 1e-3
          ) {
            emitViewerState()
            return
          }

          const previousCenter = lastCenterRef.current
          if (!previousCenter) {
            emitViewerState()
            return
          }

          const [currentRaDeg, currentDecDeg] = activeAladin.getRaDec()
          const deltaRaDeg = shortestDeltaDegrees(
            currentRaDeg,
            previousCenter.centerRaDeg,
          )
          const deltaDecDeg = currentDecDeg - previousCenter.centerDecDeg

          if (
            Math.abs(deltaRaDeg) < CENTER_EPSILON_DEG &&
            Math.abs(deltaDecDeg) < CENTER_EPSILON_DEG
          ) {
            emitViewerState()
            return
          }

          const adjustedRaDeg = wrapDegrees(
            previousCenter.centerRaDeg + deltaRaDeg * panSpeedRef.current,
          )
          const adjustedDecDeg = clamp(
            previousCenter.centerDecDeg + deltaDecDeg * panSpeedRef.current,
            -90,
            90,
          )

          if (
            Math.abs(shortestDeltaDegrees(currentRaDeg, adjustedRaDeg)) <
              CENTER_EPSILON_DEG &&
            Math.abs(currentDecDeg - adjustedDecDeg) < CENTER_EPSILON_DEG
          ) {
            emitViewerState()
            return
          }

          suppressPanAdjustmentRef.current = true
          activeAladin.gotoRaDec(adjustedRaDeg, adjustedDecDeg)
          emitViewerState({
            centerRaDeg: adjustedRaDeg,
            centerDecDeg: adjustedDecDeg,
          })
          releasePanSuppression()
        }

        const handleZoomChange = () => emitViewerState()
        hostElement.addEventListener('AL:position.changed', handlePositionChange)
        hostElement.addEventListener('AL:zoom.changed', handleZoomChange)

        return () => {
          hostElement.removeEventListener('AL:position.changed', handlePositionChange)
          hostElement.removeEventListener('AL:zoom.changed', handleZoomChange)
        }
      }

      let removeListeners: (() => void) | undefined
      void initialize().then((cleanup) => {
        removeListeners = cleanup
      })

      return () => {
        cancelled = true
        if (animationFrameRef.current !== null) {
          window.cancelAnimationFrame(animationFrameRef.current)
        }
        if (userMovementTimeoutRef.current !== null) {
          window.clearTimeout(userMovementTimeoutRef.current)
        }
        if (suppressReleaseFrameRef.current !== null) {
          window.cancelAnimationFrame(suppressReleaseFrameRef.current)
        }
        if (aladinRef.current && nearbyCatalogRef.current) {
          aladinRef.current.removeOverlay(nearbyCatalogRef.current)
        }
        nearbyCatalogRef.current = null
        nearbyCatalogSignatureRef.current = ''
        aladinModuleRef.current = null
        removeListeners?.()
        aladinRef.current = null
        surveySelectionRef.current = null
        if (hostElement) {
          hostElement.innerHTML = ''
        }
      }
    }, [
      applySurveySelection,
      containerId,
      emitViewerState,
      markUserMovement,
      releasePanSuppression,
      syncNearbyCatalog,
    ])

    useEffect(() => {
      const aladin = aladinRef.current
      const nextView = {
        centerRaDeg: desiredViewState.centerRaDeg,
        centerDecDeg: desiredViewState.centerDecDeg,
        viewWidthDeg: desiredViewState.viewWidthDeg,
      }

      if (userMovementActiveRef.current) {
        return
      }

      if (!aladin || !shouldSyncView(aladin, nextView)) {
        return
      }

      applyProgrammaticView(aladin, nextView)
    }, [
      applyProgrammaticView,
      desiredViewState.centerDecDeg,
      desiredViewState.centerRaDeg,
      desiredViewState.viewWidthDeg,
    ])

    useEffect(() => {
      const aladin = aladinRef.current
      if (!aladin) {
        return
      }

      syncNearbyCatalog(aladin)
    }, [
      nearbyObjectLabelColor,
      nearbyObjectLabelSizePx,
      nearbyObjectMarkers,
      syncNearbyCatalog,
    ])

    useEffect(() => {
      const aladin = aladinRef.current
      if (!aladin) {
        return
      }

      applySurveySelection(aladin, surveyId, surveyColormap)
    }, [applySurveySelection, surveyColormap, surveyId])

    return (
      <div className="sky-image-layer">
        <div className="sky-image-host" id={containerId} ref={hostRef} />
      </div>
    )
  },
)
