/**
 * QUOI     — l'état React des sujets et du tchat : la barre, la boîte Messages, les adresses des
 *            médias, une conversation ouverte (temps réel compris).
 * POURQUOI — chaque chargement rend son résultat et l'effet l'applique une fois
 *            (.claude/rules/v2.md) ; un échec se dit, il ne passe jamais pour une liste vide.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import {
  deleteMessage,
  editMessage,
  fetchConversation,
  fetchEventBrief,
  fetchInbox,
  fetchMessages,
  fetchStoryBar,
  markRead,
  signedMediaUrls,
  watchMessages,
  type ConversationDetail,
  type EventBrief,
  type InboxRow,
  type StorySujet,
} from '@/lib/discussion-api'
import { withReaction, type ChatMessage, type Reaction } from '@/lib/discussions'
import { fetchReactions, reactToMessage, watchReactions } from '@/lib/reaction-api'

type Loaded<T> = { status: 'loading' } | { status: 'failed' } | { status: 'ready'; value: T }

/** Relu à chaque changement d'adresse : publier, ouvrir ou fermer un sujet change l'adresse. */
function useActorLoad<T>(load: (actorId: string) => Promise<T>): Loaded<T> {
  const { actor } = useAuth()
  const { pathname, search } = useLocation()
  const [state, setState] = useState<Loaded<T>>({ status: 'loading' })
  useEffect(() => {
    if (!actor) return
    let cancelled = false
    const run = async () => {
      try {
        const value = await load(actor.id)
        if (!cancelled) setState({ status: 'ready', value })
      } catch {
        if (!cancelled) setState({ status: 'failed' })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [actor, pathname, search, load])
  return state
}

export function useStoryBar(): Loaded<StorySujet[]> {
  return useActorLoad(fetchStoryBar)
}

export function useInbox(): Loaded<InboxRow[]> {
  return useActorLoad(fetchInbox)
}

/** Les adresses signées des médias demandés, retrouvées quand la liste change. */
export function useMediaUrls(paths: (string | null)[]): Map<string, string> {
  const key = paths
    .filter((path): path is string => !!path)
    .sort()
    .join('|')
  const [urls, setUrls] = useState<Map<string, string>>(() => new Map())
  useEffect(() => {
    if (!key) return
    let cancelled = false
    const run = async () => {
      try {
        const found = await signedMediaUrls(key.split('|'))
        if (!cancelled) setUrls(found)
      } catch {
        // Un média illisible reste sans image : le message, lui, s'affiche.
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [key])
  return urls
}

interface OpenConversation {
  detail: ConversationDetail
  event: EventBrief | null
  messages: ChatMessage[]
  reactions: Reaction[]
}

/**
 * Une conversation ouverte : son détail, ses messages, et chaque nouveau message en direct.
 * L'ouvrir la marque lue au nom de l'acteur actif (l'anneau du sujet passe au gris).
 * Les réactions suivent le même chemin : chargées avec le fil, puis en direct.
 */
export function useConversation(conversationId: string) {
  const { actor } = useAuth()
  const [state, setState] = useState<Loaded<OpenConversation>>({ status: 'loading' })
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((value) => value + 1), [])

  useEffect(() => {
    if (!actor) return
    let cancelled = false
    const run = async () => {
      try {
        const [detail, messages, reactions] = await Promise.all([
          fetchConversation(conversationId),
          fetchMessages(conversationId),
          fetchReactions(conversationId),
        ])
        if (!detail) throw new Error('introuvable')
        const event = detail.eventId ? await fetchEventBrief(detail.eventId) : null
        await markRead(actor.id, conversationId)
        if (!cancelled) setState({ status: 'ready', value: { detail, event, messages, reactions } })
      } catch {
        if (!cancelled) setState({ status: 'failed' })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [actor, conversationId, version])

  const applyMessages = useCallback((change: (messages: ChatMessage[]) => ChatMessage[]) => {
    setState((previous) =>
      previous.status === 'ready'
        ? { ...previous, value: { ...previous.value, messages: change(previous.value.messages) } }
        : previous,
    )
  }, [])

  // Le temps réel ajoute les messages des autres, et suit les modifications et les suppressions ;
  // les siens reviennent aussi par là.
  useEffect(() => {
    if (!actor) return
    return watchMessages(
      conversationId,
      (message) => {
        applyMessages((messages) =>
          messages.some((known) => known.id === message.id)
            ? messages.map((known) => (known.id === message.id ? message : known))
            : [...messages, message],
        )
        void markRead(actor.id, conversationId)
      },
      (messageId) => applyMessages((messages) => messages.filter(({ id }) => id !== messageId)),
    )
  }, [actor, conversationId, applyMessages])

  const applyReaction = useCallback((reaction: Reaction) => {
    setState((previous) =>
      previous.status === 'ready'
        ? {
            ...previous,
            value: {
              ...previous.value,
              reactions: withReaction(previous.value.reactions, reaction),
            },
          }
        : previous,
    )
  }, [])

  useEffect(() => watchReactions(conversationId, applyReaction), [conversationId, applyReaction])

  /** La pastille change tout de suite ; si la base refuse, on relit la conversation. */
  const react = useCallback(
    (messageId: string, emoji: string | null) => {
      if (!actor) return
      applyReaction({ messageId, actorId: actor.id, emoji })
      reactToMessage(actor.id, messageId, emoji).catch(reload)
    },
    [actor, applyReaction, reload],
  )

  /** Modifier attend la base, qui renvoie le message par le temps réel ; supprimer est immédiat. */
  const edit = useCallback(
    async (messageId: string, body: string) => {
      if (actor) await editMessage(actor.id, messageId, body)
    },
    [actor],
  )
  const remove = useCallback(
    (messageId: string) => {
      if (!actor) return
      applyMessages((messages) => messages.filter(({ id }) => id !== messageId))
      deleteMessage(actor.id, messageId).catch(reload)
    },
    [actor, applyMessages, reload],
  )

  const value = state.status === 'ready' ? state.value : null
  const mediaPaths = useMemo(
    () =>
      value ? [value.detail.mediaPath, ...value.messages.map((message) => message.mediaPath)] : [],
    [value],
  )
  const urls = useMediaUrls(mediaPaths)
  return { state, urls, reload, react, edit, remove }
}
