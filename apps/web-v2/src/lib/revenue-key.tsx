/**
 * QUOI     — la clé de chiffrement des recettes de l'enseigne active, gardée le temps de la
 *            session : `status` ('none' aucune phrase définie, 'locked' phrase définie mais clé
 *            absente, 'open' clé en mémoire), `create`, `unlock`, `verify`, `reset`, et le refus
 *            « Garder en clair » (`clearChosen`, `keepClear`). Exposé par useRevenueKey().
 * POURQUOI — le déchiffrement se fait dans le navigateur (lib/cipher.ts) ; les chargeurs de
 *            bilans lisent la clé d'ici et se rechargent quand elle change.
 * ATTENTION — la clé ne vit que dans l'état React : jamais dans un stockage, jamais dans un
 *            journal. Changer d'enseigne l'abandonne. `ready` reste faux tant que la ligne
 *            revenue_keys n'est pas lue (ou si la lecture échoue) : `status` vaut alors 'none',
 *            ne pas proposer de créer une phrase avant `ready`. La phrase peut être réinitialisée
 *            ou recréée sur un autre appareil : `verify` avant tout scellement, sinon on écrirait
 *            des chiffrés que plus personne n'ouvre. Le refus vit sur l'enseigne
 *            (entities.revenue_clear_chosen_at, lu par mes_enseignes) : il suit sur tous les appareils.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createKey, isStrongPassphrase, keyMatches, unlockKey } from './cipher'
import { useAuth } from './auth'
import { useViewTransition } from './navigation'
import { must, supabase } from './supabase'

interface RevenueKeyValue {
  status: 'none' | 'locked' | 'open'
  key: CryptoKey | null
  /** Faux tant que l'existence d'une phrase pour cette enseigne n'est pas connue. */
  ready: boolean
  /** Définit la phrase de l'enseigne, ouvre la clé et la rend. Lève si la phrase est trop faible. */
  create: (phrase: string) => Promise<CryptoKey>
  /**
   * 'ok' et clé ouverte si la phrase est la bonne, 'wrong' sinon, 'reset' si la phrase a été
   * réinitialisée ailleurs entre-temps. Lève si la base ne répond pas.
   */
  unlock: (phrase: string) => Promise<'ok' | 'wrong' | 'reset'>
  /** Lève une RevenueKeyError si `key` n'ouvre plus la phrase de l'enseigne (changée ailleurs). */
  verify: (key: CryptoKey) => Promise<void>
  /** Efface la phrase ET les recettes chiffrées (reset_revenue_key). */
  reset: () => Promise<void>
  /** L'enseigne a choisi « Garder en clair » (bandeau de Mes bilans). */
  clearChosen: boolean
  /** Enregistre ce choix pour l'enseigne. Lève si la base ne répond pas. */
  keepClear: () => Promise<void>
}

/** Ce qui est connu de l'enseigne `actorId` ; remis à zéro dès qu'elle change. */
interface Session {
  actorId: string | null
  hasRecord: boolean | null
  key: CryptoKey | null
  /** « Garder en clair » vient d'être choisi ici, avant que l'enseigne ne soit relue. */
  clearChosen: boolean
}

/** Une erreur dont le message est fait pour être montré tel quel à l'exposant. */
export class RevenueKeyError extends Error {}

const RevenueKeyContext = createContext<RevenueKeyValue | undefined>(undefined)

