/**
 * QUOI     — « Ta vitrine, en direct » : la carte qui se construit pendant l'arrivée — initiales,
 *            marque, métier et ville, adresse `flw.sh/…`.
 * POURQUOI — maquettes 2102:72, 2244:2, 2244:53 (lot 10a) : chaque lettre tapée se voit à droite.
 *            Pour le prénom seul, la carte montre l'enseigne qui existe déjà.
 */
import { Scissors } from 'lucide-react'
import { initialsOf } from '@/lib/welcome'

interface WelcomePreviewProps {
  brand: string
  craft: string
  place: string
  slug: string
  avatarUrl?: string | null
}

export function WelcomePreview({ brand, craft, place, slug, avatarUrl }: WelcomePreviewProps) {
  const meta = [craft.trim(), place].filter(Boolean).join(' · ')
  return (
    <div className="door__panel welcome-preview">
      <p className="welcome-preview__label">Ta vitrine, en direct</p>
      <div className="welcome-preview__card">
        <div className="welcome-preview__banner">
          <Scissors className="welcome-preview__decor" strokeWidth={1} aria-hidden="true" />
        </div>
        <span className="welcome-preview__logo">
          {avatarUrl ? <img src={avatarUrl} alt="" /> : initialsOf(brand)}
        </span>
        <p
          className={
            brand.trim()
              ? 'welcome-preview__name'
              : 'welcome-preview__name welcome-preview__name--empty'
          }
        >
          {brand.trim() || 'Ta marque'}
        </p>
        {meta ? (
          <p className="welcome-preview__meta">{meta}</p>
        ) : (
          <>
            <span className="welcome-preview__bar" />
            <p className="welcome-preview__hint">
              Ton métier et ta ville viendront aux étapes suivantes
            </p>
          </>
        )}
        <div className="welcome-preview__blocks">
          <span />
          <span />
          <span />
        </div>
      </div>
      <p className="welcome-preview__slug">
        flw.sh/<b>{slug || '…'}</b>
      </p>
    </div>
  )
}
