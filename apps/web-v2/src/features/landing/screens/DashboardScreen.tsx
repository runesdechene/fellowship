/**
 * QUOI     — l'écran Tableau de bord de la landing : « Mes dossiers » sur les vrais festivals à
 *            venir, avec les statuts et les montants de l'exposant de démonstration ; « Mes bilans ».
 * POURQUOI — maquette 2290:2 (nœud 2290:343), reproduite d'après le tableau de bord de l'app.
 * ATTENTION — les montants sont de démonstration : jamais les chiffres d'un vrai exposant.
 */
import type { CSSProperties } from 'react'
import { formatDateRange } from '@/lib/dates'
import { posterThumb, type Showcase } from '@/lib/landing'
import { DEMO } from '@/lib/landing-demo'
import { formatEuros } from '@/lib/money'
import { AppWindow } from './AppWindow'
import { DemoStatus } from './DemoStatus'

function payment(paid: number, total: number): { label: string; note: string } {
  if (paid >= total) return { label: 'Payé', note: `${formatEuros(total)} réglés` }
  if (paid > 0)
    return {
      label: 'Acompte versé',
      note: `${formatEuros(paid)} sur ${formatEuros(total)} · solde à venir`,
    }
  return { label: 'À payer', note: `${formatEuros(total)} si le dossier est accepté` }
}

export function DashboardScreen({ dossiers }: { dossiers: Showcase['dossiers'] }) {
  if (dossiers.length === 0) return null
  return (
    <AppWindow title="Tableau de bord" width={560} height={300} className="landing-shot--dashboard">
      <div className="landing-dash">
        <h4 className="landing-app__section">Mes dossiers</h4>
        <p className="landing-app__meta">
          Ce qui reste à envoyer, à payer ou à recevoir sur tes prochaines dates
        </p>
        <div className="landing-dash__table">
          <div className="landing-dash__head">
            <span>Date</span>
            <span>Dossier</span>
            <span>Paiement</span>
          </div>
          {dossiers.map((d) => {
            const pay = payment(d.paid, d.total)
            return (
              <div key={d.id} className="landing-dash__row">
                <span className="landing-dash__event">
                  {d.imageUrl ? <img src={posterThumb(d.imageUrl, 80)} alt="" /> : <i />}
                  <span>
                    <strong>{d.name}</strong>
                    <small>{formatDateRange(d.startDate, d.endDate)}</small>
                  </span>
                </span>
                <DemoStatus status={d.status} />
                <span className="landing-dash__pay">
                  <strong>{pay.label}</strong>
                  <small>{pay.note}</small>
                  <span className="landing-dash__gauge">
                    <span
                      style={
                        {
                          '--paid': `${String(Math.round((d.paid / d.total) * 100))}%`,
                        } as CSSProperties
                      }
                    />
                  </span>
                </span>
              </div>
            )
          })}
        </div>
        <h4 className="landing-app__section">Mes bilans</h4>
        <div className="landing-dash__season">
          <small>Bénéfice de la saison</small>
          <strong>+{formatEuros(DEMO.season.profit)}</strong>
        </div>
      </div>
    </AppWindow>
  )
}
