'use client'

import { CelebracionNivel } from '@/components/shared/CelebracionNivel'
import { NavInferior } from '@/components/layout/NavInferior'
import { TopBar } from '@/components/layout/TopBar'
import { useNivel } from '@/hooks/useNivel'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { nivel } = useNivel()
  return (
    <div className="mx-auto min-h-screen max-w-[390px] pb-20">
      <TopBar nivel={nivel} />
      {children}
      <NavInferior nivel={nivel} />
      <CelebracionNivel />
    </div>
  )
}
