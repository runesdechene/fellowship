/**
 * QUOI     — une zone où lâcher une carte glissée : elle s'allume au survol et rend l'id reçu.
 * POURQUOI — la table, chaque paquet de l'équipe reçoivent des cartes de la même façon ; le
 *            glisser-déposer natif du navigateur suffit.
 */
import { useState, type DragEvent } from 'react'

export function useDropZone(onDrop: (taskId: string) => void) {
  const [over, setOver] = useState(false)
  return {
    over,
    handlers: {
      onDragOver: (event: DragEvent) => {
        event.preventDefault()
        setOver(true)
      },
      onDragLeave: () => setOver(false),
      onDrop: (event: DragEvent) => {
        event.preventDefault()
        setOver(false)
        const id = event.dataTransfer.getData('text/plain')
        if (id) onDrop(id)
      },
    },
  }
}
