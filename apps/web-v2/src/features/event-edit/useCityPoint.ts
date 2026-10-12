/**
 * QUOI     — la position d'une ville, pour l'aperçu « Carte » quand aucune adresse n'a été choisie.
 * POURQUOI — lot 13 (spec, §5) : l'aperçu montre la position choisie, ou celle de la ville sinon —
 *            celle que la fiche prendra à l'enregistrement (`locateCity`).
 * ATTENTION — cherchée quand la frappe se pose, et seulement quand on regarde la carte.
 */
import { useEffect, useState } from 'react'
import type { Point } from '@/lib/distance'
import { locateCity } from '@/lib/geocode'

const WAIT_MS = 400

export function useCityPoint(city: string, department: string, enabled: boolean): Point | null {
  const [found, setFound] = useState<{ key: string; point: Point | null } | null>(null)
  const key = `${city.trim()}|${department.trim()}`

  useEffect(() => {
    if (!enabled || !city.trim() || !department.trim()) return
    let cancelled = false
    const timer = setTimeout(() => {
      void locateCity(city, department).then((point) => {
        if (!cancelled) setFound({ key, point })
      })
    }, WAIT_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [enabled, city, department, key])

  return found?.key === key ? found.point : null
}
