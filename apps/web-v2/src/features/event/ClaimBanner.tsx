/**
 * QUOI     — en bas de la fiche : « Tu organises ce festival ? Revendique sa fiche : écris-nous. »,
 *            un e-mail à contact@flw.sh dont le sujet nomme la fiche.
 * POURQUOI — Uriel, 25/10/2026 : les fiches sont saisies par les exposants ; l'organisateur doit
 *            pouvoir la reprendre. Pas de parcours dans l'app pour l'instant : on se parle.
 */
import { BadgeCheck, ChevronRight } from 'lucide-react'
import { IconTile } from '@/components/ui/IconTile'

export function ClaimBanner({ eventName }: { eventName: string }) {
  const subject = encodeURIComponent(`Revendiquer la fiche ${eventName}`)

  return (
    <a className="claim-banner" href={`mailto:contact@flw.sh?subject=${subject}`}>
      <IconTile Icon={BadgeCheck} tone="bleu" />
      <span className="claim-banner__text">
        <strong className="claim-banner__title">Tu organises ce festival ?</strong>
        <span className="claim-banner__line">Revendique sa fiche : écris-nous.</span>
      </span>
      <ChevronRight className="claim-banner__go" size={18} strokeWidth={2} aria-hidden="true" />
    </a>
  )
}
