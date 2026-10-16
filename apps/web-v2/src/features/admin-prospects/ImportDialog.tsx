/**
 * QUOI     — la fenêtre « Importer un fichier » : choisir un CSV, une source commune facultative,
 *            voir l'aperçu (à ajouter, doublons, lignes ignorées), puis importer.
 * POURQUOI — le commercial crée ses prospects un par un ; un salon ou une liste se déversent d'un
 *            coup (Uriel, 16/10/2026). Papa Parse lit le fichier dans le navigateur.
 * ATTENTION — l'élément <dialog> fait le voile, Échap et le piège du focus ; pendant l'envoi, rien
 *            ne ferme la fenêtre.
 */
import Papa from 'papaparse'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { emailsOf, planImport } from '@/lib/prospect-import'
import { importProspects, knownEmails } from './prospect-writes'

const PREVIEW_NAMES = 5

/** « 1 prospect », « 3 prospects ». */
function prospects(count: number): string {
  return count === 1 ? '1 prospect' : `${count} prospects`
}

function readCsv(file: File): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      skipEmptyLines: 'greedy',
      complete: (result) => resolve(result.data),
      error: (error) => reject(error),
    })
  })
}

/** Le fichier lu et les e-mails déjà dans la liste : l'aperçu se recalcule quand la source change. */
interface Loaded {
  rows: string[][]
  known: Set<string>
}

interface Props {
  onClose: () => void
  onDone: () => void
}

export function ImportDialog({ onClose, onDone }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [source, setSource] = useState('')
  const [reading, setReading] = useState(false)
  const [sending, setSending] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const plan = loaded ? planImport(loaded.rows, loaded.known, source) : null

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  function close() {
    if (!sending) onClose()
  }

  async function choose(file: File | undefined) {
    if (!file) return
    setReading(true)
    setProblem(null)
    setLoaded(null)
    try {
      const rows = await readCsv(file)
      setLoaded({ rows, known: await knownEmails(emailsOf(rows)) })
    } catch (failure) {
      setProblem(failure instanceof Error ? failure.message : 'Le fichier n’a pas pu être lu.')
    } finally {
      setReading(false)
    }
  }

  async function send() {
    if (!plan || plan.toAdd.length === 0) return
    setSending(true)
    setProblem(null)
    try {
      await importProspects(plan.toAdd)
      onDone()
    } catch (failure) {
      setProblem(failure instanceof Error ? failure.message : 'L’import n’a pas abouti.')
      setSending(false)
    }
  }

  return (
    <dialog
      ref={dialog}
      className="confirm-dialog"
      aria-labelledby="import-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div className="confirm-dialog__card">
        <h2 id="import-dialog-title" className="confirm-dialog__title">
          Importer un fichier
        </h2>
        <p className="confirm-dialog__text">
          Un fichier CSV exporté d’Excel ou de Google Sheets (CSV UTF-8), avec les titres en
          première ligne : nom, marque, activité, ville, e-mail, téléphone, source, note.
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          className="prospect-import__file"
          aria-label="Fichier CSV"
          disabled={sending}
          onChange={(event) => void choose(event.target.files?.[0])}
        />
        <label className="prospect-import__source">
          <span className="prospect-import__label">Source pour tout le fichier (facultatif)</span>
          <input
            className="prospect-cell__input"
            value={source}
            placeholder="Salon de Rennes"
            disabled={sending}
            onChange={(event) => setSource(event.target.value)}
          />
        </label>

        {reading && <p className="confirm-dialog__text">Lecture du fichier…</p>}
        {plan && <ImportSummary plan={plan} />}
        {problem && <p className="confirm-dialog__problem">{problem}</p>}

        <div className="confirm-dialog__actions">
          <Button onClick={close} disabled={sending}>
            Annuler
          </Button>
          <Button
            variant="action"
            onClick={() => void send()}
            disabled={sending || !plan || plan.toAdd.length === 0}
          >
            {sending ? 'Un instant…' : `Importer ${prospects(plan?.toAdd.length ?? 0)}`}
          </Button>
        </div>
      </div>
    </dialog>
  )
}

function ImportSummary({ plan }: { plan: ReturnType<typeof planImport> }) {
  if (plan.toAdd.length === 0) {
    return (
      <p className="confirm-dialog__problem">
        Aucun prospect à ajouter : vérifie les titres de colonnes.
      </p>
    )
  }
  const names = plan.toAdd
    .slice(0, PREVIEW_NAMES)
    .map((prospect) => prospect.name ?? prospect.brand ?? prospect.email)
  return (
    <div className="prospect-import__summary">
      <p className="prospect-import__count">{prospects(plan.toAdd.length)} à ajouter</p>
      {plan.duplicates > 0 && (
        <p className="confirm-dialog__text">
          Déjà dans la liste (même e-mail), écartés : {plan.duplicates}.
        </p>
      )}
      {plan.ignored > 0 && (
        <p className="confirm-dialog__text">
          Lignes sans nom, marque ni e-mail, ignorées : {plan.ignored}.
        </p>
      )}
      <p className="confirm-dialog__text">
        {names.join(', ')}
        {plan.toAdd.length > PREVIEW_NAMES ? '…' : ''}
      </p>
    </div>
  )
}
