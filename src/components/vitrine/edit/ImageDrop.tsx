import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'

interface ImageDropProps {
  label: string
  /** Upload + persiste, renvoie true si OK (le parent met à jour son URL optimiste avant). */
  onPick: (file: File) => Promise<void>
  className?: string
}

/** Bouton overlay « changer l'image » : ouvre le file picker et délègue l'upload au parent. */
export function ImageDrop({ label, onPick, className }: ImageDropProps) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try { await onPick(file) } finally { setBusy(false); if (ref.current) ref.current.value = '' }
  }

  return (
    <button type="button" className={`v-imagedrop ${className ?? ''}`} onClick={() => ref.current?.click()} disabled={busy}>
      <Camera />
      <span>{busy ? 'Envoi…' : label}</span>
      <input ref={ref} type="file" accept="image/*" hidden onChange={handle} />
    </button>
  )
}
