/**
 * QUOI     — l'encadré « Il manquait cette info » autour d'un champ, qui se place à l'écran et
 *            prend le focus.
 * POURQUOI — maquette 2117:2 (lot 10c) : « + Ajouter » sur la fiche ouvre la modification sur le
 *            champ manquant ; on doit le trouver sans le chercher.
 */
import { Sparkles } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

export function MissingHighlight({ on, children }: { on: boolean; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!on) return
    box.current?.scrollIntoView({ block: 'center' })
    box.current?.querySelector<HTMLElement>('input, textarea')?.focus({ preventScroll: true })
  }, [on])

  if (!on) return <>{children}</>
  return (
    <div className="field-missing" ref={box}>
      <p className="field-missing__note">
        <Sparkles size={14} strokeWidth={1.8} />
        Il manquait cette info — merci de compléter la fiche pour tous
      </p>
      {children}
    </div>
  )
}
