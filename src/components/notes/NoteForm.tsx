import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { createNote } from '@/hooks/use-notes'
import { Button } from '@/components/ui/button'
import { Lock, Users } from 'lucide-react'
import type { NoteVisibility } from '@/types/database'

interface NoteFormProps {
  eventId: string
  onNoteAdded: () => void
}

export function NoteForm({ eventId, onNoteAdded }: NoteFormProps) {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<NoteVisibility>('amis')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !content.trim()) return
    setSaving(true)

    await createNote({
      user_id: user.id,
      event_id: eventId,
      content: content.trim(),
      visibility,
    })

    setContent('')
    setSaving(false)
    onNoteAdded()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
        placeholder="Ajouter une note..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setVisibility('prive')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              visibility === 'prive' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            <Lock className="h-3 w-3" />
            Privé
          </button>
          <button
            type="button"
            onClick={() => setVisibility('amis')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              visibility === 'amis' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            <Users className="h-3 w-3" />
            Amis
          </button>
        </div>
        <Button size="sm" type="submit" disabled={!content.trim() || saving}>
          {saving ? '...' : 'Publier'}
        </Button>
      </div>
    </form>
  )
}
