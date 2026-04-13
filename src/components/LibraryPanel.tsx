import { useMemo, useState } from 'react'
import type {
  CameraCatalogEntry,
  OpticsCatalogEntry,
} from '../domain/equipmentCatalog'
import type { EquipmentPreset, FramingSession } from '../domain/types'

interface LibraryPanelProps {
  catalogOptics: OpticsCatalogEntry[]
  catalogCameras: CameraCatalogEntry[]
  onApplyCatalogSetup: (opticsId: string, cameraId: string) => void
  presets: EquipmentPreset[]
  sessions: FramingSession[]
  onSavePreset: (name: string) => boolean
  onLoadPreset: (id: string) => void
  onDeletePreset: (id: string) => void
  onSaveSession: (name: string) => boolean
  onLoadSession: (id: string) => void
  onDeleteSession: (id: string) => void
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

const CAMERA_CATEGORY_ORDER: CameraCatalogEntry['category'][] = [
  'Astro camera',
  'Mirrorless',
  'DSLR',
  'Camera',
]

export function LibraryPanel({
  catalogOptics,
  catalogCameras,
  onApplyCatalogSetup,
  presets,
  sessions,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
  onSaveSession,
  onLoadSession,
  onDeleteSession,
}: LibraryPanelProps) {
  const [presetName, setPresetName] = useState('')
  const [sessionName, setSessionName] = useState('')
  const [selectedOpticsId, setSelectedOpticsId] = useState(catalogOptics[0]?.id ?? '')
  const [selectedCameraId, setSelectedCameraId] = useState(catalogCameras[0]?.id ?? '')
  const activeOpticsId = catalogOptics.some((optics) => optics.id === selectedOpticsId)
    ? selectedOpticsId
    : (catalogOptics[0]?.id ?? '')
  const activeCameraId = catalogCameras.some((camera) => camera.id === selectedCameraId)
    ? selectedCameraId
    : (catalogCameras[0]?.id ?? '')

  const selectedOptics = useMemo(
    () => catalogOptics.find((optics) => optics.id === activeOpticsId) ?? null,
    [activeOpticsId, catalogOptics],
  )
  const selectedCamera = useMemo(
    () => catalogCameras.find((camera) => camera.id === activeCameraId) ?? null,
    [activeCameraId, catalogCameras],
  )
  const opticsByCategory = useMemo(
    () =>
      [
        {
          category: 'Scope',
          entries: catalogOptics.filter((optics) => optics.category === 'Scope'),
        },
        {
          category: 'Lens',
          entries: catalogOptics.filter((optics) => optics.category === 'Lens'),
        },
      ].filter((group) => group.entries.length > 0),
    [catalogOptics],
  )
  const camerasByCategory = useMemo(
    () =>
      CAMERA_CATEGORY_ORDER.map((category) => ({
        category,
        entries: catalogCameras.filter((camera) => camera.category === category),
      })).filter((group) => group.entries.length > 0),
    [catalogCameras],
  )

  return (
    <div className="panel-section">
      <h2>Presets & Sessions</h2>
      <p className="section-caption">
        Load a researched starter rig, save your own equipment profiles, and
        keep complete framing sessions in local storage.
      </p>

      <div className="catalog-library">
        <div className="catalog-grid">
          <label className="input-row">
            <span>Common optics</span>
            <select
              value={activeOpticsId}
              onChange={(event) => setSelectedOpticsId(event.target.value)}
            >
              {opticsByCategory.map((group) => (
                <optgroup key={group.category} label={group.category}>
                  {group.entries.map((optics) => (
                    <option key={optics.id} value={optics.id}>
                      {optics.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <label className="input-row">
            <span>Common cameras</span>
            <select
              value={activeCameraId}
              onChange={(event) => setSelectedCameraId(event.target.value)}
            >
              {camerasByCategory.map((group) => (
                <optgroup key={group.category} label={group.category}>
                  {group.entries.map((camera) => (
                    <option key={camera.id} value={camera.id}>
                      {camera.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        </div>

        {selectedOptics ? (
          <p className="catalog-meta">
            {selectedOptics.category}: {selectedOptics.kind} | {selectedOptics.focalLengthLabel}
          </p>
        ) : null}
        {selectedCamera ? (
          <p className="catalog-meta">
            Camera: {selectedCamera.category} | {formatNumber(selectedCamera.sensorWidthMm)} x{' '}
            {formatNumber(selectedCamera.sensorHeightMm)} mm |{' '}
            {selectedCamera.pixelSizeUm
              ? `${formatNumber(selectedCamera.pixelSizeUm)} um`
              : 'pixel size unavailable'}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => onApplyCatalogSetup(activeOpticsId, activeCameraId)}
          disabled={!activeOpticsId || !activeCameraId}
        >
          Load catalog setup
        </button>
      </div>

      <div className="form-grid compact">
        <label className="input-row">
          <span>New equipment preset</span>
          <div className="action-row">
            <input
              type="text"
              value={presetName}
              onChange={(event) => setPresetName(event.target.value)}
              placeholder="e.g. 80mm refractor + APS-C"
            />
            <button
              type="button"
              onClick={() => {
                if (onSavePreset(presetName)) {
                  setPresetName('')
                }
              }}
            >
              Save
            </button>
          </div>
        </label>
      </div>

      <ul className="saved-list">
        {presets.length === 0 ? <li className="empty">No presets saved.</li> : null}
        {presets.map((preset) => (
          <li key={preset.id}>
            <div>
              <p className="saved-name">{preset.name}</p>
              <p className="saved-meta">{formatDate(preset.createdAt)}</p>
            </div>
            <div className="item-actions">
              <button type="button" onClick={() => onLoadPreset(preset.id)}>
                Load
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => onDeletePreset(preset.id)}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="form-grid compact top-gap">
        <label className="input-row">
          <span>New framing session</span>
          <div className="action-row">
            <input
              type="text"
              value={sessionName}
              onChange={(event) => setSessionName(event.target.value)}
              placeholder="e.g. Rosette widefield setup"
            />
            <button
              type="button"
              onClick={() => {
                if (onSaveSession(sessionName)) {
                  setSessionName('')
                }
              }}
            >
              Save
            </button>
          </div>
        </label>
      </div>

      <ul className="saved-list">
        {sessions.length === 0 ? <li className="empty">No sessions saved.</li> : null}
        {sessions.map((session) => (
          <li key={session.id}>
            <div>
              <p className="saved-name">{session.name}</p>
              <p className="saved-meta">{formatDate(session.updatedAt)}</p>
            </div>
            <div className="item-actions">
              <button type="button" onClick={() => onLoadSession(session.id)}>
                Load
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => onDeleteSession(session.id)}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
