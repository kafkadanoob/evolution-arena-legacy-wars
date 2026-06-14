import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { NormieSelectionProvider } from '@/context/NormieSelectionProvider'
import { AppShell } from '@/components/layout/AppShell'
import { HomePage } from '@/pages/HomePage'
import { ArenaHubPage } from '@/pages/ArenaHubPage'
import { BattleArenaPage } from '@/pages/BattleArenaPage'   // Keep this if your component is named BattleArenaPage
import { NormieBrowserPage } from '@/pages/NormieBrowserPage'
import { LegacyDashboardPage } from '@/pages/LegacyDashboardPage'

export default function App() {
  return (
    <BrowserRouter>
      <NormieSelectionProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="arena" element={<ArenaHubPage />} />
          <Route path="battle" element={<BattleArenaPage />} />
          <Route path="normies" element={<NormieBrowserPage />} />
          <Route path="legacy" element={<LegacyDashboardPage />} />
        </Route>
      </Routes>
      </NormieSelectionProvider>
    </BrowserRouter>
  )
}