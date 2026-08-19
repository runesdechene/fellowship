import { useState } from 'react'
import {
  CircleCheck,
  CircleMinus,
  CircleX,
  Coins,
  FileClock,
  Hourglass,
  Star,
} from 'lucide-react'
import { Select, type SelectOption } from '@/components/ui/Select'
import type { ParticipationStatus } from '@/types/database'
import type { EventActions, PaymentOrientation, PaymentStatus } from './useEvent'

/**
 * LE SUIVI — dans la grille principale, sous le titre.
 *
 * Il vivait dans une colonne de deux cents pixels à droite, où trois contrôles
 * voisins faisaient trente, vingt-six et trente pixels de haut sur trois
 * familles de fond : l'œil n'y trouvait aucun rythme. Ici tout partage une
 * hauteur, un rayon, une grammaire.
 *
 * Chaque état a SON dessin — étoile, sablier, coche — et pas seulement sa
 * teinte : ça se lit aussi en noir et blanc, et pour un daltonien. La couleur
 * ne dit que l'ÉTAT : olive pour ce qui est acquis, blé pour ce qui attend un
 * geste. Une place réglée redevient crème.
 */

/**
 * Les crans de participation, dans l'ordre du chemin. Le premier retire la
 * participation : un seul contrôle porte donc « je m'inscris » ET « je me
 * retire », là où le suivi d'avant demandait un lien séparé.
 */
const PARTICIPATION: SelectOption<ParticipationStatus | null>[] = [
  { value: null, label: 'Je n’y vais pas', tone: 'muet', Icon: CircleMinus },
  { value: 'interesse', label: 'Intéressé', tone: 'muet', Icon: Star },
  { value: 'en_cours', label: 'Dossier en cours', tone: 'todo', Icon: FileClock },
  { value: 'inscrit', label: 'Inscrit', tone: 'ok', Icon: CircleCheck },
]

/**
 * « refuse » ne se CHOISIT pas — la V1 ne l'a jamais proposé et rien ne
 * garantit que la contrainte en base l'accepte. Mais si la base le porte
 * déjà, le menu doit pouvoir l'afficher plutôt que de se vider.
 */
const REFUSE: SelectOption<ParticipationStatus | null> = {
  value: 'refuse',
  label: 'Dossier refusé',
  tone: 'muet',
  Icon: CircleX,
}

/** Les mêmes états en base, lus selon qu'on paie sa place ou qu'on est payé. */
const PAIEMENT: Record<PaymentOrientation, SelectOption<PaymentStatus>[]> = {
  payeur: [
    { value: 'a_payer', label: 'À payer', tone: 'todo', Icon: Hourglass },
    { value: 'acompte_verse', label: 'Acompte versé', tone: 'todo', Icon: Coins },
    { value: 'paye', label: 'Payé', tone: 'ok', Icon: CircleCheck },
  ],
  paye: [
    { value: 'a_payer', label: 'À recevoir', tone: 'todo', Icon: Hourglass },
    { value: 'acompte_verse', label: 'Acompte reçu', tone: 'todo', Icon: Coins },
    { value: 'paye', label: 'Reçu', tone: 'ok', Icon: CircleCheck },
  ],
}

