/**
 * QUOI     — l'état de la barre de la landing : compacte dès qu'on a quitté le haut de la page, et
 *            le chapitre que le visiteur est en train de lire.
 * POURQUOI — la barre suit les chapitres de la page (Uriel, 14/10/2026) : elle reste en haut et
 *            souligne la bande en cours.
 * ATTENTION — le chapitre en cours est celui qui traverse le tiers haut de l'écran (IntersectionObserver
 *            réglé sur cette ligne, que l'encadré du bas de page atteint aussi) ; aucun calcul au défilement.
 */
import { useEffect, useState } from 'react'

const COMPACT_AFTER = 24

export function useLandingNav(ids: readonly string[]) {
  const [compact, setCompact] = useState(false)
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    const onScroll = () => {
      setCompact(window.scrollY > COMPACT_AFTER)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const { target, isIntersecting } of entries) {
          setActive((current) => {
            if (isIntersecting) return target.id
            return current === target.id ? null : current
          })
        }
      },
      { rootMargin: '-33% 0px -67% 0px' },
    )
    for (const id of ids) {
      const section = document.getElementById(id)
      if (section) observer.observe(section)
    }
    return () => {
      observer.disconnect()
    }
  }, [ids])

  return { compact, active }
}
