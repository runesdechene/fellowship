/**
 * QUOI     — les types de l'environnement Vite : variables VITE_*, version injectée au build.
 * POURQUOI — sans eux, import.meta.env et __APP_VERSION__ ne seraient pas typés.
 */
/// <reference types="vite/client" />

declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** La clé publique VAPID des notifications sur le téléphone (lot 8e). */
  readonly VITE_VAPID_PUBLIC_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
