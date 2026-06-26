import { useState, useRef, useEffect } from 'react'
import { useAdminTestimonials, uploadTestimonialAvatar } from '@/hooks/use-admin'
import { supabase } from '@/lib/supabase'
import type { Testimonial, TestimonialInsert } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Loader2, Plus, Trash2, Pencil, ImagePlus, Search, X, Link2 } from 'lucide-react'

type FormValues = {
  name: string
  craft: string
  quote: string
  entity_slug: string
  avatar_url: string | null
  actor_id: string | null
  is_active: boolean
  sort_order: number
}

/** Compte Fellowship lié, résolu pour l'aperçu (avatar de secours, vitrine). */
type LinkedAccount = {
  actor_id: string
  kind: 'person' | 'entity'
  label: string | null
  avatar_url: string | null
  public_slug: string | null
}

const EMPTY: FormValues = {
  name: '', craft: '', quote: '', entity_slug: '', avatar_url: null, actor_id: null, is_active: true, sort_order: 0,
}

function fromRow(t: Testimonial): FormValues {
  return {
    name: t.name,
    craft: t.craft,
    quote: t.quote,
    entity_slug: t.entity_slug ?? '',
    avatar_url: t.avatar_url,
    actor_id: t.actor_id,
    is_active: t.is_active,
    sort_order: t.sort_order,
  }
}

