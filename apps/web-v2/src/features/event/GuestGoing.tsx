/**
 * QUOI     — sur la fiche vue sans compte : les visages de ceux qui y vont, « 12 exposants y vont »,
 *            puis « Voir qui, avec ton compte gratuit ».
 * POURQUOI — maquette 2506:233 (25/10/2026) : des visages, pas des métiers ; les noms attendent le
 *            compte gratuit.
 * ATTENTION — les visages viennent d'apercu_fiche : inscrits en public seulement, six au plus.
 */
import { ArrowRight } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { goingCount, hiddenFaces } from '@/lib/apercu'
import { loginReturning } from '@/lib/welcome'

export function GuestGoing({ going, faces }: { going: number; faces: string[] }) {
  const { pathname } = useLocation()
  const count = goingCount(going)
  if (!count) return null
  const hidden = hiddenFaces(going, faces.length)

  return (
    <section className="guest-going">
      <div className="guest-going__top">
        {faces.length > 0 && (
          <span className="guest-going__faces" aria-hidden="true">
            {faces.map((url) => (
              <img key={url} className="guest-going__face" src={url} alt="" />
            ))}
            {hidden > 0 && <span className="guest-going__more">+{hidden}</span>}
          </span>
        )}
        <h2 className="guest-going__count">{count}</h2>
      </div>
      <Link className="guest-going__link" to={loginReturning(pathname)}>
        Voir qui, avec ton compte gratuit
        <ArrowRight size={13} strokeWidth={2} />
      </Link>
    </section>
  )
}
