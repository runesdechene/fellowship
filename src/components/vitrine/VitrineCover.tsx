export function VitrineCover({ url }: { url: string | null }) {
  return (
    <div className="v-cover">
      {url ? <img src={url} alt="" /> : <div className="v-cover-fallback" aria-hidden="true" />}
    </div>
  )
}
