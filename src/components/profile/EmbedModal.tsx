import { useState, useEffect, type CSSProperties } from 'react'
import { X, Copy, Check, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buildEmbedSnippet } from '@/lib/embed-snippet'
import type { EmbedView, EmbedTheme } from '@/lib/embed-params'

interface EmbedModalProps {
  slug: string
  onClose: () => void
}

const VIEW_TABS: { id: EmbedView; label: string }[] = [
  { id: 'mini', label: 'Vignette' },
  { id: 'full', label: 'Pleine page' },
]

const THEME_TABS: { id: EmbedTheme; label: string }[] = [
  { id: 'light', label: 'Clair' },
  { id: 'dark', label: 'Sombre' },
  { id: 'auto', label: 'Auto' },
]

export function EmbedModal({ slug, onClose }: EmbedModalProps) {
  const [copied, setCopied] = useState(false)
  const [view, setView] = useState<EmbedView>('mini')
  const [theme, setTheme] = useState<EmbedTheme>('auto')

  const snippet = buildEmbedSnippet({ slug, view, theme })

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

  const segBtn = (active: boolean): CSSProperties => ({
    flex: 1,
    padding: '7px 10px',
    fontSize: 13,
    fontFamily: 'var(--font-body)',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    background: active ? 'var(--copper, #c87941)' : 'transparent',
    color: active ? '#fff' : 'rgba(61,48,40,0.6)',
    fontWeight: active ? 700 : 500,
    transition: 'all 0.15s',
  })

  return (
    <div className="profile-qr-backdrop">
      <div className="profile-qr-overlay" onClick={onClose} />
      <div className="profile-qr-modal">
        <button onClick={onClose} className="profile-qr-close">
          <X strokeWidth={1.5} />
        </button>
        <h2 className="profile-qr-title">Intégrer mon calendrier</h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(61,48,40,0.5)', marginBottom: 16, textAlign: 'center' }}>
          Choisissez le format, copiez le code, collez-le sur votre site.
        </p>

        {/* Onglets format */}
        <div style={{ display: 'flex', gap: 4, background: 'rgba(61,48,40,0.05)', borderRadius: 10, padding: 4, marginBottom: 8 }}>
          {VIEW_TABS.map(t => (
            <button key={t.id} aria-pressed={view === t.id} style={segBtn(view === t.id)} onClick={() => setView(t.id)}>{t.label}</button>
          ))}
        </div>

        {/* Sélecteur thème */}
        <div style={{ display: 'flex', gap: 4, background: 'rgba(61,48,40,0.05)', borderRadius: 10, padding: 4, marginBottom: 16 }}>
          {THEME_TABS.map(t => (
            <button key={t.id} aria-pressed={theme === t.id} style={segBtn(theme === t.id)} onClick={() => setTheme(t.id)}>{t.label}</button>
          ))}
        </div>

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
            <a href={`/@${slug}/embed?view=${view}&theme=${theme}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
              <ExternalLink className="mr-2 h-4 w-4" style={{ flexShrink: 0 }} />
              Voir en vrai
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
