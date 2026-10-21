/**
 * QUOI     — le dépôt d'une image : un cadre en pointillés (cliquer ou déposer), puis la ligne de
 *            l'image choisie, avec sa vignette ronde (photo) ou large (bannière) et « Changer ».
 * POURQUOI — maquettes 2391:187 et 2391:260 (arrivée, étape photo et bannière) ; la préparation de
 *            l'image (refus, réduction) reste à l'appelant, ici on ne fait que la choisir.
 */
import { Image as ImageIcon } from 'lucide-react'
import { useRef, type DragEvent, type KeyboardEvent } from 'react'

interface ImageDropProps {
  label: string
  /** Une photo ronde, sinon une bannière large. */
  round: boolean
  /** L'adresse locale de l'aperçu, ou null tant que rien n'est choisi. */
  preview: string | null
  fileName: string | null
  problem: string | null
  onPick: (file: File) => void
}

export function ImageDrop({ label, round, preview, fileName, problem, onPick }: ImageDropProps) {
  const input = useRef<HTMLInputElement>(null)

  // Le champ de fichier est caché : le cadre s'ouvre aussi au clavier.
  function key(event: KeyboardEvent) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    input.current?.click()
  }

  function drop(event: DragEvent) {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file) onPick(file)
  }

  return (
    <div className="image-drop">
      <span className="image-drop__label">{label}</span>
      <label
        className={preview ? 'image-drop__chosen' : 'image-drop__zone'}
        onDragOver={(event) => {
          event.preventDefault()
        }}
        onDrop={drop}
        onKeyDown={key}
        tabIndex={0}
        role="button"
        aria-label={preview ? `${label} : changer l’image` : label}
      >
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) onPick(file)
            // Rechoisir le même fichier doit encore être vu.
            event.target.value = ''
          }}
        />
        {preview ? (
          <>
            <img
              className={round ? 'image-drop__thumb' : 'image-drop__thumb image-drop__thumb--cover'}
              src={preview}
              alt=""
            />
            <span className="image-drop__name">{fileName}</span>
            <span className="image-drop__change">Changer</span>
          </>
        ) : (
          <>
            <ImageIcon size={18} strokeWidth={1.75} aria-hidden="true" />
            Déposer une image, ou cliquer pour choisir
          </>
        )}
      </label>
      {problem && (
        <p className="image-drop__problem" role="alert">
          {problem}
        </p>
      )}
    </div>
  )
}
