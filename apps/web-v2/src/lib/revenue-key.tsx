/**
 * QUOI     — la clé de chiffrement des recettes de l'enseigne active, gardée le temps de la
 *            session : `status` ('none' aucune phrase définie, 'locked' phrase définie mais clé
 *            absente, 'open' clé en mémoire), `create`, `unlock`, `verify`, `reset`. Exposé par
 *            useRevenueKey().
 * POURQUOI — le déchiffrement se fait dans le navigateur (lib/cipher.ts) ; les chargeurs de
 *            bilans lisent la clé d'ici et se rechargent quand elle change.
 * ATTENTION — la clé ne vit que dans l'état React : jamais dans un stockage, jamais dans un
 *            journal. Changer d'enseigne l'abandonne. `ready` reste faux tant que la ligne
 *            revenue_keys n'est pas lue (ou si la lecture échoue) : `status` vaut alors 'none',
 *            ne pas proposer de créer une phrase avant `ready`. La phrase peut être réinitialisée
 *            ou recréée sur un autre appareil : `verify` avant tout scellement, sinon on écrirait
 *            des chiffrés que plus personne n'ouvre.
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
}

/** Ce qui est connu de l'enseigne `actorId` ; remis à zéro dès qu'elle change. */
interface Session {
  actorId: string | null
  hasRecord: boolean | null
  key: CryptoKey | null
}

/** Une erreur dont le message est fait pour être montré tel quel à l'exposant. */
export class RevenueKeyError extends Error {}

const RevenueKeyContext = createContext<RevenueKeyValue | undefined>(undefined)

export function RevenueKeyProvider({ children }: { children: ReactNode }) {
  const actorId = useAuth().actor?.id ?? null
  const [session, setSession] = useState<Session>({ actorId, hasRecord: null, key: null })

  // Une autre enseigne : la clé de l'ancienne est abandonnée pendant le rendu, jamais réutilisée.
  if (session.actorId !== actorId) setSession({ actorId, hasRecord: null, key: null })

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

  const value = useMemo<RevenueKeyValue>(
    () => ({
      status: session.key ? 'open' : session.hasRecord ? 'locked' : 'none',
      key: session.key,
      ready: session.hasRecord !== null,
      create,
      unlock,
      verify,
      reset,
    }),
    [session, create, unlock, verify, reset],
  )

  return <RevenueKeyContext.Provider value={value}>{children}</RevenueKeyContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- le fournisseur et son hook vivent ensemble
export function useRevenueKey() {
  const context = useContext(RevenueKeyContext)
  if (!context) throw new Error('useRevenueKey doit être utilisé dans un <RevenueKeyProvider>')
  return context
}
