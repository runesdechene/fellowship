import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { createNote } from '@/hooks/use-notes'
import { Button } from '@/components/ui/button'
import { Lock } from 'lucide-react'

interface NoteFormProps {
  eventId: string
  onNoteAdded: () => void
}

export function NoteForm({ eventId, onNoteAdded }: NoteFormProps) {
  const { user, currentActor } = useAuth()
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !currentActor || !content.trim()) return
    setSaving(true)

    await createNote({
      actor_id: currentActor.id,
      acted_by_user_id: user.id,
      event_id: eventId,
      content: content.trim(),
      visibility: 'prive',
    })

    setContent('')
    setSaving(false)
    onNoteAdded()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
        placeholder="Note privée, juste pour toi…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          Visible uniquement par moi
        </span>
        <Button size="sm" type="submit" disabled={!content.trim() || saving}>
          {saving ? '...' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  )
}
