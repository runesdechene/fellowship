import { Mail } from 'lucide-react'

interface EmailSignupPlaceholderProps {
  brandName: string
  isOwner: boolean
}

export function EmailSignupPlaceholder({ brandName, isOwner }: EmailSignupPlaceholderProps) {
  return (
    <div className="v-signup">
      {isOwner && (
        <div className="v-signup-owner">
          Vos visiteurs verront ce formulaire ici
        </div>
      )}
      <Mail className="v-signup-icon" strokeWidth={1.5} />
      <p className="v-signup-text">
        Découvrez des événements et suivez <b>{brandName}</b>
      </p>
      <div className="v-signup-form">
        <input
          type="email"
          placeholder="votre@email.com"
          disabled
          className="v-signup-input"
        />
        <button disabled className="v-signup-btn">
          S'inscrire
        </button>
      </div>
    </div>
  )
}
