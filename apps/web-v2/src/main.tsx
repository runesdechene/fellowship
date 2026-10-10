/**
 * QUOI     — le point d'entrée : monte l'app dans #root, avec le routeur et la session.
 * POURQUOI — le routeur a pour base /v2 : la V2 vit sous flw.sh/v2/, la V1 à la racine.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { AuthProvider } from './lib/auth'
import { applyTheme, currentTheme } from './lib/theme'
import './styles/index.css'

// Avant le premier rendu : la page ne doit jamais s'afficher un instant dans l'autre thème.
applyTheme(currentTheme())

// « flw.sh/v2 » sans la barre finale sert bien la V2 (netlify.toml de la V1), mais le routeur, de
// base « /v2/ », n'y reconnaît rien et la page reste vide. On ajoute la barre avant le premier rendu.
if (`${window.location.pathname}/` === import.meta.env.BASE_URL) {
  const { search, hash } = window.location
  window.history.replaceState(null, '', `${import.meta.env.BASE_URL}${search}${hash}`)
}

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
