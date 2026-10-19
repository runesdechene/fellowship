/**
 * QUOI     — le dialogue du calendrier intégré avec la page qui l'accueille : sa hauteur, et le
 *            thème du site hôte quand le réglage est « auto ».
 * POURQUOI — l'iframe n'a pas de hauteur propre : `public/embed.js`, sur le site de l'artiste,
 *            l'ajuste à chaque message « resize », et lui envoie la couleur de son fond.
 * ATTENTION — le protocole ({ source: 'flwsh-embed', type }) est celui de la V1 : des chargeurs
 *            déjà collés sur des sites l'attendent tel quel (lot 12).
 */
import { useEffect, useState } from 'react'
import type { EmbedTheme } from '@/lib/embed'

const SOURCE = 'flwsh-embed'

function systemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

interface HostMessage {
  source?: unknown
  type?: unknown
  theme?: unknown
}

/** Le thème à peindre : imposé par le réglage, sinon celui du site hôte (à défaut, du système). */
export function useHostTheme(setting: EmbedTheme): 'light' | 'dark' {
  const [hostTheme, setHostTheme] = useState(systemTheme)

  useEffect(() => {
    if (setting !== 'auto') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onMedia = (event: MediaQueryListEvent) => {
      setHostTheme(event.matches ? 'dark' : 'light')
    }
    const onMessage = (event: MessageEvent<HostMessage | null>) => {
      const data = event.data
      if (data?.source !== SOURCE || data.type !== 'theme') return
      if (data.theme === 'light' || data.theme === 'dark') setHostTheme(data.theme)
    }
    media.addEventListener('change', onMedia)
    window.addEventListener('message', onMessage)
    window.parent.postMessage({ source: SOURCE, type: 'ready' }, '*')
    return () => {
      media.removeEventListener('change', onMedia)
      window.removeEventListener('message', onMessage)
    }
  }, [setting])

  return setting === 'auto' ? hostTheme : setting
}

/** Annonce la hauteur du document à la page hôte : au départ, à chaque changement de taille, et
 *  à chaque message du chargeur — arrivé après l'iframe, il aurait manqué les premières annonces. */
export function useReportHeight(): void {
  useEffect(() => {
    const report = () => {
      const height = document.documentElement.offsetHeight
      window.parent.postMessage({ source: SOURCE, type: 'resize', height }, '*')
    }
    const onMessage = (event: MessageEvent<HostMessage | null>) => {
      if (event.data?.source === SOURCE) report()
    }
    report()
    const observer = new ResizeObserver(report)
    observer.observe(document.documentElement)
    window.addEventListener('load', report)
    window.addEventListener('message', onMessage)
    return () => {
      observer.disconnect()
      window.removeEventListener('load', report)
      window.removeEventListener('message', onMessage)
    }
  }, [])
}
