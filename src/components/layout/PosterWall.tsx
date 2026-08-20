import { useCallback, useState } from 'react'
import { usePageChrome } from '@/lib/page-chrome'

/**
 * LE MUR D'AFFICHE — le bord droit de l'écran, du haut au bas.
 *
 * Dans le monde d'un exposant, l'affiche EST l'artefact : c'est ce qu'il
 * regarde pour dire oui à une date. En vignette de deux cents pixels elle
 * n'était qu'une décoration ; en mur, elle porte l'identité de la date.
 *
 * Elle est NETTE. Elle a été floue un temps, pour masquer les petits JPEG
 * récupérés sur Facebook — Uriel a tranché l'inverse : on montre l'affiche
 * telle que l'organisateur l'a faite.
 *
 * ATTENTION SI ON REVIENT AU FLOU : pas avec `filter: blur()`. Son coût suit
 * la taille AFFICHÉE, pas la source, et flouter 737 x 1291 se repaie à chaque
 * image — assez pour figer le moteur de rendu. Il faut passer par un canevas
 * basse définition ré-agrandi, dont le lissage fait le flou gratuitement.
 *
 * Ce composant a un temps relevé les couleurs dominantes de l'affiche dans un
 * canevas, pour teinter le voile et le fond d'attente. Les deux ont changé de
 * main depuis — le voile est un brun à plat, le fond est celui du panneau —
 * et plus rien ne lisait ces couleurs. Un canevas par affiche pour un résultat
 * que personne ne regarde est pire que pas de canevas du tout.
 */
export function PosterWall() {
  const { poster } = usePageChrome()
  // L'affiche dont l'image est arrivée. C'est ELLE qui déclenche la glissade,
  // et non le chargement de la page : l'affiche vient après la requête, et un
  // cadre qui glisse puis se remplit est précisément ce qui fait bricolé.
  const [arrivee, setArrivee] = useState<string | null>(null)

  // L'AFFICHE QUE LE MUR TIENT ENCORE. Elle SURVIT à la page qui l'a
  // déclarée, le temps de repartir par la droite.
  //
  // Le mur suivait la déclaration au pixel près : elle tombait, il
  // disparaissait. On ne pouvait donc pas le faire sortir — au moment où il
  // aurait fallu l'animer, il n'était déjà plus là. La photographie du
  // navigateur ne rattrapait rien : mesuré, l'état reposé par le nettoyage
  // n'est rendu qu'APRÈS le `flushSync`, donc le mur était présent sur les
  // DEUX photos, et l'ancienne glissait sous la nouvelle restée immobile.
  //
  // Il tient donc son affiche lui-même, et ne la lâche qu'une fois sorti.
  const [tenue, setTenue] = useState<string | null>(poster)
  const [precedent, setPrecedent] = useState<string | null>(poster)
  const [sort, setSort] = useState(false)

  // État dérivé d'une prop : ajusté PENDANT le rendu, pas dans un effet — le
  // patron React, et pas de rendu de trop.
  if (poster !== precedent) {
    setPrecedent(poster)
    if (poster) {
      // Une nouvelle affiche annule une sortie en cours : on ne fait pas
      // partir un mur qu'on est en train de remplir.
      setTenue(poster)
      setSort(false)
    } else if (tenue) {
      setSort(true)
    }
  }

  // La sortie est finie : le mur peut enfin lâcher. On ne lit QUE sa propre
  // animation — celles de l'affiche et du voile remontent jusqu'ici, et la
  // fin de la glissade d'entrée démonterait le mur à peine arrivé.
  const finirSortie = useCallback((nom: string) => {
    if (nom !== 'mur-sort') return
    setTenue(null)
    setSort(false)
  }, [])

  const noter = useCallback((image: HTMLImageElement | null) => {
    if (!image?.src) return
    // `complete` couvre l'image DÉJÀ EN CACHE : la balise est alors montée
    // chargée et `onLoad` peut ne jamais se déclencher.
    if (!image.complete || !image.naturalWidth) return
    setArrivee(image.src)
  }, [])

  // Une image en ERREUR compte comme arrivée : le voile entre sur le cadre,
  // qui reste vide. Sans ça, une URL cassée le laisserait hors champ pour
  // toujours.
  const echouer = useCallback((source: string) => setArrivee(source), [])

  if (!tenue) return null

  const classes = ['poster-wall']
  if (arrivee === tenue) classes.push('poster-wall--entre')
  if (sort) classes.push('poster-wall--sort')

  return (
    <aside
      className={classes.join(' ')}
      aria-hidden="true"
      onAnimationEnd={(evenement) => finirSortie(evenement.animationName)}
    >
      <img
        className="poster-wall__image"
        src={tenue}
        alt=""
        ref={noter}
        onLoad={(evenement) => noter(evenement.currentTarget)}
        onError={(evenement) => echouer(evenement.currentTarget.src)}
      />
      <div className="poster-wall__veil" />
    </aside>
  )
}
