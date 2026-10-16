/**
 * QUOI     — la page publique de désinscription des e-mails de prospection (`/desinscription?t=…`).
 * POURQUOI — le lien « Se désinscrire » de chaque e-mail y mène (via la fonction
 *            prospect-unsubscribe, qui redirige) : un bouton, puis la confirmation.
 * ATTENTION — un bouton plutôt qu'une désinscription à l'ouverture : les antivirus des messageries
 *            suivent les liens tout seuls. Aucune information sur le prospect n'est affichée.
 */
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Wordmark } from '@/components/ui/Wordmark'
import { supabase } from '@/lib/supabase'

type Step = 'ask' | 'busy' | 'done' | 'failed'

export function Unsubscribe() {
  const [search] = useSearchParams()
  const token = search.get('t') ?? ''
  const [step, setStep] = useState<Step>('ask')

  async function confirm() {
    setStep('busy')
    const response = await supabase.functions.invoke<{ done: true }>('prospect-unsubscribe', {
      body: { token },
    })
    setStep(response.error ? 'failed' : 'done')
  }

  return (
    <main className="unsubscribe">
      <div className="unsubscribe__card">
        <Wordmark className="unsubscribe__logo" />
        {step === 'done' ? (
          <p className="unsubscribe__title">C’est fait : tu ne recevras plus nos e-mails.</p>
        ) : (
          <>
            <p className="unsubscribe__title">Tu ne veux plus recevoir nos e-mails ?</p>
            {step === 'failed' && (
              <p className="unsubscribe__problem">
                La désinscription n’a pas abouti : le lien n’est peut-être plus valable. Réessaie,
                ou réponds simplement à l’e-mail.
              </p>
            )}
            <Button variant="action" onClick={() => void confirm()} disabled={step === 'busy'}>
              {step === 'busy' ? 'Un instant…' : 'Me désinscrire'}
            </Button>
          </>
        )}
      </div>
    </main>
  )
}
