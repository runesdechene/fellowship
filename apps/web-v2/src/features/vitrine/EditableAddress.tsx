/**
 * QUOI     — l'adresse de la vitrine en mode édition : « flw.sh/ » puis l'adresse, nettoyée à la
 *            frappe ; dès qu'elle change, l'avertissement ; un problème (réservée, prise) dessous.
 * POURQUOI — lot 6b (Uriel, 11/10/2026) : l'adresse se change librement — « c'est leur souci » —
 *            mais l'artisan doit savoir que ses QR codes et anciens liens ne marcheront plus.
 */
import { CircleAlert, Link2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { cleanSlug } from '@/lib/vitrine-edit'

interface EditableAddressProps {
  slug: string
  original: string
  problem: string | null
  onChange: (slug: string) => void
}

export function EditableAddress({ slug, original, problem, onChange }: EditableAddressProps) {
  const input = useRef<HTMLInputElement>(null)

  // Une adresse refusée à l'enregistrement : la ligne se rouvre, sélectionnée (spec 6b).
  useEffect(() => {
    if (problem) input.current?.select()
  }, [problem])

  return (
    <span className="edit-address">
      <span className="edit-zone edit-address__line">
        <Link2 size={14} strokeWidth={1.9} />
        <span className="edit-address__host">flw.sh/</span>
        <input
          ref={input}
          className="edit-field edit-address__input"
          type="text"
          aria-label="Adresse de ta vitrine"
          value={slug}
          size={Math.max(slug.length, 4)}
          onChange={(event) => {
            onChange(cleanSlug(event.target.value))
          }}
        />
      </span>
      {problem ? (
        <span className="edit-address__note edit-address__note--problem">
          <CircleAlert size={12} strokeWidth={2} />
          {problem}
        </span>
      ) : (
        slug !== original && (
          <span className="edit-address__note">
            <CircleAlert size={12} strokeWidth={2} />
            Les anciens liens et QR codes ne marcheront plus.
          </span>
        )
      )}
    </span>
  )
}
