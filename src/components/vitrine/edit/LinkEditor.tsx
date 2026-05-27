import { useState } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { normalizeLinkUrl } from '@/lib/vitrine-edit'
import type { VitrineLink } from '@/types/database'

const TYPES: VitrineLink['type'][] = ['website', 'shop', 'instagram', 'facebook', 'other']
const TYPE_LABEL: Record<VitrineLink['type'], string> = {
  website: 'Site', shop: 'Boutique', instagram: 'Instagram', facebook: 'Facebook', other: 'Autre',
}

interface LinkEditorProps {
  links: VitrineLink[]
  onChange: (next: VitrineLink[]) => void
}

/** Liste éditable de liens : type + label + url, ajout/suppression. Pas de réordre (Phase 3.1). */
export function LinkEditor({ links, onChange }: LinkEditorProps) {
  const [draft, setDraft] = useState<VitrineLink>({ type: 'website', label: '', url: '' })

  function update(i: number, patch: Partial<VitrineLink>) {
    onChange(links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }
  function commitUrl(i: number) {
    update(i, { url: normalizeLinkUrl(links[i].url) })
  }
  function remove(i: number) { onChange(links.filter((_, idx) => idx !== i)) }
  function addDraft() {
    const url = normalizeLinkUrl(draft.url)
    if (!url || !draft.label.trim()) return
    onChange([...links, { ...draft, url, label: draft.label.trim() }])
    setDraft({ type: 'website', label: '', url: '' })
  }

  return (
    <div className="v-links v-links-edit">
      {links.map((l, i) => (
        <div key={i} className="v-linkrow-edit">
          <select className="v-link-type" value={l.type} onChange={e => update(i, { type: e.target.value as VitrineLink['type'] })}>
            {TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </select>
          <input className="v-link-label" value={l.label} placeholder="Libellé" onChange={e => update(i, { label: e.target.value })} />
          <input className="v-link-url" value={l.url} placeholder="url.fr" onChange={e => update(i, { url: e.target.value })} onBlur={() => commitUrl(i)} />
          <button type="button" className="v-link-del" onClick={() => remove(i)} aria-label="Supprimer"><Trash2 /></button>
        </div>
      ))}
      <div className="v-linkrow-edit v-linkrow-new">
        <select className="v-link-type" value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value as VitrineLink['type'] })}>
          {TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </select>
        <input className="v-link-label" value={draft.label} placeholder="Libellé" onChange={e => setDraft({ ...draft, label: e.target.value })} />
        <input className="v-link-url" value={draft.url} placeholder="url.fr" onChange={e => setDraft({ ...draft, url: e.target.value })} />
        <button type="button" className="v-link-add" onClick={addDraft} aria-label="Ajouter le lien"><Plus /></button>
      </div>
    </div>
  )
}
