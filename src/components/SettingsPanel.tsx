import { SKY_SURVEY_OPTIONS } from '../domain/skySurvey'
import type { FramingSettings } from '../domain/types'

interface SettingsPanelProps {
  settings: FramingSettings
  onSettingsChange: <K extends keyof FramingSettings>(
    field: K,
    value: FramingSettings[K],
  ) => void
  onResetSettings: () => void
  framingSummaryText: string
  onCopyFramingSummary: () => void
}

interface SettingField {
  key:
    | 'defaultZoomFactor'
    | 'zoomStepMultiplier'
    | 'panSpeed'
    | 'rotationFitPaddingRatio'
  label: string
  min: number
  max: number
  step: number
  help: string
}

const NUMBER_FIELDS: SettingField[] = [
  {
    key: 'defaultZoomFactor',
    label: 'Default zoom',
    min: 0.25,
    max: 8,
    step: 0.01,
    help: 'Used on first load and when resetting framing.',
  },
  {
    key: 'zoomStepMultiplier',
    label: 'Zoom step multiplier',
    min: 1.02,
    max: 2,
    step: 0.01,
    help: 'Controls each wheel-click and button zoom step.',
  },
  {
    key: 'panSpeed',
    label: 'Pan speed',
    min: 0.25,
    max: 3,
    step: 0.05,
    help: 'Scales how far the sky moves while dragging.',
  },
  {
    key: 'rotationFitPaddingRatio',
    label: 'Sensor edge padding',
    min: 0,
    max: 0.3,
    step: 0.01,
    help: 'Viewport margin reserved while auto-fitting a rotated sensor.',
  },
]

const TOGGLE_FIELDS: Array<{
  key: 'showNearbyObjectLabels' | 'showFramingReadout' | 'showRecentTargets' | 'showCopyableFramingSummary'
  label: string
  help: string
}> = [
  {
    key: 'showNearbyObjectLabels',
    label: 'Nearby object labels',
    help: 'Show nearby DSO labels over the sky survey.',
  },
  {
    key: 'showFramingReadout',
    label: 'Framing readout',
    help: 'Show FOV, image scale, and rotation near the reticle.',
  },
  {
    key: 'showRecentTargets',
    label: 'Recent targets',
    help: 'Show recently resolved targets in the search panel.',
  },
  {
    key: 'showCopyableFramingSummary',
    label: 'Copyable summary',
    help: 'Show a one-click copyable summary of the current framing.',
  },
]

function formatSettingValue(key: keyof FramingSettings, value: number): string {
  if (key === 'rotationFitPaddingRatio') {
    return `${(value * 100).toFixed(0)}%`
  }

  return value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

export function SettingsPanel({
  settings,
  onSettingsChange,
  onResetSettings,
  framingSummaryText,
  onCopyFramingSummary,
}: SettingsPanelProps) {
  return (
    <div className="panel-section">
      <h2>Settings</h2>
      <p className="section-caption">
        Tune viewport defaults and interaction behavior without changing your
        saved presets or sessions.
      </p>

      <div className="form-grid">
        {NUMBER_FIELDS.map((field) => (
          <label key={field.key} className="input-row">
            <span>{field.label}</span>
            <input
              type="number"
              inputMode="decimal"
              min={field.min}
              max={field.max}
              step={field.step}
              value={settings[field.key]}
              onChange={(event) => {
                const parsed = Number.parseFloat(event.target.value)
                onSettingsChange(
                  field.key,
                  Number.isFinite(parsed) ? parsed : settings[field.key],
                )
              }}
            />
            <span className="input-help">
              {field.help} Current: {formatSettingValue(field.key, settings[field.key])}
            </span>
          </label>
        ))}
      </div>

      <div className="settings-toggle-grid">
        {TOGGLE_FIELDS.map((field) => (
          <label key={field.key} className="toggle-row">
            <input
              type="checkbox"
              checked={settings[field.key]}
              onChange={(event) =>
                onSettingsChange(field.key, event.target.checked)
              }
            />
            <span>
              <strong>{field.label}</strong>
              <em>{field.help}</em>
            </span>
          </label>
        ))}
      </div>

      <div className="settings-subsection">
        <p className="summary-title">Nearby label styling</p>
        <p className="input-help">
          Adjust the object label size and color used for markers in the sky
          viewer.
        </p>
        <div className="form-grid compact">
          <label className="input-row">
            <span>Nearby label size</span>
            <input
              type="number"
              inputMode="decimal"
              min={8}
              max={24}
              step={1}
              value={settings.nearbyObjectLabelSizePx}
              onChange={(event) => {
                const parsed = Number.parseFloat(event.target.value)
                onSettingsChange(
                  'nearbyObjectLabelSizePx',
                  Number.isFinite(parsed) ? parsed : settings.nearbyObjectLabelSizePx,
                )
              }}
            />
            <span className="input-help">
              Current: {settings.nearbyObjectLabelSizePx.toFixed(0)} px
            </span>
          </label>

          <label className="input-row">
            <span>Nearby label color</span>
            <input
              className="color-input"
              type="color"
              value={settings.nearbyObjectLabelColor}
              onChange={(event) =>
                onSettingsChange('nearbyObjectLabelColor', event.target.value)
              }
            />
            <span className="input-help">
              Current: <span className="mono">{settings.nearbyObjectLabelColor}</span>
            </span>
          </label>
        </div>
      </div>

      <label className="input-row">
        <span>Survey</span>
        <select
          value={settings.skySurvey}
          onChange={(event) =>
            onSettingsChange(
              'skySurvey',
              event.target.value as FramingSettings['skySurvey'],
            )
          }
        >
          {SKY_SURVEY_OPTIONS.map((survey) => (
            <option key={survey.option} value={survey.option}>
              {survey.label}
            </option>
          ))}
        </select>
        <span className="input-help">
          Switch the survey layer in the sky viewer. Current:{' '}
          {SKY_SURVEY_OPTIONS.find((survey) => survey.option === settings.skySurvey)?.label ??
            'DSS2 color'}
        </span>
      </label>

      {settings.showCopyableFramingSummary ? (
        <div className="summary-card">
          <div>
            <p className="summary-title">Framing summary</p>
            <p className="input-help">
              Copy a text summary of the current target, equipment, and framing state.
            </p>
          </div>
          <textarea readOnly value={framingSummaryText} className="summary-textarea" />
          <button type="button" onClick={onCopyFramingSummary}>
            Copy framing summary
          </button>
        </div>
      ) : null}

      <button type="button" className="secondary" onClick={onResetSettings}>
        Reset settings
      </button>
    </div>
  )
}
