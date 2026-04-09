import { useState, useEffect } from 'react'
import { X, Copy, Check, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmbedModalProps {
  slug: string
  onClose: () => void
}

export function EmbedModal({ slug, onClose }: EmbedModalProps) {
  const [copied, setCopied] = useState(false)
  const snippet = `<iframe src="https://flw.sh/@${slug}/embed" width="100%" height="600" frameborder="0"></iframe>`

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(snippet)
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
        <h2 className="profile-qr-title">Intégrer mon calendrier</h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(61,48,40,0.5)', marginBottom: 16, textAlign: 'center' }}>
          Collez ce code sur votre site pour afficher vos événements automatiquement.
        </p>
        <pre style={{
          background: 'rgba(61,48,40,0.04)',
          borderRadius: 12,
          padding: '14px 16px',
          fontSize: 12,
          fontFamily: 'monospace',
          overflowX: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          lineHeight: 1.5,
          color: 'rgba(61,48,40,0.7)',
          marginBottom: 16,
        }}>
          {snippet}
        </pre>
        <div className="profile-qr-actions" style={{ flexDirection: 'column', gap: 8 }}>
          <Button variant="outline" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4 text-accent" />
                Copié !
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copier le code
              </>
            )}
          </Button>
          <Button variant="outline" asChild>
            <a href={`/@${slug}/embed`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
              <ExternalLink className="mr-2 h-4 w-4" style={{ flexShrink: 0 }} />
              Voir mon calendrier public
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
