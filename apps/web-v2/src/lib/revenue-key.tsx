/**
 * QUOI     — la clé de chiffrement des recettes de l'enseigne active, gardée le temps de la
 *            session : `status` ('none' aucune phrase définie, 'locked' phrase définie mais clé
 *            absente, 'open' clé en mémoire), `create`, `unlock`, `verify`, `rekey`, `reset`, et le
 *            refus « Garder en clair » (`clearChosen`, `keepClear`). Exposé par useRevenueKey().
 * POURQUOI — le déchiffrement se fait dans le navigateur (lib/cipher.ts) ; les chargeurs de
 *            bilans lisent la clé d'ici et se rechargent quand elle change.
 * ATTENTION — la clé ne vit que dans l'état React : jamais dans un stockage, jamais dans un
 *            journal. Changer d'enseigne l'abandonne, 15 minutes sans activité aussi (lib/idle.ts).
 *            `create`, `rekey` et `reset` prennent l'enseigne visée (Réglages montre toutes les
 *            enseignes Pro) : la session ne suit que si c'est l'enseigne active. `ready` reste faux
 *            tant que la ligne revenue_keys n'est pas lue (ou si la lecture échoue) : `status` vaut
 *            alors 'none', ne pas proposer de créer une phrase avant `ready`. La phrase peut être
 *            réinitialisée ou recréée sur un autre appareil : `verify` avant tout scellement, sinon
 *            on écrirait des chiffrés que plus personne n'ouvre. Le refus vit sur l'enseigne
 *            (entities.revenue_clear_chosen_at, lu par mes_enseignes) : il suit sur tous les appareils.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  createKey,
  isStrongPassphrase,
  keyMatches,
  resealAll,
  unlockKey,
  whichKeyOpens,
} from './cipher'
import { useAuth } from './auth'
import { isIdle } from './idle'
import { useViewTransition } from './navigation'
import { must, supabase } from './supabase'

interface RevenueKeyValue {
  status: 'none' | 'locked' | 'open'
  key: CryptoKey | null
  /** Faux tant que l'existence d'une phrase pour cette enseigne n'est pas connue. */
  ready: boolean
  /**
   * Définit la phrase de l'enseigne (l'active par défaut), ouvre la clé et la rend. Lève si la phrase
   * est trop faible.
   */
  create: (phrase: string, actorId?: string) => Promise<CryptoKey>
  /**
   * 'ok' et clé ouverte si la phrase est la bonne, 'wrong' sinon, 'reset' si la phrase a été
   * réinitialisée ailleurs entre-temps. Lève si la base ne répond pas.
   */
  unlock: (phrase: string) => Promise<'ok' | 'wrong' | 'reset'>
  /**
   * Rend le "check" de la phrase en place, à passer au scellement (seal_revenue le compare). Lève
   * une RevenueKeyError si `key` n'ouvre plus la phrase de l'enseigne (changée ailleurs).
   */
  verify: (key: CryptoKey) => Promise<string>
  /** Abandonne la clé : la phrase a changé ailleurs, il faut taper la nouvelle. */
  lock: () => void
  /**
   * Remplace la phrase de l'enseigne sans rien perdre : 'wrong' si l'ancienne n'est pas la bonne.
   * Lève une RevenueKeyError (message à montrer) si rien n'a pu être changé, une autre erreur si la
   * base ne répond pas.
   */
  rekey: (actorId: string, oldPhrase: string, newPhrase: string) => Promise<'ok' | 'wrong'>
  /** Efface la phrase ET les recettes chiffrées de l'enseigne (reset_revenue_key). */
  reset: (actorId: string) => Promise<void>
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

/** seal_revenue a refusé : la phrase a changé ailleurs depuis la vérification de la clé. */
export class PhraseChangedError extends RevenueKeyError {
  constructor() {
    super('Ta phrase a changé sur un autre appareil : tape la nouvelle.')
  }
}

