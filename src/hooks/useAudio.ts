/**
 * useAudio.ts
 *
 * Web Audio API hook for battle sound effects.
 * All sounds are synthesized — no audio files needed.
 * Gracefully silent if Web Audio is unavailable (older browsers).
 */

import { useCallback, useRef } from 'react'

type SoundType = 'hit' | 'crit' | 'powerMove' | 'eliminate' | 'victory' | 'roundStart'

export function useBattleAudio() {
  const ctxRef = useRef<AudioContext | null>(null)

  const getCtx = useCallback((): AudioContext | null => {
    if (typeof window === 'undefined') return null
    if (!ctxRef.current) {
      try {
        ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      } catch {
        return null
      }
    }
    // Resume if suspended (browser autoplay policy)
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume().catch(() => {})
    }
    return ctxRef.current
  }, [])

  const play = useCallback((type: SoundType) => {
    const ctx = getCtx()
    if (!ctx) return

    switch (type) {
      case 'hit': {
        // Short noise burst
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate)
        const data = buf.getChannelData(0)
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
        const src = ctx.createBufferSource()
        src.buffer = buf
        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.18, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
        src.connect(gain).connect(ctx.destination)
        src.start()
        break
      }
      case 'crit': {
        // Two-tone crunch
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(220, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.18)
        gain.gain.setValueAtTime(0.25, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
        osc.connect(gain).connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.2)
        break
      }
      case 'powerMove': {
        // Rising sweep + impact
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'square'
        osc.frequency.setValueAtTime(80, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15)
        osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.35)
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        osc.connect(gain).connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.4)
        break
      }
      case 'eliminate': {
        // Descending tone
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(440, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.5)
        gain.gain.setValueAtTime(0.2, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
        osc.connect(gain).connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.5)
        break
      }
      case 'victory': {
        // Ascending arpeggio
        const notes = [261.63, 329.63, 392, 523.25]
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const t = ctx.currentTime + i * 0.12
          osc.type = 'triangle'
          osc.frequency.setValueAtTime(freq, t)
          gain.gain.setValueAtTime(0, t)
          gain.gain.linearRampToValueAtTime(0.2, t + 0.04)
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
          osc.connect(gain).connect(ctx.destination)
          osc.start(t)
          osc.stop(t + 0.4)
        })
        break
      }
      case 'roundStart': {
        // Short blip
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(660, ctx.currentTime)
        gain.gain.setValueAtTime(0.12, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
        osc.connect(gain).connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.08)
        break
      }
    }
  }, [getCtx])

  return { play }
}