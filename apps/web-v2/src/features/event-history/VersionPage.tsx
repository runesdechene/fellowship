/**
 * QUOI     — une version de la fiche (`/evenement/:id/historique/:version`) : qui, quand, son mot, et
 *            ce qu'elle a changé — un champ court en « avant → après », un texte mot à mot.
 * POURQUOI — maquette 2253:299 (lot 10c) : souligné, ce qui a été ajouté ; barré, ce qui a été
 *            retiré. Un admin peut revenir à cette version, ce qui en crée une nouvelle.
 */
import { ArrowRight, ChevronLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/lib/auth'
import { changeBlocks, versionTitle, versionWhen, type ChangeBlock } from '@/lib/event-history'
import { useTransitionNavigate } from '@/lib/navigation'
import { must, supabase } from '@/lib/supabase'
import { useEventHistory } from './useEventHistory'

function useVersionBlocks(version: number) {
  const [blocks, setBlocks] = useState<ChangeBlock[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const rows = must(await supabase.rpc('version_evenement', { p_version: version }))
        if (!cancelled) setBlocks(changeBlocks(rows))
      } catch (failure) {
        if (!cancelled) setError(failure instanceof Error ? failure.message : 'Version illisible.')
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [version])
  return { blocks, error }
}

function Block({ block }: { block: ChangeBlock }) {
  return (
    <li className="version__block">
      <span className="version__label">{block.label}</span>
      {block.kind === 'short' ? (
        <span className="version__short">
          <span className={block.before ? 'version__before' : 'version__empty'}>
            {block.before ?? 'vide'}
          </span>
          <ArrowRight size={14} strokeWidth={1.8} className="version__arrow" />
          {block.after ? (
            <ins className="version__ins">{block.after}</ins>
          ) : (
            <span className="version__empty">vide</span>
          )}
        </span>
      ) : (
        <p className="version__text">
          {block.parts.map((part, index) =>
            part.added ? (
              <ins key={index} className="version__ins">
                {part.text}
              </ins>
            ) : part.removed ? (
              <del key={index} className="version__del">
                {part.text}
              </del>
            ) : (
              <span key={index}>{part.text}</span>
            ),
          )}
        </p>
      )}
    </li>
  )
}

export function VersionPage() {
  const { id = '', version = '' } = useParams<{ id: string; version: string }>()
  const versionId = Number(version)
  const go = useTransitionNavigate()
  const { person } = useAuth()
  const { entries } = useEventHistory(id)
  const { blocks, error } = useVersionBlocks(versionId)
  const [reverting, setReverting] = useState(false)
  const [revertError, setRevertError] = useState<string | null>(null)
  const entry = entries.find((candidate) => candidate.id === versionId)
  const isCurrent = entries[0]?.id === versionId
  const isAdmin = person?.role === 'admin'

  async function revert() {
    setReverting(true)
    const { error: failure } = await supabase.rpc('revenir_a_version_evenement', {
      p_version: versionId,
    })
    setReverting(false)
    if (failure) setRevertError(failure.message)
    else go(`/evenement/${id}/historique`)
  }

  return (
    <div className="history">
      <header className="history__head">
        <button
          type="button"
          className="history__back"
          onClick={() => go(`/evenement/${id}/historique`)}
        >
          <ChevronLeft size={14} strokeWidth={2} />
          L’histoire de la fiche
        </button>
        {entry && (
          <>
            <h1 className="history__title">{versionTitle(entry.createdAt)}</h1>
            <p className="version__who">
              <Avatar src={entry.avatarUrl} name={entry.author} className="version__avatar" />
              <b>{entry.author}</b> · {versionWhen(entry.createdAt, new Date())}
            </p>
            {entry.note && <p className="version__note">« {entry.note} »</p>}
          </>
        )}
      </header>

      {error && <p className="history__state">{error}</p>}
      {blocks && blocks.length > 0 && (
        <>
          <ul className="version__blocks">
            {blocks.map((block) => (
              <Block key={block.field} block={block} />
            ))}
          </ul>
          <p className="history__foot">
            Souligné : ce qui a été ajouté. Barré : ce qui a été retiré.
          </p>
        </>
      )}
      {blocks && blocks.length === 0 && entry?.isOrigin && (
        <p className="history__state">La fiche telle qu’elle a été ajoutée.</p>
      )}

      {isAdmin && !isCurrent && entry && (
        <div className="version__revert">
          <button
            type="button"
            className="version__revert-button"
            disabled={reverting}
            onClick={() => void revert()}
          >
            Revenir à cette version
          </button>
          <span className="version__revert-hint">
            {revertError ??
              'Réservé aux admins. Revenir crée une nouvelle version : rien ne se perd.'}
          </span>
        </div>
      )}
    </div>
  )
}
