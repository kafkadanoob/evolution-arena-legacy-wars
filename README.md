## Evolution Arena: Legacy Wars

> **A pixel battle royale where real on-chain Normies fight, burn, and evolve — permanently.**


## What Is This?

Evolution Arena pulls **live pixel data** from the Normies API and uses it as the actual battlefield. When a Normie takes damage, their 40×40 pixel grid is **XOR-burned in real time** — not simulated, not a copy. The pixels that represent your fighter literally get destroyed.

Win, and your Normie evolves — regrowing pixels, gaining scars, accumulating a **Legacy Score** that persists across battles. Every fight leaves a mark on the actual token data.

---

## Demo

📹 **[Watch 90-second gameplay walkthrough](https://drive.google.com/file/d/1oM4Owiib3jJ-WvXZhIIzXxd1_HAgi4Bs/view?usp=sharing)**  
🌐 **[Try it live](https://evolution-arena-legacy-wars-gamma.vercel.app)**

---

## Core Mechanics

### Real Pixel Destruction
Attacks apply XOR operations directly to a Normie's pixel data. Damage isn't abstracted — you watch specific pixels die. Losers carry visible, permanent scars. Winners regrow some of what they lost.

### Legacy Score System
Every battle contributes to a fighter's running legacy, calculated from:
- Survival rate across fights
- Total pixel destruction inflicted on opponents
- Awakened agent power accumulated

### Battle Modes
- **Auto** — full simulation, watch it play out
- **Step-by-step** — manual control with targeting decisions and Power Moves
- **Difficulty tiers** (Easy → Legacy) — scale depth, agent commentary, and stakes

---

## How to Play

1. Open the **Normies Browser** — search and select up to 3 real Normies from the live API
2. Enter the **Arena Hub** — choose your difficulty and battle mode
3. Fight — watch real pixel damage land with visual flash effects
4. After the battle, check the **Legacy Dashboard** for evolving stats, scar history, and leaderboard rank

---

## Tech Stack

| Layer | Tools |
|---|---|
| Frontend | React + TypeScript + Vite |
| Styling & Animation | Tailwind CSS + Framer Motion |
| Rendering | Canvas API (crisp pixel-perfect output) |
| State | Zustand |
| Data | Normies Public API (live, authentic usage) |

---

## Project Structure

```
src/
├── components/
│   ├── Arena/          # Battle engine, step controller, Power Moves
│   ├── Browser/        # Normies API integration, squad selection
│   ├── Dashboard/      # Legacy scores, scar history, leaderboard
│   └── Pixel/          # Canvas renderer, XOR burn logic
├── store/              # Zustand slices (squad, battle, legacy)
├── hooks/              # useNormiesAPI, useBattleEngine, usePixelBurn
└── utils/              # XOR mechanics, legacy scoring algorithm
```

---

## Local Setup

```bash
git clone https://github.com/kafkadanoob/evolution-arena-legacy-wars
cd evolution-arena-legacy-wars
npm install
npm run dev
```

No env variables required — the Normies API is public.

---

## What Makes This Different

Most hackathon games simulate damage with health bars. This one **mutates the actual underlying data** of the NFT. The pixel grid isn't a UI metaphor — it's the source of truth. A Normie that has fought a hundred battles looks like it.

That's the whole bet: make the game *be* the chain, not just reference it.

---

## Roadmap (Post-Hackathon)

- [ ] On-chain scar persistence via metadata write-back
- [ ] Tournament bracket mode (8-Normie elimination)
- [ ] Spectator mode with live commentary feed
- [ ] Legacy NFT minting for hall-of-fame fighters

---

## Built by

[@notfranzkafka](https://github.com/kafkadanoob) — built for the Normies hackathon
