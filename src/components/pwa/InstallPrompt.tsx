import { useState, useEffect, useRef } from 'react'
import './InstallPrompt.css'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Déjà installé en PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return

    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)

    if (isIOSDevice && isSafari) {
      // iOS : montrer après 30s
      const timer = setTimeout(() => {
        if (!sessionStorage.getItem('pwa-install-dismissed')) {
          setIsIOS(true)
          setShowPrompt(true)
        }
      }, 30000)
      return () => clearTimeout(timer)
    }

    // Android/Chrome : capturer beforeinstallprompt
    function handleBeforeInstall(e: Event) {
      e.preventDefault()
      deferredPrompt.current = e as BeforeInstallPromptEvent
      if (!sessionStorage.getItem('pwa-install-dismissed')) {
        setShowPrompt(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  async function handleInstall() {
    if (deferredPrompt.current) {
      await deferredPrompt.current.prompt()
      const { outcome } = await deferredPrompt.current.userChoice
      if (outcome === 'accepted') {
        setShowPrompt(false)
      }
      deferredPrompt.current = null
    }
  }

  function handleDismiss() {
    setShowPrompt(false)
    sessionStorage.setItem('pwa-install-dismissed', '1')
  }

  if (!showPrompt) return null

  return (
    <div className="install-prompt">
      <div className="install-prompt-content">
        <img src="/pwa-192x192.png" alt="" className="install-prompt-icon" />
        <div className="install-prompt-text">
          <strong>Installer Fellowship</strong>
          <span>
            {isIOS
              ? "Appuyez sur Partager puis \"Sur l'écran d'accueil\""
              : "Accédez à vos événements depuis l'écran d'accueil"}
          </span>
        </div>
      </div>
      <div className="install-prompt-actions">
        {!isIOS && (
          <button className="install-prompt-btn" onClick={handleInstall}>
            Installer
          </button>
        )}
        <button className="install-prompt-dismiss" onClick={handleDismiss}>
          &#10005;
        </button>
      </div>
    </div>
  )
}
