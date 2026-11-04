/**
 * QUOI     — le tiroir d'un sujet : il glisse depuis la droite sur ordinateur, couvre l'écran sur
 *            téléphone (maquette Story).
 * POURQUOI — ouvrir un sujet ne fait pas quitter la page : on y répond, on referme, on reste où
 *            l'on était.
 * ATTENTION — rendu dans `document.body` : la coquille crée son propre empilement, rien de ce
 *            qu'elle contient ne passe au-dessus du mur d'affiche (.claude/rules/v2.md). Ouvert
 *            par `?discussion=<id>` : le retour du navigateur le referme.
 */
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { Conversation } from './Conversation'
import { DISCUSSION_PARAM } from './StoryBar'

export function DiscussionDrawer() {
  const [params, setParams] = useSearchParams()
  const id = params.get(DISCUSSION_PARAM)
  if (!id) return null
  const close = () => {
    const next = new URLSearchParams(params)
    next.delete(DISCUSSION_PARAM)
    setParams(next)
  }
  return createPortal(<Drawer key={id} id={id} onClose={close} />, document.body)
}

function Drawer({ id, onClose }: { id: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    dialog.current?.showModal()
  }, [])
  return (
    <dialog
      ref={dialog}
      className="discussion-drawer"
      aria-label="Sujet"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        // Toucher le voile ferme ; le contenu vit dans un bloc intérieur (.claude/rules/v2.md).
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="discussion-drawer__panel">
        <Conversation conversationId={id} onClose={onClose} closeWith="cross" />
      </div>
    </dialog>
  )
}
