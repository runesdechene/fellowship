import { useState, useEffect } from 'react'
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useEvent, updateEvent, useEventCreator } from '@/hooks/use-events'
import { compressImage } from '@/lib/compress-image'
import { addParticipation, removeParticipation, updateParticipation, useFriendsOnEvent } from '@/hooks/use-participations'
import { useEventNotes } from '@/hooks/use-notes'
import { useEventReviews } from '@/hooks/use-reviews'
import { NoteForm } from '@/components/notes/NoteForm'
import { NotesFeed } from '@/components/notes/NotesFeed'
import { ReviewModal } from '@/components/reviews/ReviewModal'
import { ReviewSummary } from '@/components/reviews/ReviewSummary'
import { BilanCard } from '@/components/reports/BilanCard'
import { EventDashboard } from '@/components/events/EventDashboard'
import { FestivalFacts } from '@/components/events/FestivalFacts'
import { DiscussionTeaser } from '@/components/events/DiscussionTeaser'
import { HowToApplyModal } from '@/components/events/HowToApplyModal'
import { ReportButton } from '@/components/reports/ReportButton'
import { candidatureState, mapsSearchUrl, daysUntilStart, editionLabel, hasApplyInfo } from '@/lib/festival'
import { canGoBackInApp } from '@/lib/nav-back'
import { useDateQuota } from '@/hooks/use-date-quota'
import { DateQuotaModal } from '@/components/mes-dates/DateQuotaModal'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import DOMPurify from 'dompurify'
import { ParticipantsModal } from '@/components/events/ParticipantsModal'
import { LocationField, type LocationValue } from '@/components/events/LocationField'
import { geocodeCity } from '@/lib/geocode'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Pencil, X, Save, Image, Trash2, Calendar, MapPin, Users, FileText, Star, MessageSquarePlus, Share2, Globe, Map, Store, ChevronRight, Send } from 'lucide-react'
import { getTagIcon, getTagLandingColor } from '@/components/ui/TagBadge'
import type { ParticipationVisibility, ParticipationStatus, Participation } from '@/types/database'
import './EventPage.css'

const GRADIENTS = [
  ['#f0a060', '#e74c3c'],
  ['#6c5ce7', '#a29bfe'],
  ['#00b894', '#00cec9'],
  ['#fd79a8', '#e84393'],
  ['#f39c12', '#d68910'],
]

