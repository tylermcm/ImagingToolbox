import type { ImagingMetrics } from '../domain/framingMath'
import type { EquipmentConfig } from '../domain/types'

interface EquipmentPanelProps {
  equipment: EquipmentConfig
  metrics: ImagingMetrics
  onEquipmentChange: (field: keyof EquipmentConfig, value: number) => void
}

interface FieldDescriptor {
  key: keyof EquipmentConfig
  label: string
  min: number
  step: number
}

const FIELDS: FieldDescriptor[] = [
  {
    key: 'focalLengthMm',
    label: 'Focal length (mm)',
    min: 10,
    step: 1,
  },
  {
    key: 'multiplier',
    label: 'Reducer / barlow multiplier',
    min: 0.1,
    step: 0.01,
  },
  {
    key: 'sensorWidthMm',
    label: 'Sensor width (mm)',
    min: 1,
    step: 0.1,
  },
  {
    key: 'sensorHeightMm',
    label: 'Sensor height (mm)',
    min: 1,
    step: 0.1,
  },
  {
    key: 'pixelSizeUm',
    label: 'Pixel size (um)',
    min: 0.1,
    step: 0.01,
  },
]

export function EquipmentPanel({
  equipment,
  metrics,
  onEquipmentChange,
}: EquipmentPanelProps) {
  return (
    <div className="panel-section">
      <h2>Equipment</h2>
      <p className="section-caption">
        Enter your optics and sensor values to compute framing metrics.
      </p>

      <div className="form-grid">
        {FIELDS.map((field) => (
          <label key={field.key} className="input-row">
            <span>{field.label}</span>
            <input
              type="number"
              inputMode="decimal"
              min={field.min}
              step={field.step}
              value={equipment[field.key]}
              onChange={(event) => {
                const parsed = Number.parseFloat(event.target.value)
                onEquipmentChange(field.key, Number.isFinite(parsed) ? parsed : 0)
              }}
            />
          </label>
        ))}
      </div>

      <div className="metrics-grid">
        <p>
          Effective focal length
          <strong>{metrics.effectiveFocalLengthMm.toFixed(1)} mm</strong>
        </p>
        <p>
          Horizontal FOV
          <strong>{metrics.horizontalFovDeg.toFixed(3)} deg</strong>
        </p>
        <p>
          Vertical FOV
          <strong>{metrics.verticalFovDeg.toFixed(3)} deg</strong>
        </p>
        <p>
          Diagonal FOV
          <strong>{metrics.diagonalFovDeg.toFixed(3)} deg</strong>
        </p>
        <p>
          Image scale
          <strong>{metrics.imageScaleArcsecPerPixel.toFixed(3)} arcsec/px</strong>
        </p>
      </div>
    </div>
  )
}
