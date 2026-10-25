/**
 * QUOI     — en bas de la fiche : « Tu organises ce festival ? », dans le dégradé de la marque, le
 *            badge certifié, et « Nous écrire » : un e-mail à contact@flw.sh dont le sujet nomme la fiche.
 * POURQUOI — Uriel, 25/10/2026 (maquette 2506:233) : un appel qui se voit, aux couleurs de l'app ;
 *            pas de parcours dans l'app pour l'instant, on se parle.
 */
import { ArrowRight, BadgeCheck } from 'lucide-react'

export function ClaimBanner({ eventName }: { eventName: string }) {
  const subject = encodeURIComponent(`Revendiquer la fiche ${eventName}`)

  return (
    <a className="claim-banner" href={`mailto:contact@flw.sh?subject=${subject}`}>
      <BadgeCheck className="claim-banner__badge" size={44} strokeWidth={1.4} aria-hidden="true" />
      <span className="claim-banner__text">
        <strong className="claim-banner__title">Tu organises ce festival ?</strong>
        <span className="claim-banner__line">
          Revendique sa fiche : elle porte le badge certifié, et c’est toi qui la tiens à jour.
        </span>
      </span>
      <span className="claim-banner__button">
        Nous écrire
        <ArrowRight size={13} strokeWidth={2} />
      </span>
    </a>
  )
}
