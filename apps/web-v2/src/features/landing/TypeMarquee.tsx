/**
 * QUOI     — le défilé des catégories sous l'accroche : chaque type de festival dans ses couleurs,
 *            en continu, avec un fondu sur les bords.
 * POURQUOI — maquette 2112:2 ; les tags se montrent toujours en couleur (décision du 07/10/2026).
 *            La liste et les couleurs viennent de la table `tags` : ce sont des DONNÉES, d'où le
 *            seul `style` du composant, en variables CSS.
 * ATTENTION — la liste est rendue deux fois pour boucler sans saut ; la copie est cachée aux
 *            lecteurs d'écran. Le défilé s'arrête au survol et se fige sous
 *            `prefers-reduced-motion`. Un clic mène à la connexion jusqu'au lot 11b.
 */
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { categoryIcon } from '@/lib/category-icons'
import type { TagRow } from '@/lib/tags'

function Chips({ tags, hidden }: { tags: TagRow[]; hidden: boolean }) {
  return (
    <ul className="landing-marquee__list" aria-hidden={hidden || undefined}>
      {tags.map((tag) => {
        const Icon = categoryIcon([tag.name, tag.slug])
        return (
          <li key={tag.slug}>
            <Link
              className="landing-marquee__chip"
              to="/connexion"
              tabIndex={hidden ? -1 : undefined}
              style={{ '--tag-bg': tag.bgColor, '--tag-ink': tag.textColor } as CSSProperties}
            >
              <Icon size={15} strokeWidth={1.75} aria-hidden />
              {tag.name}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export function TypeMarquee({ tags }: { tags: TagRow[] }) {
  if (tags.length === 0) return null
  return (
    <div className="landing-marquee">
      <div className="landing-marquee__track">
        <Chips tags={tags} hidden={false} />
        <Chips tags={tags} hidden />
      </div>
    </div>
  )
}
