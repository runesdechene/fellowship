import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface QRCodeCardProps {
  slug: string
  size?: number
}

export function QRCodeCard({ slug, size = 200 }: QRCodeCardProps) {
  const url = `https://flw.sh/@${slug}`

  const handleDownload = () => {
    const svg = document.getElementById('fellowship-qr')
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

  return (
    <div className="rounded-xl border border-border bg-card p-6 text-center">
      <h3 className="mb-4 font-semibold">Ton QR Code</h3>
      <div className="inline-block rounded-lg bg-white p-4">
        <QRCodeSVG id="fellowship-qr" value={url} size={size} level="M" />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{url}</p>
      <Button variant="outline" size="sm" className="mt-3" onClick={handleDownload}>
        <Download className="mr-2 h-4 w-4" />
        Télécharger en PNG
      </Button>
    </div>
  )
}
