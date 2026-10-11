/**
 * QUOI     — le logo en mode édition : son cercle, et une pastille appareil photo pour en choisir
 *            un autre ; l'aperçu s'affiche aussitôt, rien n'est envoyé avant « Enregistrer ».
 * POURQUOI — lot 6b, maquette 2231:2.
 */
import { Camera } from 'lucide-react'
import { useRef } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { initials } from '@/lib/vitrine'

interface EditableLogoProps {
  src: string | null
  name: string
  onPick: (file: File) => void
}

export function EditableLogo({ src, name, onPick }: EditableLogoProps) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <div className="edit-logo">
      <div className="vitrine-head__logo">
        {src ? (
          <Avatar className="vitrine-head__logo-image" src={src} name={name} />
        ) : (
          <span className="vitrine-head__initials">{initials(name)}</span>
        )}
      </div>
      <button
        type="button"
        className="edit-logo__pick"
        aria-label="Changer le logo"
        onClick={() => {
          input.current?.click()
        }}
      >
        <Camera size={15} strokeWidth={2} />
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onPick(file)
          event.target.value = ''
        }}
      />
    </div>
  )
}
