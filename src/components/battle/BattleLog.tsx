/**
 * BattleLog.tsx  v4
 *
 * Changes from v3:
 *   - Removed emoji/symbol prefixes from battle terminal entries.
 *   - Replaced them with compact arcade-style text tags such as [ATK], [PWR],
 *     [SYNC], [MOM], and [KO].
 *   - Keeps the single-scroll-boundary fix from v3.
 */

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScrollText, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BattleLogEntry, LogEntryType } from '@/types/battle.type'

interface BattleLogProps {
  entries: BattleLogEntry[]
  allEntries?: BattleLogEntry[]
  className?: string
}

function entryColor(type: LogEntryType): string {
  switch (type) {
    case 'round':       return 'text-arena-border'
    case 'attack':      return 'text-arena-muted'
    case 'taunt':       return 'text-arena-glow'
    case 'elimination': return 'text-arena-danger'
    case 'system':      return 'text-arena-text'
    case 'powermove':   return 'text-yellow-400'
    case 'synergy':     return 'text-arena-glow'
    case 'momentum':    return 'text-orange-400'
    default:            return 'text-arena-muted'
  }
}

function entryPrefix(type: LogEntryType): string {
  switch (type) {
    case 'round':       return '[RD] '
    case 'attack':      return '[ATK] '
    case 'taunt':       return '[COM] '
    case 'elimination': return '[KO] '
    case 'system':      return '[SYS] '
    case 'powermove':   return '[PWR] '
    case 'synergy':     return '[SYNC] '
    case 'momentum':    return '[MOM] '
    default:            return '[LOG] '
  }
}

function LogLine({ entry, isNew }: { entry: BattleLogEntry; isNew: boolean }) {
  return (
    <motion.div
      key={entry.id}
      initial={isNew ? { opacity: 0, y: 10 } : { opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      className={cn(
        'grid grid-cols-[44px_minmax(0,1fr)] gap-2 font-mono text-[11px] leading-5 break-words',
        entryColor(entry.type),
      )}
    >
      <span className="select-none font-pixel text-[7px] uppercase tracking-wide opacity-70">
        {entryPrefix(entry.type)}
      </span>
      <span>{entry.text}</span>
    </motion.div>
  )
}

export function BattleLog({ entries, allEntries = [], className }: BattleLogProps) {
  const [showModal, setShowModal] = useState(false)
  const prevCountRef = useRef(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  const newIds = new Set(entries.slice(prevCountRef.current).map((entry) => entry.id))

  useEffect(() => {
    prevCountRef.current = entries.length
  }, [entries.length])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [entries.length])

  return (
    <>
      <div
        className={cn('relative flex flex-col gap-1', className)}
        aria-label="Battle log"
        aria-live="polite"
      >
        {entries.length === 0 && (
          <p className="font-mono text-[11px] text-arena-border">
            Awaiting battle...
          </p>
        )}

        <AnimatePresence initial={false} mode="popLayout">
          {entries.map((entry) => (
            <LogLine key={entry.id} entry={entry} isNew={newIds.has(entry.id)} />
          ))}
        </AnimatePresence>

        <div ref={bottomRef} />

        {allEntries.length > entries.length && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="mt-1 flex items-center gap-1 font-mono text-[9px] text-arena-muted transition-colors hover:text-arena-glow"
          >
            <ScrollText className="h-3 w-3" />
            Full log ({allEntries.length})
          </button>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[70vh] w-full max-w-lg overflow-hidden rounded-xl border border-arena-border bg-arena-bg"
            >
              <div className="flex items-center justify-between border-b border-arena-border px-4 py-3">
                <p className="font-pixel text-[9px] uppercase tracking-widest text-arena-muted">
                  Full Battle Log
                </p>
                <button type="button" onClick={() => setShowModal(false)}>
                  <X className="h-4 w-4 text-arena-muted hover:text-arena-text" />
                </button>
              </div>

              <div className="overflow-y-auto px-4 py-3" style={{ maxHeight: '60vh' }}>
                <div className="flex flex-col gap-1">
                  {allEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className={cn(
                        'grid grid-cols-[44px_minmax(0,1fr)] gap-2 font-mono text-[11px] leading-5 break-words',
                        entryColor(entry.type),
                      )}
                    >
                      <span className="select-none font-pixel text-[7px] uppercase tracking-wide opacity-70">
                        {entryPrefix(entry.type)}
                      </span>
                      <span>{entry.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}