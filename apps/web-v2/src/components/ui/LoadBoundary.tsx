/**
 * QUOI     — un filet autour d'un morceau chargé à la demande : s'il échoue (réseau coupé, onglet
 *            resté ouvert pendant une mise en ligne), on montre une phrase au lieu de tout perdre.
 * POURQUOI — lot 13 : la carte part dans son propre fichier ; sans filet, un import raté démonte
 *            toute l'application.
 */
import { Component, type ReactNode } from 'react'

interface LoadBoundaryProps {
  fallback: ReactNode
  children: ReactNode
}

export class LoadBoundary extends Component<LoadBoundaryProps, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
