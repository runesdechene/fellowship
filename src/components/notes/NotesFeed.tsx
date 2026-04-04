import { useAuth } from '@/lib/auth'
import { deleteNote } from '@/hooks/use-notes'
import { Lock, Users, UserPlus, Trash2 } from 'lucide-react'
import type { NoteWithAuthor } from '@/types/database'

interface NotesFeedProps {
  notes: NoteWithAuthor[]
  onRefresh: () => void
}

export function NotesFeed({ notes, onRefresh }: NotesFeedProps) {
  const { user } = useAuth()

  if (notes.length === 0) {
    return <p className="text-sm text-muted-foreground italic">Aucune note pour le moment</p>
  }

  const handleDelete = async (noteId: string) => {
    await deleteNote(noteId)
    onRefresh()
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-3">
      {notes.map((note) => {
        const isOwn = note.user_id === user?.id
        const authorName = (note.profiles as any)?.brand_name || (note.profiles as any)?.display_name || 'Anonyme'

        return (
          <div
            key={note.id}
            className={`rounded-xl border p-4 ${
              note.visibility === 'prive'
                ? 'border-primary/20 bg-secondary'
                : 'border-border bg-card'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{authorName}</span>
                {note.is_friend_of_friend && note.mutual_friend_name && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <UserPlus className="h-3 w-3" />
                    ami de {note.mutual_friend_name}
                  </span>
                )}
                {note.visibility === 'prive' ? (
                  <Lock className="h-3 w-3 text-primary" />
                ) : (
                  <Users className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
              {isOwn && (
                <button onClick={() => handleDelete(note.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="mt-2 text-sm">{note.content}</p>
            <p className="mt-2 text-xs text-muted-foreground">{formatDate(note.created_at)}</p>
          </div>
        )
      })}
    </div>
  )
}
