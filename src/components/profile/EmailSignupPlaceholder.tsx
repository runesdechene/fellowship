import { Mail } from 'lucide-react'

interface EmailSignupPlaceholderProps {
  brandName: string
  isOwner: boolean
}

export function EmailSignupPlaceholder({ brandName, isOwner }: EmailSignupPlaceholderProps) {
  return (
    <div className="profile-email-card">
      {isOwner && (
        <div className="profile-email-owner-badge">
          Vos visiteurs verront ce formulaire ici
        </div>
      )}
      <Mail className="profile-email-icon" strokeWidth={1.5} />
      <p className="profile-email-text">
         Découvrez des événements et suivez <b>{brandName}</b>
      </p>
      <div className="profile-email-form">
        <input
          type="email"
          placeholder="votre@email.com"
          disabled
          className="profile-email-input"
        />
        <button disabled className="profile-email-button">
          S'inscrire
        </button>
      </div>
    </div>
  )
}
