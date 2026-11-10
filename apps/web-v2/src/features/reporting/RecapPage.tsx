/**
 * QUOI     — la page Récap (`/reporting/recap?mois=`) : l'e-mail mensuel de l'expert-comptable, tel
 *            qu'il partira — destinataire, date, objet, pièces jointes, puis le texte mot pour mot.
 * POURQUOI — maquette 2814:467, validée le 10/11/2026 : vérifier le récap avant qu'il parte. Le mois
 *            vit dans l'adresse ; par défaut, celui en cours (le prochain à partir).
 */
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  formatFullDateOrdinal,
  formatMonthLabel,
  monthKey,
  monthName,
  parseSqlDate,
} from '@/lib/dates'
import { parseMonthKey } from '@/lib/reporting'
import { SettingRow, SettingSection } from '@/features/settings/SettingRow'
import { RecapFile } from './RecapFile'
import { useRecap } from './useRecap'

/** La note de « L’envoi » : où il part vraiment, et s'il part. */
function sendingNote(environment: string, active: boolean): string {
  if (!active) return 'Le récapitulatif est coupé dans les réglages : rien ne part.'
  return environment === 'sandbox'
    ? 'Au bac à sable, il part à ton adresse d’alerte, « [bac à sable] » devant l’objet.'
    : 'Il part à l’adresse de l’expert-comptable choisie dans les réglages.'
}

export function RecapPage({ entityId }: { entityId: string }) {
  const [search] = useSearchParams()
  const today = new Date()
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const month = parseMonthKey(search.get('mois')) ?? thisMonth
  const { recap, error } = useRecap(entityId, monthKey(month))
  const previous = new Date(month.getFullYear(), month.getMonth() - 1, 1)
  const next = new Date(month.getFullYear(), month.getMonth() + 1, 1)

  return (
    <div className="admin-page reporting-settings">
      <header className="reporting__head">
        <div className="admin-home__head">
          <h1 className="admin-home__title">Récap de {monthName(month)}</h1>
          <p className="admin-page__lede">
            L’e-mail que ton expert-comptable recevra, mot pour mot. Il ne compte que ce qui est
            parti à l’administration.
          </p>
        </div>
        <nav className="reporting-recap__months" aria-label="Mois">
          <Link className="reporting__month-link" to={`?mois=${monthKey(previous)}`}>
            <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
            {formatMonthLabel(previous)}
          </Link>
          {next <= thisMonth && (
            <Link className="reporting__month-link" to={`?mois=${monthKey(next)}`}>
              {formatMonthLabel(next)}
              <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
            </Link>
          )}
        </nav>
      </header>
      {error && <p className="admin-page__error">{error}</p>}

      {recap && (
        <div className="reporting-recap__sections">
          <div className="reporting-settings__sections">
            <SettingSection title="L’envoi" note={sendingNote(recap.environnement, recap.actif)}>
              <SettingRow title="À">
                {recap.destinataire ?? 'Aucune adresse : à remplir dans les réglages'}
              </SettingRow>
              <SettingRow title="Part le">
                {formatFullDateOrdinal(parseSqlDate(recap.envoiLe))}
              </SettingRow>
              <SettingRow title="Objet">{recap.sujet}</SettingRow>
              <SettingRow title="Pièces jointes">
                <span className="reporting-recap__files">
                  {recap.pieces.map((piece) => (
                    <span key={piece.nom}>{piece.nom}</span>
                  ))}
                </span>
              </SettingRow>
            </SettingSection>

            <SettingSection title="Le message" note="Le texte exact de l’e-mail.">
              <p className="reporting-recap__body">{recap.texte}</p>
            </SettingSection>
          </div>

          {/* Les tableaux prennent toute la largeur : 13 colonnes ne tiennent pas dans celle des réglages. */}
          {recap.pieces.map((piece) => (
            <RecapFile key={piece.nom} name={piece.nom} csv={piece.csv} />
          ))}
        </div>
      )}
    </div>
  )
}