/** Ce qui compte comme activité. Les minuteries d'un onglet caché ralentissent : d'où le retour visible. */
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const
const IDLE_CHECK_MS = 30_000

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
    async (phrase: string, target = actorId) => {
      if (!target) throw new Error('Aucune enseigne active')
      if (!isStrongPassphrase(phrase)) throw new Error('Phrase de passe trop faible')
      const { key, record } = await createKey(phrase)
      const { error } = await supabase.from('revenue_keys').insert({ actor_id: target, ...record })
      // Un autre appareil a posé sa phrase le premier : c'est elle qui compte, il faut la taper.
      if (error?.code === '23505') {
        setSession((s) => (s.actorId === target ? { ...s, hasRecord: true, key: null } : s))
        throw new RevenueKeyError(
          'Une phrase existe déjà pour cette enseigne : tape-la pour ouvrir tes recettes.',
        )
      }
      if (error) throw new Error(error.message)
      setSession((s) => (s.actorId === target ? { ...s, hasRecord: true, key } : s))
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
      if (record && (await keyMatches(key, record))) return record.check
      // Plus de phrase : 'none'. Une autre phrase : 'locked', il faut taper la nouvelle.
      setSession((s) =>
        s.actorId === actorId ? { ...s, hasRecord: record !== null, key: null } : s,
      )
      throw new RevenueKeyError('Ta phrase a été réinitialisée sur un autre appareil.')
    },
    [actorId],
  )

  const rekey = useCallback(async (target: string, oldPhrase: string, newPhrase: string) => {
    if (!isStrongPassphrase(newPhrase)) throw new Error('Phrase de passe trop faible')
    const response = await supabase
      .from('revenue_keys')
      .select('salt, iterations, check')
      .eq('actor_id', target)
      .maybeSingle()
    const record = must(response)
    if (!record) {
      setSession((s) => (s.actorId === target ? { ...s, hasRecord: false, key: null } : s))
      throw new RevenueKeyError('Ta phrase a été réinitialisée sur un autre appareil.')
    }
    const oldKey = await unlockKey(oldPhrase, record)
    if (!oldKey) return 'wrong'
    const rows = must(
      await supabase.from('report_secrets').select('event_id, payload').eq('actor_id', target),
    )
    const next = await createKey(newPhrase)
    const payloads = await resealAll(oldKey, rows, next.key).catch(() => {
      throw new RevenueKeyError(
        'Une de tes recettes ne s’ouvre pas avec cette phrase : rien n’a été changé.',
      )
    })
    // Une seule transaction : la nouvelle clé et tous les chiffrés, ou rien (rekey_revenue).
    const { error } = await supabase.rpc('rekey_revenue', {
      p_actor: target,
      p_salt: next.record.salt,
      p_iterations: next.record.iterations,
      p_check: next.record.check,
      p_payloads: payloads,
    })
    // La réponse a pu se perdre après l'écriture : on relit la phrase en place avant de conclure.
    if (error) {
      const reread = await supabase
        .from('revenue_keys')
        .select('check')
        .eq('actor_id', target)
        .maybeSingle()
      const opens = reread.error ? null : await whichKeyOpens(reread.data, oldKey, next.key)
      if (opens === 'old') {
        throw new RevenueKeyError(
          'La phrase n’a pas été changée : rien n’a bougé, ton ancienne phrase reste la bonne. Réessaie.',
        )
      }
      if (opens !== 'new') {
        throw new RevenueKeyError(
          'On ne sait pas si la phrase a changé : recharge la page et essaie la nouvelle, puis l’ancienne.',
        )
      }
    }
    setSession((s) => (s.actorId === target ? { ...s, hasRecord: true, key: next.key } : s))
    return 'ok' as const
  }, [])

  const lock = useCallback(() => {
    setSession((s) => (s.key ? { ...s, hasRecord: true, key: null } : s))
  }, [])

  const reset = useCallback(async (target: string) => {
    must(await supabase.rpc('reset_revenue_key', { p_actor: target }))
    setSession((s) => (s.actorId === target ? { ...s, hasRecord: false, key: null } : s))
  }, [])

  // 15 minutes sans geste dans l'onglet : la clé quitte la mémoire, les recettes se remasquent.
  const lastActivity = useRef(0)
  const open = session.key !== null
  useEffect(() => {
    if (!open) return
    lastActivity.current = Date.now()
    const touch = () => {
      lastActivity.current = Date.now()
    }
    const check = () => {
      if (isIdle(lastActivity.current, Date.now())) {
        setSession((s) => (s.key ? { ...s, key: null } : s))
      }
    }
    for (const name of ACTIVITY_EVENTS) window.addEventListener(name, touch, { passive: true })
    document.addEventListener('visibilitychange', check)
    const timer = window.setInterval(check, IDLE_CHECK_MS)
    return () => {
      for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, touch)
      document.removeEventListener('visibilitychange', check)
      window.clearInterval(timer)
    }
  }, [open])

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
      lock,
      rekey,
      reset,
      clearChosen: session.clearChosen || Boolean(entity?.revenue_clear_chosen_at),
      keepClear,
    }),
    [session, entity, create, unlock, verify, lock, rekey, reset, keepClear],
  )

  return <RevenueKeyContext.Provider value={value}>{children}</RevenueKeyContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- le fournisseur et son hook vivent ensemble
export function useRevenueKey() {
  const context = useContext(RevenueKeyContext)
  if (!context) throw new Error('useRevenueKey doit être utilisé dans un <RevenueKeyProvider>')
  return context
}
