/**
 * QUOI     — ce qui arrive dans le Pro : une seule liste, lue par la landing (ProSoon) et par la
 *            page /pro (ProFaq).
 * POURQUOI — Uriel, 25/10/2026 (maquette 2544:233) : on n'annonce que ce qui sort dans les
 *            prochains mois, et la même chose partout. Le coût de la route d'abord, il arrive vite.
 * ATTENTION — rien de tout ça n'existe encore. Une fonction livrée quitte cette liste et rejoint
 *            celle de ce que le Pro fait déjà (features/pro/PlanCard.tsx).
 */
import { Car, FileText, Megaphone, MousePointerClick, Radar, type LucideIcon } from 'lucide-react'

export const PRO_SOON: readonly { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Car,
    title: 'Le coût de la route',
    text: 'Avant d’y aller, sache ce que te coûte un festival selon ton véhicule : carburant, péages, nuits.',
  },
  {
    icon: MousePointerClick,
    title: 'L’inscription en un clic',
    text: 'Si l’orga utilise Fellowship, ton dossier part tout seul.',
  },
  {
    icon: FileText,
    title: 'Le dossier PDF rempli pour toi',
    text: 'Tu déposes le PDF : enseigne, SIRET, stand, déjà reportés.',
  },
  {
    icon: Radar,
    title: 'La veille des festivals',
    text: 'Fellowship parcourt le web et te propose les dates qui te ressemblent.',
  },
  {
    icon: Megaphone,
    title: 'Tes annonces sur les réseaux',
    text: 'Une story et un post prêts pour chaque festival où tu vas.',
  },
]
