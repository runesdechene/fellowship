import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { createEvent, searchSimilarEvents } from '@/hooks/use-events'
import { supabase } from '@/lib/supabase'
import { compressImage } from '@/lib/compress-image'
import { Button } from '@/components/ui/button'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { DeduplicateSuggestions } from './DeduplicateSuggestions'
import { TagInput } from './TagInput'
import { PRIMARY_TAGS } from '@/lib/constants'
import { ChevronRight, ChevronLeft, MapPin, Calendar, Tag, Image, Link as LinkIcon, Check } from 'lucide-react'
import type { EventInsert } from '@/types/database'

type EventSuggestion = { id: string; name: string; city: string; department: string; start_date: string; end_date: string; score?: number }

interface EventFormProps {
  onClose?: () => void
}

export function EventForm({ onClose }: EventFormProps) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [suggestions, setSuggestions] = useState<EventSuggestion[]>([])
  const [dismissed, setDismissed] = useState(false)
  const [secondaryTags, setSecondaryTags] = useState<string[]>([])
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
    contact_email: '',
    registration_note: '',
    primary_tag: '',
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
    onClose?.()
    navigate(`/evenement/${eventId}`)
  }

  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!profile) return
    setSaving(true)
    setError(null)

    try {
      let image_url: string | undefined
      if (form.image) {
        const compressed = await compressImage(form.image)
        const isWebp = compressed.type === 'image/webp'
        const ext = isWebp ? 'webp' : compressed.name.split('.').pop() ?? 'jpg'
        const path = `${crypto.randomUUID()}.${ext}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('event-images')
          .upload(path, compressed, { contentType: compressed.type || 'image/webp' })
        if (uploadError) {
          console.error('Image upload failed:', uploadError)
          // Continue without image
        } else if (uploadData) {
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
        contact_email: form.contact_email || null,
        registration_note: form.registration_note || null,
        primary_tag: form.primary_tag,
        tags: secondaryTags,
        image_url: image_url ?? null,
        created_by: profile.id,
      }

      const { data, error: createError } = await createEvent(eventData)
      if (createError) {
        console.error('Event creation failed:', createError)
        setError(createError.message ?? 'Erreur lors de la création')
        return
      }
      if (data) {
        onClose?.()
        navigate(`/evenement/${data.id}`)
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('Une erreur inattendue est survenue')
    } finally {
      setSaving(false)
    }
  }

  const update = (field: string, value: string | File | null) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const inputClass = "w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"

  const canProceedStep0 = form.name.length >= 3 && suggestions.length === 0
  const canProceedStep1 = form.city && form.department && form.start_date
  const canProceedStep2 = !!form.primary_tag

  const steps = [
    // Step 0: Name + deduplication
    <div key="name" className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Calendar className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Quel événement ?</h3>
          <p className="text-xs text-muted-foreground">Cherche s'il existe déjà</p>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Nom <span className="text-destructive">*</span></label>
        <input
          type="text"
          className={inputClass}
          placeholder="Ex: Fête médiévale de Provins 2026"
          value={form.name}
          onChange={(e) => { update('name', e.target.value); setDismissed(false) }}
          autoFocus
        />
      </div>
      <DeduplicateSuggestions
        suggestions={suggestions}
        onSelect={handleSelectExisting}
        onDismiss={() => setDismissed(true)}
      />
      {form.name.length >= 3 && suggestions.length === 0 && dismissed && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <Check className="h-3 w-3" /> Nouvel événement, on continue !
        </p>
      )}
    </div>,

    // Step 1: Where + When
    <div key="where-when" className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <MapPin className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Où et quand ?</h3>
          <p className="text-xs text-muted-foreground">Localisation et dates</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Ville <span className="text-destructive">*</span></label>
          <input type="text" className={inputClass} placeholder="Ville" value={form.city} onChange={e => update('city', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Département <span className="text-destructive">*</span></label>
          <input type="text" className={inputClass} placeholder="Département (ex: 77)" value={form.department} onChange={e => update('department', e.target.value)} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Début <span className="text-destructive">*</span></label>
          <input type="date" className={inputClass} value={form.start_date} onChange={e => update('start_date', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Fin</label>
          <input type="date" className={inputClass} value={form.end_date} onChange={e => update('end_date', e.target.value)} />
        </div>
      </div>
    </div>,

    // Step 2: Tags
    <div key="tags" className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Tag className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Catégorie</h3>
          <p className="text-xs text-muted-foreground">Type d'événement et tags</p>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Type principal <span className="text-destructive">*</span></label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {PRIMARY_TAGS.map(tag => (
            <button
              key={tag.value}
              type="button"
              onClick={() => update('primary_tag', tag.value)}
              className={`rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                form.primary_tag === tag.value
                  ? 'border-2 border-primary bg-primary/10 text-primary'
                  : 'bg-card hover:bg-muted'
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Tags secondaires</label>
        <TagInput value={secondaryTags} onChange={setSecondaryTags} placeholder="Ex: fantasy, artisanat, jeux de rôle..." />
      </div>
    </div>,

    // Step 3: Details (optional)
    <div key="details" className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <LinkIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Détails</h3>
          <p className="text-xs text-muted-foreground">Optionnel — tu pourras compléter plus tard</p>
        </div>
      </div>
      <RichTextEditor
        content={form.description}
        onChange={html => update('description', html)}
        placeholder="Décrivez l'événement..."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Date limite d'inscription</label>
          <input type="date" className={inputClass} value={form.registration_deadline} onChange={e => update('registration_deadline', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Lien d'inscription</label>
          <input type="url" className={inputClass} placeholder="https://..." value={form.registration_url} onChange={e => update('registration_url', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Site web de l'événement</label>
        <input type="url" className={inputClass} placeholder="https://..." value={form.external_url} onChange={e => update('external_url', e.target.value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Email de contact</label>
          <input type="email" className={inputClass} placeholder="contact@exemple.fr" value={form.contact_email} onChange={e => update('contact_email', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Note d'inscription</label>
          <input type="text" className={inputClass} placeholder="Ex: Envoyer dossier par mail" value={form.registration_note} onChange={e => update('registration_note', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Affiche</label>
        <div className="flex items-center gap-3">
          <label className="flex-1 cursor-pointer rounded-xl border-2 border-dashed border-border p-4 text-center text-sm text-muted-foreground hover:border-primary/30 hover:bg-muted transition-colors">
            <Image className="mx-auto mb-1 h-6 w-6" />
            {form.image ? form.image.name : 'Cliquer pour ajouter une image'}
            <input type="file" accept="image/*" className="hidden" onChange={e => update('image', e.target.files?.[0] ?? null)} />
          </label>
        </div>
      </div>
    </div>,
  ]

  const canProceed = [canProceedStep0, canProceedStep1, canProceedStep2, true]
  const isLastStep = step === steps.length - 1

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex gap-1">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= step ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Current step */}
      {steps[step]}

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        {step > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Retour
          </Button>
        ) : (
          <div />
        )}

        {isLastStep ? (
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Création...' : "Créer l'événement"}
          </Button>
        ) : (
          <Button onClick={() => setStep(step + 1)} disabled={!canProceed[step]}>
            Suivant
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
