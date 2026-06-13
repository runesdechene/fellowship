import { useState, useEffect, type CSSProperties } from 'react'
import { X, Copy, Check, ExternalLink } from 'lucide-react'
import { buildEmbedSnippet } from '@/lib/embed-snippet'
import type { EmbedTheme } from '@/lib/embed-params'

interface EmbedModalProps {
  slug: string
  onClose: () => void
}

const THEME_TABS: { id: EmbedTheme; label: string }[] = [
  { id: 'light', label: 'Clair' },
  { id: 'dark', label: 'Sombre' },
  { id: 'auto', label: 'Auto' },
]

/** Modale « Intégrer mon calendrier », au style DA carnet (classes v-* de Vitrine.css). */
export function EmbedModal({ slug, onClose }: EmbedModalProps) {
  const [copied, setCopied] = useState(false)
  const [theme, setTheme] = useState<EmbedTheme>('auto')
  const [hideHeader, setHideHeader] = useState(false)

  const snippet = buildEmbedSnippet({ slug, theme, hideHeader })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard indisponible */ }
  }

  const track: CSSProperties = {
    display: 'flex',
    gap: 4,
    background: 'hsl(var(--border) / 0.4)',
    borderRadius: 12,
    padding: 4,
  }
  const seg = (active: boolean): CSSProperties => ({
    flex: 1,
    padding: '8px 10px',
    fontSize: 13,
    fontFamily: 'var(--font-body)',
    borderRadius: 9,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s',
    background: active ? 'var(--copper)' : 'transparent',
    color: active ? '#fff' : 'hsl(var(--muted-foreground))',
    fontWeight: active ? 700 : 500,
  })
  const fieldLabel: CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'hsl(var(--muted-foreground))',
    marginBottom: 6,
  }

  return (
    <div className="v-backdrop" onClick={onClose}>
      <div className="v-modal" onClick={e => e.stopPropagation()}>
        <div className="v-mhead">
          <h3>Intégrer mon calendrier</h3>
          <button type="button" className="v-mx" onClick={onClose} aria-label="Fermer"><X /></button>
        </div>

        <div className="v-mbody">
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'hsl(var(--muted-foreground))', margin: 0 }}>
            Choisis le format, copie le code, colle-le sur ton site.
          </p>

          <div>
            <div style={fieldLabel}>Thème</div>
            <div style={track}>
              {THEME_TABS.map(t => (
                <button key={t.id} type="button" aria-pressed={theme === t.id} style={seg(theme === t.id)} onClick={() => setTheme(t.id)}>{t.label}</button>
              ))}
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, color: 'hsl(var(--foreground))' }}>
            <input
              type="checkbox"
              checked={hideHeader}
              onChange={e => setHideHeader(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--copper)', cursor: 'pointer' }}
            />
            Masquer l'identité (avatar, nom, description)
          </label>

          <pre style={{
            background: 'hsl(var(--border) / 0.35)',
            borderRadius: 12,
            padding: '14px 16px',
            fontSize: 12,
            fontFamily: 'monospace',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            lineHeight: 1.5,
            color: 'hsl(var(--foreground))',
            margin: 0,
          }}>
            {snippet}
          </pre>

          <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'hsl(var(--muted-foreground))', margin: 0 }}>
            Pleine largeur du conteneur par défaut. Pour la limiter, ajoute <code>&amp;maxw=720</code> à l'URL (largeur max en pixels).
          </p>
        </div>

        <div className="v-mfoot">
          <button type="button" className="v-qr-btn" onClick={handleCopy}>
            {copied ? <><Check /> Copié</> : <><Copy /> Copier le code</>}
          </button>
          <a
            className="v-qr-btn is-primary"
            href={`/@${slug}/embed?theme=${theme}${hideHeader ? '&header=0' : ''}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink /> Voir en vrai
          </a>
        </div>
      </div>
    </div>
  )
}
