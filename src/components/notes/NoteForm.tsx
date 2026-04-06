import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { createNote } from '@/hooks/use-notes'
import { Button } from '@/components/ui/button'
import { Users } from 'lucide-react'

interface NoteFormProps {
  eventId: string
  onNoteAdded: () => void
}

export function NoteForm({ eventId, onNoteAdded }: NoteFormProps) {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !content.trim()) return
    setSaving(true)

    await createNote({
      user_id: user.id,
      event_id: eventId,
      content: content.trim(),
      visibility: 'amis',
    })

    setContent('')
    setSaving(false)
    onNoteAdded()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
        placeholder="Partager une note avec tes amis..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          Visible par tes amis
        </span>
        <Button size="sm" type="submit" disabled={!content.trim() || saving}>
          {saving ? '...' : 'Publier'}
        </Button>
      </div>
    </form>
  )
}
