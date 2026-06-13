import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { planForActor } from '@/lib/navModel'
import { useEventReport, saveEventReport } from '@/hooks/use-reports'
import { uploadBilanPhoto, signedUrlsFor, removeBilanPhoto } from '@/lib/bilan-media'
import { LEDGER_CATEGORIES, defaultDirectionFor, ledgerProfit, categoryLabel } from '@/lib/ledger'
import type { LedgerCategory, LedgerDirection } from '@/types/database'
import { useEventLedger, insertLedgerEntry, updateLedgerEntry, deleteLedgerEntry, ensureReportId } from '@/hooks/use-ledger'
import { Button } from '@/components/ui/button'
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
  const [newLabel, setNewLabel] = useState('')
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
      <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-secondary p-4 text-sm">
        <Lock className="h-4 w-4 text-primary" />
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
      label: newLabel.trim() || null, amount: amt,
      direction: defaultDirectionFor(newCat), category: newCat, source: 'manual',
    })
    setNewAmount(''); setNewLabel(''); setAdding(false)
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

  const inputClass = "w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"

  return (
    <div className="space-y-4 rounded-xl border border-primary/20 bg-secondary p-4">
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Bilan privé</h3>
      </div>

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
            <select value={newCat} onChange={e => setNewCat(e.target.value as LedgerCategory)}>
              {LEDGER_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
            </select>
            <input className={inputClass} placeholder="Libellé (optionnel)" value={newLabel} onChange={e => setNewLabel(e.target.value)} />
            <input className={inputClass} type="number" inputMode="decimal" placeholder="Montant €" value={newAmount} onChange={e => setNewAmount(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addEntry() }} />
            <Button size="sm" onClick={addEntry}>Ajouter</Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Ajouter une ligne</Button>
        )}
      </div>

      <div className="rounded-lg bg-card p-3 text-center">
        <p className="text-xs text-muted-foreground">Bénéfice</p>
        <p className={`text-xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
          {profit.toFixed(2)} €
        </p>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Note libre</label>
        <textarea
          className={inputClass}
          rows={3}
          placeholder="Comment ça s'est passé ? Ambiance, public, ce que tu retiens…"
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">À améliorer la prochaine fois</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {improvements.map((im, i) => (
            <span key={i} className="flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs text-orange-700">
              {im}
              <button onClick={() => setImprovements(improvements.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input className={inputClass} placeholder="Ajouter un point à améliorer" value={newImprovement} onChange={e => setNewImprovement(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addImprovement() } }} />
          <Button size="icon" variant="ghost" onClick={addImprovement}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Photos souvenir <span className="opacity-70">— privées, visibles uniquement par toi</span></label>
        <div className="mt-1 flex flex-wrap gap-2">
          {mediaPaths.map(path => (
            <span key={path} className="relative h-16 w-16 overflow-hidden rounded-lg bg-card">
              {signedUrls.get(path) && <img src={signedUrls.get(path)} alt="" className="h-full w-full object-cover" />}
              <button onClick={() => handleRemovePhoto(path)} className="absolute right-0 top-0 bg-black/60 p-0.5 text-white" aria-label="Retirer la photo"><X className="h-3 w-3" /></button>
            </span>
          ))}
          <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border border-dashed border-input text-muted-foreground">
            <ImagePlus className="h-5 w-5" />
            <input type="file" accept="image/*" multiple className="hidden" onChange={e => handlePhotos(e.target.files)} />
          </label>
        </div>
        {uploading && <p className="mt-1 text-xs text-muted-foreground">Envoi des photos…</p>}
      </div>

      <Button className="w-full" onClick={handleSave} disabled={saving || uploading}>
        {saving ? 'Sauvegarde...' : 'Sauvegarder le bilan'}
      </Button>
    </div>
  )
}
