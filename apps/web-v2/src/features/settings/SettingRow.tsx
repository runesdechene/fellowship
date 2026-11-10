/**
 * QUOI     — la carte des Réglages et sa ligne : libellé (avec son aide et sa pastille) à gauche,
 *            contrôle à droite.
 * POURQUOI — maquette 2206:691 : toutes les sections sont faites de ces lignes. Une chose qui se
 *            répète devient un seul composant (Méthode, 11/10/2026).
 */
import type { ReactNode } from 'react'

export function SettingCard({ children }: { children: ReactNode }) {
  return <div className="setting-card">{children}</div>
}

/** Un titre de section, son aide, puis sa carte (Réglages et Récap du reporting). */
export function SettingSection({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: ReactNode
}) {
  return (
    <section className="settings-section">
      <div className="settings-section__head">
        <h2 className="settings-section__title">{title}</h2>
        {note && <p className="settings-section__note">{note}</p>}
      </div>
      <SettingCard>{children}</SettingCard>
    </section>
  )
}

interface SettingRowProps {
  title: string
  note?: string
  badge?: ReactNode
  /** Ce qui précède le libellé : le logo d'une enseigne. */
  leading?: ReactNode
  /** `setting-row--sub` : une ligne rattachée à celle du dessus, sans filet (recettes d'une enseigne). */
  className?: string
  children?: ReactNode
}

export function SettingRow({ title, note, badge, leading, className, children }: SettingRowProps) {
  return (
    <div className={className ? `setting-row ${className}` : 'setting-row'}>
      {leading}
      <span className="setting-row__text">
        <span className="setting-row__title">
          {title}
          {badge}
        </span>
        {note && <span className="setting-row__note">{note}</span>}
      </span>
      {children && <span className="setting-row__control">{children}</span>}
    </div>
  )
}
