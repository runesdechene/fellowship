/**
 * QUOI     — la barre des sujets, en haut du tableau de bord (maquette Story, 2727:291) :
 *            « Toi » pour lancer un sujet, puis un avatar par sujet ouvert, l'anneau à la
 *            couleur du festival, le nombre de participants. Le mot ne s'affiche pas : on
 *            touche pour découvrir, comme une story (Uriel, 04/11/2026).
 * POURQUOI — les exposants ne savaient pas à qui écrire pour parler d'un festival (Uriel,
 *            04/11/2026) : le sujet se lance et se lit au premier coup d'œil.
 * ATTENTION — elle ne vit que sur le tableau de bord (Uriel, 04/11/2026). Ouvrir un sujet ou en lancer un passe par l'adresse
 *            (`?discussion=`, `?sujet=nouveau`) : le retour du navigateur les referme.
 */
import type { CSSProperties } from 'react'
import { Play, Plus, User } from 'lucide-react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { OfficialBadge } from '@/components/ui/OfficialBadge'
import { useAuth } from '@/lib/auth'
import { conversationTone } from '@/lib/discussions'
import { officialFirst } from '@/lib/officials'
import { useOfficials } from '@/lib/useOfficials'
import type { StorySujet } from '@/lib/discussion-api'
import { useTagStyles } from '@/lib/useTagStyles'
import { useMediaUrls, useStoryBar } from './useDiscussions'

export const DISCUSSION_PARAM = 'discussion'
export const NEW_SUJET_PARAM = 'sujet'

export function StoryBar() {
  const { actor } = useAuth()
  const { pathname } = useLocation()
  const bar = useStoryBar()
  const styles = useTagStyles()
  const officials = useOfficials()
  const [params, setParams] = useSearchParams()
  // Les sujets d'un compte officiel passent toujours en tête, juste après « Toi ».
  const sujets = officialFirst(
    bar.status === 'ready' ? bar.value : [],
    (sujet) => sujet.created_by,
    officials,
  )
  const urls = useMediaUrls(
    sujets.map((sujet) => (sujet.media_kind === 'image' ? sujet.media_path : null)),
  )

  // Une barre qui n'a pas pu se charger se tait plutôt que de prétendre qu'il n'y a aucun sujet.
  if (!actor || pathname !== '/' || bar.status === 'failed') return null

  const open = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    next.set(key, value)
    setParams(next)
  }

  return (
    <nav className="story-bar" aria-label="Sujets du moment">
      <ul className="story-bar__list">
        <li>
          <button
            type="button"
            className="story story--new"
            onClick={() => open(NEW_SUJET_PARAM, 'nouveau')}
            aria-label="Lancer un sujet"
          >
            <span className="story__ring">
              <Avatar className="story__face" src={actor.avatarUrl} name={actor.label} />
              <span className="story__plus" aria-hidden="true">
                <Plus size={13} strokeWidth={3} />
              </span>
            </span>
            <span className="story__name">Toi</span>
          </button>
        </li>
        {sujets.map((sujet) => (
          <li key={sujet.id}>
            <SujetButton
              sujet={sujet}
              mine={sujet.created_by === actor.id}
              official={officials.has(sujet.created_by)}
              ring={conversationTone(styles, sujet.event_tags)?.bgColor ?? null}
              photo={sujet.media_path ? (urls.get(sujet.media_path) ?? null) : null}
              onOpen={() => open(DISCUSSION_PARAM, sujet.id)}
            />
          </li>
        ))}
      </ul>
    </nav>
  )
}

interface SujetButtonProps {
  sujet: StorySujet
  mine: boolean
  /** Un compte officiel : l'anneau au dégradé de la marque, avec son halo (maquette 2835:893). */
  official: boolean
  ring: string | null
  photo: string | null
  onOpen: () => void
}

/** Un sujet : sa photo prend la place du visage dans l'anneau (Uriel, 04/11/2026). */
function SujetButton({ sujet, mine, official, ring, photo, onOpen }: SujetButtonProps) {
  const classes = ['story']
  if (official) classes.push('story--official')
  else if (sujet.seen && !mine) classes.push('story--seen')
  if (!ring) classes.push('story--plain')
  const name = mine ? 'Toi' : sujet.author_label
  return (
    <button
      type="button"
      className={classes.join(' ')}
      // La couleur vient de la catégorie du festival, réglée en base : seule variable permise.
      style={ring ? ({ '--story-ring-color': ring } as CSSProperties) : undefined}
      onClick={onOpen}
      aria-label={`${name} : ${sujet.mot}`}
    >
      <span className="story__ring">
        <Avatar
          className="story__face"
          src={photo ?? sujet.author_avatar}
          name={sujet.author_label}
        />
        {sujet.media_kind === 'video' && (
          <span className="story__play" aria-hidden="true">
            <Play size={10} fill="currentColor" />
          </span>
        )}
        <span className="story__count" title={`${String(sujet.participants)} dans la discussion`}>
          <User size={10} strokeWidth={2.6} aria-hidden="true" />
          {sujet.participants}
        </span>
      </span>
      <span className="story__name">
        {name}
        {!mine && <OfficialBadge actorId={sujet.created_by} />}
      </span>
    </button>
  )
}
