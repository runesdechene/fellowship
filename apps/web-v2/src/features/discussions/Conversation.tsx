/**
 * QUOI     — une conversation ouverte : son en-tête (le sujet épinglé, la personne ou le groupe),
 *            le fil, la saisie. Sert au tiroir d'un sujet comme à la page Messages.
 * POURQUOI — un seul tchat pour les sujets, les conversations à deux et les groupes (Uriel,
 *            04/11/2026) : seul l'en-tête change.
 * ATTENTION — ouverte depuis la barre des sujets (`story`), un sujet montre d'abord sa story
 *            (SujetStory) ; la discussion complète s'ouvre par `?fil`, et le retour du navigateur
 *            ramène à la story.
 *            La couleur de la conversation vient de la catégorie du festival lié (réglée en base) :
 *            elle passe par deux variables CSS, seule forme de style permise dans un .tsx.
 */
import { useState, type CSSProperties } from 'react'
import { ArrowLeft, Users, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Avatar, AvatarStack } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAuth } from '@/lib/auth'
import { formatDateRange, parseSqlDate } from '@/lib/dates'
import { closeSujet } from '@/lib/discussion-api'
import {
  AUDIENCES,
  conversationName,
  conversationTone,
  remainingLabel,
  summarizeReactions,
  toBubbles,
} from '@/lib/discussions'
import { useTagStyles } from '@/lib/useTagStyles'
import { ChatFeed } from './ChatFeed'
import { ChatInput } from './ChatInput'
import { MembersSheet } from './MembersSheet'
import { SujetStory } from './SujetStory'
import { useConversation } from './useDiscussions'

/** La discussion complète d'un sujet ouvert sur sa story : un état de l'adresse. */
export const CHAT_PARAM = 'fil'

interface Props {
  conversationId: string
  onClose: () => void
  /** Le tiroir se ferme d'une croix ; la page Messages sur téléphone revient par une flèche. */
  closeWith: 'cross' | 'arrow'
  /** Un sujet ouvert depuis la barre : sa story d'abord, la discussion ensuite. */
  story?: boolean
}

