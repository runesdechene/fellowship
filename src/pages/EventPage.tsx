import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useEvent, updateEvent, useEventCreator } from '@/hooks/use-events'
import { compressImage } from '@/lib/compress-image'
import { addParticipation, removeParticipation, useFriendsOnEvent } from '@/hooks/use-participations'
import { useEventNotes } from '@/hooks/use-notes'
import { useEventReviews } from '@/hooks/use-reviews'
import { NoteForm } from '@/components/notes/NoteForm'
import { NotesFeed } from '@/components/notes/NotesFeed'
import { ReviewForm } from '@/components/reviews/ReviewForm'
import { ReviewSummary } from '@/components/reviews/ReviewSummary'
import { EventReportForm } from '@/components/reports/EventReportForm'
import { EventDashboard } from '@/components/events/EventDashboard'
import { ParticipantsModal } from '@/components/events/ParticipantsModal'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Pencil, X, Save, Image, Trash2, Calendar, MapPin, Clock, Users, ExternalLink, FileText, Mail, StickyNote } from 'lucide-react'
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

const STATUS_LABELS_FRIEND: Record<string, string> = {
  interesse: 'Intéressé',
  en_cours: 'En cours',
  inscrit: 'Inscrit',
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function dayCount(start: string, end: string) {
  const diff = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1
  return diff > 1 ? `${diff} jours` : '1 jour'
}

function daysUntil(date: string) {
  const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
  if (diff < 0) return 'Date passée'
  if (diff === 0) return "Aujourd'hui"
  return `${diff} jour${diff > 1 ? 's' : ''} restant${diff > 1 ? 's' : ''}`
}

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
  const [showParticipants, setShowParticipants] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editImage, setEditImage] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const creator = useEventCreator(event?.created_by)
  const creatorName = creator?.brand_name ?? creator?.display_name ?? '?'
  const creatorGradient = GRADIENTS[hashName(creatorName) % GRADIENTS.length]

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
      const compressed = await compressImage(editImage)
      const path = `${crypto.randomUUID()}.webp`
      const { data: uploadData } = await supabase.storage
        .from('event-images')
        .upload(path, compressed, { contentType: 'image/webp' })
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
      <div className="event-topbar">
        {editing ? (
          <button onClick={() => setEditing(false)} className="event-back" title="Annuler l'édition">
            <ArrowLeft />
          </button>
        ) : (
          <Link to="/explorer" className="event-back" title="Retour">
            <ArrowLeft />
          </Link>
        )}
        {isExposant && !editing && (
          <button onClick={startEditing} className="event-edit-btn">
            <Pencil className="h-4 w-4" strokeWidth={1.5} />
          </button>
        )}
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
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
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
          </div>
        </div>
      ) : (
        <div className="event-two-col">
          {/* ── LEFT COLUMN ── */}
          <div className="event-col-left">
            {/* Poster */}
            <div className="event-poster">
              {event.image_url ? (
                <img src={event.image_url} alt={event.name} />
              ) : (
                <div className="event-poster-empty">
                  <Image strokeWidth={1} />
                </div>
              )}
            </div>

            <div className="event-col-left-sticky">
              {/* Ajouté par */}
              {creator && (
                <div className="event-left-card">
                  <div className="event-left-card-label">Ajouté par</div>
                  <Link to={`/@${creator.public_slug ?? creator.id}`} className="event-organizer-row" style={{ textDecoration: 'none', color: 'inherit' }}>
                    {creator.avatar_url ? (
                      <img src={creator.avatar_url} alt={creatorName} className="event-organizer-avatar" />
                    ) : (
                      <div className="event-organizer-avatar-fallback" style={{ background: `linear-gradient(135deg, ${creatorGradient[0]}, ${creatorGradient[1]})` }}>
                        {creatorName[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}
                    <div>
                      <div className="event-organizer-name">{creatorName}</div>
                      {creator.craft_type && <div className="event-organizer-role">{creator.craft_type}</div>}
                    </div>
                  </Link>
                </div>
              )}

              {/* Liens */}
              {(event.registration_url?.startsWith('http') || event.external_url?.startsWith('http') || event.contact_email) && (
                <div className="event-left-card">
                  <div className="event-left-card-label">Liens</div>
                  <div className="event-links-list">
                    {event.registration_url?.startsWith('http') && (
                      <a href={event.registration_url} target="_blank" rel="noopener noreferrer" className="event-link-item primary">
                        <FileText strokeWidth={1.5} />
                        S'inscrire
                      </a>
                    )}
                    {event.external_url?.startsWith('http') && (
                      <a href={event.external_url} target="_blank" rel="noopener noreferrer" className="event-link-item">
                        <ExternalLink strokeWidth={1.5} />
                        Site web
                      </a>
                    )}
                    {event.contact_email && (
                      <a href={`mailto:${event.contact_email}`} className="event-link-item">
                        <Mail strokeWidth={1.5} />
                        {event.contact_email}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Amis présents */}
              {friendsOnEvent.length > 0 && (
                <div className="event-left-card">
                  <div className="event-left-card-label">Amis présents</div>
                  <div className="event-friends-col">
                    {friendsOnEvent.map(friend => {
                      const fname = friend.brand_name ?? friend.display_name ?? '?'
                      const [from, to] = GRADIENTS[hashName(fname) % GRADIENTS.length]
                      return (
                        <Link key={friend.id} to={`/@${friend.public_slug ?? friend.id}`} className="event-friend-row">
                          {friend.avatar_url ? (
                            <img src={friend.avatar_url} alt={fname} className="event-friend-avatar" />
                          ) : (
                            <div className="event-friend-avatar-fallback" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
                              {fname[0]?.toUpperCase() ?? '?'}
                            </div>
                          )}
                          <div>
                            <div className="event-friend-name">{fname}</div>
                            <div className={`event-friend-status ${friend.status}`}>
                              {STATUS_LABELS_FRIEND[friend.status] ?? friend.status}
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="event-col-right">
            {/* Tags */}
            <div className="event-tags">
              <span className="event-tag-primary">{event.primary_tag}</span>
              {event.tags?.map(tag => (
                <span key={tag} className="event-tag-secondary">{tag}</span>
              ))}
            </div>

            {/* Title */}
            <h1 className="event-title">{event.name}</h1>

            {/* Meta rows */}
            <div className="event-meta-list">
              <div className="event-meta-row">
                <div className="event-meta-icon"><Calendar strokeWidth={1.5} /></div>
                <div className="event-meta-text">
                  <span className="event-meta-primary">{formatDate(event.start_date)}{event.end_date !== event.start_date ? ` — ${formatDate(event.end_date)}` : ''}</span>
                  <span className="event-meta-secondary">{dayCount(event.start_date, event.end_date)}</span>
                </div>
              </div>
              <div className="event-meta-row">
                <div className="event-meta-icon"><MapPin strokeWidth={1.5} /></div>
                <div className="event-meta-text">
                  <span className="event-meta-primary">{event.city} ({event.department})</span>
                </div>
              </div>
              {event.registration_deadline && (
                <div className="event-meta-row">
                  <div className="event-meta-icon"><Clock strokeWidth={1.5} /></div>
                  <div className="event-meta-text">
                    <span className="event-meta-primary">Inscription avant le {formatDate(event.registration_deadline)}</span>
                    <span className="event-meta-secondary">{daysUntil(event.registration_deadline)}</span>
                  </div>
                </div>
              )}
              {friendCount > 0 && (
                <div className="event-meta-row event-meta-row-clickable" onClick={() => setShowParticipants(true)}>
                  <div className="event-meta-icon"><Users strokeWidth={1.5} /></div>
                  <div className="event-meta-text">
                    <span className="event-meta-primary">{friendCount} participant{friendCount > 1 ? 's' : ''}{participation ? ' dont vous' : ''}</span>
                    <span className="event-meta-secondary">Voir les participants</span>
                  </div>
                </div>
              )}
            </div>

            {/* Registration note */}
            {event.registration_note && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'hsl(var(--muted) / 0.5)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'rgba(61,48,40,0.5)', marginBottom: 20 }}>
                <StickyNote strokeWidth={1.5} style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }} />
                <span>{event.registration_note}</span>
              </div>
            )}

            {/* Mon suivi */}
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

            <div className="event-separator" />

            {/* À propos */}
            {event.description && (
              <div className="event-section-card">
                <div className="event-section-title">🌍 À propos</div>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(61,48,40,0.7)', whiteSpace: 'pre-wrap', margin: 0 }}>{event.description}</p>
              </div>
            )}

            {/* Notes partagées */}
            <div className="event-section-card">
              <div className="event-section-title muted">📝 Notes partagées ({notes.length})</div>
              <NoteForm eventId={event.id} onNoteAdded={refetchNotes} />
              <NotesFeed notes={notes} onRefresh={refetchNotes} />
            </div>

            {/* Avis */}
            <div className="event-section-card">
              <div className="event-section-title muted">⭐ Avis ({reviews.length})</div>
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

            {/* Report form */}
            {showReportForm && <EventReportForm eventId={event.id} />}
          </div>
        </div>

      )}

      {showParticipants && (

        <ParticipantsModal eventId={event.id} onClose={() => setShowParticipants(false)} />
      )}
    </div>
  )
}
