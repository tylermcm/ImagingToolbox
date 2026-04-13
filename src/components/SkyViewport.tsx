import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { formatDecDegrees, formatRaHours } from '../domain/targetResolver'
import { clamp } from '../domain/framingMath'
import { MIN_ZOOM_FACTOR, projectSkyObjects } from '../domain/skyProjection'
import type { ResolvedTarget, ReticleState } from '../domain/types'
import { ReticleOverlayLayer } from './sky/ReticleOverlayLayer'
import {
  buildDesiredSkyViewState,
  buildSkyViewStateFromViewer,
  type ViewerState,
} from './sky/sharedViewState'
import {
  SkyImageLayer,
  type SkyImageLayerHandle,
} from './sky/SkyImageLayer'

interface SkyViewportProps {
  target: ResolvedTarget | null
  reticle: ReticleState
  sensorRatio: number
  horizontalFovDeg: number
  verticalFovDeg: number
  imageScaleArcsecPerPixel: number
  zoomStepMultiplier: number
  panSpeed: number
  rotationFitPaddingRatio: number
  showNearbyObjectLabels: boolean
  nearbyObjectLabelSizePx: number
  nearbyObjectLabelColor: string
  showFramingReadout: boolean
  surveyId: string
  surveyColormap: 'native' | 'grayscale'
  overlayControls?: ReactNode
  onViewportChange: (
    centerRaDeg: number,
    centerDecDeg: number,
    zoomFactor: number,
  ) => void
  onReticleRotate: (rotationDeg: number) => void
}

interface Size {
  width: number
  height: number
}

const VIEW_SYNC_EPSILON = 1e-3
const INTERACTIVE_SELECTOR =
  '.viewport-controls, .rotate-handle, .floating-controls'
const NATIVE_CONTEXTMENU_SELECTOR = '.floating-controls'

interface PointerPosition {
  x: number
  y: number
}

interface ViewSignature {
  centerRaDeg: number
  centerDecDeg: number
  viewWidthDeg: number
}

function shortestDeltaDegrees(left: number, right: number): number {
  return ((left - right + 540) % 360) - 180
}

function viewsMatch(left: ViewSignature, right: ViewSignature): boolean {
  return (
    Math.abs(shortestDeltaDegrees(left.centerRaDeg, right.centerRaDeg)) <
      VIEW_SYNC_EPSILON &&
    Math.abs(left.centerDecDeg - right.centerDecDeg) < VIEW_SYNC_EPSILON &&
    Math.abs(left.viewWidthDeg - right.viewWidthDeg) < VIEW_SYNC_EPSILON
  )
}

