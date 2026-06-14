import { useEffect, useState } from 'react'
import { getAgentsList, type AgentListItem } from '@/api/normie'

export function useFeaturedAgents() {
  const [agents, setAgents] = useState<AgentListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getAgentsList(24)
      .then((res) => {
        if (!cancelled) {
          setAgents(res.items)
          setLoading(false)
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load agents')
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { agents, loading, error }
}
