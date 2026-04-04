import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { createEvent, searchSimilarEvents } from '@/hooks/use-events'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { DeduplicateSuggestions } from './DeduplicateSuggestions'
import type { EventInsert } from '@/types/database'

type EventSuggestion = { id: string; name: string; city: string; department: string; start_date: string; end_date: string }

export function EventForm() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [suggestions, setSuggestions] = useState<EventSuggestion[]>([])
  const [dismissed, setDismissed] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    city: '',
    department: '',
    start_date: '',
    end_date: '',
    registration_deadline: '',
    registration_url: '',
    external_url: '',
    primary_tag: '',
    tags: '',
    image: null as File | null,
  })

  useEffect(() => {
    if (form.name.length < 3 || dismissed) {
      setSuggestions([]) // eslint-disable-line react-hooks/set-state-in-effect
      return
    }
    const timer = setTimeout(async () => {
      const results = await searchSimilarEvents(form.name, form.start_date)
      setSuggestions(results)
    }, 500)
    return () => clearTimeout(timer)
  }, [form.name, form.start_date, dismissed])

  const handleSelectExisting = (eventId: string) => {
    navigate(`/evenement/${eventId}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setSaving(true)

    let image_url: string | undefined
    if (form.image) {
      const ext = form.image.name.split('.').pop()
      const path = `${crypto.randomUUID()}.${ext}`
      const { data: uploadData } = await supabase.storage
        .from('event-images')
        .upload(path, form.image)
      if (uploadData) {
        const { data: urlData } = supabase.storage
          .from('event-images')
          .getPublicUrl(uploadData.path)
        image_url = urlData.publicUrl
      }
    }

    const eventData: EventInsert = {
      name: form.name,
      description: form.description || null,
      city: form.city,
      department: form.department,
      start_date: form.start_date,
      end_date: form.end_date || form.start_date,
      registration_deadline: form.registration_deadline || null,
      registration_url: form.registration_url || null,
      external_url: form.external_url || null,
      primary_tag: form.primary_tag,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
      image_url: image_url ?? null,
      created_by: profile.id,
    }

    const { data } = await createEvent(eventData)
    setSaving(false)
    if (data) {
      navigate(`/evenement/${data.id}`)
    }
  }

  const update = (field: string, value: string | File | null) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const inputClass = "w-full rounded-xl border border-input bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring"

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Nom de l'événement *</label>
        <input type="text" className={inputClass} placeholder="Fête médiévale de Provins" value={form.name} onChange={(e) => { update('name', e.target.value); setDismissed(false) }} required />
        <DeduplicateSuggestions suggestions={suggestions} onSelect={handleSelectExisting} onDismiss={() => setDismissed(true)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Date de début *</label>
          <input type="date" className={inputClass} value={form.start_date} onChange={e => update('start_date', e.target.value)} required />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Date de fin</label>
          <input type="date" className={inputClass} value={form.end_date} onChange={e => update('end_date', e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Ville *</label>
          <input type="text" className={inputClass} placeholder="Provins" value={form.city} onChange={e => update('city', e.target.value)} required />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Département *</label>
          <input type="text" className={inputClass} placeholder="77 - Seine-et-Marne" value={form.department} onChange={e => update('department', e.target.value)} required />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <textarea className={`${inputClass} min-h-[100px]`} placeholder="Décris l'événement..." value={form.description} onChange={e => update('description', e.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Tag principal *</label>
          <input type="text" className={inputClass} placeholder="Médiéval" value={form.primary_tag} onChange={e => update('primary_tag', e.target.value)} required />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Tags secondaires</label>
          <input type="text" className={inputClass} placeholder="fantasy, artisanat (virgules)" value={form.tags} onChange={e => update('tags', e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Date limite d'inscription</label>
          <input type="date" className={inputClass} value={form.registration_deadline} onChange={e => update('registration_deadline', e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Lien d'inscription</label>
          <input type="url" className={inputClass} placeholder="https://..." value={form.registration_url} onChange={e => update('registration_url', e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Lien externe</label>
        <input type="url" className={inputClass} placeholder="https://..." value={form.external_url} onChange={e => update('external_url', e.target.value)} />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Affiche / Image</label>
        <input type="file" accept="image/*" className={inputClass} onChange={e => update('image', e.target.files?.[0] ?? null)} />
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={saving}>
        {saving ? 'Création...' : "Créer l'événement"}
      </Button>
    </form>
  )
}
