import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { X, Download, Copy, Check } from 'lucide-react'

interface Props {
  slug: string
  onClose: () => void
}

/** Modale QR de la vitrine, au style DA carnet. Encode l'URL publique réelle. */
export function VitrineQRModal({ slug, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const url = `${origin}/${slug}`
  const pretty = `${origin.replace(/^https?:\/\//, '')}/${slug}`

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function download() {
    const svg = document.getElementById('v-qr-svg')
    if (!svg) return
    const data = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 1024
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      if (ctx) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1024, 1024); ctx.drawImage(img, 0, 0, 1024, 1024) }
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `fellowship-${slug}-qr.png`
      a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(data)))
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard indisponible */ }
  }

  return (
    <div className="v-backdrop" onClick={onClose}>
      <div className="v-modal v-qr-modal" onClick={e => e.stopPropagation()}>
        <div className="v-mhead">
          <h3>QR de ma vitrine</h3>
          <button type="button" className="v-mx" onClick={onClose} aria-label="Fermer"><X /></button>
        </div>
        <div className="v-mbody v-qr-body">
          <div className="v-qr-card">
            <QRCodeSVG id="v-qr-svg" value={url} size={208} level="M" />
          </div>
          <p className="v-qr-hint">Imprime-le sur ton stand : un scan ouvre ta vitrine.</p>
          <p className="v-qr-url">{pretty}</p>
        </div>
        <div className="v-mfoot v-qr-foot">
          <button type="button" className="v-qr-btn" onClick={copy}>
            {copied ? <><Check /> Copié</> : <><Copy /> Copier le lien</>}
          </button>
          <button type="button" className="v-qr-btn is-primary" onClick={download}>
            <Download /> Télécharger
          </button>
        </div>
      </div>
    </div>
  )
}
