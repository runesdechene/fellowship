import { useState } from 'react'
import { useAdminTags } from '@/hooks/use-admin'
import { Loader2, Plus, Trash2, Pencil, X, Check } from 'lucide-react'

function TagPreview({ name, bg, color }: { name: string; bg: string; color: string }) {
  return (
    <span
      className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
      style={{ background: bg, color }}
    >
      {name}
    </span>
  )
}

export function AdminTags() {
  const { tags, loading, createTag, updateTag, deleteTag } = useAdminTags()
  const [editing, setEditing] = useState<string | null>(null)
  const [editValues, setEditValues] = useState({ name: '', slug: '', bg_color: '', text_color: '' })
  const [showNew, setShowNew] = useState(false)
  const [newTag, setNewTag] = useState({ name: '', slug: '', bg_color: 'hsl(200 50% 45% / 0.1)', text_color: 'hsl(200 50% 45%)' })

  function startEdit(tag: { id: string; name: string; slug: string; bg_color: string; text_color: string }) {
    setEditing(tag.id)
    setEditValues({ name: tag.name, slug: tag.slug, bg_color: tag.bg_color, text_color: tag.text_color })
  }

  async function saveEdit(id: string) {
    await updateTag(id, editValues)
    setEditing(null)
  }

  async function handleCreate() {
    if (!newTag.name || !newTag.slug) return
    await createTag({ ...newTag, sort_order: tags.length + 1 })
    setNewTag({ name: '', slug: '', bg_color: 'hsl(200 50% 45% / 0.1)', text_color: 'hsl(200 50% 45%)' })
    setShowNew(false)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer le tag "${name}" ?`)) return
    await deleteTag(id)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{tags.length} tags</p>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Nouveau tag
        </button>
      </div>

      {showNew && (
        <div className="rounded-2xl border border-border bg-card p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
            <input
              placeholder="Nom (ex: Médiéval)"
              value={newTag.name}
              onChange={e => setNewTag({ ...newTag, name: e.target.value })}
              className="rounded-xl border border-border px-3 py-2 text-sm"
            />
            <input
              placeholder="Slug (ex: fete-medievale)"
              value={newTag.slug}
              onChange={e => setNewTag({ ...newTag, slug: e.target.value })}
              className="rounded-xl border border-border px-3 py-2 text-sm"
            />
            <input
              placeholder="Couleur fond (HSL)"
              value={newTag.bg_color}
              onChange={e => setNewTag({ ...newTag, bg_color: e.target.value })}
              className="rounded-xl border border-border px-3 py-2 text-sm"
            />
            <input
              placeholder="Couleur texte (HSL)"
              value={newTag.text_color}
              onChange={e => setNewTag({ ...newTag, text_color: e.target.value })}
              className="rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <TagPreview name={newTag.name || 'Aperçu'} bg={newTag.bg_color} color={newTag.text_color} />
            <div className="flex gap-2 ml-auto">
              <button onClick={() => setShowNew(false)} className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-muted">
                Annuler
              </button>
              <button onClick={handleCreate} className="px-3 py-1.5 rounded-lg text-sm bg-primary text-primary-foreground font-medium">
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card divide-y divide-border/50">
        {tags.map(tag => (
          <div key={tag.id} className="flex items-center gap-4 p-4">
            {editing === tag.id ? (
              <>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                  <input
                    value={editValues.name}
                    onChange={e => setEditValues({ ...editValues, name: e.target.value })}
                    className="rounded-lg border border-border px-2 py-1 text-sm"
                  />
                  <input
                    value={editValues.slug}
                    onChange={e => setEditValues({ ...editValues, slug: e.target.value })}
                    className="rounded-lg border border-border px-2 py-1 text-sm"
                  />
                  <input
                    value={editValues.bg_color}
                    onChange={e => setEditValues({ ...editValues, bg_color: e.target.value })}
                    className="rounded-lg border border-border px-2 py-1 text-sm"
                  />
                  <input
                    value={editValues.text_color}
                    onChange={e => setEditValues({ ...editValues, text_color: e.target.value })}
                    className="rounded-lg border border-border px-2 py-1 text-sm"
                  />
                </div>
                <TagPreview name={editValues.name} bg={editValues.bg_color} color={editValues.text_color} />
                <button onClick={() => saveEdit(tag.id)} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600">
                  <Check className="h-4 w-4" strokeWidth={1.5} />
                </button>
                <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                  <X className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </>
            ) : (
              <>
                <div className="flex-1">
                  <span className="font-medium text-sm">{tag.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">({tag.slug})</span>
                </div>
                <TagPreview name={tag.name} bg={tag.bg_color} color={tag.text_color} />
                <button onClick={() => startEdit(tag)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                  <Pencil className="h-4 w-4" strokeWidth={1.5} />
                </button>
                <button onClick={() => handleDelete(tag.id, tag.name)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
