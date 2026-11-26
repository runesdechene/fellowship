/**
 * QUOI     — les cartes de la grille de /decouvrir-v2 : leur texte, leur largeur, et le détail de
 *            la capture que chacune montre.
 * POURQUOI — maquette du 26/11/2026.
 * ATTENTION — `crop` se mesure sur une capture de 2000 px de large (public/decouvrir/) : x, y,
 *            largeur, hauteur. Une capture refaite se recadre ici. Sans `crop` : le téléphone.
 */
export interface Crop {
  image: string
  x: number
  y: number
  width: number
  height: number
}

export interface Card {
  title: string
  text: string
  size: 'wide' | 'narrow' | 'half'
  pro?: boolean
  crop?: Crop
}

export const CARDS: Card[] = [
  {
    size: 'wide',
    title: 'Calendrier',
    text: 'Toute ta saison mois par mois, avec les affiches et les amis qui y vont.',
    crop: { image: 'calendrier', x: 412, y: 318, width: 1400, height: 910 },
  },
  {
    size: 'narrow',
    title: 'Sur ton téléphone',
    text: 'Fellowship s’installe sur ton écran d’accueil comme une application.',
  },
  {
    size: 'narrow',
    title: 'Le fil de ta communauté',
    text: 'Qui va où, qui a candidaté, ce qu’ils en ont pensé. Et un bouton pour leur écrire.',
    crop: { image: 'communaute', x: 425, y: 425, width: 735, height: 690 },
  },
  {
    size: 'wide',
    title: 'Explorer',
    text: 'Les festivals et les marchés où exposer, à filtrer par lieu, catégorie et période.',
    crop: { image: 'explorer', x: 412, y: 478, width: 1500, height: 750 },
  },
  {
    size: 'half',
    title: 'Ta vitrine',
    text: 'Une page à ton nom, avec tes prochaines escales, que l’on peut suivre.',
    crop: { image: 'vitrine', x: 420, y: 420, width: 1100, height: 810 },
  },
  {
    size: 'half',
    title: 'Où vous vous croiserez',
    text: 'Les festivals où tu vas retrouver les exposants que tu connais.',
    crop: { image: 'communaute', x: 1405, y: 598, width: 565, height: 408 },
  },
  {
    size: 'wide',
    pro: true,
    title: 'Bilans de saison',
    text: 'Recettes, frais, bénéfice par date et par mois. Visibles par toi seul.',
    crop: { image: 'bilans', x: 500, y: 196, width: 1390, height: 1128 },
  },
  {
    size: 'narrow',
    title: 'Ce qu’il te reste à faire',
    text: 'Ta prochaine date, puis ce qui reste à envoyer, à payer ou à recevoir.',
    crop: { image: 'taches', x: 0, y: 0, width: 2000, height: 2878 },
  },
  {
    size: 'narrow',
    title: 'Les sujets',
    text: 'Une question, une place dans la voiture : tu la lances, les autres exposants répondent.',
    crop: { image: 'sujet', x: 1190, y: 390, width: 790, height: 915 },
  },
  {
    size: 'wide',
    title: 'La discussion',
    text: 'Chaque sujet a son tchat. Tes conversations à deux et tes groupes sont au même endroit.',
    crop: { image: 'discussion', x: 976, y: 728, width: 1024, height: 596 },
  },
]
