import { useEffect, useState, type CSSProperties } from 'react'
import { usePageChrome } from '@/lib/page-chrome'

/**
 * LE MUR D'AFFICHE — le bord droit de l'écran, du haut au bas.
 *
 * Dans le monde d'un exposant, l'affiche EST l'artefact : c'est ce qu'il
 * regarde pour dire oui à une date. En vignette de deux cents pixels elle
 * n'était qu'une décoration ; en mur, elle porte l'identité de la date.
 *
 * Elle est FLOUE, et c'est délibéré. Le mur dépasse sept cents pixels de large
 * sur un grand écran, or la plupart des affiches arrivent en petit JPEG
 * récupéré sur Facebook : étirées là-dessus, elles montrent leurs pixels et
 * leurs artefacts. Le flou les efface et fait du mur une ambiance. Ce que la
 * page perd en lisibilité de l'affiche, elle l'a déjà en toutes lettres dans
 * la colonne de gauche.
 *
 * MAIS PAS AVEC `filter: blur()`. Le coût d'un flou CSS dépend de la taille
 * AFFICHÉE, pas de la source : flouter une couche de 737 × 1291 se repaie à
 * chaque image, et ça a suffi à figer le moteur de rendu pendant les essais.
 * On redessine donc l'affiche dans un canevas de quarante pixels de large, et
 * on laisse le navigateur la ré-agrandir : le lissage de l'agrandissement
 * FAIT le flou, gratuitement. Même image, zéro coût de composition.
 */

/** Les trois bandes moyennes de l'affiche, et sa version basse définition. */
type Rendu = {
  /** L'affiche qui a produit ce rendu — il ne vaut que pour elle. */
  pour: string
  /** L'aperçu en data: URI, ou l'affiche d'origine si le canevas a refusé. */
  src: string
  /** Vrai quand on a dû garder l'affiche pleine, donc la flouter en CSS. */
  brute: boolean
  haut: string
  milieu: string
  bas: string
}

/**
 * Quarante pixels de large. Ré-agrandi quinze à vingt fois, ça donne un flou
 * franc sans aucun filtre. Monter ce nombre rend le mur plus net.
 */
const LARGEUR_APERCU = 40

function preparer(image: HTMLImageElement, pour: string): Rendu {
  const repli: Rendu = {
    pour,
    src: pour,
    brute: true,
    haut: '#2d2826',
    milieu: '#4a4643',
    bas: '#2d2826',
  }
  if (!image.naturalWidth) return repli

  const hauteur = Math.max(
    1,
    Math.round((LARGEUR_APERCU * image.naturalHeight) / image.naturalWidth),
  )
  const toile = document.createElement('canvas')
  toile.width = LARGEUR_APERCU
  toile.height = hauteur
  const dessin = toile.getContext('2d', { willReadFrequently: true })
  if (!dessin) return repli
  dessin.drawImage(image, 0, 0, LARGEUR_APERCU, hauteur)

  let pixels: Uint8ClampedArray
  let apercu: string
  try {
    // Les affiches viennent du stockage Supabase, donc d'un autre domaine.
    // Sans en-tête CORS le canevas est teinté et les deux lectures jettent :
    // ce n'est pas une panne, c'est un cas à couvrir.
    pixels = dessin.getImageData(0, 0, LARGEUR_APERCU, hauteur).data
    apercu = toile.toDataURL('image/jpeg', 0.72)
  } catch {
    return repli
  }

  /**
   * La dominante d'une tranche horizontale. Aucune couleur n'est écrite en
   * dur : une affiche nocturne donne un mur sombre, un marché de printemps
   * un mur clair. C'est ce qui rend le voile utilisable sur toutes les dates.
   */
  const bande = (debut: number, fin: number): string => {
    let rouge = 0
    let vert = 0
    let bleu = 0
    let compte = 0
    for (let y = debut; y < fin; y += 1) {
      for (let x = 0; x < LARGEUR_APERCU; x += 1) {
        const i = (y * LARGEUR_APERCU + x) * 4
        rouge += pixels[i]
        vert += pixels[i + 1]
        bleu += pixels[i + 2]
        compte += 1
      }
    }
    if (!compte) return repli.milieu
    return `rgb(${Math.round(rouge / compte)} ${Math.round(vert / compte)} ${Math.round(
      bleu / compte,
    )})`
  }

  const tiers = hauteur / 3
  return {
    pour,
    src: apercu,
    brute: false,
    haut: bande(0, Math.floor(tiers)),
    milieu: bande(Math.floor(tiers), Math.floor(tiers * 2)),
    bas: bande(Math.floor(tiers * 2), hauteur),
  }
}

export function PosterWall() {
  const { poster } = usePageChrome()
  const [rendu, setRendu] = useState<Rendu | null>(null)

  useEffect(() => {
    if (!poster) return
    let vivant = true
    const image = new Image()
    // À poser AVANT src, sinon la requête part sans en-tête et le canevas
    // sera teinté quoi qu'il arrive ensuite.
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      if (vivant) setRendu(preparer(image, poster))
    }
    image.onerror = () => {
      if (vivant) setRendu({ pour: poster, src: poster, brute: true, haut: '#2d2826', milieu: '#4a4643', bas: '#2d2826' })
    }
    image.src = poster
    return () => {
      vivant = false
    }
  }, [poster])

  if (!poster) return null

  // Un rendu ne vaut que pour l'affiche qui l'a produit : sans ce contrôle,
  // passer d'une date à l'autre montrerait l'ancienne le temps du chargement.
  const pret = rendu && rendu.pour === poster ? rendu : null

  // Le seul style écrit depuis un `.tsx` du projet, et il ne fixe aucune
  // apparence : il passe à la couche 3 trois valeurs qu'elle ne peut pas
  // connaître, parce qu'elles sont lues dans l'image au chargement.
  const couleurs = pret
    ? ({
        '--wall-haut': pret.haut,
        '--wall-milieu': pret.milieu,
        '--wall-bas': pret.bas,
      } as CSSProperties)
    : undefined

  return (
    <aside className="poster-wall" style={couleurs} aria-hidden="true">
      {pret && (
        <img
          className={
            pret.brute ? 'poster-wall__image poster-wall__image--brute' : 'poster-wall__image'
          }
          src={pret.src}
          alt=""
        />
      )}
      <div className="poster-wall__veil" />
      <div className="poster-wall__vignette" />
    </aside>
  )
}
