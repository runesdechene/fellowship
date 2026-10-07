// Capture du code de parrainage depuis l'URL d'arrivée (ex: flwsh.app/?r=RUNEDECHENE).
// Persiste en localStorage pour survivre au parcours login OTP → onboarding (≠ même page).
import { normalizeReferralCode } from './referral'

const KEY = 'flwsh.referralCode'

export function captureReferralFromUrl(search: string = window.location.search): void {
  const raw = new URLSearchParams(search).get('r')
  if (!raw) return
  const code = normalizeReferralCode(raw)
  if (code.length >= 3) localStorage.setItem(KEY, code)
}

export function getStoredReferralCode(): string | null {
  return localStorage.getItem(KEY)
}

export function clearStoredReferralCode(): void {
  localStorage.removeItem(KEY)
}
