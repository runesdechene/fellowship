import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type Status = 'idle' | 'submitting' | 'success' | 'error'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function useWaitlist() {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  async function submit(email: string) {
    const trimmed = email.trim()
    if (!EMAIL_RE.test(trimmed)) {
      setError('Adresse email invalide.')
      setStatus('error')
      return
    }
    setStatus('submitting')
    setError(null)
    // La table organizer_waitlist n'est pas dans les types générés → cast (précédent projet).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase as any)
      .from('organizer_waitlist')
      .insert({ email: trimmed, source: 'landing' })
    if (insertError) {
      // 23505 = violation d'unicité : déjà inscrit, on traite comme un succès silencieux.
      if (insertError.code === '23505') {
        setStatus('success')
        return
      }
      setError('Une erreur est survenue. Réessaie dans un instant.')
      setStatus('error')
      return
    }
    setStatus('success')
  }

  return { status, error, submit }
}
