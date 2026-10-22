/**
 * QUOI     — les quatre chiffres du haut de la liste : comptes, enseignes Pro, essais, paiements en échec.
 * POURQUOI — un coup d'œil dit si quelque chose demande l'attention de l'administrateur (maquette 2338:2).
 */
import { CircleAlert, Hourglass, Sparkles, Users } from 'lucide-react'
import { AdminStats, type AdminFigure } from '@/components/ui/AdminStats'
import type { Stats } from './useAccounts'

export function AccountsStats({ stats }: { stats: Stats }) {
  const figures: AdminFigure[] = [
    {
      label: 'Comptes',
      Icon: Users,
      tone: 'prune',
      value: stats.comptes,
      detail: `+${stats.comptes_semaine} cette semaine`,
    },
    {
      label: 'Enseignes Pro',
      Icon: Sparkles,
      tone: 'terre',
      value: stats.pro,
      detail: `dont ${stats.pro_offerts} offertes`,
    },
    {
      label: 'Essais en cours',
      Icon: Hourglass,
      tone: 'bleu',
      value: stats.essais,
      detail: `${stats.essais_bientot} finissent dans 3 jours`,
    },
    {
      label: 'Paiements en échec',
      Icon: CircleAlert,
      tone: 'brique',
      value: stats.echecs,
      detail: stats.echecs > 0 ? 'à relancer' : 'aucun',
      alert: stats.echecs > 0,
    },
  ]
  return <AdminStats figures={figures} />
}
