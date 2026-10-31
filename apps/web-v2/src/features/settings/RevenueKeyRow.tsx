/**
 * QUOI     — la ligne des recettes sous une enseigne Pro des Réglages : « Recettes chiffrées » (date
 *            de la phrase, « Changer la phrase », « Réinitialiser… ») ou « Recettes en clair »
 *            (« Chiffrer mes recettes »), et leurs fenêtres.
 * POURQUOI — maquettes 2587:233 et 2587:396 : chaque enseigne Pro règle sa phrase ici, même quand
 *            elle n'est pas l'enseigne active. Remplace les cartes de Réglages · Compte.
 * ATTENTION — chaque geste vise l'enseigne de la ligne (`entityId`), jamais l'active ; `onChange`
 *            relit les dates après coup.
 */
import { Lock, LockOpen } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EncryptDialog } from '@/features/reports/EncryptDialog'
import { formatShortDate } from '@/lib/dates'
import { useRevenueKey } from '@/lib/revenue-key'
import { ChangePhraseDialog } from './ChangePhraseDialog'
import { SettingRow } from './SettingRow'

interface Props {
  entityId: string
  brandName: string
  /** La date de la phrase en place, null sans phrase. */
  chosenAt: string | null
  onChange: () => void
}

export function RevenueKeyRow({ entityId, brandName, chosenAt, onChange }: Props) {
  const { reset } = useRevenueKey()
  const [open, setOpen] = useState<'choose' | 'change' | 'reset' | null>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  function done() {
    setOpen(null)
    onChange()
  }

  async function confirmReset() {
    setBusy(true)
    setProblem(null)
    try {
      await reset(entityId)
      done()
    } catch {
      setProblem('La réinitialisation n’a pas abouti. Réessaie, ou écris-nous à contact@flw.sh.')
    }
    setBusy(false)
  }

  if (!chosenAt) {
    return (
      <SettingRow
        className="setting-row--sub"
        leading={<LockOpen className="setting-row__icon" size={15} strokeWidth={2} />}
        title="Recettes en clair"
        note="Avec une phrase de passe, personne d’autre que toi ne pourra les lire."
      >
        <Button
          onClick={() => {
            setOpen('choose')
          }}
        >
          Chiffrer mes recettes
        </Button>
        {open === 'choose' && (
          <EncryptDialog
            subtitle={brandName}
            actorId={entityId}
            onClose={() => {
              setOpen(null)
              onChange()
            }}
          />
        )}
      </SettingRow>
    )
  }

  return (
    <SettingRow
      className="setting-row--sub"
      leading={<Lock className="setting-row__icon" size={15} strokeWidth={2} />}
      title="Recettes chiffrées"
      note={`Choisie le ${formatShortDate(new Date(chosenAt))}. Verrouillées après 15 minutes sans activité.`}
    >
      <Button
        onClick={() => {
          setOpen('change')
        }}
      >
        Changer la phrase
      </Button>
      <button
        type="button"
        className="delete-account__open"
        onClick={() => {
          setProblem(null)
          setOpen('reset')
        }}
      >
        Réinitialiser…
      </button>
      {open === 'change' && (
        <ChangePhraseDialog
          actorId={entityId}
          brandName={brandName}
          onDone={done}
          onClose={() => {
            setOpen(null)
          }}
        />
      )}
      {open === 'reset' && (
        <ConfirmDialog
          title="Réinitialiser ta phrase de passe ?"
          text="Tes recettes chiffrées seront effacées dans tous tes bilans de cette enseigne. Personne ne pourra les retrouver."
          confirmLabel="Réinitialiser"
          busy={busy}
          problem={problem}
          onConfirm={() => void confirmReset()}
          onClose={() => {
            setOpen(null)
          }}
        />
      )}
    </SettingRow>
  )
}
