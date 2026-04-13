import { useEffect, useRef } from 'react'
import { normalizeDegrees } from '../../domain/framingMath'
import type { FrameSize } from '../../domain/skyProjection'

interface ReticleOverlayLayerProps {
  reticleSize: FrameSize
  rotationDeg: number
  onReticleRotate: (rotationDeg: number) => void
}

export function ReticleOverlayLayer({
  reticleSize,
  rotationDeg,
  onReticleRotate,
}: ReticleOverlayLayerProps) {
  const layerRef = useRef<HTMLDivElement | null>(null)
  const rotatingRef = useRef(false)

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (!rotatingRef.current || !layerRef.current) {
        return
      }

      const bounds = layerRef.current.getBoundingClientRect()
      const centerX = bounds.left + bounds.width * 0.5
      const centerY = bounds.top + bounds.height * 0.5
      const angle = Math.atan2(event.clientY - centerY, event.clientX - centerX)
      onReticleRotate(normalizeDegrees((angle * 180) / Math.PI + 90))
    }

    const onPointerUp = () => {
      rotatingRef.current = false
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [onReticleRotate])

  return (
    <div className="reticle-layer" ref={layerRef}>
      <div
        className="reticle"
        style={{
          left: '50%',
          top: '50%',
          width: `${reticleSize.widthPx}px`,
          height: `${reticleSize.heightPx}px`,
          transform: `translate(-50%, -50%) rotate(${rotationDeg}deg)`,
        }}
      >
        <button
          type="button"
          aria-label="Rotate reticle"
          className="rotate-handle"
          onPointerDown={(event) => {
            event.preventDefault()
            event.stopPropagation()
            rotatingRef.current = true
          }}
        />
      </div>
    </div>
  )
}
