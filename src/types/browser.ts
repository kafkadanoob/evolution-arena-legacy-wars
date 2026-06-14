/**
 * browser.type.ts
 *
 * BrowserFilters type. If your existing file already has some of these fields,
 * merge rather than replace — add any missing fields only.
 *
 * Fields added/confirmed:
 *   - traitSearch: string (was likely already present given the UI exists)
 *   - customizedOnly: boolean (same)
 *   - minActionPoints: number
 *   - awakenedOnly: boolean
 *   - hasCanvasHistory: boolean
 */

export interface BrowserFilters {
  traitSearch: string
  minActionPoints: number
  customizedOnly: boolean
  awakenedOnly: boolean
  hasCanvasHistory: boolean
}

export const DEFAULT_BROWSER_FILTERS: BrowserFilters = {
  traitSearch: '',
  minActionPoints: 0,
  customizedOnly: false,
  awakenedOnly: false,
  hasCanvasHistory: false,
}