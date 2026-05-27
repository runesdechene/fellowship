import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { planForActor } from '@/lib/navModel'
import './ProTeaser.css'

/**
 * Enveloppe une surface Pro : Pro → contenu normal ; gratuit → le vrai contenu
 * flouté en aperçu (pointer-events coupés) sous un voile dégradé + CTA « Passer en Pro ».
 * Même esprit que le teaser Communauté, mais générique (réutilisable Calendrier, Dashboard…).
 */
export function ProTeaser({ title, pitch, children }: { title: string; pitch: string; children: ReactNode }) {
  const { currentActor, currentActorRow } = useAuth()
  if (planForActor(currentActor, currentActorRow) === 'pro') return <>{children}</>

  return (
    <div className="pro-teaser">
      <div className="pro-teaser-content" aria-hidden="true">{children}</div>
      <div className="pro-teaser-veil">
        <div className="pro-teaser-cta">
          <div className="pro-teaser-lock"><Lock strokeWidth={1.5} /></div>
          <h2>{title}</h2>
          <p>{pitch}</p>
          <Link to="/reglages" className="pro-teaser-btn">Passer en Pro — dès 9,99 € HT/mois</Link>
        </div>
      </div>
    </div>
  )
}
