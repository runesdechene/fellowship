import { useState } from 'react'
import {
  ChevronDown,
  CircleCheck,
  CircleMinus,
  CircleX,
  Coins,
  FileClock,
  Hourglass,
  Star,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ParticipationStatus } from '@/types/database'
import type { EventActions, PaymentOrientation, PaymentStatus } from './useEvent'

/**
 * LE SUIVI — remonté dans la grille principale, sous le titre.
 *
 * Il vivait dans une colonne de deux cents pixels à droite, où trois
 * contrôles voisins faisaient trente, vingt-six et trente pixels de haut sur
 * trois familles de fond : l'œil n'y trouvait aucun rythme. Ici tout partage
 * une hauteur, un rayon, une grammaire — libellé à gauche, valeur à droite,
 * chevron pour changer.
 *
 * La couleur n'y sert qu'à dire l'ÉTAT : l'olive pour ce qui est acquis, le
 * blé pour ce qui attend un geste. Une place réglée redevient crème.
 */

type Ton = 'muet' | 'todo' | 'ok'

/**
 * Chaque état a SON dessin, pas seulement sa teinte. Une pastille ronde dit
 * qu'il se passe quelque chose ; une étoile, un sablier ou une coche disent
 * QUOI — et ils le disent aussi en noir et blanc, ou pour un daltonien.
 */
type Choix<T> = { key: T; label: string; ton: Ton; Icon: LucideIcon }

/**
 * Les crans de participation, dans l'ordre du chemin. Le premier retire la
 * participation : un seul contrôle porte donc « je m'inscris » ET « je me
 * retire », là où le suivi d'avant demandait un lien séparé.
 */
const PARTICIPATION: Choix<ParticipationStatus | null>[] = [
  { key: null, label: 'Je n’y vais pas', ton: 'muet', Icon: CircleMinus },
  { key: 'interesse', label: 'Intéressé', ton: 'muet', Icon: Star },
  { key: 'en_cours', label: 'Dossier en cours', ton: 'todo', Icon: FileClock },
  { key: 'inscrit', label: 'Inscrit', ton: 'ok', Icon: CircleCheck },
]

/**
 * « refuse » ne se CHOISIT pas — la V1 ne l'a jamais proposé et rien ne
 * garantit que la contrainte en base l'accepte. Mais si la base le porte
 * déjà, le menu doit pouvoir l'afficher plutôt que de se vider.
 */
const REFUSE: Choix<ParticipationStatus | null> = {
  key: 'refuse',
  label: 'Dossier refusé',
  ton: 'muet',
  Icon: CircleX,
}

/** Les mêmes états en base, lus selon qu'on paie sa place ou qu'on est payé. */
const PAIEMENT: Record<PaymentOrientation, Choix<PaymentStatus>[]> = {
  payeur: [
    { key: 'a_payer', label: 'À payer', ton: 'todo', Icon: Hourglass },
    { key: 'acompte_verse', label: 'Acompte versé', ton: 'todo', Icon: Coins },
    { key: 'paye', label: 'Payé', ton: 'ok', Icon: CircleCheck },
  ],
  paye: [
    { key: 'a_payer', label: 'À recevoir', ton: 'todo', Icon: Hourglass },
    { key: 'acompte_verse', label: 'Acompte reçu', ton: 'todo', Icon: Coins },
    { key: 'paye', label: 'Reçu', ton: 'ok', Icon: CircleCheck },
  ],
}

/** `null` ne survit pas à un attribut HTML : on lui donne un jeton stable. */
const AUCUN = '—'

/**
 * Une valeur qu'on change. Le `<select>` natif recouvre toute la pastille,
 * transparent : on garde le clavier, le tactile et le menu du système sans
 * réécrire un menu à la main.
 */
function Pick<T extends string | null>({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string
  value: T
  options: Choix<T>[]
  disabled: boolean
  onChange: (value: T) => void
}) {
  const jeton = (key: T) => (key === null ? AUCUN : String(key))
  const courant = options.find((option) => option.key === value) ?? options[0]

  return (
    <span className={`event-status__pick event-status__pick--${courant.ton}`}>
      <courant.Icon className="event-status__icon" size={16} strokeWidth={2} />
      {courant.label}
      <ChevronDown className="event-status__chev" size={14} strokeWidth={2} />
      <select
        className="event-status__select"
        aria-label={label}
        value={jeton(value)}
        disabled={disabled}
        onChange={(event) => {
          const choisi = options.find(
            (option) => jeton(option.key) === event.target.value,
          )
          if (choisi) onChange(choisi.key)
        }}
      >
        {options.map((option) => (
          <option key={jeton(option.key)} value={jeton(option.key)}>
            {option.label}
          </option>
        ))}
      </select>
    </span>
  )
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
  const participation =
    status === 'refuse' ? [...PARTICIPATION, REFUSE] : PARTICIPATION

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
        <Pick
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

          <div className="event-status__money">
            <input
              className="event-status__amount"
              type="text"
              inputMode="decimal"
              placeholder={paye ? 'Cachet' : 'Montant'}
              aria-label={paye ? 'Montant du cachet en euros' : 'Prix de la place en euros'}
              value={montant}
              disabled={past}
              onChange={(event) => setMontant(event.target.value)}
              onBlur={() => void enregistrerLeMontant()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur()
                if (event.key === 'Escape') {
                  setMontant(ecrire(standAmount))
                  event.currentTarget.blur()
                }
              }}
            />
            <Pick
              label={paye ? 'Où en est le cachet' : 'Où en est le règlement'}
              value={statutPaiement}
              options={paiement}
              disabled={saving || past}
              onChange={(choisi) => void setPayment(choisi)}
            />
          </div>
        </div>
      )}

      {/* L'écriture a échoué et l'affichage est déjà revenu en arrière : sans
          ce mot, la valeur qui saute passerait pour un bug. */}
      {writeError && <p className="event-status__error">{writeError}</p>}
    </section>
  )
}
