import { EquipmentPanel } from './components/EquipmentPanel'
import { LibraryPanel } from './components/LibraryPanel'
import { SettingsPanel } from './components/SettingsPanel'
import { SkyViewport } from './components/SkyViewport'
import { TargetSearchPanel } from './components/TargetSearchPanel'
import { ViewportControlDock } from './components/ViewportControlDock'
import { getSkySurveyConfig } from './domain/skySurvey'
import { useFramingState } from './state/useFramingState'

const dockIcons = {
  target: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="6.25" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M12 3.5v2.5M12 18v2.5M3.5 12H6M18 12h2.5" />
    </svg>
  ),
  equipment: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 8.5h2l1.2-2h4.6l1.2 2h1.8A1.5 1.5 0 0 1 19 10v7.5A1.5 1.5 0 0 1 17.5 19h-11A1.5 1.5 0 0 1 5 17.5V10a1.5 1.5 0 0 1 1.5-1.5Z" />
      <circle cx="12" cy="13.25" r="3.2" />
      <path d="M8 8.5h1" />
    </svg>
  ),
  presets: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 4.5h10a1.5 1.5 0 0 1 1.5 1.5v13L12 15.75 5.5 19V6A1.5 1.5 0 0 1 7 4.5Z" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h10" />
      <path d="M18 6h2" />
      <path d="M4 12h5" />
      <path d="M13 12h7" />
      <path d="M4 18h16" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="11" cy="12" r="2" />
      <circle cx="8" cy="18" r="2" />
    </svg>
  ),
  reset: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 11a8 8 0 1 1-2.34-5.66" />
      <path d="M20 4v5h-5" />
    </svg>
  ),
}

function App() {
  const framing = useFramingState()
  const sensorRatio =
    framing.equipment.sensorHeightMm > 0
      ? framing.equipment.sensorWidthMm / framing.equipment.sensorHeightMm
      : 1
  const skySurvey = getSkySurveyConfig(framing.settings.skySurvey)

  return (
    <div className="app-shell">
      <header className="app-header">
        <p className="eyebrow">Imaging Toolbox MVP</p>
        <h1>Astrophotography Framing</h1>
        <p className="subhead">
          Resolve targets, tune equipment, and place a single reticle quickly on
          mobile.
        </p>
        {framing.statusMessage ? (
          <p className="status-message" role="status">
            {framing.statusMessage}
          </p>
        ) : null}
      </header>

      <main className="layout">
        <section className="sky-column panel sky-panel">
          <SkyViewport
            target={framing.resolvedTarget}
            reticle={framing.reticle}
            sensorRatio={sensorRatio}
            horizontalFovDeg={framing.metrics.horizontalFovDeg}
            verticalFovDeg={framing.metrics.verticalFovDeg}
            imageScaleArcsecPerPixel={framing.metrics.imageScaleArcsecPerPixel}
            zoomStepMultiplier={framing.settings.zoomStepMultiplier}
            panSpeed={framing.settings.panSpeed}
            rotationFitPaddingRatio={framing.settings.rotationFitPaddingRatio}
            showNearbyObjectLabels={framing.settings.showNearbyObjectLabels}
            nearbyObjectLabelSizePx={framing.settings.nearbyObjectLabelSizePx}
            nearbyObjectLabelColor={framing.settings.nearbyObjectLabelColor}
            showFramingReadout={framing.settings.showFramingReadout}
            surveyId={skySurvey.surveyId}
            surveyColormap={skySurvey.colormap}
            overlayControls={
              <ViewportControlDock
                sections={[
                  {
                    id: 'target',
                    label: 'Target',
                    icon: dockIcons.target,
                    content: (
                      <TargetSearchPanel
                        targetQuery={framing.targetQuery}
                        onTargetQueryChange={framing.setTargetQuery}
                        onResolve={framing.resolveTargetFromQuery}
                        suggestions={framing.targetSuggestions}
                        onSelectSuggestion={framing.selectSuggestedTarget}
                        resolvedTarget={framing.resolvedTarget}
                        recentTargets={framing.recentTargets}
                        showRecentTargets={framing.settings.showRecentTargets}
                        onSelectRecentTarget={framing.selectSuggestedTarget}
                      />
                    ),
                  },
                  {
                    id: 'equipment',
                    label: 'Equipment',
                    icon: dockIcons.equipment,
                    content: (
                      <EquipmentPanel
                        equipment={framing.equipment}
                        metrics={framing.metrics}
                        onEquipmentChange={framing.updateEquipmentField}
                      />
                    ),
                  },
                  {
                    id: 'presets',
                    label: 'Presets',
                    icon: dockIcons.presets,
                    content: (
                      <LibraryPanel
                        catalogOptics={framing.catalogOptics}
                        catalogCameras={framing.catalogCameras}
                        onApplyCatalogSetup={framing.applyCatalogSetup}
                        presets={framing.presets}
                        sessions={framing.sessions}
                        onSavePreset={framing.savePreset}
                        onLoadPreset={framing.loadPreset}
                        onDeletePreset={framing.deletePreset}
                        onSaveSession={framing.saveSession}
                        onLoadSession={framing.loadSession}
                        onDeleteSession={framing.deleteSession}
                      />
                    ),
                  },
                  {
                    id: 'settings',
                    label: 'Settings',
                    icon: dockIcons.settings,
                    content: (
                      <SettingsPanel
                        settings={framing.settings}
                        onSettingsChange={framing.updateSettingsField}
                        onResetSettings={framing.resetSettings}
                        framingSummaryText={framing.framingSummaryText}
                        onCopyFramingSummary={framing.copyFramingSummary}
                      />
                    ),
                  },
                ]}
                actions={[
                  {
                    id: 'reset',
                    label: 'Reset framing',
                    icon: dockIcons.reset,
                    onClick: framing.resetFraming,
                  },
                ]}
              />
            }
            onViewportChange={framing.updateViewport}
            onReticleRotate={framing.updateReticleRotation}
          />
        </section>
      </main>
    </div>
  )
}

export default App
