/**
 * QUOI     — le bandeau « Une nouvelle version de Fellowship est disponible. » et son bouton
 *            « Recharger ».
 * POURQUOI — lot 12 : un onglet ouvert ou l'appli installée sur un téléphone garde le code qu'il a
 *            chargé. L'app relit `/version.json` quand l'onglet revient au premier plan et toutes
 *            les 10 minutes ; une autre version que la sienne fait paraître le bandeau.
 * ATTENTION — pas de fermeture : il reste jusqu'au rechargement. Une lecture ratée (hors ligne)
 *            ne montre rien. Sans maquette : briques de l'app, à relire par Uriel.
 */
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { isOutdated, servedVersion } from '@/lib/app-version'

const CHECK_EVERY_MS = 10 * 60 * 1000

async function readServedVersion(): Promise<string | null> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}version.json`, { cache: 'no-store' })
    return response.ok ? servedVersion(await response.json()) : null
  } catch {
    return null
  }
}

export function UpdateBanner() {
  const [outdated, setOutdated] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function check() {
      const served = await readServedVersion()
      if (cancelled) return
      if (isOutdated(__APP_VERSION__, served)) setOutdated(true)
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check()
    }
    const timer = window.setInterval(() => void check(), CHECK_EVERY_MS)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  if (!outdated) return null
  return (
    <div className="update-banner" role="status">
      <p className="update-banner__text">Une nouvelle version de Fellowship est disponible.</p>
      <Button
        variant="action"
        onClick={() => {
          window.location.reload()
        }}
      >
        Recharger
      </Button>
    </div>
  )
}
