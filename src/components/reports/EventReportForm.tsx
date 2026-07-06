import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { planForActor } from '@/lib/navModel'
import { useEventReport, saveEventReport } from '@/hooks/use-reports'
import { uploadBilanPhoto, signedUrlsFor, removeBilanPhoto } from '@/lib/bilan-media'
import { LEDGER_CATEGORIES, defaultDirectionFor, ledgerProfit, categoryLabel } from '@/lib/ledger'
import type { LedgerCategory, LedgerDirection } from '@/types/database'
import { useEventLedger, insertLedgerEntry, updateLedgerEntry, deleteLedgerEntry, ensureReportId } from '@/hooks/use-ledger'
import { Lock, Plus, X, ImagePlus } from 'lucide-react'

interface EventReportFormProps {
  eventId: string
  /** Appelé après save réussi (utilisé par BilanModal pour fermer + refetch parent). */
  onSaved?: () => void
}

export function EventReportForm({ eventId, onSaved }: EventReportFormProps) {
  const { user, currentActor, currentActorRow } = useAuth()
  const { report: existing } = useEventReport(eventId)
  const { entries, refetch: refetchEntries } = useEventLedger(eventId)
  const [adding, setAdding] = useState(false)
  const [newCat, setNewCat] = useState<LedgerCategory>('essence')
  const [newAmount, setNewAmount] = useState('')
  const [improvements, setImprovements] = useState<string[]>([])
  const [newImprovement, setNewImprovement] = useState('')
  const [note, setNote] = useState('')
  const [mediaPaths, setMediaPaths] = useState<string[]>([])
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map())
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (existing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setImprovements(existing.improvements ?? [])
      setNote(existing.note ?? '')
      setMediaPaths(existing.media_paths ?? [])
    }
  }, [existing])

  // Signer les paths pour l'aperçu (bucket privé).
  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (mediaPaths.length === 0) { setSignedUrls(new Map()); return }
    signedUrlsFor(mediaPaths).then(map => { if (!cancelled) setSignedUrls(map) })
    return () => { cancelled = true }
  }, [mediaPaths])

  if (planForActor(currentActor, currentActorRow) !== 'pro') {
    return (
      <div className="bilan-pro-gate">
        <Lock className="h-4 w-4" strokeWidth={2} />
        <span>Le bilan post-événement est une fonctionnalité <strong>Pro</strong></span>
      </div>
    )
  }

  const profit = ledgerProfit(entries)

  const addEntry = async () => {
    const amt = parseFloat(newAmount) || 0
    if (!currentActor || amt <= 0) return
    const reportId = await ensureReportId(currentActor.id, eventId)
    if (!reportId) return
    await insertLedgerEntry({
      report_id: reportId, actor_id: currentActor.id, event_id: eventId,
      label: null, amount: amt,
      direction: defaultDirectionFor(newCat), category: newCat, source: 'manual',
    })
    setNewAmount(''); setAdding(false)
    await refetchEntries()
  }

  const toggleDirection = async (id: string, dir: LedgerDirection) => {
    await updateLedgerEntry(id, { direction: dir === 'in' ? 'out' : 'in' })
    await refetchEntries()
  }

  const removeEntry = async (id: string) => {
    await deleteLedgerEntry(id)
    await refetchEntries()
  }

  const handlePhotos = async (files: FileList | null) => {
    if (!files || !currentActor) return
    setUploading(true)
    try {
      const added: string[] = []
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue
        added.push(await uploadBilanPhoto(file, currentActor.id, eventId))
      }
      if (added.length) setMediaPaths(prev => [...prev, ...added])
    } catch (e) {
      console.error('bilan photo upload failed', e)
    }
    setUploading(false)
  }

  const handleRemovePhoto = async (path: string) => {
    setMediaPaths(prev => prev.filter(p => p !== path))
    try { await removeBilanPhoto(path) } catch (e) { console.error('bilan photo remove failed', e) }
  }

  const handleSave = async () => {
    if (!user || !currentActor) return
    setSaving(true)
    const { error } = await saveEventReport({
      actor_id: currentActor.id,
      acted_by_user_id: user.id,
      event_id: eventId,
      improvements,
      note: note.trim() || null,
      media_paths: mediaPaths,
    })
    setSaving(false)
    if (!error) onSaved?.()
  }

  const addImprovement = () => {
    if (newImprovement.trim()) { setImprovements([...improvements, newImprovement.trim()]); setNewImprovement('') }
  }

  return (
    <div className="bilan-form">
      <div className="bilan-ledger">
        <div className="bilan-ledger-label">Mes lignes (dépenses &amp; recettes)</div>
        <ul className="bilan-ledger-list">
          {entries.map(e => (
            <li key={e.id} className={`bilan-ledger-row ${e.direction}`}>
              <button
                type="button"
                className="bilan-ledger-sign"
                onClick={() => toggleDirection(e.id, e.direction)}
                title="Basculer dépense / recette"
              >{e.direction === 'in' ? '+' : '−'}</button>
              <span className="bilan-ledger-cat">{e.label || categoryLabel(e.category)}</span>
              <span className="bilan-ledger-amt">{e.amount.toLocaleString('fr-FR')} €</span>
              {e.source === 'stepper'
                ? <span className="bilan-ledger-auto" title="Saisi depuis le suivi de paiement">auto</span>
                : <button type="button" className="bilan-ledger-del" onClick={() => removeEntry(e.id)} aria-label="Supprimer"><X className="h-3 w-3" /></button>}
            </li>
          ))}
          {entries.length === 0 && <li className="bilan-ledger-empty">Aucune ligne pour l'instant.</li>}
        </ul>

        {adding ? (
          <div className="bilan-ledger-add">
            {/* Le sens est intrinsèque à la catégorie : +/− devant chaque option
                (− = dépense, + = recette). Pas de toggle, l'essence reste une dépense. */}
            <div className="bilan-ledger-add-row">
              <select
                className="bilan-ledger-select"
                value={newCat}
                onChange={e => setNewCat(e.target.value as LedgerCategory)}
              >
                {LEDGER_CATEGORIES.map(c => (
                  <option key={c.key} value={c.key}>
                    {c.defaultDirection === 'in' ? '+' : '−'} {c.emoji} {c.label}
                  </option>
                ))}
              </select>
              <input className="bilan-input bilan-ledger-amount" type="number" inputMode="decimal" placeholder="Montant €" value={newAmount} onChange={e => setNewAmount(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addEntry() }} />
              <button type="button" className="da-btn da-btn-flat da-btn-sm" onClick={addEntry}>Ajouter</button>
            </div>
          </div>
        ) : (
          <button type="button" className="da-btn da-btn-2 da-btn-sm" onClick={() => setAdding(true)}><Plus strokeWidth={2.2} /> Ajouter une ligne</button>
        )}
      </div>

      <div className={`bilan-benefit ${profit >= 0 ? 'pos' : 'neg'}`}>
        <small>Bénéfice</small>
        <b>{(profit >= 0 ? '+' : '') + profit.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</b>
      </div>

      <div className="bilan-field">
        <label className="bilan-field-label">Note libre</label>
        <textarea
          className="bilan-textarea"
          rows={3}
          placeholder="Comment ça s'est passé ? Ambiance, public, ce que tu retiens…"
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      </div>

      <div className="bilan-field">
        <label className="bilan-field-label">À améliorer la prochaine fois</label>
        {improvements.length > 0 && (
          <div className="bilan-chips">
            {improvements.map((im, i) => (
              <span key={i} className="bilan-chip">
                {im}
                <button type="button" onClick={() => setImprovements(improvements.filter((_, j) => j !== i))} aria-label="Retirer"><X strokeWidth={2.2} /></button>
              </span>
            ))}
          </div>
        )}
        <div className="bilan-row">
          <input className="bilan-input" placeholder="Ajouter un point à améliorer" value={newImprovement} onChange={e => setNewImprovement(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addImprovement() } }} />
          <button type="button" className="da-btn da-btn-2 da-btn-sm" onClick={addImprovement} aria-label="Ajouter"><Plus strokeWidth={2.2} /></button>
        </div>
      </div>

      <div className="bilan-field">
        <label className="bilan-field-label">Photos souvenir <span className="hint">— privées, visibles uniquement par toi</span></label>
        <div className="bilan-photos">
          {mediaPaths.map(path => (
            <span key={path} className="bilan-photo">
              {signedUrls.get(path) && <img src={signedUrls.get(path)} alt="" />}
              <button type="button" className="bilan-photo-rm" onClick={() => handleRemovePhoto(path)} aria-label="Retirer la photo"><X strokeWidth={2.2} /></button>
            </span>
          ))}
          <label className="bilan-photo-add">
            <ImagePlus strokeWidth={1.8} />
            <input type="file" accept="image/*" multiple className="hidden" onChange={e => handlePhotos(e.target.files)} />
          </label>
        </div>
        {uploading && <p className="bilan-ledger-empty">Envoi des photos…</p>}
      </div>

      <button type="button" className="da-btn da-btn-flat bilan-save" onClick={handleSave} disabled={saving || uploading}>
        {saving ? 'Sauvegarde…' : 'Sauvegarder le bilan'}
      </button>
    </div>
  )
}
