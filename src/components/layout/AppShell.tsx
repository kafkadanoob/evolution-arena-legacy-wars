import { Outlet } from 'react-router-dom'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'

export function AppShell() {
  return (
    <div className="flex min-h-svh flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-6xl flex-1 overflow-x-hidden px-4 pb-24 pt-6 md:pb-8">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  )
}