export function SkyViewport({
  target,
  reticle,
  sensorRatio,
  horizontalFovDeg,
  verticalFovDeg,
  imageScaleArcsecPerPixel,
  zoomStepMultiplier,
  panSpeed,
  rotationFitPaddingRatio,
  showNearbyObjectLabels,
  nearbyObjectLabelSizePx,
  nearbyObjectLabelColor,
  showFramingReadout,
  surveyId,
  surveyColormap,
  overlayControls,
  onViewportChange,
  onReticleRotate,
}: SkyViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const imageLayerRef = useRef<SkyImageLayerHandle | null>(null)
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })
  const [viewerState, setViewerState] = useState<ViewerState | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const imageLayerId = useId().replace(/:/g, '')
  const activePointersRef = useRef<Map<number, PointerPosition>>(new Map())
  const pinchStateRef = useRef<{ startDistance: number; startZoom: number } | null>(
    null,
  )
  const previousDesiredViewRef = useRef<ViewSignature | null>(null)
  const pendingProgrammaticViewRef = useRef<ViewSignature | null>(null)
  const lastViewerDrivenViewRef = useRef<ViewSignature | null>(null)
  const viewportAspectRatio =
    Number.isFinite(sensorRatio) && sensorRatio > 0 ? sensorRatio : 1
  const safeZoomStepMultiplier = clamp(zoomStepMultiplier, 1.02, 2)

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const updateSize = () => {
      if (!containerRef.current) {
        return
      }

      setSize({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current)
    }

    handleFullscreenChange()
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const desiredViewState = useMemo(
    () =>
      buildDesiredSkyViewState({
        widthPx: size.width,
        heightPx: size.height,
        sensorRatio,
        horizontalFovDeg,
        verticalFovDeg,
        rotationFitPaddingRatio,
        target,
        reticle,
      }),
    [
      horizontalFovDeg,
      reticle,
      rotationFitPaddingRatio,
      sensorRatio,
      size,
      target,
      verticalFovDeg,
    ],
  )

  const activeViewState = viewerState
    ? buildSkyViewStateFromViewer({
        widthPx: size.width,
        heightPx: size.height,
        sensorRatio,
        horizontalFovDeg,
        verticalFovDeg,
        rotationFitPaddingRatio,
        target,
        rotationDeg: reticle.rotationDeg,
        userZoom: reticle.zoomFactor,
        viewerState,
      })
    : desiredViewState
  const centerRaLabel = formatRaHours(activeViewState.centerRaDeg / 15)
  const centerDecLabel = formatDecDegrees(activeViewState.centerDecDeg)
  const catalogProjection = useMemo(
    () => ({
      centerRaDeg: activeViewState.centerRaDeg,
      centerDecDeg: activeViewState.centerDecDeg,
      viewWidthDeg: activeViewState.viewWidthDeg,
      viewHeightDeg: activeViewState.viewHeightDeg,
    }),
    [
      activeViewState.centerDecDeg,
      activeViewState.centerRaDeg,
      activeViewState.viewHeightDeg,
      activeViewState.viewWidthDeg,
    ],
  )
  const nearbyObjectMarkers = useMemo(
    () =>
      showNearbyObjectLabels
        ? projectSkyObjects(target, catalogProjection)
        : [],
    [catalogProjection, showNearbyObjectLabels, target],
  )
  const desiredViewSignature = useMemo<ViewSignature>(
    () => ({
      centerRaDeg: desiredViewState.centerRaDeg,
      centerDecDeg: desiredViewState.centerDecDeg,
      viewWidthDeg: desiredViewState.viewWidthDeg,
    }),
    [
      desiredViewState.centerDecDeg,
      desiredViewState.centerRaDeg,
      desiredViewState.viewWidthDeg,
    ],
  )
  const activeViewSignature = useMemo<ViewSignature>(
    () => ({
      centerRaDeg: activeViewState.centerRaDeg,
      centerDecDeg: activeViewState.centerDecDeg,
      viewWidthDeg: activeViewState.viewWidthDeg,
    }),
    [
      activeViewState.centerDecDeg,
      activeViewState.centerRaDeg,
      activeViewState.viewWidthDeg,
    ],
  )

  useEffect(() => {
    const previousDesiredView = previousDesiredViewRef.current
    const desiredChanged =
      !previousDesiredView ||
      !viewsMatch(previousDesiredView, desiredViewSignature)

    if (viewerState && pendingProgrammaticViewRef.current) {
      const viewerSignature: ViewSignature = {
        centerRaDeg: viewerState.centerRaDeg,
        centerDecDeg: viewerState.centerDecDeg,
        viewWidthDeg: viewerState.viewWidthDeg,
      }

      if (viewsMatch(viewerSignature, pendingProgrammaticViewRef.current)) {
        pendingProgrammaticViewRef.current = null
      }
    }

    if (desiredChanged) {
      const desiredMatchesViewerDriven =
        lastViewerDrivenViewRef.current &&
        viewsMatch(lastViewerDrivenViewRef.current, desiredViewSignature)
      const viewerMatchesDesired =
        viewerState &&
        viewsMatch(
          {
            centerRaDeg: viewerState.centerRaDeg,
            centerDecDeg: viewerState.centerDecDeg,
            viewWidthDeg: viewerState.viewWidthDeg,
          },
          desiredViewSignature,
        )

      if (desiredMatchesViewerDriven) {
        lastViewerDrivenViewRef.current = null
      } else if (viewerState && !viewerMatchesDesired) {
        pendingProgrammaticViewRef.current = desiredViewSignature
      }
    }

    previousDesiredViewRef.current = desiredViewSignature
  }, [
    desiredViewSignature,
    viewerState,
  ])

  const applyZoom = useCallback(
    (nextZoomFactor: number) => {
      const constrainedZoom = clamp(
        nextZoomFactor,
        MIN_ZOOM_FACTOR,
        activeViewState.maxUserZoom,
      )
      const nextView = buildDesiredSkyViewState({
        widthPx: size.width,
        heightPx: size.height,
        sensorRatio,
        horizontalFovDeg,
        verticalFovDeg,
        rotationFitPaddingRatio,
        target,
        reticle: {
          ...reticle,
          centerRaDeg: activeViewState.centerRaDeg,
          centerDecDeg: activeViewState.centerDecDeg,
          xNorm: 0.5,
          yNorm: 0.5,
          zoomFactor: constrainedZoom,
        },
      })

      if (imageLayerRef.current) {
        imageLayerRef.current.setView(nextView)
      }

      onViewportChange(
        nextView.centerRaDeg,
        nextView.centerDecDeg,
        constrainedZoom,
      )
    },
    [
      activeViewState,
      horizontalFovDeg,
      onViewportChange,
      reticle,
      rotationFitPaddingRatio,
      sensorRatio,
      size.height,
      size.width,
      target,
      verticalFovDeg,
    ],
  )

  useEffect(() => {
    const containerElement = containerRef.current
    if (!containerElement) {
      return
    }

    const handleWheel = (event: WheelEvent) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest(INTERACTIVE_SELECTOR)
      ) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      const nextZoom =
        event.deltaY > 0
          ? activeViewState.userZoom / safeZoomStepMultiplier
          : activeViewState.userZoom * safeZoomStepMultiplier
      applyZoom(nextZoom)
    }

    containerElement.addEventListener('wheel', handleWheel, {
      passive: false,
      capture: true,
    })

    return () => {
      containerElement.removeEventListener('wheel', handleWheel, true)
    }
  }, [activeViewState.userZoom, applyZoom, safeZoomStepMultiplier])

  useEffect(() => {
    const containerElement = containerRef.current
    if (!containerElement) {
      return
    }

    const handleContextMenu = (event: MouseEvent) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest(NATIVE_CONTEXTMENU_SELECTOR)
      ) {
        return
      }

      event.preventDefault()
    }

    containerElement.addEventListener('contextmenu', handleContextMenu, true)
    return () => {
      containerElement.removeEventListener('contextmenu', handleContextMenu, true)
    }
  }, [])

  useEffect(() => {
    if (!viewerState) {
      return
    }

    if (
      pendingProgrammaticViewRef.current &&
      !viewsMatch(
        {
          centerRaDeg: viewerState.centerRaDeg,
          centerDecDeg: viewerState.centerDecDeg,
          viewWidthDeg: viewerState.viewWidthDeg,
        },
        pendingProgrammaticViewRef.current,
      )
    ) {
      return
    }

    if (
      Math.abs(
        shortestDeltaDegrees(activeViewState.centerRaDeg, reticle.centerRaDeg),
      ) < VIEW_SYNC_EPSILON &&
      Math.abs(activeViewState.centerDecDeg - reticle.centerDecDeg) <
        VIEW_SYNC_EPSILON
    ) {
      return
    }

    lastViewerDrivenViewRef.current = activeViewSignature
    onViewportChange(
      activeViewState.centerRaDeg,
      activeViewState.centerDecDeg,
      reticle.zoomFactor,
    )
  }, [
    activeViewState.centerDecDeg,
    activeViewState.centerRaDeg,
    activeViewSignature,
    onViewportChange,
    reticle.centerDecDeg,
    reticle.centerRaDeg,
    reticle.zoomFactor,
    viewerState,
  ])

  const updatePointerPosition = (pointerId: number, x: number, y: number) => {
    activePointersRef.current.set(pointerId, { x, y })
  }

  const getPinchDistance = () => {
    const pointers = [...activePointersRef.current.values()]
    if (pointers.length !== 2) {
      return null
    }

    return Math.hypot(
      pointers[0].x - pointers[1].x,
      pointers[0].y - pointers[1].y,
    )
  }

  const handlePointerDownCapture = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (
      event.pointerType !== 'touch' ||
      !(event.target instanceof HTMLElement) ||
      event.target.closest(INTERACTIVE_SELECTOR)
    ) {
      return
    }

    updatePointerPosition(event.pointerId, event.clientX, event.clientY)
    if (activePointersRef.current.size !== 2) {
      return
    }

    const startDistance = getPinchDistance()
    if (!startDistance) {
      return
    }

    pinchStateRef.current = {
      startDistance,
      startZoom: reticle.zoomFactor,
    }
    event.preventDefault()
    event.stopPropagation()
  }

  const handlePointerMoveCapture = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (
      event.pointerType !== 'touch' ||
      !activePointersRef.current.has(event.pointerId)
    ) {
      return
    }

    updatePointerPosition(event.pointerId, event.clientX, event.clientY)
    const pinchState = pinchStateRef.current
    const distance = getPinchDistance()
    if (!pinchState || !distance) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    applyZoom(pinchState.startZoom * (distance / pinchState.startDistance))
  }

  const handlePointerEndCapture = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    activePointersRef.current.delete(event.pointerId)
    if (activePointersRef.current.size < 2) {
      pinchStateRef.current = null
    }
  }

  const toggleFullscreen = useCallback(async () => {
    const containerElement = containerRef.current
    if (
      !containerElement ||
      typeof containerElement.requestFullscreen !== 'function'
    ) {
      return
    }

    try {
      if (document.fullscreenElement === containerElement) {
        await document.exitFullscreen()
        return
      }

      await containerElement.requestFullscreen()
    } catch {
      // Ignore fullscreen API rejections triggered by browser policy.
    }
  }, [])

  return (
    <div
      className="sky-viewport"
      ref={containerRef}
      style={{ aspectRatio: viewportAspectRatio }}
      onPointerDownCapture={handlePointerDownCapture}
      onPointerMoveCapture={handlePointerMoveCapture}
      onPointerUpCapture={handlePointerEndCapture}
      onPointerCancelCapture={handlePointerEndCapture}
    >
      <SkyImageLayer
        ref={imageLayerRef}
        containerId={`aladin-${imageLayerId}`}
        desiredViewState={desiredViewState}
        nearbyObjectMarkers={nearbyObjectMarkers}
        nearbyObjectLabelSizePx={nearbyObjectLabelSizePx}
        nearbyObjectLabelColor={nearbyObjectLabelColor}
        surveyId={surveyId}
        surveyColormap={surveyColormap}
        panSpeed={panSpeed}
        onViewerStateChange={setViewerState}
      />

      <div className="sky-overlay">
        <div className="sky-metrics">
          <p>{target ? target.name : 'No target resolved'}</p>
          <p>
            RA {centerRaLabel} | Dec {centerDecLabel}
          </p>
        </div>

        {showFramingReadout ? (
          <div
            className="reticle-readout"
            style={{
              left: `calc(50% - ${activeViewState.reticleSize.widthPx / 2}px + 0.35rem)`,
              top: `calc(50% - ${activeViewState.reticleSize.heightPx / 2}px - 0.45rem)`,
            }}
          >
            <p>
              FOV {horizontalFovDeg.toFixed(2)} x {verticalFovDeg.toFixed(2)} deg
            </p>
            <p>{imageScaleArcsecPerPixel.toFixed(3)} arcsec/px</p>
            <p>Rot {reticle.rotationDeg.toFixed(1)} deg</p>
          </div>
        ) : null}

        <div className="viewport-utility-controls">
          <button
            type="button"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              void toggleFullscreen()
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {isFullscreen ? (
                <>
                  <path d="M9 9H4V4" />
                  <path d="M15 9h5V4" />
                  <path d="M20 15v5h-5" />
                  <path d="M4 20v-5h5" />
                </>
              ) : (
                <>
                  <path d="M9 4H4v5" />
                  <path d="M15 4h5v5" />
                  <path d="M20 15v5h-5" />
                  <path d="M4 15v5h5" />
                </>
              )}
            </svg>
          </button>
        </div>

        {overlayControls}

        <ReticleOverlayLayer
          reticleSize={activeViewState.reticleSize}
          rotationDeg={reticle.rotationDeg}
          onReticleRotate={onReticleRotate}
        />

        <div className="viewport-controls">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              applyZoom(activeViewState.userZoom / safeZoomStepMultiplier)
            }}
          >
            -
          </button>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              applyZoom(activeViewState.userZoom * safeZoomStepMultiplier)
            }}
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}
