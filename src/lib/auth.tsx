import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile, UserRow, EntityRow } from '@/types/database'
import {
  pickCurrentActor, deriveNeedsOnboarding, readStoredActorId, writeStoredActorId,
  actorCan, type ActorView, type ActorAction,
} from './actorModel'

interface AuthContextType {
  user: User | null
  session: Session | null
  // Nouveau modèle (acteurs)
  person: UserRow | null
  entities: EntityRow[]
  currentActor: ActorView | null      // acteur actif (personne par défaut)
  currentActorRow: UserRow | EntityRow | null
  switchActor: (actorId: string | null) => void
  can: (action: ActorAction) => boolean
  // Rétro-compat : ligne `profiles` legacy, lue par les pages non encore recâblées (→ Plan 3).
  profile: Profile | null
  loading: boolean
  /** true tant que fetchProfile+fetchIdentity n'ont pas tous deux résolu pour la session
   *  courante. Découplé de `loading` (qui ne couvre que le boot session Supabase) et
   *  utilisé par AdminRoute pour ne pas éjecter un admin avant que son rôle soit chargé. */
  identityLoading: boolean
  signIn: (email: string) => Promise<{ error: Error | null }>
  verifyOtp: (email: string, token: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  needsOnboarding: boolean
  isAdmin: boolean
  // Debug admin : force le plan perçu de l'entité active (pur client, n'écrit rien en base).
  planOverride: PlanOverride
  setPlanOverride: (v: PlanOverride) => void
}

type PlanOverride = 'pro' | 'free' | null
const PLAN_OVERRIDE_KEY = 'debug-plan-override'
function readPlanOverride(): PlanOverride {
  try {
    const v = localStorage.getItem(PLAN_OVERRIDE_KEY)
    return v === 'pro' || v === 'free' ? v : null
  } catch { return null }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [person, setPerson] = useState<UserRow | null>(null)
  const [entities, setEntities] = useState<EntityRow[]>([])
  const [currentActorId, setCurrentActorId] = useState<string | null>(readStoredActorId())
  const [loading, setLoading] = useState(true)
  const [identityLoading, setIdentityLoading] = useState(false)
  const [planOverride, setPlanOverrideState] = useState<PlanOverride>(() => readPlanOverride())

  const setPlanOverride = (v: PlanOverride) => {
    setPlanOverrideState(v)
    try {
      if (v) localStorage.setItem(PLAN_OVERRIDE_KEY, v)
      else localStorage.removeItem(PLAN_OVERRIDE_KEY)
    } catch { /* ignore */ }
  }

  const switchActor = (id: string | null) => {
    setCurrentActorId(id)
    writeStoredActorId(id)
  }

  // Legacy : ligne profiles (rétro-compat tant que les pages ne sont pas recâblées).
  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)
    return data
  }

  // Nouveau modèle : la personne + ses entités (via memberships).
  const fetchIdentity = async (authUid: string) => {
    const { data: u } = await supabase.from('users').select('*').eq('actor_id', authUid).single()
    setPerson((u as UserRow) ?? null)
    const { data: ms } = await supabase
      .from('memberships')
      .select('entity_actor_id, entities(*)')
      .eq('user_actor_id', authUid)
    const rows = (ms ?? []) as unknown as Array<{ entities: EntityRow | null }>
    setEntities(rows.map(r => r.entities).filter((e): e is EntityRow => !!e))
  }

  const refreshProfile = async () => {
    if (user) await Promise.all([fetchProfile(user.id), fetchIdentity(user.id)])
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          // identityLoading reste vrai jusqu'à ce que les DEUX fetchs aient résolu
          // (succès ou échec). Sans ça, AdminRoute ne savait pas si `isAdmin=false`
          // signifie « pas admin » ou « rôle pas encore lu » → bandaid timer 1.5s.
          setIdentityLoading(true)
          Promise.allSettled([
            fetchProfile(session.user.id),
            fetchIdentity(session.user.id),
          ]).finally(() => setIdentityLoading(false))
        } else {
          setProfile(null)
          setPerson(null)
          setEntities([])
          setIdentityLoading(false)
        }

        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    return { error: error as Error | null }
  }

  const verifyOtp = async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
    return { error: error as Error | null }
  }

  const signOut = async () => {
    await supabase.auth.signOut({ scope: 'local' })
    setProfile(null)
    setPerson(null)
    setEntities([])
    switchActor(null)
  }

  const toView = (row: UserRow | EntityRow | null, kind: 'person' | 'entity'): ActorView | null =>
    row && {
      id: (row as { actor_id: string }).actor_id,
      kind,
      entityType: kind === 'entity' ? (row as EntityRow).type : null,
      label: kind === 'entity' ? (row as EntityRow).brand_name : (row as UserRow).display_name,
      hasName: kind === 'person' ? !!(row as UserRow).display_name : true,
    }

  const personView = toView(person, 'person')
  const entityViews = entities
    .map(e => toView(e, 'entity'))
    .filter((v): v is ActorView => !!v)
  const currentActor = personView ? pickCurrentActor(personView, entityViews, currentActorId) : null
  const rawActorRow = currentActor?.kind === 'entity'
    ? entities.find(e => e.actor_id === currentActor.id) ?? null
    : person
  const can = (action: ActorAction) => (currentActor ? actorCan(currentActor, action) : false)

  // Garde anti-flash : on attend que `person` soit chargée avant de router vers l'onboarding.
  const needsOnboarding = !!user && person !== null && deriveNeedsOnboarding(personView)
  // Fallback chain comme pour avatar_url : le rôle admin peut vivre côté profiles (legacy)
  // ou côté users (nouveau modèle). Même bug que pour l'avatar — un admin restait bloqué
  // hors de /admin si son rôle vivait dans profiles.
  const isAdmin = person?.role === 'admin' || profile?.role === 'admin'

  // Debug admin : surcharge du plan perçu de l'entité active (n'écrit rien en base).
  const currentActorRow = (isAdmin && planOverride && currentActor?.kind === 'entity' && rawActorRow)
    ? { ...(rawActorRow as EntityRow), plan: planOverride }
    : rawActorRow

  return (
    <AuthContext.Provider
      value={{
        user, session,
        person, entities, currentActor, currentActorRow, switchActor, can,
        profile, loading, identityLoading, signIn, verifyOtp, signOut, refreshProfile, needsOnboarding, isAdmin,
        planOverride, setPlanOverride,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
