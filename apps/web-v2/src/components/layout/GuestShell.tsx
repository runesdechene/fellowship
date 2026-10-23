/**
 * QUOI     — le cadre d'une page vue sans compte (la fiche d'un festival) : la barre de la landing,
 *            la page, le mur d'affiche à droite.
 * POURQUOI — lot 11b : un visiteur n'a ni barre latérale, ni cloche, ni compte ; il garde la
 *            barre qu'il connaît depuis la landing, avec « Se connecter » et « Commencer ».
 * ATTENTION — le PageChromeProvider enveloppe tout : la fiche déclare son affiche, le mur la rend.
 */
import type { ReactNode } from 'react'
import { LandingTopBar } from '@/features/landing/LandingTopBar'
import { PageChromeProvider } from '@/lib/page-chrome'
import { PosterWall } from './PosterWall'

export function GuestShell({ children }: { children: ReactNode }) {
  return (
    <PageChromeProvider>
      <LandingTopBar away paper />
      <div className="guest-shell">
        <main className="guest-shell__main">{children}</main>
        <PosterWall />
      </div>
    </PageChromeProvider>
  )
}
