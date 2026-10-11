/**
 * QUOI     — écrire un morceau du profil (`users`) puis relire l'identité, et dire si c'est passé.
 * POURQUOI — lot 9b : « Chaque changement s'enregistre aussitôt ». Après écriture, la barre latérale
 *            (nom, photo) se met à jour par reloadIdentity.
 */
import { useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

export type UserPatch = Pick<
  Database['public']['Tables']['users']['Update'],
  'display_name' | 'city' | 'postal_code' | 'sex' | 'avatar_url'
>

export type SaveState = 'idle' | 'saved' | 'failed'

export function useProfileSave() {
  const { user, reloadIdentity } = useAuth()
  return useCallback(
    async (patch: UserPatch): Promise<boolean> => {
      if (!user) return false
      const { error } = await supabase.from('users').update(patch).eq('actor_id', user.id)
      if (error) return false
      await reloadIdentity()
      return true
    },
    [user, reloadIdentity],
  )
}