export function RevenueKeyProvider({ children }: { children: ReactNode }) {
  const { actor, entities, reloadIdentity } = useAuth()
  const actorId = actor?.id ?? null
  const transition = useViewTransition()
  const fresh = (id: string | null): Session => ({
    actorId: id,
    hasRecord: null,
    key: null,
    clearChosen: false,
  })
  const [session, setSession] = useState<Session>(() => fresh(actorId))
  const entity = entities.find((row) => row.actor_id === actorId)

  // Une autre enseigne : la clé de l'ancienne est abandonnée pendant le rendu, jamais réutilisée.
  if (session.actorId !== actorId) setSession(fresh(actorId))

  useEffect(() => {
    if (!actorId) return
    let cancelled = false
    async function read(id: string) {
      try {
        const response = await supabase
          .from('revenue_keys')
          .select('actor_id')
          .eq('actor_id', id)
          .maybeSingle()
        const row = must(response)
        if (cancelled) return
        setSession((s) => (s.actorId === id ? { ...s, hasRecord: row !== null } : s))
      } catch {
        // Lecture ratée : `ready` reste faux, l'écran ne propose rien plutôt qu'une création à tort.
      }
    }
    void read(actorId)
    return () => {
      cancelled = true
    }
  }, [actorId])

  const create = useCallback(
    async (phrase: string) => {
      if (!actorId) throw new Error('Aucune enseigne active')
      if (!isStrongPassphrase(phrase)) throw new Error('Phrase de passe trop faible')
      const { key, record } = await createKey(phrase)
      const { error } = await supabase.from('revenue_keys').insert({ actor_id: actorId, ...record })
      // Un autre appareil a posé sa phrase le premier : c'est elle qui compte, il faut la taper.
      if (error?.code === '23505') {
        setSession((s) => (s.actorId === actorId ? { ...s, hasRecord: true, key: null } : s))
        throw new RevenueKeyError(
          'Une phrase existe déjà pour cette enseigne : tape-la pour ouvrir tes recettes.',
        )
      }
      if (error) throw new Error(error.message)
      setSession((s) => (s.actorId === actorId ? { ...s, hasRecord: true, key } : s))
      return key
    },
    [actorId],
  )

  const unlock = useCallback(
    async (phrase: string) => {
      if (!actorId) return 'wrong'
      const response = await supabase
        .from('revenue_keys')
        .select('salt, iterations, check')
        .eq('actor_id', actorId)
        .maybeSingle()
      const record = must(response)
      if (!record) {
        setSession((s) => (s.actorId === actorId ? { ...s, hasRecord: false, key: null } : s))
        return 'reset'
      }
      const key = await unlockKey(phrase, record)
      if (!key) return 'wrong'
      setSession((s) => (s.actorId === actorId ? { ...s, hasRecord: true, key } : s))
      return 'ok'
    },
    [actorId],
  )

  const verify = useCallback(
    async (key: CryptoKey) => {
      if (!actorId) throw new Error('Aucune enseigne active')
      const response = await supabase
        .from('revenue_keys')
        .select('check')
        .eq('actor_id', actorId)
        .maybeSingle()
      const record = must(response)
      if (record && (await keyMatches(key, record))) return
      // Plus de phrase : 'none'. Une autre phrase : 'locked', il faut taper la nouvelle.
      setSession((s) =>
        s.actorId === actorId ? { ...s, hasRecord: record !== null, key: null } : s,
      )
      throw new RevenueKeyError('Ta phrase a été réinitialisée sur un autre appareil.')
    },
    [actorId],
  )

  const reset = useCallback(async () => {
    if (!actorId) throw new Error('Aucune enseigne active')
    must(await supabase.rpc('reset_revenue_key', { p_actor: actorId }))
    setSession((s) => (s.actorId === actorId ? { ...s, hasRecord: false, key: null } : s))
  }, [actorId])

  const keepClear = useCallback(async () => {
    if (!actorId) throw new Error('Aucune enseigne active')
    must(
      await supabase
        .from('entities')
        .update({ revenue_clear_chosen_at: new Date().toISOString() })
        .eq('actor_id', actorId),
    )
    // Le bandeau s'efface en fondu (View Transitions) ; l'enseigne relue confirme le choix ensuite.
    transition('banner', () => {
      setSession((s) => (s.actorId === actorId ? { ...s, clearChosen: true } : s))
    })
    void reloadIdentity()
  }, [actorId, transition, reloadIdentity])

  const value = useMemo<RevenueKeyValue>(
    () => ({
      status: session.key ? 'open' : session.hasRecord ? 'locked' : 'none',
      key: session.key,
      ready: session.hasRecord !== null,
      create,
      unlock,
      verify,
      reset,
      clearChosen: session.clearChosen || Boolean(entity?.revenue_clear_chosen_at),
      keepClear,
    }),
    [session, entity, create, unlock, verify, reset, keepClear],
  )

  return <RevenueKeyContext.Provider value={value}>{children}</RevenueKeyContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- le fournisseur et son hook vivent ensemble
export function useRevenueKey() {
  const context = useContext(RevenueKeyContext)
  if (!context) throw new Error('useRevenueKey doit être utilisé dans un <RevenueKeyProvider>')
  return context
}
