/**
 * QUOI     — « Ils en parlent mieux que nous » : le bouton flottant de la landing, avec trois
 *            visages, qui ouvre les stories des témoignages.
 * POURQUOI — Uriel, 14/10/2026 (maquette 2332:2) : plutôt qu'une bande de plus dans la lecture, un
 *            bouton qu'on ouvre quand on veut ; la page finit sur les prix puis le pied de page.
 * ATTENTION — les stories ont leur adresse (`?temoignage=<n>`) : le retour du navigateur les ferme
 *            sans quitter la landing, comme la popup « Qui y va » (features/event/Companions.tsx).
 */
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import type { Testimonial } from '@/lib/testimonials'
import { StoryDialog } from './StoryDialog'

const PARAM = 'temoignage'
const OPENED_HERE = 'temoignages-ouverts'
const FACES = 3

export function Stories({ testimonials }: { testimonials: Testimonial[] }) {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const raw = params.get(PARAM)
  const person = raw === null ? null : Number(raw)
  const open = person !== null && testimonials[person] !== undefined

  if (testimonials.length === 0) return null

  function show() {
    const next = new URLSearchParams(params)
    next.set(PARAM, '0')
    setParams(next, { state: OPENED_HERE })
  }

  /** Changer d'exposant remplace l'adresse : le retour ferme les stories d'un coup. */
  function follow(index: number) {
    const next = new URLSearchParams(params)
    next.set(PARAM, String(index))
    setParams(next, {
      replace: true,
      state: location.state === OPENED_HERE ? OPENED_HERE : null,
    })
  }

  function hide() {
    if (location.state === OPENED_HERE) {
      void navigate(-1)
      return
    }
    const next = new URLSearchParams(params)
    next.delete(PARAM)
    setParams(next, { replace: true })
  }

  return (
    <>
      <button type="button" className="landing-stories-button" onClick={show}>
        <span className="landing-stories-button__faces">
          {testimonials.slice(0, FACES).map((t) => (
            <span key={t.id} className="landing-stories-ring">
              <Avatar src={t.avatarUrl} name={t.name} />
            </span>
          ))}
        </span>
        Ils en parlent mieux que nous
      </button>
      <StoryDialog
        testimonials={testimonials}
        person={open ? person : null}
        onPerson={follow}
        onClose={hide}
      />
    </>
  )
}
