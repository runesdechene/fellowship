/**
 * QUOI     — le point d'entrée : monte l'app dans #root, avec le routeur et la session.
 * POURQUOI — la V2 vit à la racine de flw.sh depuis la bascule (lot 12).
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { AuthProvider } from './lib/auth'
import { captureReferral } from './lib/referral'
import { applyTheme, currentTheme } from './lib/theme'
import './styles/index.css'

// Avant le premier rendu : la page ne doit jamais s'afficher un instant dans l'autre thème.
applyTheme(currentTheme())

// Un lien de parrainage (`?r=`) arrive sur n'importe quelle page : le code attend l'inscription.
captureReferral(window.location.search)

// Le service worker du téléphone (public/sw.js) : les notifications, rien d'autre.
if ('serviceWorker' in navigator) {
  // Un échec (stockage bloqué, fichier introuvable) laisse simplement les notifications
  // impossibles : les portes le lisent par getRegistration (lib/push-phone.ts).
  navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
    .catch(() => undefined)
}

const root = document.getElementById('root')
if (!root) throw new Error('index.html doit contenir #root')

createRoot(root).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