export function Conversation({ conversationId, onClose, closeWith, story = false }: Props) {
  const { actor } = useAuth()
  const styles = useTagStyles()
  const { state, urls, reload, react } = useConversation(conversationId)
  const [params, setParams] = useSearchParams()
  const [membersOpen, setMembersOpen] = useState(false)
  const [closing, setClosing] = useState<'ask' | 'busy' | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  const closeButton = (
    <Button
      variant="icon"
      aria-label={closeWith === 'cross' ? 'Fermer' : 'Retour'}
      onClick={onClose}
    >
      {closeWith === 'cross' ? (
        <X size={18} strokeWidth={1.75} />
      ) : (
        <ArrowLeft size={20} strokeWidth={1.75} />
      )}
    </Button>
  )

  if (state.status !== 'ready' || !actor) {
    return (
      <section className="conversation">
        <header className="conversation__head">{closeButton}</header>
        <p className="conversation__status">
          {state.status === 'failed'
            ? 'Cette conversation ne s’ouvre pas. Elle a peut-être été clôturée.'
            : 'Chargement…'}
        </p>
      </section>
    )
  }

  const { detail, event, messages, reactions } = state.value
  const people = new Map(detail.members.map((member) => [member.id, member]))
  const others = detail.members.filter((member) => member.id !== actor.id)
  const author = people.get(detail.createdBy)
  const tone = conversationTone(styles, event?.tags ?? null)
  const sujet = detail.kind === 'sujet'
  const remaining = remainingLabel(
    new Date(detail.expiresAt ?? 0),
    detail.closedAt ? new Date(detail.closedAt) : null,
    new Date(),
  )
  const closed = sujet && remaining === 'clôturé'
  const readTimes = others.map((member) => member.lastReadAt).sort()
  const title = conversationName(detail.kind, detail.mot, detail.title, others)
  const audience = AUDIENCES.find((option) => option.value === detail.audience)?.label

  async function confirmClose() {
    if (!actor) return
    setClosing('busy')
    try {
      await closeSujet(actor.id, conversationId)
      setClosing(null)
      reload()
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'La clôture a échoué.')
      setClosing('ask')
    }
  }

  if (story && sujet && !params.has(CHAT_PARAM)) {
    const openChat = () => {
      const next = new URLSearchParams(params)
      next.set(CHAT_PARAM, '1')
      setParams(next)
    }
    return (
      <SujetStory
        detail={detail}
        event={event}
        messages={messages}
        people={people}
        urls={urls}
        me={actor.id}
        remaining={remaining}
        closed={closed}
        onClose={onClose}
        onOpen={openChat}
      />
    )
  }

  return (
    <section
      className={tone ? 'conversation conversation--toned' : 'conversation'}
      style={
        tone
          ? ({ '--chat-tone': tone.textColor, '--chat-tone-soft': tone.bgColor } as CSSProperties)
          : undefined
      }
    >
      <header className="conversation__head">
        {closeWith === 'arrow' && closeButton}
        {sujet ? (
          <Avatar className="conversation__avatar" src={author?.avatar} name={author?.label} />
        ) : others.length > 1 ? (
          <AvatarStack>
            {others.slice(0, 2).map((member) => (
              <Avatar
                key={member.id}
                className="conversation__avatar conversation__avatar--small"
                src={member.avatar}
                name={member.label}
              />
            ))}
          </AvatarStack>
        ) : (
          <Avatar
            className="conversation__avatar"
            src={others[0]?.avatar}
            name={others[0]?.label}
          />
        )}
        <div className="conversation__who">
          <p className="conversation__name">
            {sujet ? (detail.createdBy === actor.id ? 'Ton sujet' : author?.label) : title}
          </p>
          <p className="conversation__meta">
            {sujet
              ? `${String(new Set(messages.map((message) => message.authorId)).size)} dans la discussion, ${remaining}`
              : detail.kind === 'groupe'
                ? `${String(detail.members.length)} membres`
                : 'Conversation privée'}
          </p>
        </div>
        {sujet && detail.createdBy === actor.id && !closed && (
          <Button onClick={() => setClosing('ask')}>Clôturer</Button>
        )}
        {detail.kind === 'groupe' && (
          <Button
            icon={<Users size={16} strokeWidth={1.75} />}
            onClick={() => setMembersOpen(true)}
          >
            Membres
          </Button>
        )}
        {closeWith === 'cross' && closeButton}
      </header>

      {sujet && (
        <div className="conversation__pin">
          {event?.imageUrl && <img className="conversation__poster" src={event.imageUrl} alt="" />}
          <div className="conversation__pin-text">
            <p className="conversation__mot">{detail.mot}</p>
            {event && (
              <p className="conversation__event">
                {event.name},{' '}
                {formatDateRange(
                  parseSqlDate(event.startDate),
                  parseSqlDate(event.endDate),
                  'long',
                )}
              </p>
            )}
          </div>
          {audience && <span className="conversation__audience">{audience}</span>}
        </div>
      )}

      <ChatFeed
        bubbles={toBubbles(messages, actor.id)}
        people={people}
        urls={urls}
        readByAllUntil={readTimes[0] ?? null}
        group={detail.kind !== 'direct'}
        reactions={summarizeReactions(reactions, actor.id)}
        onReact={closed ? undefined : react}
      />

      {closed ? (
        <p className="conversation__closed">
          Ce sujet est clôturé. Le fil reste lisible, plus personne n’y écrit.
        </p>
      ) : (
        <ChatInput
          conversationId={conversationId}
          placeholder={sujet ? `Répondre à ${author?.label ?? 'ce sujet'}` : `Message à ${title}`}
        />
      )}

      {closing && (
        <ConfirmDialog
          title="Clôturer ce sujet ?"
          text="Il quitte la barre des sujets. Le fil reste lisible pour ceux qui y ont écrit, plus personne n’y écrit."
          confirmLabel="Clôturer"
          busy={closing === 'busy'}
          problem={problem}
          onConfirm={() => void confirmClose()}
          onClose={() => setClosing(null)}
        />
      )}
      {membersOpen && (
        <MembersSheet
          detail={detail}
          onClose={() => setMembersOpen(false)}
          onChanged={reload}
          onLeft={onClose}
        />
      )}
    </section>
  )
}
