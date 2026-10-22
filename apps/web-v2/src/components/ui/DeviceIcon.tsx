/**
 * QUOI     — l'icône de l'appareil qu'on tient : un téléphone sous le doigt, un écran sous la souris.
 * POURQUOI — les notifications parlent de « cet appareil » (Uriel, 22/10/2026) : sur PC, une icône de
 *            téléphone mentait.
 */
import { Monitor, Smartphone, type LucideProps } from 'lucide-react'

export function DeviceIcon(props: LucideProps) {
  // Un doigt plutôt qu'une souris : téléphone ou tablette.
  const Icon = window.matchMedia('(pointer: coarse)').matches ? Smartphone : Monitor
  return <Icon {...props} />
}
