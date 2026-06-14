# Evolution Arena: Legacy Wars

Polished web game for the **Normies Hackathon** (submission by June 15, 2026). Forge legacies in a monochrome pixel arena using **live** [Normies API](https://api.normies.art) data — no mocks in demo.

## Stack

- React 19 + Vite 8 + TypeScript
- Tailwind CSS v4 + shadcn-style UI primitives
- Framer Motion animations
- HTML5 Canvas 40×40 Normie renderer (crisp upscale, no blur)
- React Router SPA with 5 screen shells
- localStorage-ready (leaderboards later)

## Quick start

```bash
cd evolution-arena
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The home hero loads a live Normie via `GET /normie/{id}/pixels`.

## Project structure

```
src/
  api/           # Normies API client + cache
  components/
    normie/      # NormieRenderer, loading face
    layout/      # TopNav, MobileNav, AppShell
    ui/          # Button (shadcn pattern)
  constants/     # API base URL, theme colors
  hooks/         # useNormiePixels
  lib/           # pixels (parse, XOR), utils
  pages/         # Home, Arena, Battle, Browser, Legacy
  types/         # Normie / canvas types
```

## Normie Renderer (deliverable #1)

`NormieRenderer` fetches composited pixels, draws a 40×40 grid on canvas with `image-rendering: pixelated`, supports:

- Configurable scale (default 24px/cell)
- Highlight / flip animation hooks
- Burned Normie fallback via history endpoint
- Arena vs API color modes
- Loading spinner (spinning pixel face) and error retry

## API endpoints used (live)

| Endpoint | Purpose |
|----------|---------|
| `GET /normie/{id}/pixels` | Composited 40×40 bitmap |
| `GET /normie/{id}/original/pixels` | Pre-canvas bitmap |
| `GET /normie/{id}/canvas/pixels` | XOR transform layer |
| `GET /normie/{id}/canvas/diff` | Added/removed pixels |
| `GET /normie/{id}/canvas/info` | Action points, level |
| `GET /normie/{id}/traits` | Decoded traits |
| `GET /normie/{id}/owner` | Ownership |
| `GET /history/normie/{id}/versions` | Transform history |
| `GET /history/burned/{id}/pixels` | Burned fallback |
| `GET /health` | API health |

Docs: [api.normies.art/llms.txt](https://api.normies.art/llms.txt)

## Why this extends Normies lore

Canvas burns become **action points** in battle; XOR diffs drive evolution visuals; history versions grant Legacy-mode bonuses; awakened agents commentate fights — all grounded in on-chain mechanics, not fiction.

## Roadmap

1. ✅ Project setup + Normie Renderer
2. ✅ Normie Browser / selector (search, filters, squad selection, canvas diff wave)
3. Battle simulation engine
4. Full UI polish + difficulty slider
5. Replay, share links, leaderboard

## Deploy

```bash
npm run build
```

Deploy `dist/` to Vercel or Netlify (static SPA).

## License

Hackathon submission — Normies ecosystem fan project.
