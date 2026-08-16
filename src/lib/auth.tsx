import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Actor, EntityRow, EntityType, UserRow } from '@/types/database'

/** Libellé affiché sous le nom, dans la carte de compte. */
const ENTITY_ROLE_LABEL: Record<EntityType, string> = {
  exposant: 'Compte exposant',
  festival: 'Compte festival',
  entreprise: 'Compte entreprise',
}

const STORED_ACTOR_KEY = 'flwsh-actor-id'

function readStoredActorId(): string | null {
  try {
    return localStorage.getItem(STORED_ACTOR_KEY)
  } catch {
    return null
  }
}

function writeStoredActorId(id: string | null) {
  try {
    if (id) localStorage.setItem(STORED_ACTOR_KEY, id)
    else localStorage.removeItem(STORED_ACTOR_KEY)
  } catch {
    /* stockage indisponible : on garde l'acteur en mémoire seulement */
  }
}

function toActor(row: UserRow | EntityRow, kind: 'person' | 'entity'): Actor {
  if (kind === 'entity') {
    const entity = row as EntityRow
    return {
      id: entity.actor_id,
      kind: 'entity',
      label: entity.brand_name,
      avatarUrl: entity.avatar_url,
      roleLabel: ENTITY_ROLE_LABEL[entity.type],
    }
  }
  const person = row as UserRow
  return {
    id: person.actor_id,
    kind: 'person',
    label: person.display_name ?? person.email,
    avatarUrl: person.avatar_url,
    roleLabel: 'Compte personnel',
  }
}

interface AuthContextValue {
  user: User | null
  session: Session | null
  person: UserRow | null
  entities: EntityRow[]
  /** Acteur actif : la première enseigne par défaut, sinon la personne. */
  actor: Actor | null
  actors: Actor[]
  switchActor: (actorId: string) => void
  /** Vrai tant que la session initiale n'a pas été résolue. */
  loading: boolean
  signIn: (email: string) => Promise<{ error: Error | null }>
  verifyOtp: (email: string, token: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [person, setPerson] = useState<UserRow | null>(null)
  const [entities, setEntities] = useState<EntityRow[]>([])
  const [actorId, setActorId] = useState<string | null>(readStoredActorId)
  const [loading, setLoading] = useState(true)

  const loadIdentity = useCallback(async (authUid: string) => {
    const { data: personRow } = await supabase
      .from('users')
      .select('*')
      .eq('actor_id', authUid)
      .maybeSingle()
    setPerson((personRow as UserRow) ?? null)

    // Le TRI est indispensable : sans lui, Postgres rend les lignes dans un
    // ordre arbitraire qui peut changer d'un appel à l'autre. Comme l'acteur
    // par défaut est « le premier de la liste » et que l'identité est
    // rechargée plusieurs fois par Supabase, l'app basculait silencieusement
    // d'une enseigne à l'autre — et le tableau de bord se vidait tout seul.
    const { data: memberships } = await supabase
      .from('memberships')
      .select('created_at, entities(*)')
      .eq('user_actor_id', authUid)
      .order('created_at', { ascending: true })
    const rows = (memberships ?? []) as unknown as Array<{ entities: EntityRow | null }>
    setEntities(rows.map((r) => r.entities).filter((e): e is EntityRow => Boolean(e)))
  }, [])

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      if (nextSession?.user) {
        void loadIdentity(nextSession.user.id)
      } else {
        setPerson(null)
        setEntities([])
      }
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [loadIdentity])

  const actors = useMemo<Actor[]>(() => {
    const list: Actor[] = entities.map((e) => toActor(e, 'entity'))
    if (person) list.push(toActor(person, 'person'))
    return list
  }, [entities, person])

  const actor = useMemo<Actor | null>(
    () => actors.find((a) => a.id === actorId) ?? actors[0] ?? null,
    [actors, actorId],
  )

  // Une fois l'acteur résolu, on le grave : la prochaine visite reprendra le
  // même, quoi qu'il arrive à l'ordre des enseignes.
  useEffect(() => {
    if (actor && !actorId) writeStoredActorId(actor.id)
  }, [actor, actorId])

  const switchActor = useCallback((id: string) => {
    setActorId(id)
    writeStoredActorId(id)
  }, [])

  const signIn = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })
    return { error: error as Error | null }
  }, [])

  const verifyOtp = useCallback(async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
    return { error: error as Error | null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut({ scope: 'local' })
    setPerson(null)
    setEntities([])
    setActorId(null)
    writeStoredActorId(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      person,
      entities,
      actor,
      actors,
      switchActor,
      loading,
      signIn,
      verifyOtp,
      signOut,
    }),
    [
      user,
      session,
      person,
      entities,
      actor,
      actors,
      switchActor,
      loading,
      signIn,
      verifyOtp,
      signOut,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth doit être utilisé dans un <AuthProvider>')
  return context
}
