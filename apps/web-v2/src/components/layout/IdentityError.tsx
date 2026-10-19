/**
 * QUOI     — l'écran qui remplace l'app quand le compte n'a pas pu se charger, et « Réessayer ».
 * POURQUOI — chantier 4 (19/10/2026) : sans lui, une coupure au chargement montrait un compte sans
 *            enseigne — tableau de bord vide, et l'arrivée proposait d'en créer une deuxième.
 */
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/auth'

export function IdentityError() {
  const { reloadIdentity } = useAuth()
  const [trying, setTrying] = useState(false)

  return (
    <div className="identity-error" role="alert">
      <p className="identity-error__text">Ton compte n’a pas pu se charger.</p>
      <Button
        variant="action"
        disabled={trying}
        onClick={() => {
          setTrying(true)
          void reloadIdentity().finally(() => {
            setTrying(false)
          })
        }}
      >
        {trying ? 'Un instant…' : 'Réessayer'}
      </Button>
    </div>
  )
}
