/**
 * QUOI     — le client Supabase unique de la V2, typé par types/supabase.ts.
 * POURQUOI — même projet et même clé de session que la V1 : c'est ce qui partage la connexion.
 * ATTENTION — lève sans VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (.env racine ; valeurs
 *            factices dans vitest.config.ts pour les tests).
 */
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variables Supabase manquantes (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