/** Recherche de compte par nom (typeahead) → renvoie l'acteur lié résolu. */
function AccountPicker({ value, onPick, onClear }: {
  value: LinkedAccount | null
  onPick: (a: LinkedAccount) => void
  onClear: () => void
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Array<{ actor_id: string | null; kind: string | null; label: string | null; avatar_url: string | null; public_slug: string | null }>>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const query = q.trim()
    let cancelled = false
    const id = setTimeout(async () => {
      if (query.length < 2) { if (!cancelled) setResults([]); return }
      if (!cancelled) setSearching(true)
      const { data } = await supabase
        .from('actor_public')
        .select('actor_id, kind, label, avatar_url, public_slug')
        .ilike('label', `%${query}%`)
        .limit(8)
      if (!cancelled) { setResults(data ?? []); setSearching(false) }
    }, 250)
    return () => { cancelled = true; clearTimeout(id) }
  }, [q])

  function pick(r: { actor_id: string | null; kind: string | null; label: string | null; avatar_url: string | null; public_slug: string | null }) {
    if (!r.actor_id) return
    onPick({ actor_id: r.actor_id, kind: r.kind === 'entity' ? 'entity' : 'person', label: r.label, avatar_url: r.avatar_url, public_slug: r.public_slug })
    setQ(''); setResults([])
  }

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
        <Link2 className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        {value.avatar_url
          ? <img src={value.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
          : <span className="h-6 w-6 rounded-full bg-muted inline-block" />}
        <span className="font-medium">{value.label ?? 'Compte'}</span>
        <span className="text-xs text-muted-foreground">
          {value.kind === 'entity' ? 'Exposant' : 'Festivalier'}
        </span>
        <button type="button" onClick={onClear} className="ml-auto p-1 rounded hover:bg-muted text-muted-foreground" title="Délier">
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-border px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Lier un compte Fellowship (chercher un nom)…"
          className="flex-1 bg-transparent text-sm outline-none"
        />
        {searching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      {results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full glass-card max-h-64 overflow-auto divide-y divide-[var(--hair)]">
          {results.map(r => (
            <button
              key={r.actor_id}
              type="button"
              onClick={() => pick(r)}
              className="flex items-center gap-2 w-full text-left p-2 hover:bg-muted text-sm"
            >
              {r.avatar_url
                ? <img src={r.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                : <span className="h-7 w-7 rounded-full bg-muted inline-block" />}
              <span className="font-medium truncate">{r.label ?? 'Sans nom'}</span>
              <span className="ml-auto text-xs text-muted-foreground">{r.kind === 'entity' ? 'Exposant' : 'Festivalier'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Carte d'aperçu — réplique le markup .testimonial de la Landing (avatar résolu + chip). */
function Preview({ v, linked }: { v: FormValues; linked: LinkedAccount | null }) {
  const initials = v.name.slice(0, 1).toUpperCase() || '?'
  const avatar = v.avatar_url ?? linked?.avatar_url ?? null
  const slug = v.entity_slug || linked?.public_slug || null
  return (
    <div>
      <article className="testimonial" style={{ maxWidth: 340 }}>
        <div className="testimonial-head">
          {avatar
            ? <img src={avatar} alt="" className="testimonial-avatar" />
            : <div className="testimonial-avatar testimonial-avatar-fallback">{initials}</div>}
          <div className="testimonial-meta">
            <div className="testimonial-name">{v.name || 'Prénom'}</div>
            <div className="testimonial-craft">{v.craft || 'Métier — Lieu'}</div>
          </div>
        </div>
        <blockquote className="testimonial-quote">« {v.quote || 'Le paragraphe mélioratif apparaîtra ici.'} »</blockquote>
      </article>
      {slug && (
        <p className="text-[11px] text-muted-foreground mt-2 text-center">
          La tête renvoie vers <span className="font-medium">/{slug}</span>
        </p>
      )}
    </div>
  )
}

function TestimonialForm({
  initial, onSubmit, onCancel, submitLabel,
}: {
  initial: FormValues
  onSubmit: (v: FormValues) => Promise<void>
  onCancel: () => void
  submitLabel: string
}) {
  const [v, setV] = useState<FormValues>(initial)
  const [linked, setLinked] = useState<LinkedAccount | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Édition d'un témoignage déjà lié : on recharge les infos du compte pour l'aperçu.
  useEffect(() => {
    const actorId = initial.actor_id
    if (!actorId) return
    let cancelled = false
    ;(async () => {
      const { data: a } = await supabase
        .from('actor_public')
        .select('actor_id, kind, label, avatar_url, public_slug')
        .eq('actor_id', actorId)
        .maybeSingle()
      if (cancelled || !a || !a.actor_id) return
      setLinked({ actor_id: a.actor_id, kind: a.kind === 'entity' ? 'entity' : 'person', label: a.label, avatar_url: a.avatar_url, public_slug: a.public_slug })
    })()
    return () => { cancelled = true }
  }, [initial.actor_id])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadTestimonialAvatar(file)
      setV(prev => ({ ...prev, avatar_url: url }))
    } catch (err) {
      console.error('Upload témoignage error:', err)
      alert("L'upload de l'image a échoué.")
    } finally {
      setUploading(false)
    }
  }

  async function submit() {
    if (!v.name.trim() || !v.craft.trim() || !v.quote.trim()) return
    setSaving(true)
    try { await onSubmit(v) } finally { setSaving(false) }
  }

  return (
    <div className="glass-card p-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-3">
          <input
            placeholder="Prénom (ex: Élise)"
            value={v.name}
            onChange={e => setV({ ...v, name: e.target.value })}
            className="rounded-xl border border-border px-3 py-2 text-sm bg-transparent"
          />
          <input
            placeholder="Phrase qui le décrit (ex: Céramiste — Provence)"
            value={v.craft}
            onChange={e => setV({ ...v, craft: e.target.value })}
            className="rounded-xl border border-border px-3 py-2 text-sm bg-transparent"
          />
          <textarea
            placeholder="Paragraphe mélioratif (gain concret vécu)"
            value={v.quote}
            onChange={e => setV({ ...v, quote: e.target.value })}
            rows={4}
            className="rounded-xl border border-border px-3 py-2 text-sm bg-transparent resize-y"
          />
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Compte Fellowship lié (avatar de secours + lien vitrine)</span>
            <AccountPicker
              value={linked}
              onPick={a => { setLinked(a); setV(prev => ({ ...prev, actor_id: a.actor_id })) }}
              onClear={() => { setLinked(null); setV(prev => ({ ...prev, actor_id: null })) }}
            />
          </div>
          <input
            placeholder="Slug vitrine (override manuel, optionnel)"
            value={v.entity_slug}
            onChange={e => setV({ ...v, entity_slug: e.target.value })}
            className="rounded-xl border border-border px-3 py-2 text-sm bg-transparent"
          />
          <div className="flex items-center gap-4 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading
                ? <Loader2 className="animate-spin" />
                : <ImagePlus strokeWidth={1.5} />}
              {v.avatar_url ? 'Changer la photo' : 'Ajouter une photo'}
            </Button>
            {v.avatar_url && (
              <button
                type="button"
                onClick={() => setV({ ...v, avatar_url: null })}
                className="text-xs text-muted-foreground hover:text-red-500"
              >
                Retirer la photo
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="sr-only" />
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={v.is_active}
                onChange={e => setV({ ...v, is_active: e.target.checked })}
              />
              Actif (visible sur la Landing)
            </label>
            <label className="flex items-center gap-2 text-sm">
              Ordre
              <input
                type="number"
                value={v.sort_order}
                onChange={e => setV({ ...v, sort_order: Number(e.target.value) || 0 })}
                className="w-20 rounded-lg border border-border px-2 py-1 text-sm bg-transparent"
              />
            </label>
          </div>
        </div>

        {/* Aperçu live */}
        <div className="flex items-start justify-center">
          <Preview v={v} linked={linked} />
        </div>
      </div>

      <div className="flex gap-2 justify-end mt-4">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          size="sm"
          onClick={submit}
          disabled={saving || uploading || !v.name.trim() || !v.craft.trim() || !v.quote.trim()}
        >
          {saving ? 'Enregistrement…' : submitLabel}
        </Button>
      </div>
    </div>
  )
}

export function AdminTestimonials() {
  const { testimonials, loading, createTestimonial, updateTestimonial, deleteTestimonial } = useAdminTestimonials()
  const [showNew, setShowNew] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)

  function toInsert(v: FormValues): TestimonialInsert {
    return {
      name: v.name.trim(),
      craft: v.craft.trim(),
      quote: v.quote.trim(),
      entity_slug: v.entity_slug.trim() || null,
      avatar_url: v.avatar_url,
      actor_id: v.actor_id,
      is_active: v.is_active,
      sort_order: v.sort_order,
    }
  }

  async function handleCreate(v: FormValues) {
    await createTestimonial({ ...toInsert(v), sort_order: v.sort_order || testimonials.length + 1 })
    setShowNew(false)
  }

  async function handleUpdate(id: string, v: FormValues) {
    await updateTestimonial(id, toInsert(v))
    setEditing(null)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer le témoignage de "${name}" ?`)) return
    await deleteTestimonial(id)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{testimonials.length} témoignage{testimonials.length > 1 ? 's' : ''}</p>
        {!showNew && (
          <Button variant="outline" size="sm" onClick={() => setShowNew(true)}>
            <Plus strokeWidth={1.5} />
            Nouveau témoignage
          </Button>
        )}
      </div>

      {showNew && (
        <TestimonialForm
          initial={{ ...EMPTY, sort_order: testimonials.length + 1 }}
          onSubmit={handleCreate}
          onCancel={() => setShowNew(false)}
          submitLabel="Créer"
        />
      )}

      {testimonials.length === 0 && !showNew && (
        <div className="glass-card p-8 text-center text-sm text-muted-foreground">
          Aucun témoignage pour l'instant. La section est masquée sur la Landing tant qu'aucun témoignage actif n'existe.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {testimonials.map(t => (
          editing === t.id ? (
            <TestimonialForm
              key={t.id}
              initial={fromRow(t)}
              onSubmit={v => handleUpdate(t.id, v)}
              onCancel={() => setEditing(null)}
              submitLabel="Enregistrer"
            />
          ) : (
            <div key={t.id} className="glass-card flex items-center gap-4 p-4">
              {t.avatar_url
                ? <img src={t.avatar_url} alt="" className="testimonial-avatar" />
                : <div className="testimonial-avatar testimonial-avatar-fallback">{t.name.slice(0, 1).toUpperCase()}</div>}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{t.name}</span>
                  {!t.is_active && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Inactif</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{t.craft}</div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">« {t.quote} »</p>
              </div>
              <button onClick={() => setEditing(t.id)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                <Pencil className="h-4 w-4" strokeWidth={1.5} />
              </button>
              <button onClick={() => handleDelete(t.id, t.name)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
          )
        ))}
      </div>
    </div>
  )
}
