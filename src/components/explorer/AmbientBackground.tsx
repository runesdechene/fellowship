/** Fond ambiant flouté de l'image du festival actif (fondu au changement). Fallback dégradé si pas d'image. */
export function AmbientBackground({ imageUrl }: { imageUrl: string | null }) {
  return (
    <div className="ambient" aria-hidden="true">
      {imageUrl
        ? <img src={imageUrl} alt="" key={imageUrl} />
        : <div className="ambient-fallback" />}
    </div>
  )
}
