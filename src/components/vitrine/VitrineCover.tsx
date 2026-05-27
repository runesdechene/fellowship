import { ImageDrop } from './edit/ImageDrop'

interface VitrineCoverProps {
  url: string | null
  editing?: boolean
  onUpload?: (file: File) => Promise<void>
}

export function VitrineCover({ url, editing, onUpload }: VitrineCoverProps) {
  return (
    <div className="v-cover">
      {url ? <img src={url} alt="" /> : <div className="v-cover-fallback" aria-hidden="true" />}
      {editing && onUpload && (
        <div className="v-cover-edit">
          <ImageDrop label="Changer la cover" onPick={onUpload} />
        </div>
      )}
    </div>
  )
}
