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
  const url = `https://flw.sh/${slug}`

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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative rounded-2xl bg-card p-8 shadow-xl max-w-sm w-full mx-4">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="text-center">
          <h2 className="text-lg font-bold mb-6">Ton QR Code Fellowship</h2>
          <div className="inline-block rounded-xl bg-white p-5">
            <QRCodeSVG id="profile-qr-code" value={url} size={256} level="M" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground font-mono">{url}</p>
          <div className="mt-6 flex gap-3 justify-center">
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
    </div>
  )
}
