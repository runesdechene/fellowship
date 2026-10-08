/**
 * QUOI     — /pro, la page d'attente de l'offre Pro.
 * POURQUOI — toutes les invitations du gratuit mènent ici ; la vraie page de l'offre arrive au
 *            lot 7c. D'ici là, aucun bouton ne mène nulle part : on renvoie vers l'abonnement de
 *            la V1.
 * ATTENTION — /abonnement vit hors du routeur /v2 : un lien <a>, pas un Link.
 */
import { ArrowRight } from 'lucide-react'
import { ProBadge } from '@/components/ui/ProBadge'
import { useDeclarePageChrome } from '@/lib/page-chrome'

export function ProPage() {
  useDeclarePageChrome({ poster: null, lead: null, back: '/' })

  return (
    <div className="pro-page">
      <ProBadge />
      <h1 className="pro-page__title">L’offre Pro arrive dans la V2.</h1>
      <p className="pro-page__text">
        En attendant, ton abonnement se gère dans la version actuelle de Fellowship.
      </p>
      <a className="pro-page__link" href="/abonnement">
        Voir l’abonnement
        <ArrowRight size={14} strokeWidth={2} />
      </a>
    </div>
  )
}
