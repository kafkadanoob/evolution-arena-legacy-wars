import { useEffect, useState } from 'react'
import { NORMIE_SCALE } from '@/constants/renderer'

/** Responsive integer scale for detail preview (20–24 range) */
export function useNormiePreviewScale(): number {
  const [scale, setScale] = useState<number>(NORMIE_SCALE.previewSm)

  useEffect(() => {
    const lg = window.matchMedia('(min-width: 1024px)')
    const md = window.matchMedia('(min-width: 640px)')

    const update = () => {
      if (lg.matches) setScale(NORMIE_SCALE.preview)
      else if (md.matches) setScale(NORMIE_SCALE.previewMd)
      else setScale(NORMIE_SCALE.previewSm)
    }

    update()
    lg.addEventListener('change', update)
    md.addEventListener('change', update)
    return () => {
      lg.removeEventListener('change', update)
      md.removeEventListener('change', update)
    }
  }, [])

  return scale
}
