/**
 * QUOI     — l'adresse d'une affiche servie par le stockage, à la largeur voulue.
 * POURQUOI — le stockage la réduit et la convertit en WebP à la volée, quel que soit le fichier
 *            d'origine : un JPEG de 4 Mo envoyé par la V1, ou celui d'un iPhone, dont Safari ne sait
 *            pas fabriquer de WebP, arrive en quelques centaines de Ko (Uriel, 19/10/2026).
 * ATTENTION — une affiche hébergée ailleurs que dans notre stockage passe telle quelle.
 */

const OBJECT = '/storage/v1/object/public/'
const RENDER = '/storage/v1/render/image/public/'

/**
 * `resize=contain` : sans lui, le stockage garde la hauteur d'origine et découpe une bande au centre.
 * La qualité baisse pour les vignettes floues de la landing ; une affiche qu'on lit garde la sienne.
 */
export function posterThumb(url: string, width: number, quality = 60): string {
  if (!url.includes(OBJECT)) return url
  return `${url.replace(OBJECT, RENDER)}?width=${String(width)}&resize=contain&quality=${String(quality)}`
}
