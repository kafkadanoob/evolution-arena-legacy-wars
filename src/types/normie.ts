export type PixelGrid = boolean[][]

export interface NormieTraitAttribute {
  trait_type: string
  value: string
  display_type?: string
}

export interface NormieTraits {
  raw: string
  attributes: NormieTraitAttribute[]
}

export interface CanvasDiff {
  added: { x: number; y: number }[]
  removed: { x: number; y: number }[]
  addedCount: number
  removedCount: number
  netChange: number
}

export interface CanvasInfo {
  actionPoints: number
  level: number
  customized: boolean
  delegate: string
  delegateSetBy: string
}

export interface NormieOwner {
  tokenId: string
  owner: string
}

export interface HistoryVersion {
  version: number
  changeCount: number
  newPixelCount: number
  transformer: string
  blockNumber: string
  timestamp: string
  txHash: string
}

export type NormieLoadState = 'idle' | 'loading' | 'success' | 'error'

export interface NormieRenderHighlight {
  /** Linear index 0–1599 or coordinate */
  indices?: number[]
  coords?: { x: number; y: number }[]
  color?: string
}
