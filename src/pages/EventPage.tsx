import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useEvent, updateEvent } from '@/hooks/use-events'
import { addParticipation, removeParticipation } from '@/hooks/use-participations'
import { useEventNotes } from '@/hooks/use-notes'
import { useEventReviews } from '@/hooks/use-reviews'
import { NoteForm } from '@/components/notes/NoteForm'
import { NotesFeed } from '@/components/notes/NotesFeed'
import { ReviewForm } from '@/components/reviews/ReviewForm'
import { ReviewSummary } from '@/components/reviews/ReviewSummary'
import { EventReportForm } from '@/components/reports/EventReportForm'
import { Button } from '@/components/ui/button'
import {
  Calendar, MapPin, ExternalLink, Clock, ArrowLeft,
  Users, Check, Star, FileText, Pencil, X, Save, Image, Trash2
} from 'lucide-react'
import type { ParticipationVisibility, ParticipationStatus, Participation } from '@/types/database'

export function EventPage() {
  const { id } = useParams<{ id: string }>()
  const { user, profile } = useAuth()
  const { event, loading } = useEvent(id)
  const { notes, refetch: refetchNotes } = useEventNotes(id)
  const { reviews, canSeeDetails, refetch: refetchReviews } = useEventReviews(id)
  const [participation, setParticipation] = useState<Participation | null>(null)
  const [loadingParticipation, setLoadingParticipation] = useState(true)
  const [friendCount, setFriendCount] = useState(0)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [showReportForm, setShowReportForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'notes' | 'reviews'>('info')
  const [editing, setEditing] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editImage, setEditImage] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    city: '',
    department: '',
    start_date: '',
    end_date: '',
    registration_deadline: '',
    registration_url: '',
    external_url: '',
  })

  // Fetch user's participation
  useEffect(() => {
    if (!user || !id) return
    supabase
      .from('participations')
      .select('*')
      .eq('user_id', user.id)
      .eq('event_id', id)
      .maybeSingle()
      .then(({ data }) => {
        setParticipation(data)
        setLoadingParticipation(false)
      })
  }, [user, id])

  // Friend count
  useEffect(() => {
    if (!id) return
    supabase
      .from('participations')
      .select('id', { count: 'exact' })
      .eq('event_id', id)
      .in('visibility', ['amis', 'public'])
      .then(({ count }) => setFriendCount(count ?? 0))
  }, [id])

  const handleJoin = async (status: ParticipationStatus, visibility: ParticipationVisibility) => {
    if (!user || !id) return
    const { data } = await addParticipation({
      user_id: user.id,
      event_id: id,
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

  const startEditing = () => {
    if (!event) return
    setEditForm({
      name: event.name,
      description: event.description ?? '',
      city: event.city,
      department: event.department,
      start_date: event.start_date,
      end_date: event.end_date,
      registration_deadline: event.registration_deadline ?? '',
      registration_url: event.registration_url ?? '',
      external_url: event.external_url ?? '',
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
      const ext = editImage.name.split('.').pop()
      const path = `${crypto.randomUUID()}.${ext}`
      const { data: uploadData } = await supabase.storage
        .from('event-images')
        .upload(path, editImage)
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
      city: editForm.city,
      department: editForm.department,
      start_date: editForm.start_date,
      end_date: editForm.end_date || editForm.start_date,
      registration_deadline: editForm.registration_deadline || null,
      registration_url: editForm.registration_url || null,
      external_url: editForm.external_url || null,
    }
    if (image_url !== undefined) {
      updates.image_url = image_url
    }

    const { error } = await updateEvent(event.id, updates)
    setEditSaving(false)
    if (!error) {
      setEditing(false)
      window.location.reload()
    }
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const isPast = event ? new Date(event.end_date) < new Date() : false
  const isExposant = profile?.type === 'exposant'

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
        <h1 className="text-xl font-bold">Événement introuvable</h1>
        <Link to="/explorer" className="mt-4 text-primary hover:underline">Retour à l'explorateur</Link>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Back */}
      <Link to="/explorer" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Link>

      {/* Header image */}
      {editing ? (
        <div className="mb-6">
          {editImage ? (
            <div className="group relative">
              <img src={URL.createObjectURL(editImage)} alt="" className="h-64 w-full rounded-xl object-cover" />
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
            <div className="flex h-64 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/50">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Trash2 className="h-6 w-6" />
                <span className="text-sm">Image retirée</span>
                <button onClick={() => setRemoveImage(false)} className="text-xs text-primary hover:underline">Annuler</button>
              </div>
            </div>
          ) : event.image_url ? (
            <div className="group relative">
              <img src={event.image_url} alt={event.name} className="h-64 w-full rounded-xl object-cover" />
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
            <label className="flex h-64 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/50 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-muted">
              <Image className="h-8 w-8" />
              <span className="text-sm">Ajouter une affiche</span>
              <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) setEditImage(e.target.files[0]) }} />
            </label>
          )}
        </div>
      ) : event.image_url ? (
        <div className="relative mb-6 overflow-hidden rounded-2xl">
          <img src={event.image_url} alt={event.name} className="h-64 w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      ) : null}

      {editing ? (
        <div className="mb-6 space-y-4 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Modifier l'événement</h2>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
            Vos modifications seront visibles par tous les utilisateurs. Éditez avec précaution.
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
            <textarea
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
              placeholder="Description"
              value={editForm.description}
              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Ville <span className="text-destructive">*</span></label>
              <input type="text" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Ville" value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Département <span className="text-destructive">*</span></label>
              <input type="text" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Département (ex: 77)" value={editForm.department} onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))} />
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
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(false)}>Annuler</Button>
            <Button onClick={handleSaveEdit} disabled={editSaving || !editForm.name || !editForm.city || !editForm.start_date}>
              <Save className="mr-2 h-4 w-4" />
              {editSaving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <span className="mb-2 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {event.primary_tag}
              </span>
              {event.tags && event.tags.length > 0 && event.tags.map(tag => (
                <span key={tag} className="ml-2 inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                  {tag}
                </span>
              ))}
              <h1 className="mt-2 text-3xl">{event.name}</h1>
            </div>
            {isExposant && (
              <Button variant="ghost" size="sm" onClick={startEditing}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(event.start_date)}{event.end_date !== event.start_date && ` — ${formatDate(event.end_date)}`}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{event.city}, {event.department}</span>
            </div>
            {event.registration_deadline && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Inscription avant le {formatDate(event.registration_deadline)}</span>
              </div>
            )}
            {friendCount > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{friendCount} participant{friendCount > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {/* External links */}
          <div className="mt-4 flex gap-3">
            {event.registration_url && (
              <a href={event.registration_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <FileText className="mr-2 h-4 w-4" />
                  S'inscrire
                </Button>
              </a>
            )}
            {event.external_url && (
              <a href={event.external_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Site web
                </Button>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Participation */}
      {!loadingParticipation && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-4">
          {participation ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span className="font-medium">
                  {participation.status === 'interesse' && 'Intéressé'}
                  {participation.status === 'inscrit' && 'Inscrit'}
                  {participation.status === 'confirme' && 'Confirmé'}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({participation.visibility === 'prive' ? 'Privé' : participation.visibility === 'amis' ? 'Amis' : 'Public'})
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={handleLeave}>Retirer</Button>
            </div>
          ) : (
            <div>
              <p className="mb-3 text-sm font-medium">Tu y vas ?</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => handleJoin('interesse', 'amis')}>Intéressé</Button>
                <Button size="sm" variant="outline" onClick={() => handleJoin('inscrit', 'amis')}>Inscrit</Button>
                <Button size="sm" onClick={() => handleJoin('confirme', 'amis')}>Confirmé</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Description */}
      {event.description && (
        <div className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">Description</h2>
          <p className="text-muted-foreground whitespace-pre-wrap">{event.description}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-muted p-1">
        {(['info', 'notes', 'reviews'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'info' && 'Infos'}
            {tab === 'notes' && `Notes (${notes.length})`}
            {tab === 'reviews' && `Avis (${reviews.length})`}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <NoteForm eventId={event.id} onNoteAdded={refetchNotes} />
          <NotesFeed notes={notes} onRefresh={refetchNotes} />
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="space-y-4">
          <ReviewSummary event={event} canSeeDetails={canSeeDetails} />
          {isPast && isExposant && (
            <>
              <Button variant="outline" onClick={() => setShowReviewForm(!showReviewForm)}>
                <Star className="mr-2 h-4 w-4" />
                {showReviewForm ? 'Fermer' : 'Donner mon avis'}
              </Button>
              {showReviewForm && <ReviewForm eventId={event.id} onReviewSubmitted={refetchReviews} />}
            </>
          )}
        </div>
      )}

      {activeTab === 'info' && isPast && isExposant && (
        <div className="space-y-4">
          <Button variant="outline" onClick={() => setShowReportForm(!showReportForm)}>
            <FileText className="mr-2 h-4 w-4" />
            {showReportForm ? 'Fermer le bilan' : 'Bilan post-événement'}
          </Button>
          {showReportForm && <EventReportForm eventId={event.id} />}
        </div>
      )}
    </div>
  )
}
