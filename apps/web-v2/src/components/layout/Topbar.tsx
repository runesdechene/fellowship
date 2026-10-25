/**
 * QUOI     — la barre du haut : à gauche le retour et le repère déclarés par la page, à droite
 *            « Modifier la fiche » (si la page le déclare), la cloche, « Passer Pro » pour un compte
 *            gratuit (maquette 2540:233) et « Ajouter une date ».
 * POURQUOI — sortir d'un écran est du châssis, pas du contenu : la main cherche le retour au même
 *            coin sur tous les écrans.
 */
import { Wordmark } from '@/components/ui/Wordmark'
import { ArrowLeft, CirclePlus, Pencil } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ProBadge } from '@/components/ui/ProBadge'
import { NotificationBell } from '@/features/notifications/NotificationBell'
import { useTransitionNavigate, useViewTransition } from '@/lib/navigation'
import { usePageChrome } from '@/lib/page-chrome'
import { usePlan } from '@/lib/usePlan'

/**
 * Barre du haut : cloche + « Ajouter une date » à droite, et à gauche les
 * deux repères que la page déclare — par où l'on sort, puis où l'on est. Sur
 * la fiche d'un événement : la flèche de retour, puis le compte à rebours.
 * Les écrans qui ne déclarent rien laissent le coin vide.
 *
 * La sortie est ICI, dans le coin, et pas en tête du contenu : c'est du
 * châssis, pas du texte. La main la cherche au même endroit sur tous les
 * écrans, et la page peut s'ouvrir sur son titre.
 *
 * Le retour est celui du navigateur (.claude/rules/v2.md) : on revient à la page d'où l'on vient
 * — la Communauté, l'Explorer, le calendrier. Le chemin déclaré par la page ne sert que si la
 * fiche est la première page de l'onglet (lien reçu, nouvel onglet) : il n'y a alors pas
 * d'« avant » dans l'application. Uriel, 11/10/2026 : la fiche ramenait toujours au tableau de
 * bord.
 */
export function Topbar() {
  const go = useTransitionNavigate()
  const { lead, back, edit } = usePageChrome()
  const navigate = useNavigate()
  const { pro } = usePlan()
  const { key, pathname } = useLocation()
  const transition = useViewTransition()
  // « default » : la première entrée de l'onglet — aucune page de l'application avant elle.
  const firstPage = key === 'default'

  function leave(fallback: string) {
    if (firstPage) {
      go(fallback)
      return
    }
    transition('page', () => {
      void navigate(-1)
    })
  }

  return (
    <div className="topbar">
      {/* Sur téléphone, la barre latérale disparaît : la marque monte en haut à gauche, écrite
          comme sur la landing (Uriel, 19/10/2026). */}
      {!back && <Wordmark className="topbar__brand" />}
      {(back || lead) && (
        <div className="topbar__coin">
          {/* La MEME variante que la cloche, pas une imitation à côté. Le
              retour a d'abord été dessiné nu — « un chemin, pas une
              commande » — mais posé dans le châssis il est devenu le voisin
              direct de la cloche, et deux voisins identiques qui ne se
              ressemblent pas se remarquent. Uriel a tranché : les trois
              contrôles de la barre portent la même surface. */}
          {back && (
            <Button variant="icon" onClick={() => leave(back)} aria-label="Retour" title="Retour">
              <ArrowLeft size={20} strokeWidth={1.75} />
            </Button>
          )}
          {lead && <p className="topbar__lead">{lead}</p>}
        </div>
      )}
      {edit && (
        <Button
          className="topbar__edit"
          icon={<Pencil size={18} strokeWidth={1.75} />}
          onClick={() => go(edit)}
          aria-label="Modifier la fiche"
        >
          <span className="topbar__add-label">Modifier la fiche</span>
        </Button>
      )}
      <NotificationBell />
      {!pro && pathname !== '/pro' && (
        <Button variant="pro" className="topbar__pro" onClick={() => go('/pro')}>
          Passer
          <ProBadge />
        </Button>
      )}
      <Button
        variant="action"
        icon={<CirclePlus size={22} strokeWidth={1.75} />}
        onClick={() => go('/evenements/nouveau')}
        aria-label="Ajouter une date"
      >
        <span className="topbar__add-label">Ajouter une date</span>
      </Button>
    </div>
  )
}