function hashName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
  return Math.abs(h)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function EventPage() {
  const { id, slug } = useParams<{ id?: string; slug?: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, currentActor } = useAuth()
  // Fallback si on est arrivé directement (lien partagé) : pas d'historique à remonter.
  // Anonyme (arrivé via embed/lien partagé) : pas d'app à explorer → on ramène à l'accueil.
  const backTo = (location.state as { from?: string } | null)?.from ?? (user ? '/explorer' : '/')
  // Retour = vrai historique du navigateur quand on a navigué dans l'app (depuis Cockpit,
  // Mes dates, Communauté…), au lieu de toujours retomber sur Explorer (#1).
  const handleBack = () => {
    if (canGoBackInApp(location.key)) navigate(-1)
    else navigate(backTo)
  }
  const { event, loading } = useEvent(slug ?? id, slug ? 'slug' : 'id')
  // Notes personnelles (filtrées sur l'acteur actif) — privées, pas partagées.
  const { notes, refetch: refetchNotes } = useEventNotes(event?.id, currentActor?.id ?? null)
  const { reviews, canSeeDetails, refetch: refetchReviews } = useEventReviews(event?.id)
  const { friends: friendsOnEvent } = useFriendsOnEvent(event?.id)
  const { canAdd } = useDateQuota()
  const [showQuotaModal, setShowQuotaModal] = useState(false)
  const [participation, setParticipation] = useState<Participation | null>(null)
  const [friendCount, setFriendCount] = useState(0)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)
  const [showHowTo, setShowHowTo] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editImage, setEditImage] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const creator = useEventCreator(event?.created_by_actor)
  const creatorName = creator?.label ?? '?'
  const creatorGradient = GRADIENTS[hashName(creatorName) % GRADIENTS.length]

  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    registration_deadline: '',
    registration_url: '',
    external_url: '',
    contact_email: '',
    registration_note: '',
    edition: '',
    opening_hours: '',
    expected_attendance: '',
    stand_size: '',
    stand_price: '',
  })
  const [editLocation, setEditLocation] = useState<LocationValue>({
    address: '', city: '', department: '', postcode: '',
    latitude: null, longitude: null, geo_precision: null,
  })

  // Fetch current actor's participation
  useEffect(() => {
    if (!currentActor || !event?.id) return
    supabase
      .from('participations')
      .select('*')
      .eq('actor_id', currentActor.id)
      .eq('event_id', event.id)
      .maybeSingle()
      .then(({ data }) => {
        setParticipation(data)
      })
  }, [currentActor, event?.id])

  // Friend count
  useEffect(() => {
    if (!event?.id) return
    supabase
      .from('participations')
      .select('id', { count: 'exact' })
      .eq('event_id', event.id)
      .in('visibility', ['amis', 'public'])
      .then(({ count }) => setFriendCount(count ?? 0))
  }, [event?.id])

  const handleJoin = async (status: ParticipationStatus, visibility: ParticipationVisibility) => {
    if (!user || !currentActor || !event?.id) return
    // Quota dates : bloque l'ajout d'une NOUVELLE date pour une entité gratuite au plafond.
    if (!canAdd) { setShowQuotaModal(true); return }
    const { data } = await addParticipation({
      actor_id: currentActor.id,
      acted_by_user_id: user.id,
      event_id: event.id,
      status,
      visibility,
    })
    setParticipation(data)
  }

  const handleLeave = async () => {
    if (!participation) return
    await removeParticipation(participation.id)
    setParticipation(null)
  }

  // « Marquer comme candidaté » depuis la modale : passe en en_cours (ou crée la participation).
  const handleMarkApplied = async () => {
    if (participation) {
      const { data } = await updateParticipation(participation.id, { status: 'en_cours' })
      if (data) setParticipation(data)
    } else {
      await handleJoin('en_cours', 'amis')
    }
  }

  // Partage : Web Share API si dispo, sinon copie du lien.
  const sharePage = async () => {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: event?.name, url })
      else await navigator.clipboard.writeText(url)
    } catch {
      /* partage annulé */
    }
  }

  const startEditing = () => {
    if (!event) return
    setEditForm({
      name: event.name,
      description: event.description ?? '',
      start_date: event.start_date,
      end_date: event.end_date,
      registration_deadline: event.registration_deadline ?? '',
      registration_url: event.registration_url ?? '',
      external_url: event.external_url ?? '',
      contact_email: event.contact_email ?? '',
      registration_note: event.registration_note ?? '',
      edition: event.edition != null ? String(event.edition) : '',
      opening_hours: event.opening_hours ?? '',
      expected_attendance: event.expected_attendance ?? '',
      stand_size: event.stand_size ?? '',
      stand_price: event.stand_price ?? '',
    })
    setEditLocation({
      address: event.address ?? '',
      city: event.city,
      department: event.department,
      postcode: '',
      latitude: event.latitude ?? null,
      longitude: event.longitude ?? null,
      geo_precision: (event.geo_precision as 'precise' | 'city' | null) ?? null,
    })
    setEditImage(null)
    setRemoveImage(false)
    setEditing(true)
  }

  const handleSaveEdit = async () => {
    if (!event) return
    setEditSaving(true)

    let image_url: string | null | undefined = undefined

    if (editImage) {
      const compressed = await compressImage(editImage)
      const isWebp = compressed.type === 'image/webp'
      const ext = isWebp ? 'webp' : compressed.name.split('.').pop() ?? 'jpg'
      const path = `${crypto.randomUUID()}.${ext}`
      const { data: uploadData } = await supabase.storage
        .from('event-images')
        .upload(path, compressed, { contentType: compressed.type || 'image/webp' })
      if (uploadData) {
        const { data: urlData } = supabase.storage
          .from('event-images')
          .getPublicUrl(uploadData.path)
        image_url = urlData.publicUrl
      }
    } else if (removeImage) {
      image_url = null
    }

    const updates: Parameters<typeof updateEvent>[1] = {
      name: editForm.name,
      description: editForm.description || null,
      city: editLocation.city,
      department: editLocation.department,
      address: editLocation.address || null,
      latitude: editLocation.latitude,
      longitude: editLocation.longitude,
      geo_precision: editLocation.geo_precision,
      start_date: editForm.start_date,
      end_date: editForm.end_date || editForm.start_date,
      registration_deadline: editForm.registration_deadline || null,
      registration_url: editForm.registration_url || null,
      external_url: editForm.external_url || null,
      contact_email: editForm.contact_email || null,
      registration_note: editForm.registration_note || null,
      edition: editForm.edition ? Number(editForm.edition) : null,
      opening_hours: editForm.opening_hours || null,
      expected_attendance: editForm.expected_attendance || null,
      stand_size: editForm.stand_size || null,
      stand_price: editForm.stand_price || null,
    }
    if (image_url !== undefined) {
      updates.image_url = image_url
    }

    // Pas de point précis -> fallback centre-ville (mondial) pour ne pas garder un vieux pin.
    if (editLocation.geo_precision !== 'precise' && editLocation.city && editLocation.department) {
      const c = await geocodeCity(editLocation.city, editLocation.department)
      if (c) {
        updates.latitude = c.lat
        updates.longitude = c.lng
        updates.geo_precision = 'city'
      }
    }

    const { error } = await updateEvent(event.id, updates)
    setEditSaving(false)
    if (!error) {
      setEditing(false)
      window.location.reload()
    }
  }

  const isPast = event ? new Date(event.end_date) < new Date() : false
  // isExposant = on agit en tant qu'entity (exposant). Si on est sur le compte
  // personne (festivalier), on voit le stepper court (Repéré / J'y vais) — peu
  // importe que le profil legacy soit type='exposant'.
  const isExposant = currentActor?.kind === 'entity'

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold">Événement introuvable</h1>
        <Link to="/explorer" className="mt-4 text-primary hover:underline">Retour à l'explorateur</Link>
      </div>
    )
  }

  const cand = candidatureState(event)
  const editionLbl = editionLabel(event.edition)
  const primaryTag = event.tags?.[0] ?? null
  const jx = daysUntilStart(event)
  const applyAvailable = hasApplyInfo(event)
  const friendNames = friendsOnEvent.map((f) => f.label).filter(Boolean).slice(0, 3).join(', ')
  const tagAccent = getTagLandingColor(event.tags?.[0] ?? '')

  return (
    <div className="event-page" style={{ ['--tag-accent' as string]: tagAccent } as React.CSSProperties}>
      {/* Ambient : affiche floutée derrière le hero */}
      {!editing && event.image_url && (
        <div className="event-ambient" aria-hidden="true">
          <img src={event.image_url} alt="" />
        </div>
      )}

      <div className="event-topbar">
        {editing ? (
          <button onClick={() => setEditing(false)} className="event-back" title="Annuler l'édition">
            <ArrowLeft />
          </button>
        ) : (
          <button onClick={handleBack} className="event-back" title="Retour">
            <ArrowLeft /> Retour
          </button>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          {isExposant && isPast && !editing && (
            <button onClick={() => setShowReviewForm(!showReviewForm)} className="event-edit-btn" title="Donner mon avis">
              <Star className="h-4 w-4" strokeWidth={1.5} />
            </button>
          )}
          {isExposant && !editing && (
            <button onClick={startEditing} className="event-edit-btn" title="Modifier">
              <Pencil className="h-4 w-4" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="event-two-col">
          {/* Left column: image */}
          <div className="event-col-left">
            {editImage ? (
              <div className="event-poster group relative">
                <img src={URL.createObjectURL(editImage)} alt="" />
                <div className="absolute bottom-3 right-3 flex gap-2">
                  <label className="cursor-pointer rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white">
                    <span className="flex items-center gap-1.5"><Image className="h-3.5 w-3.5" />Remplacer</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) { setEditImage(e.target.files[0]); setRemoveImage(false) } }} />
                  </label>
                  <button onClick={() => setEditImage(null)} className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white">
                    <span className="flex items-center gap-1.5"><X className="h-3.5 w-3.5" />Annuler</span>
                  </button>
                </div>
              </div>
            ) : removeImage ? (
              <div className="event-poster" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed hsl(var(--border))', background: 'hsl(var(--muted) / 0.5)', boxShadow: 'none' }}>
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Trash2 className="h-6 w-6" />
                  <span className="text-sm">Image retirée</span>
                  <button onClick={() => setRemoveImage(false)} className="text-xs text-primary hover:underline">Annuler</button>
                </div>
              </div>
            ) : event.image_url ? (
              <div className="event-poster group relative">
                <img src={event.image_url} alt={event.name} />
                <div className="absolute bottom-3 right-3 flex gap-2">
                  <label className="cursor-pointer rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white">
                    <span className="flex items-center gap-1.5"><Image className="h-3.5 w-3.5" />Remplacer</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) { setEditImage(e.target.files[0]); setRemoveImage(false) } }} />
                  </label>
                  <button onClick={() => setRemoveImage(true)} className="rounded-full bg-red-500/90 px-3 py-1.5 text-xs font-medium text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-red-600">
                    <span className="flex items-center gap-1.5"><Trash2 className="h-3.5 w-3.5" />Retirer</span>
                  </button>
                </div>
              </div>
            ) : (
              <label className="event-poster" style={{ display: 'flex', cursor: 'pointer', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, border: '2px dashed hsl(var(--border))', background: 'hsl(var(--muted) / 0.5)', boxShadow: 'none' }}>
                <Image className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Ajouter une affiche</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) setEditImage(e.target.files[0]) }} />
              </label>
            )}
          </div>

          {/* Right column: form */}
          <div className="event-col-right">
            <div className="space-y-4 rounded-2xl bg-card p-5" style={{ border: '1px solid rgba(0,0,0,0.07)', boxShadow: '1px 0 40px 10px rgba(0,0,0,0.02)' }}>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">Modifier l'événement</h2>
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="rounded-lg border border-amber-700 bg-amber-950/30 px-4 py-3 text-sm text-amber-200 light:border-amber-300 light:bg-amber-50 light:text-amber-800">
                Vos modifications seront visibles par tous les utilisateurs.
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nom <span className="text-destructive">*</span></label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Nom de l'événement"
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                <RichTextEditor
                  content={editForm.description}
                  onChange={html => setEditForm(f => ({ ...f, description: html }))}
                  placeholder="Décrivez l'événement..."
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Adresse ou lieu</label>
                <LocationField value={editLocation} onChange={setEditLocation} inputClass="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Ville <span className="text-destructive">*</span></label>
                  <input type="text" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Ville" value={editLocation.city} onChange={e => setEditLocation(l => ({ ...l, city: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Département <span className="text-destructive">*</span></label>
                  <input type="text" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Département (ex: 77)" value={editLocation.department} onChange={e => setEditLocation(l => ({ ...l, department: e.target.value }))} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Début <span className="text-destructive">*</span></label>
                  <input type="date" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={editForm.start_date} onChange={e => setEditForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Fin</label>
                  <input type="date" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={editForm.end_date} onChange={e => setEditForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Date limite inscription</label>
                  <input type="date" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={editForm.registration_deadline} onChange={e => setEditForm(f => ({ ...f, registration_deadline: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Lien inscription</label>
                  <input type="url" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="https://..." value={editForm.registration_url} onChange={e => setEditForm(f => ({ ...f, registration_url: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Site web</label>
                <input type="url" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="https://..." value={editForm.external_url} onChange={e => setEditForm(f => ({ ...f, external_url: e.target.value }))} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Email de contact</label>
                  <input type="email" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="contact@exemple.fr" value={editForm.contact_email} onChange={e => setEditForm(f => ({ ...f, contact_email: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Note d'inscription</label>
                  <input type="text" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Ex: Envoyer dossier par mail" value={editForm.registration_note} onChange={e => setEditForm(f => ({ ...f, registration_note: e.target.value }))} />
                </div>
              </div>
              {/* Infos pratiques (champs descriptifs festival) */}
              <div className="pt-2 border-t border-border">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Infos pratiques</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">N° d'édition</label>
                    <input type="number" min="1" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Ex: 21" value={editForm.edition} onChange={e => setEditForm(f => ({ ...f, edition: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Horaires</label>
                    <input type="text" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Ex: 10h – 19h" value={editForm.opening_hours} onChange={e => setEditForm(f => ({ ...f, opening_hours: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Affluence attendue</label>
                    <input type="text" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Ex: ~40 000 visiteurs" value={editForm.expected_attendance} onChange={e => setEditForm(f => ({ ...f, expected_attendance: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Taille d'emplacement</label>
                    <input type="text" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Ex: 3×3 m" value={editForm.stand_size} onChange={e => setEditForm(f => ({ ...f, stand_size: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Prix d'emplacement</label>
                    <input type="text" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Ex: 120 € le week-end" value={editForm.stand_price} onChange={e => setEditForm(f => ({ ...f, stand_price: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(false)}>Annuler</Button>
                <Button onClick={handleSaveEdit} disabled={editSaving || !editForm.name || !editLocation.city || !editForm.start_date}>
                  <Save className="mr-2 h-4 w-4" />
                  {editSaving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="fest-grid">
          {/* ── COLONNE PRINCIPALE ── */}
          <div className="fest-main">
            {/* Hero */}
            <div className="fest-hero">
              {cand && (
                <span className={`fest-statpill ${cand}`}>
                  <span className="fest-statpill-dot" />
                  {cand === 'open' ? 'Candidatures ouvertes' : 'Candidatures clôturées'}
                </span>
              )}
              {(primaryTag || editionLbl) && (
                <div className="fest-eyebrow-row">
                  {primaryTag && (() => {
                    const I = getTagIcon(primaryTag)
                    return (
                      <span className="fest-tag-chip">
                        <I size={13} strokeWidth={2.2} /> {primaryTag}
                      </span>
                    )
                  })()}
                  {editionLbl && <span className="fest-edition">{editionLbl}</span>}
                </div>
              )}
              <h1 className="fest-title">{event.name}</h1>
              <div className="fest-hmeta">
                <span className="fest-hmeta-item">
                  <Calendar strokeWidth={2} />
                  {formatDate(event.start_date)}{event.end_date !== event.start_date ? ` – ${formatDate(event.end_date)}` : ''}
                </span>
                <span className="fest-hmeta-item">
                  <MapPin strokeWidth={2} />
                  {event.city} ({event.department})
                </span>
              </div>
              <div className="fest-hactions">
                <button className="fest-iconbtn" onClick={sharePage} title="Partager">
                  <Share2 strokeWidth={2} />
                </button>
                {event.external_url?.startsWith('http') && (
                  <a className="fest-iconbtn" href={event.external_url} target="_blank" rel="noopener noreferrer" title="Site web">
                    <Globe strokeWidth={2} />
                  </a>
                )}
                <ReportButton
                  targetType="event"
                  targetId={event.id}
                  targetLabel={event.name}
                  targetOwnerId={event.created_by_actor ?? null}
                  className="fest-iconbtn"
                  title="Signaler ce festival"
                />
                {creator && (
                  <Link to={`/@${creator.public_slug ?? creator.id}`} className="fest-org">
                    {creator.avatar_url ? (
                      <img src={creator.avatar_url} alt={creatorName} className="fest-org-av" />
                    ) : (
                      <span className="fest-org-av fallback" style={{ background: `linear-gradient(135deg, ${creatorGradient[0]}, ${creatorGradient[1]})` }}>
                        {creatorName[0]?.toUpperCase() ?? '?'}
                      </span>
                    )}
                    <span>Ajouté par <b>{creatorName}</b></span>
                  </Link>
                )}
              </div>
            </div>

            {/* Compagnons sur cette date */}
            {friendCount > 0 && (
              <div className="event-section-card fest-companions">
                <div className="event-section-title">
                  <Users strokeWidth={1.8} /> Tes compagnons sur cette date
                </div>
                <div className="fest-friends-band" onClick={() => setShowParticipants(true)} role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') setShowParticipants(true) }}>
                  <div className="fest-avs">
                    {friendsOnEvent.slice(0, 5).map((f) => {
                      const fname = f.label ?? '?'
                      const [from, to] = GRADIENTS[hashName(fname) % GRADIENTS.length]
                      return f.avatar_url ? (
                        <img key={f.actor_id} src={f.avatar_url} alt={fname} className="fest-av" />
                      ) : (
                        <span key={f.actor_id} className="fest-av fallback" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
                          {fname[0]?.toUpperCase() ?? '?'}
                        </span>
                      )
                    })}
                    {friendCount > 5 && <span className="fest-av more">+{friendCount - 5}</span>}
                  </div>
                  <div className="fest-friends-txt">
                    <b>{friendCount} utilisateur{friendCount > 1 ? 's' : ''} de Fellowship y {friendCount > 1 ? 'vont' : 'va'}</b>
                    {friendNames && <span>dont {friendNames}, parmi tes abonnés</span>}
                  </div>
                </div>
                <div className="fest-rally">
                  <span className="fest-rally-ic">🎪</span>
                  <div className="fest-rally-t">
                    <b>Vous serez {friendCount} réuni{friendCount > 1 ? 's' : ''} à {event.city}</b>
                    <span>Partage le festival pour vous organiser</span>
                  </div>
                  <button className="fest-btn ghost" onClick={sharePage}>Partager</button>
                </div>
              </div>
            )}
            {/* À propos */}
            {event.description && (
              <div className="event-section-card">
                <div className="event-section-title">À propos de l'événement</div>
                <div className="event-description" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(event.description) }} />
              </div>
            )}

            {/* Infos pratiques */}
            <FestivalFacts event={event} />

            {/* Discussion du festival (placeholder) */}
            <DiscussionTeaser />

            {/* CTA d'acquisition — visiteur anonyme uniquement, juste sous le contenu (pas de pied de page perdu) */}
            {!user && (
              <div style={{ padding: 24, borderRadius: 18, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
                <img src="/icon.png" alt="" style={{ width: 44, height: 44, objectFit: 'contain' }} />
                <strong style={{ fontFamily: 'var(--font-heading)', fontSize: 18 }}>Le réseau qui fait tourner les festivals</strong>
                <span style={{ fontSize: 13.5, color: 'hsl(var(--muted-foreground))', maxWidth: 380 }}>
                  Fellowship aide artisans et organisateurs à gérer leurs événements et leur communauté.
                </span>
                <button className="fest-btn primary" onClick={() => navigate('/')} style={{ marginTop: 6 }}>
                  Découvrir Fellowship
                </button>
              </div>
            )}

            {/* Notes privées — réservées à l'acteur connecté (perso, jamais visibles en anonyme) */}
            {currentActor && (
              <div className="event-section-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="event-section-title muted" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>Mes notes privées ({notes.length})</div>
                  <button
                    onClick={() => setShowNoteModal(true)}
                    className="event-edit-btn"
                    title="Ajouter une note privée"
                    style={{ width: 32, height: 32 }}
                  >
                    <MessageSquarePlus className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>
                {notes.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <NotesFeed notes={notes} onRefresh={refetchNotes} />
                  </div>
                )}
              </div>
            )}

            {/* Avis exposants — réservé au mode exposant. Le mode festivalier
                aura son propre bloc d'avis (spec à venir, cf. memory
                project_reviews_duality_next) ; en attendant on ne montre rien
                pour ne pas pousser un Pro-lock non-sens à un visiteur. */}
            {isExposant && (isPast || reviews.length > 0 || canSeeDetails) && (
              <div className="event-section-card">
                <ReviewSummary
                  reviews={reviews}
                  canSeeDetails={canSeeDetails}
                  isPast={isPast}
                  onLeaveReview={() => setShowReviewForm(true)}
                />
              </div>
            )}

            {/* Bilan post-festival (exposant + passé). Pro lock géré dans BilanCard. */}
            {isExposant && isPast && <BilanCard eventId={event.id} />}
          </div>

          {/* ── COLONNE LATÉRALE (cockpit) ── */}
          <aside className="fest-side">
            <div className="event-poster">
              {event.image_url ? (
                <img src={event.image_url} alt={event.name} />
              ) : (
                <div className="event-poster-empty">
                  <Image strokeWidth={1} />
                </div>
              )}
            </div>

            <div className="fest-cockpit">
              <div className="fest-cockpit-head">
                <div className="fest-jx">
                  {jx != null ? <b>J-{jx}</b> : <b>{isPast ? 'Passé' : 'En cours'}</b>}
                  <span>{formatDate(event.start_date)}</span>
                </div>
                {isExposant && event.registration_deadline && cand && (
                  <div className="fest-deadline">
                    Candidatures<br />
                    <b>jusqu'au {new Date(event.registration_deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</b>
                  </div>
                )}
              </div>

              <EventDashboard
                participation={participation}
                isExposant={isExposant}
                onUpdate={setParticipation}
                onLeave={handleLeave}
                onJoin={handleJoin}
              />

              <div className="fest-ckrows">
                {isExposant && event.stand_price && (
                  <div className="fest-ckrow">
                    <span className="fest-ckrow-lab"><Store strokeWidth={1.8} /> Emplacement</span>
                    <span className="fest-ckrow-val">{event.stand_price}</span>
                  </div>
                )}
                {isExposant && applyAvailable && (
                  <button className="fest-ckrow click" onClick={() => setShowHowTo(true)}>
                    <span className="fest-ckrow-lab"><FileText strokeWidth={1.8} /> Candidature</span>
                    <span className="fest-ckrow-val warn">Comment faire <ChevronRight strokeWidth={2.4} /></span>
                  </button>
                )}
                <a className="fest-ckrow" href={mapsSearchUrl(event)} target="_blank" rel="noopener noreferrer">
                  <span className="fest-ckrow-lab"><Map strokeWidth={1.8} /> Itinéraire</span>
                  <span className="fest-ckrow-val">Voir sur la carte</span>
                </a>
              </div>

              <div className="fest-ckcta">
                {isExposant && applyAvailable && (
                  <button className="fest-btn primary" onClick={() => setShowHowTo(true)}>
                    <Send strokeWidth={2} /> Candidater
                  </button>
                )}
                <button className="fest-btn ghost" onClick={sharePage}>
                  <Share2 strokeWidth={2} /> Partager
                </button>
              </div>
            </div>
          </aside>
        </div>

      )}

      {showParticipants && (
        <ParticipantsModal eventId={event.id} onClose={() => setShowParticipants(false)} />
      )}

      {showHowTo && (
        <HowToApplyModal event={event} onClose={() => setShowHowTo(false)} onMarkApplied={handleMarkApplied} />
      )}

      {/* Modal: Ajouter une note */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowNoteModal(false)}>
          <div className="w-full max-w-md rounded-2xl bg-card p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700 }}>Ajouter une note</h2>
              <button onClick={() => setShowNoteModal(false)} className="rounded-full p-2 text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
            <NoteForm eventId={event.id} onNoteAdded={() => { refetchNotes(); setShowNoteModal(false) }} />
          </div>
        </div>
      )}

      {/* Modal: Donner mon avis */}
      {showReviewForm && (
        <ReviewModal
          eventId={event.id}
          onClose={() => setShowReviewForm(false)}
          onSubmitted={refetchReviews}
        />
      )}

      {showQuotaModal && <DateQuotaModal onClose={() => setShowQuotaModal(false)} />}
    </div>
  )
}
