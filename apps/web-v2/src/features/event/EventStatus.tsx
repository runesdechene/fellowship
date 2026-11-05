/**
 * QUOI     — le statut d'une date sur sa fiche, en contrôle segmenté (Intéressé · Dossier envoyé ·
 *            Inscrit), et un menu « … » en face du titre : dossier refusé, participation annulée,
 *            retirer la date (piste B, maquette 2776:233, Uriel, 05/11/2026). Une date refusée ou
 *            annulée remplace les étapes par une ligne qui le dit ; « Changer » les ramène.
 *            Sous un refus, sa raison, privée (maquette 2789:233, retour bêta du 05/11/2026).
 * POURQUOI — toutes les étapes visibles d'un coup, celle qui vaut en relief ; « Inscrit » porte le
 *            vert de validation (Uriel, 11/10/2026). Refusé et annulé ne comptent nulle part : ni
 *            calendrier, ni bilan, ni compteurs (ils ne lisent que des statuts nommés).
 * ATTENTION — recliquer l'étape choisie retire aussi la date : la ligne de participation est
 *            supprimée. Rien ne se verrouille après la date (piège du 19/08/2026). En gratuit, une
 *            date au-delà des 6 mois ne se pose pas (`locked`) : le choix ouvre l'invitation Pro ;
 *            une date déjà posée, elle, reste toujours modifiable (lib/plan.ts).
 */
import { Check, Ellipsis, FolderInput, Star } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { DraftInput } from '@/components/ui/DraftInput'
import { ProBubble } from '@/components/ui/ProBubble'
import { Segmented, type SegmentedOption } from '@/components/ui/Segmented'
import type { ParticipationStatus } from '@/types/database'

type ChosenStatus = 'interesse' | 'en_cours' | 'inscrit'
type Outcome = 'refuse' | 'annule'

const STEPS: SegmentedOption<ChosenStatus>[] = [
  { value: 'interesse', label: 'Intéressé', Icon: Star },
  { value: 'en_cours', label: 'Dossier envoyé', Icon: FolderInput, sent: true },
  { value: 'inscrit', label: 'Inscrit', Icon: Check, validated: true },
]

const OUTCOMES: Record<Outcome, { label: string; sentence: string; choice: string }> = {
  refuse: {
    label: 'Refusé',
    sentence: 'Ton dossier n’a pas été retenu pour cette date.',
    choice: 'Mon dossier a été refusé',
  },
  annule: {
    label: 'Annulé',
    sentence: 'Tu as annulé ta participation.',
    choice: 'J’ai annulé ma participation',
  },
}

const OUTCOME_KEYS: Outcome[] = ['refuse', 'annule']

function chosen(status: ParticipationStatus | null): ChosenStatus | null {
  if (status === 'confirme') return 'inscrit'
  if (status === 'refuse' || status === 'annule') return null
  return status
}

function outcomeOf(status: ParticipationStatus | null): Outcome | null {
  return status === 'refuse' || status === 'annule' ? status : null
}

interface EventStatusProps {
  status: ParticipationStatus | null
  setStatus: (next: ParticipationStatus | null) => Promise<void>
  saving: boolean
  writeError: string | null
  /** En gratuit, au-delà des 6 mois : on ne pose pas la date, on invite au Pro. */
  locked: boolean
  monthsAway: number
  /** La raison d'un refus, privée (participation_dossiers), et son écriture. */
  refusalReason: string | null
  saveReason: (reason: string | null) => void
}

export function EventStatus({
  status,
  setStatus,
  saving,
  writeError,
  locked,
  monthsAway,
  refusalReason,
  saveReason,
}: EventStatusProps) {
  // Juste choisi : le champ de la raison prend la main.
  const [justRefused, setJustRefused] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  // « Changer » sur une date refusée ou annulée : les étapes reviennent, sans rien écrire encore.
  const [changing, setChanging] = useState(false)
  const menu = useRef<HTMLDivElement>(null)
  const outcome = changing ? null : outcomeOf(status)

  // Le menu se referme au clic ailleurs et sur Échap, comme celui des comptes.
  useEffect(() => {
    if (!menuOpen) return
    function outside(event: MouseEvent) {
      if (event.target instanceof Node && !menu.current?.contains(event.target)) setMenuOpen(false)
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [menuOpen])

  function choose(next: ParticipationStatus | null) {
    setJustRefused(next === 'refuse')
    setMenuOpen(false)
    setChanging(false)
    void setStatus(next)
  }

  return (
    <section className="event-page__block">
      <div className="event-status__head">
        <h2 className="event-page__block-title">Statut</h2>
        {status && (
          <div className="event-status__more" ref={menu}>
            <Button
              variant="icon"
              aria-label="Autres choix pour cette date"
              aria-expanded={menuOpen}
              disabled={saving}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <Ellipsis size={18} strokeWidth={1.75} />
            </Button>
            {menuOpen && (
              <div className="event-status__menu" role="menu">
                {OUTCOME_KEYS.filter((key) => key !== status).map((key) => (
                  <button
                    key={key}
                    type="button"
                    role="menuitem"
                    className="event-status__option"
                    onClick={() => choose(key)}
                  >
                    {OUTCOMES[key].choice}
                  </button>
                ))}
                <button
                  type="button"
                  role="menuitem"
                  className="event-status__option event-status__option--remove"
                  onClick={() => choose(null)}
                >
                  Retirer cette date
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {outcome ? (
        <div className="event-status__outcome">
          <span className="event-status__outcome-chip">{OUTCOMES[outcome].label}</span>
          <p className="event-status__outcome-text">{OUTCOMES[outcome].sentence}</p>
          <button
            type="button"
            className="event-status__outcome-change"
            onClick={() => setChanging(true)}
          >
            Changer
          </button>
        </div>
      ) : null}
      {outcome === 'refuse' && (
        <label className="event-status__reason">
          <span>Pourquoi ? Visible par toi seul</span>
          <DraftInput
            multiline
            autoFocus={justRefused}
            className="draft-input--box"
            label="La raison du refus"
            placeholder="Ce que l’orga t’a dit, ce que tu en retiens…"
            value={refusalReason ?? ''}
            onSave={(draft) => {
              saveReason(draft.trim() || null)
            }}
          />
        </label>
      )}
      {outcome ? null : (
        <Segmented
          label="Ma participation à cette date"
          options={STEPS}
          value={chosen(status)}
          disabled={saving}
          onChange={(next) => {
            if (locked) setInviting(true)
            else choose(next)
          }}
          onClear={() => choose(null)}
        />
      )}
      {inviting && (
        <ProBubble
          className="event-status__bubble"
          title={`Ce festival est dans ${monthsAway} mois`}
          text="En gratuit, tu planifies tes 6 prochains mois. Le Pro t’ouvre toute ton année."
          onClose={() => {
            setInviting(false)
          }}
        />
      )}

      {/* L'écriture a échoué et l'affichage est déjà revenu en arrière : sans
          ce mot, la valeur qui saute passerait pour un bug. */}
      {writeError && <p className="event-status__error">{writeError}</p>}
    </section>
  )
}
