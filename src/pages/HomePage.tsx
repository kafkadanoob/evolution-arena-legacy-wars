import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { NormieRendererWithMeta } from '@/components/normie/NormieRenderer'
import { Button } from '@/components/ui/button'
import { clampNormieId } from '@/lib/utils'
import { PixelFieldCanvas } from '@/components/PixelFieldCanvas'

function randomNormieId() {
  return Math.floor(Math.random() * 10000)
}

export function HomePage() {
  const [demoId, setDemoId] = useState(() => randomNormieId())
  const userEditing = useRef(false)
  const editTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>

    const scheduleNext = () => {
      const delay = 8000 + Math.random() * 4000
      timeoutId = setTimeout(() => {
        if (!userEditing.current) setDemoId(randomNormieId())
        scheduleNext()
      }, delay)
    }

    scheduleNext()
    return () => clearTimeout(timeoutId)
  }, [])

  const holdRotation = () => {
    userEditing.current = true
    if (editTimeoutRef.current) clearTimeout(editTimeoutRef.current)
    editTimeoutRef.current = setTimeout(() => {
      userEditing.current = false
    }, 15_000)
  }

  const handleIdChange = (value: number) => {
    setDemoId(clampNormieId(value))
    holdRotation()
  }

  const handleRandom = () => {
    setDemoId(randomNormieId())
    holdRotation()
  }

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden">
      <PixelFieldCanvas />

      
      <div className="pointer-events-none fixed inset-0 z-[1] bg-[radial-gradient(circle_at_25%_40%,rgba(34,197,94,0.14),transparent_34%),radial-gradient(circle_at_72%_42%,rgba(34,197,94,0.08),transparent_30%)]" />

      <div className="relative z-10 grid min-h-[calc(100vh-96px)] w-full gap-8 px-6 py-7 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-24 lg:px-10 lg:py-10">
        <motion.section
          className="flex min-w-0 flex-col items-start gap-5 text-left sm:items-center sm:text-center lg:translate-x-6 xl:translate-x-10"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex w-fit items-center gap-2 rounded border border-arena-glow/40 bg-black/50 px-3 py-2 font-pixel text-[9px] uppercase tracking-widest text-arena-glow shadow-[0_0_18px_#22c55e33]">
            Built by Kafka
          </div>

          <h1
            className="w-full max-w-[22rem] font-pixel text-[2.15rem] font-bold uppercase leading-[1.08] tracking-[0.04em] text-arena-text sm:text-4xl sm:tracking-widest lg:text-5xl"
            style={{
              textShadow: '0 0 24px #22c55e66, 0 0 48px #22c55e22',
              WebkitTextStroke: '0px',
              paintOrder: 'fill stroke',
            }}
          >
            Evolution
            <br />
            <span
              className="text-arena-glow"
              style={{
                textShadow: '0 0 20px #22c55e, 0 0 40px #22c55e66',
                WebkitTextStroke: '0px',
              }}
            >
              Arena
            </span>
            <br />
            Legacy Wars
          </h1>

          <div className="w-full max-w-xl space-y-3">
            <p className="font-mono text-sm leading-7 text-arena-text/85 sm:text-base">
              On-chain Normies enter a pixel-burn arena where every fight is
              simulated from live canvas data, traits, history, and legacy.
            </p>
            <p className="font-mono text-sm leading-7 text-arena-muted">
              Build a squad, assign tactics, and watch each battle carve a visible
              mark into the fighters.
            </p>
          </div>

          <div className="flex w-full max-w-xl flex-wrap gap-2">
            {['Live pixels', 'Trait combat', 'Legacy scoring'].map((label) => (
              <span
                key={label}
                className="rounded border border-arena-border bg-black/35 px-3 py-2 font-pixel text-[8px] uppercase tracking-widest text-arena-muted"
              >
                {label}
              </span>
            ))}
          </div>

          <div className="flex w-full max-w-xl flex-wrap gap-3">
            <Button asChild variant="glow" size="lg">
              <Link to="/arena">Enter Arena</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/normies">Browse Normies</Link>
            </Button>
          </div>
        </motion.section>

        <motion.section
          className="flex flex-col items-center gap-5 lg:pl-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <motion.div
            className="relative overflow-hidden rounded-sm bg-[#030805] p-3"
            style={{
              border: '2px solid #d8ffe833',
              outline: '1px solid #22c55e33',
              outlineOffset: '4px',
            }}
            animate={{
              boxShadow: [
                '0 0 14px #22c55e22, inset 0 0 28px #22c55e10',
                '0 0 34px #22c55e55, inset 0 0 42px #22c55e18',
                '0 0 14px #22c55e22, inset 0 0 28px #22c55e10',
              ],
            }}
            transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(34,197,94,0.18),rgba(0,0,0,0)_45%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.24))]" />
            <div className="pointer-events-none absolute inset-0 opacity-35 [background:repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(255,255,255,0.08)_3px,rgba(255,255,255,0.08)_4px)]" />

            <div className="relative z-10 bg-[#111]">
              <NormieRendererWithMeta
                normieId={demoId}
                scale={8}
                crtScanlines
                showBorder={false}
              />
            </div>
          </motion.div>

          <div className="flex w-full max-w-md flex-wrap items-center justify-center gap-3">
            <div className="rounded border border-arena-glow/30 bg-black/50 px-4 py-2 shadow-[0_0_14px_#22c55e1f]">
              <p className="font-mono text-[9px] uppercase tracking-widest text-arena-muted">
                Featured Normie
              </p>
              <p className="font-pixel text-lg text-arena-text">#{demoId}</p>
            </div>

            <div className="flex min-w-[180px] flex-1 items-center gap-2 rounded border border-arena-border bg-black/50 px-3 py-2">
              <label htmlFor="normie-id" className="font-mono text-xs text-arena-muted">
                ID
              </label>
              <input
                id="normie-id"
                type="number"
                min={0}
                max={9999}
                value={demoId}
                onChange={(e) => handleIdChange(Number(e.target.value))}
                className="min-w-0 flex-1 bg-transparent font-mono text-sm text-arena-text focus:outline-none"
              />
            </div>

            <Button type="button" variant="ghost" size="sm" onClick={handleRandom}>
              Random
            </Button>
          </div>

          <p className="font-pixel text-[9px] uppercase tracking-widest text-arena-glow/80">
            Live Pixel Data
          </p>
        </motion.section>
      </div>
    </main>
  )
}