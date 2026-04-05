import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Download, Copy, Check, X } from 'lucide-react'

interface QRCodeModalProps {
  slug: string
  onClose: () => void
}

export function QRCodeModal({ slug, onClose }: QRCodeModalProps) {
  const [copied, setCopied] = useState(false)
  const url = `https://flw.sh/@${slug}`

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleDownload = () => {
    const svg = document.getElementById('profile-qr-code')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 1024
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 1024, 1024)
      const pngUrl = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = pngUrl
      a.download = `fellowship-${slug}-qr.png`
      a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="profile-qr-backdrop">
      <div className="profile-qr-overlay" onClick={onClose} />
      <div className="profile-qr-modal">
        <button onClick={onClose} className="profile-qr-close">
          <X strokeWidth={1.5} />
        </button>
        <h2 className="profile-qr-title">Ton QR Code Fellowship</h2>
        <div className="profile-qr-code">
          <div className="profile-qr-code-wrapper">
            <QRCodeSVG id="profile-qr-code" value={url} size={256} level="M" />
          </div>
        </div>
        <p className="profile-qr-url">{url}</p>
        <div className="profile-qr-actions">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Télécharger HD
          </Button>
          <Button variant="outline" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4 text-accent" />
                Copié !
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copier le lien
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