export function EventStatus({
  status,
  paymentStatus,
  paymentOrientation,
  standAmount,
  past,
  setStatus,
  setPayment,
  setOrientation,
  setStandAmount,
  saving,
  writeError,
}: {
  status: ParticipationStatus | null
  paymentStatus: string | null
  paymentOrientation: PaymentOrientation
  /** Le prix de la place déjà posé, ou 0 s'il ne l'est pas encore. */
  standAmount: number
  past: boolean
} & EventActions) {
  // Le montant se tape, donc il a son brouillon. Il se recale quand la valeur
  // enregistrée change sous lui — après un enregistrement, ou en revenant sur
  // la fiche.
  //
  // Ajusté PENDANT le rendu et non dans un effet : c'est le patron documenté
  // de React pour un état dérivé d'une prop, et il évite le rendu de trop où
  // le champ afficherait encore l'ancien montant.
  const ecrire = (valeur: number) => (valeur > 0 ? String(valeur) : '')
  const [montant, setMontant] = useState(() => ecrire(standAmount))
  const [montantConnu, setMontantConnu] = useState(standAmount)
  if (montantConnu !== standAmount) {
    setMontantConnu(standAmount)
    setMontant(ecrire(standAmount))
  }

  // Un dossier refusé n'est pas dans la liste ; il faut pourtant l'afficher.
  const participation = status === 'refuse' ? [...PARTICIPATION, REFUSE] : PARTICIPATION

  const paiement = PAIEMENT[paymentOrientation]
  const statutPaiement = (paymentStatus ?? 'a_payer') as PaymentStatus

  // Le paiement n'a de sens qu'une fois la place acquise : avant, il n'y a
  // rien à régler.
  const montrerLePaiement = status === 'inscrit' || status === 'confirme'
  const paye = paymentOrientation === 'paye'

  /**
   * Une saisie vide vaut zéro, donc efface la ligne. Un texte qui n'est pas
   * un nombre ne doit RIEN effacer : on remet le brouillon à la valeur
   * enregistrée et on n'écrit pas.
   */
  async function enregistrerLeMontant() {
    const brut = montant.trim()
    if (brut === '') {
      if (standAmount !== 0) await setStandAmount(0)
      return
    }
    const lu = Number.parseFloat(brut.replace(',', '.'))
    if (Number.isNaN(lu)) {
      setMontant(ecrire(standAmount))
      return
    }
    if (lu !== standAmount) await setStandAmount(lu)
  }

  return (
    <section className="event-status">
      <div className="event-status__head">
        <h2 className="event-status__title">Statut</h2>
        {/* Le SEUL aplat coloré de l'écran : c'est le contrôle qui résume la
            page. Le règlement, lui, garde son icône teintée sur du crème —
            deux aplats côte à côte se disputeraient le regard. */}
        <Select
          filled
          className="event-status__participation"
          label="Ma participation à cette date"
          value={status}
          options={participation}
          disabled={saving || past}
          onChange={(choisi) => void setStatus(choisi)}
        />
      </div>

      {montrerLePaiement && (
        <div className="event-status__bar">
          <div className="event-status__sides">
            <button
              type="button"
              className="event-status__side"
              aria-pressed={paymentOrientation === 'payeur'}
              disabled={saving || past}
              onClick={() => void setOrientation('payeur')}
            >
              Je paie ma place
            </button>
            <button
              type="button"
              className="event-status__side"
              aria-pressed={paye}
              disabled={saving || past}
              onClick={() => void setOrientation('paye')}
            >
              On me paie
            </button>
          </div>

          <input
            className="event-status__amount"
            type="text"
            inputMode="decimal"
            placeholder={paye ? 'Cachet' : 'Montant'}
            aria-label={paye ? 'Montant du cachet en euros' : 'Prix de la place en euros'}
            value={montant}
            disabled={past}
            onChange={(evenement) => setMontant(evenement.target.value)}
            onBlur={() => void enregistrerLeMontant()}
            onKeyDown={(evenement) => {
              if (evenement.key === 'Enter') evenement.currentTarget.blur()
              if (evenement.key === 'Escape') {
                setMontant(ecrire(standAmount))
                evenement.currentTarget.blur()
              }
            }}
          />

          {/* Sa largeur est FIGÉE : « Acompte versé » est plus long que
              « Payé », et sans ça le champ du montant d'à côté se déformait à
              chaque changement d'état. */}
          <Select
            className="event-status__reglement"
            label={paye ? 'Où en est le cachet' : 'Où en est le règlement'}
            value={statutPaiement}
            options={paiement}
            disabled={saving || past}
            onChange={(choisi) => void setPayment(choisi)}
          />
        </div>
      )}

      {/* L'écriture a échoué et l'affichage est déjà revenu en arrière : sans
          ce mot, la valeur qui saute passerait pour un bug. */}
      {writeError && <p className="event-status__error">{writeError}</p>}
    </section>
  )
}
