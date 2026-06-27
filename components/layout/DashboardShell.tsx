'use client'

import { Suspense } from 'react'
import { CelebracionNivel } from '@/components/shared/CelebracionNivel'
import { NavInferior } from '@/components/layout/NavInferior'
import { TopBar } from '@/components/layout/TopBar'
import { TutorialGuiado } from '@/components/tutorial/TutorialGuiado'
import { useNivel } from '@/hooks/useNivel'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { nivel } = useNivel()
  return (
    <div className="min-h-[100dvh] bg-brand-tint">
      <div className="mx-auto min-h-[100dvh] max-w-[390px] bg-background pb-24 shadow-2xl shadow-brand-dark/10">
      <TopBar nivel={nivel} />
      {children}
      <NavInferior nivel={nivel} />
      <CelebracionNivel />
      <Suspense fallback={null}>
        <TutorialGuiado />
      </Suspense>
      </div>
    </div>
  )
}
