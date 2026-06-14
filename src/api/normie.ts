import { fetchJson, fetchText } from '@/api/client'
import { NORMIES_API_BASE } from '@/constants/api'
import type {
  CanvasDiff,
  CanvasInfo,
  HistoryVersion,
  NormieOwner,
  NormieTraits,
} from '@/types/normie'

export async function getNormiePixels(id: number): Promise<string> {
  return fetchText(`/normie/${id}/pixels`)
}

export async function getNormieOriginalPixels(id: number): Promise<string> {
  return fetchText(`/normie/${id}/original/pixels`)
}

export async function getNormieTraits(id: number): Promise<NormieTraits> {
  return fetchJson<NormieTraits>(`/normie/${id}/traits`)
}

export async function getNormieCanvasPixels(id: number): Promise<string> {
  return fetchText(`/normie/${id}/canvas/pixels`)
}

export async function getNormieCanvasDiff(id: number): Promise<CanvasDiff> {
  return fetchJson<CanvasDiff>(`/normie/${id}/canvas/diff`)
}

export async function getNormieCanvasInfo(id: number): Promise<CanvasInfo> {
  return fetchJson<CanvasInfo>(`/normie/${id}/canvas/info`)
}

export async function getNormieOwner(id: number): Promise<NormieOwner | null> {
  try {
    return await fetchJson<NormieOwner>(`/normie/${id}/owner`)
  } catch (e) {
    if (e && typeof e === 'object' && 'status' in e && (e as { status: number }).status === 404) {
      return null
    }
    throw e
  }
}

export async function getNormieHistoryVersions(id: number): Promise<HistoryVersion[]> {
  return fetchJson<HistoryVersion[]>(`/history/normie/${id}/versions?limit=20`)
}

/** Burned Normies persist as SSTORE2 images (no /pixels endpoint) */
export function getBurnedNormieImageUrl(id: number, format: 'png' | 'svg' = 'png'): string {
  return `${NORMIES_API_BASE}/history/burned/${id}/image.${format}`
}

/** Agent persona for Legacy mode flavor (when awakened) */
export async function getNormieAgentPersona(id: number): Promise<Record<string, unknown> | null> {
  try {
    return await fetchJson<Record<string, unknown>>(`/agents/info/${id}`)
  } catch {
    return null
  }
}

export interface HolderNormies {
  address: string
  tokenIds: string[]
}

export interface NormieMetadata {
  name: string
  attributes: Array<{
    trait_type: string
    value: string | number
    display_type?: string
  }>
}

export interface AgentListItem {
  agentId: string
  tokenId: string
  name: string
  type: string
  registeredBy: string
  registeredAt: string
  txHash: string
}

export interface AgentsListResponse {
  items: AgentListItem[]
  hasMore: boolean
}

export interface AgentBindingResponse {
  binding: {
    agentId: string
    tokenId: string
    registeredBy: string
  } | null
}

export async function getHolderNormies(address: string): Promise<HolderNormies> {
  const normalized = address.trim().toLowerCase()
  return fetchJson<HolderNormies>(`/holders/${normalized}`)
}

export async function getNormieMetadata(id: number): Promise<NormieMetadata> {
  return fetchJson<NormieMetadata>(`/normie/${id}/metadata`)
}

export async function getAgentsList(limit = 24): Promise<AgentsListResponse> {
  return fetchJson<AgentsListResponse>(`/agents/list?limit=${limit}&sort=newest`)
}

export async function getAgentBinding(id: number): Promise<AgentBindingResponse> {
  return fetchJson<AgentBindingResponse>(`/agents/binding/${id}`)
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const data = await fetchJson<{ status: string }>('/health', { cache: false })
    return data.status === 'ok'
  } catch {
    return false
  }
}
