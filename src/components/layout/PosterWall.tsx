import { useCallback, useState, type CSSProperties } from 'react'
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
 */

/** Les trois bandes moyennes de l'affiche, relevées à son chargement. */
type Teintes = {
  /** L'affiche qui les a produites — elles ne valent que pour elle. */
  pour: string
  haut: string
  milieu: string
  bas: string
}

/** Combien de pixels de large on échantillonne. Assez pour la dominante. */
const ECHANTILLON = 24

/**
 * On dessine l'affiche dans un canevas minuscule et on moyenne trois bandes.
 * Aucune couleur n'est écrite en dur : une affiche nocturne donne un mur
 * sombre, un marché de printemps un mur clair. C'est ce qui rend le voile
 * utilisable sur toutes les dates et pas seulement sur une.
 *
 * L'affiche vient du stockage Supabase, donc d'un autre domaine : sans
 * en-tête CORS le canevas est teinté et la lecture jette. Ce n'est pas une
 * panne, c'est un cas à couvrir — on garde alors le repli du CSS.
 */
function releverLesTeintes(image: HTMLImageElement, pour: string): Teintes | null {
  if (!image.naturalWidth) return null

  const hauteur = Math.max(
    3,
    Math.round((ECHANTILLON * image.naturalHeight) / image.naturalWidth),
  )
  const toile = document.createElement('canvas')
  toile.width = ECHANTILLON
  toile.height = hauteur
  const dessin = toile.getContext('2d', { willReadFrequently: true })
  if (!dessin) return null
  dessin.drawImage(image, 0, 0, ECHANTILLON, hauteur)

  let pixels: Uint8ClampedArray
  try {
    pixels = dessin.getImageData(0, 0, ECHANTILLON, hauteur).data
  } catch {
    return null
  }

  const bande = (debut: number, fin: number): string => {
    let rouge = 0
    let vert = 0
    let bleu = 0
    let compte = 0
    for (let y = debut; y < fin; y += 1) {
      for (let x = 0; x < ECHANTILLON; x += 1) {
        const i = (y * ECHANTILLON + x) * 4
        rouge += pixels[i]
        vert += pixels[i + 1]
        bleu += pixels[i + 2]
        compte += 1
      }
    }
    if (!compte) return 'rgb(74 70 67)'
    return `rgb(${Math.round(rouge / compte)} ${Math.round(vert / compte)} ${Math.round(
      bleu / compte,
    )})`
  }

  const tiers = hauteur / 3
  return {
    pour,
    haut: bande(0, Math.floor(tiers)),
    milieu: bande(Math.floor(tiers), Math.floor(tiers * 2)),
    bas: bande(Math.floor(tiers * 2), hauteur),
  }
}

export function PosterWall() {
  const { poster } = usePageChrome()
  const [teintes, setTeintes] = useState<Teintes | null>(null)
  // L'affiche dont l'image est arrivee. C'est ELLE qui declenche l'entree du
  // mur, et non le chargement de la page : l'affiche vient apres la requete,
  // et un rectangle brun qui glisse puis se remplit fait bricolé.
  const [arrivee, setArrivee] = useState<string | null>(null)

  const lire = useCallback((image: HTMLImageElement | null) => {
    if (!image?.src) return
    // `complete` couvre l'image DEJA EN CACHE : la balise est alors montee
    // chargee et `onLoad` peut ne jamais se declencher.
    if (!image.complete || !image.naturalWidth) return
    setArrivee(image.src)
    const relevees = releverLesTeintes(image, image.src)
    if (relevees) setTeintes(relevees)
  }, [])

  // Une image en ERREUR compte comme arrivee : le mur entre avec son fond
  // seul. Sans ca, une URL cassee le laisserait cache pour toujours.
  const echouer = useCallback((source: string) => setArrivee(source), [])

  if (!poster) return null

  // Des teintes ne valent que pour l'affiche qui les a produites : sans ce
  // contrôle, passer d'une date à l'autre garderait les couleurs de la
  // précédente le temps du chargement.
  const pretes = teintes && teintes.pour === poster ? teintes : null

  // Le seul style écrit depuis un `.tsx` du projet, et il ne fixe aucune
  // apparence : il passe à la couche 3 trois valeurs qu'elle ne peut pas
  // connaître, parce qu'elles sont lues dans l'image au chargement.
  const couleurs = pretes
    ? ({
        '--wall-haut': pretes.haut,
        '--wall-milieu': pretes.milieu,
        '--wall-bas': pretes.bas,
      } as CSSProperties)
    : undefined

  return (
    <aside
      className={arrivee === poster ? 'poster-wall poster-wall--entre' : 'poster-wall'}
      style={couleurs}
      aria-hidden="true"
    >
      <img
        className="poster-wall__image"
        src={poster}
        alt=""
        // À poser sur la balise elle-même, sinon le canevas sera teinté et
        // les couleurs du voile retomberont sur leur repli.
        crossOrigin="anonymous"
        ref={lire}
        onLoad={(evenement) => lire(evenement.currentTarget)}
        onError={(evenement) => echouer(evenement.currentTarget.src)}
      />
      <div className="poster-wall__veil" />
    </aside>
  )
}
