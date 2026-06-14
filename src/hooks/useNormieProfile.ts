import { useCallback, useEffect, useState } from 'react'
import { NormiesApiError } from '@/api/client'
import {
  getAgentBinding,
  getNormieCanvasDiff,
  getNormieCanvasInfo,
  getNormieHistoryVersions,
  getNormieMetadata,
  getNormieOwner,
  getNormieTraits,
  getNormieAgentPersona,
} from '@/api/normie'
import { clampNormieId } from '@/lib/utils'
import type { CanvasDiff, CanvasInfo, HistoryVersion, NormieOwner, NormieTraits } from '@/types/normie'
import type { NormieMetadata } from '@/api/normie'

export type ProfileLoadState = 'idle' | 'loading' | 'success' | 'error'

export interface NormieProfile {
  state: ProfileLoadState
  id: number
  traits: NormieTraits | null
  canvasInfo: CanvasInfo | null
  canvasDiff: CanvasDiff | null
  owner: NormieOwner | null
  historyVersions: HistoryVersion[]
  metadata: NormieMetadata | null
  agentName: string | null
  isAwakened: boolean
  isBurned: boolean
  pixelCount: number | null
  error: string | null
  refetch: () => void
}

function pixelCountFromMetadata(meta: NormieMetadata | null): number | null {
  if (!meta) return null
  const attr = meta.attributes.find((a) => a.trait_type === 'Pixel Count')
  return attr != null ? Number(attr.value) : null
}

export function useNormieProfile(normieId: number | null): NormieProfile {
  const id = normieId != null ? clampNormieId(normieId) : -1
  const enabled = normieId != null && id >= 0
  const [state, setState] = useState<ProfileLoadState>('idle')
  const [traits, setTraits] = useState<NormieTraits | null>(null)
  const [canvasInfo, setCanvasInfo] = useState<CanvasInfo | null>(null)
  const [canvasDiff, setCanvasDiff] = useState<CanvasDiff | null>(null)
  const [owner, setOwner] = useState<NormieOwner | null>(null)
  const [historyVersions, setHistoryVersions] = useState<HistoryVersion[]>([])
  const [metadata, setMetadata] = useState<NormieMetadata | null>(null)
  const [agentName, setAgentName] = useState<string | null>(null)
  const [isAwakened, setIsAwakened] = useState(false)
  const [isBurned, setIsBurned] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    async function load() {
      setState('loading')
      setError(null)
      setIsBurned(false)

      try {
        const [
          traitsRes,
          canvasRes,
          diffRes,
          ownerRes,
          historyRes,
          metaRes,
          bindingRes,
        ] = await Promise.allSettled([
          getNormieTraits(id),
          getNormieCanvasInfo(id),
          getNormieCanvasDiff(id),
          getNormieOwner(id),
          getNormieHistoryVersions(id),
          getNormieMetadata(id),
          getAgentBinding(id),
        ])

        if (cancelled) return

        const traitsOk = traitsRes.status === 'fulfilled' ? traitsRes.value : null
        const metaOk = metaRes.status === 'fulfilled' ? metaRes.value : null

        if (traitsRes.status === 'rejected' && metaRes.status === 'rejected') {
          const err = traitsRes.reason
          if (err instanceof NormiesApiError && err.status === 404) {
            setIsBurned(true)
            setState('success')
            setTraits(null)
            setCanvasInfo(null)
            setCanvasDiff(null)
            setOwner(null)
            setHistoryVersions([])
            setMetadata(null)
            setAgentName(null)
            setIsAwakened(false)
            return
          }
          throw err
        }

        setTraits(traitsOk)
        setCanvasInfo(canvasRes.status === 'fulfilled' ? canvasRes.value : null)
        setCanvasDiff(diffRes.status === 'fulfilled' ? diffRes.value : null)
        setOwner(ownerRes.status === 'fulfilled' ? ownerRes.value : null)
        setHistoryVersions(historyRes.status === 'fulfilled' ? historyRes.value : [])
        setMetadata(metaOk)

        if (bindingRes.status === 'fulfilled' && bindingRes.value.binding) {
          setIsAwakened(true)
          const persona = await getNormieAgentPersona(id).catch(() => null)
          const name =
            persona && typeof persona.name === 'string'
              ? persona.name
              : `Agent #${bindingRes.value.binding!.agentId}`
          if (!cancelled) setAgentName(name)
        } else {
          setIsAwakened(false)
          setAgentName(null)
        }

        if (ownerRes.status === 'rejected') {
          const err = ownerRes.reason
          if (err instanceof NormiesApiError && err.status === 404) {
            setIsBurned(true)
          }
        }

        setState('success')
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load profile')
        setState('error')
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id, enabled, tick])

  return {
    state,
    id,
    traits,
    canvasInfo,
    canvasDiff,
    owner,
    historyVersions,
    metadata,
    agentName,
    isAwakened,
    isBurned,
    pixelCount: pixelCountFromMetadata(metadata),
    error,
    refetch,
  }
}
