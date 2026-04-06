import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useEvent, updateEvent } from '@/hooks/use-events'
import { addParticipation, removeParticipation, useFriendsOnEvent } from '@/hooks/use-participations'
import { useEventNotes } from '@/hooks/use-notes'
import { useEventReviews } from '@/hooks/use-reviews'
import { NoteForm } from '@/components/notes/NoteForm'
import { NotesFeed } from '@/components/notes/NotesFeed'
import { ReviewForm } from '@/components/reviews/ReviewForm'
import { ReviewSummary } from '@/components/reviews/ReviewSummary'
import { EventReportForm } from '@/components/reports/EventReportForm'
import { EventHero } from '@/components/events/EventHero'
import { EventDashboard } from '@/components/events/EventDashboard'
import { FriendRow } from '@/components/events/FriendRow'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Pencil, X, Save, Image, Trash2 } from 'lucide-react'
import type { ParticipationVisibility, ParticipationStatus, Participation } from '@/types/database'
import './EventPage.css'

export function EventPage() {
  const { id } = useParams<{ id: string }>()
  const { user, profile } = useAuth()
  const { event, loading } = useEvent(id)
  const { notes, refetch: refetchNotes } = useEventNotes(id)
  const { reviews, canSeeDetails, refetch: refetchReviews } = useEventReviews(id)
  const { friends: friendsOnEvent } = useFriendsOnEvent(id)
  const [participation, setParticipation] = useState<Participation | null>(null)
  const [friendCount, setFriendCount] = useState(0)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [showReportForm, setShowReportForm] = useState(false)
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
    contact_email: '',
    registration_note: '',
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
      contact_email: event.contact_email ?? '',
      registration_note: event.registration_note ?? '',
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
      contact_email: editForm.contact_email || null,
      registration_note: editForm.registration_note || null,
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
        <h1 className="text-2xl font-bold">Événement introuvable</h1>
        <Link to="/explorer" className="mt-4 text-primary hover:underline">Retour à l'explorateur</Link>
      </div>
    )
  }

  return (
    <div className="event-page">
      <Link to="/explorer" className="event-back">
        <ArrowLeft />
        Retour
      </Link>

      {editing ? (
        <>
          {/* Edit mode image section */}
          <div className="mb-6 flex justify-center">
            {editImage ? (
              <div className="group relative" style={{ aspectRatio: '2/3', maxHeight: '400px' }}>
                <img src={URL.createObjectURL(editImage)} alt="" className="h-full w-full rounded-xl object-cover" />
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
              <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/50" style={{ aspectRatio: '2/3', maxHeight: '400px' }}>
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Trash2 className="h-6 w-6" />
                  <span className="text-sm">Image retirée</span>
                  <button onClick={() => setRemoveImage(false)} className="text-xs text-primary hover:underline">Annuler</button>
                </div>
              </div>
            ) : event.image_url ? (
              <div className="group relative" style={{ aspectRatio: '2/3', maxHeight: '400px' }}>
                <img src={event.image_url} alt={event.name} className="h-full w-full rounded-xl object-cover" />
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
              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/50 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-muted" style={{ aspectRatio: '2/3', maxHeight: '400px' }}>
                <Image className="h-8 w-8" />
                <span className="text-sm">Ajouter une affiche</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) setEditImage(e.target.files[0]) }} />
              </label>
            )}
          </div>

          {/* Edit form */}
          <div className="mb-6 space-y-4 rounded-2xl bg-card p-4">
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
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(false)}>Annuler</Button>
              <Button onClick={handleSaveEdit} disabled={editSaving || !editForm.name || !editForm.city || !editForm.start_date}>
                <Save className="mr-2 h-4 w-4" />
                {editSaving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div style={{ position: 'relative' }}>
          {isExposant && (
            <button onClick={startEditing} className="event-edit-btn">
              <Pencil className="h-4 w-4" strokeWidth={1.5} />
            </button>
          )}

          <EventHero
            event={event}
            friendCount={friendCount}
            participationStatus={participation?.status}
            paymentStatus={participation?.payment_status as string | null}
          />

          {/* Dashboard inline — mobile only (above content) */}
          <div className="event-dashboard-mobile-inline">
            <EventDashboard
              participation={participation}
              isExposant={isExposant}
              isPast={isPast}
              onUpdate={setParticipation}
              onLeave={handleLeave}
              onJoin={handleJoin}
              onToggleReport={() => setShowReportForm(!showReportForm)}
              showReportForm={showReportForm}
            />
          </div>

          <div className="event-separator" />

          <div className="event-columns">
            {/* Left column */}
            <div className="event-main">
              {/* Description */}
              {event.description && (
                <div>
                  <div className="event-section-label public">🌍 Infos publiques</div>
                  <div className="event-section-card">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
                  </div>
                </div>
              )}

              {/* Friends */}
              {friendsOnEvent.length > 0 && (
                <div>
                  <div className="event-section-label friends">👥 Amis sur ce festival</div>
                  <div className="event-section-card">
                    <FriendRow friends={friendsOnEvent} />
                  </div>
                </div>
              )}

              {/* Notes & Reviews SIDE BY SIDE */}
              <div className="event-notes-reviews">
                <div>
                  <div className="event-section-label" style={{color: 'rgba(61,48,40,0.45)'}}>📝 Notes partagées ({notes.length})</div>
                  <div className="event-section-card">
                    <NoteForm eventId={event.id} onNoteAdded={refetchNotes} />
                    <NotesFeed notes={notes} onRefresh={refetchNotes} />
                  </div>
                </div>
                <div>
                  <div className="event-section-label" style={{color: 'rgba(61,48,40,0.45)'}}>⭐ Avis ({reviews.length})</div>
                  <div className="event-section-card">
                    <ReviewSummary event={event} canSeeDetails={canSeeDetails} />
                    {isPast && isExposant && (
                      <>
                        <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => setShowReviewForm(!showReviewForm)}>
                          {showReviewForm ? 'Fermer' : 'Donner mon avis'}
                        </Button>
                        {showReviewForm && <ReviewForm eventId={event.id} onReviewSubmitted={refetchReviews} />}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Report form (inside left column, shown via dashboard button) */}
              {showReportForm && <EventReportForm eventId={event.id} />}
            </div>

            {/* Right column — desktop dashboard */}
            <div className="event-sidebar">
              <EventDashboard
                participation={participation}
                isExposant={isExposant}
                isPast={isPast}
                onUpdate={setParticipation}
                onLeave={handleLeave}
                onJoin={handleJoin}
                onToggleReport={() => setShowReportForm(!showReportForm)}
                showReportForm={showReportForm}
              />
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
