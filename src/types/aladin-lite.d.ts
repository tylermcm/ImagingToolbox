declare module 'aladin-lite' {
  export interface AladinSourceOptions {
    marker?: boolean
    popupTitle?: string
    popupDesc?: string
    useMarkerDefaultIcon?: boolean
  }

  export interface AladinSource {
    ra: number
    dec: number
    data: Record<string, unknown>
    isShowing: boolean
    color?: string
    setColor(color: string): void
    setSize(size: number): void
    show(): void
    hide(): void
  }

  export interface AladinCatalogOptions {
    name?: string
    color?: string
    sourceSize?: number
    shape?: string | ((source: AladinSource) => string | HTMLCanvasElement | Image | Array<string | HTMLCanvasElement | Image>)
    displayLabel?: boolean
    labelColor?: string
    labelFont?: string
    labelColumn?: string
    onlyFootprints?: boolean
    readOnly?: boolean
    limit?: number
    raField?: string
    decField?: string
    filter?: (source: AladinSource) => boolean
  }

  export interface AladinCatalog {
    name: string
    addSources(sources: AladinSource[]): void
    removeAll(): void
    clear(): void
    show(): void
    hide(): void
    reportChange(): void
    setColor(color: string): void
    setSourceSize(size: number): void
    setShape(shape: string): void
  }

  export interface AladinInitOptions {
    target?: string
    survey?: string
    fov?: number
    projection?: string
    showReticle?: boolean
    showCooGrid?: boolean
    showZoomControl?: boolean
    showFullscreenControl?: boolean
    showLayersControl?: boolean
    showGotoControl?: boolean
    showProjectionControl?: boolean
    showFrame?: boolean
  }

  export interface Aladin {
    getRaDec(): [number, number]
    getFov(): [number, number]
    gotoRaDec(raDeg: number, decDeg: number): void
    setFov(fovDeg: number): void
    addCatalog(catalog: AladinCatalog): void
    removeOverlay(overlay: AladinCatalog | string): void
    setImageSurvey?(surveyId: string): void
    getBaseImageLayer?(): {
      setColormap?(name: 'native' | 'grayscale'): void
    } | null
  }

  export interface AladinModule {
    init: Promise<void>
    aladin(selector: string, options?: AladinInitOptions): Aladin
    source(
      raDeg: number,
      decDeg: number,
      data?: Record<string, unknown>,
      options?: AladinSourceOptions,
    ): AladinSource
    catalog(options?: AladinCatalogOptions): AladinCatalog
  }

  const A: AladinModule
  export default A
}
