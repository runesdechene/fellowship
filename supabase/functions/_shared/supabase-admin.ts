// Client Supabase service-role : bypass RLS pour les writes Stripe (webhook).
// Bypass aussi le trigger protect_entity_plan (condition: auth.uid() IS NOT NULL),
// donc la service-role est la SEULE voie autorisée à écrire `entities.plan`.
// À utiliser uniquement dans les edge functions de confiance, jamais exposée au client.
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'

let _admin: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (_admin) return _admin
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars are required')
  _admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return _admin
}
