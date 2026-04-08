import { useState, useRef } from 'react'
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

/** Convert hex (#rrggbb) to HSL string */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max - min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

/** Build bg (light) and text (solid) HSL strings from a hex color */
function hexToTagColors(hex: string): { bg_color: string; text_color: string } {
  const { h, s, l } = hexToHsl(hex)
  return {
    bg_color: `hsl(${h} ${s}% ${l}% / 0.1)`,
    text_color: `hsl(${h} ${s}% ${l}%)`,
  }
}

/** Best-effort parse of hsl(...) to hex for the color input */
function hslStringToHex(hsl: string): string {
  const nums = hsl.match(/[\d.]+/g)
  if (!nums || nums.length < 3) return '#6688aa'
  const h = parseFloat(nums[0]) / 360
  const s = parseFloat(nums[1]) / 100
  const l = parseFloat(nums[2]) / 100
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
  }
  let r: number, g: number, b: number
  if (s === 0) { r = g = b = l }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function ColorPicker({ value, onChange, label }: { value: string; label: string; onChange: (hex: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const hex = hslStringToHex(value)
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="h-8 w-8 rounded-lg border border-border shrink-0 cursor-pointer"
        style={{ background: hex }}
        title={label}
      />
      <input
        ref={ref}
        type="color"
        value={hex}
        onChange={e => onChange(e.target.value)}
        className="sr-only"
      />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
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
          </div>
          <div className="flex items-center gap-4 mb-3">
            <ColorPicker
              label="Couleur"
              value={newTag.text_color}
              onChange={hex => {
                const colors = hexToTagColors(hex)
                setNewTag({ ...newTag, ...colors })
              }}
            />
            <TagPreview name={newTag.name || 'Aperçu'} bg={newTag.bg_color} color={newTag.text_color} />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowNew(false)} className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-muted">
              Annuler
            </button>
            <button onClick={handleCreate} className="px-3 py-1.5 rounded-lg text-sm bg-primary text-primary-foreground font-medium">
              Créer
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card divide-y divide-border/50">
        {tags.map(tag => (
          <div key={tag.id} className="flex items-center gap-4 p-4">
            {editing === tag.id ? (
              <>
                <div className="flex-1 flex flex-wrap items-center gap-3">
                  <input
                    value={editValues.name}
                    onChange={e => setEditValues({ ...editValues, name: e.target.value })}
                    className="rounded-lg border border-border px-2 py-1 text-sm flex-1 min-w-[120px]"
                    placeholder="Nom"
                  />
                  <input
                    value={editValues.slug}
                    onChange={e => setEditValues({ ...editValues, slug: e.target.value })}
                    className="rounded-lg border border-border px-2 py-1 text-sm flex-1 min-w-[120px]"
                    placeholder="Slug"
                  />
                  <ColorPicker
                    label="Couleur"
                    value={editValues.text_color}
                    onChange={hex => {
                      const colors = hexToTagColors(hex)
                      setEditValues({ ...editValues, ...colors })
                    }}
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
