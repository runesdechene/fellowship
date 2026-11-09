/**
 * QUOI     — les Réglages du reporting (`/reporting/reglages`) : l'entreprise, les ventes, les
 *            sources, SuperPDP, les alertes, l'expert-comptable, l'abonnement.
 * POURQUOI — maquette 2803:233, validée le 09/11/2026. Ce qui ne se règle pas d'un clic (passer en
 *            production, la date du premier envoi réel) s'affiche sans se modifier.
 * ATTENTION — absents tant qu'ils n'existent pas côté serveur : « Délai avant l'envoi » (une
 *            constante en attendant SuperPDP), « Tester » une source, l'état des identifiants et de
 *            la réception des factures (ils se lisent chez SuperPDP, par la fonction quotidienne).
 */
import { type ReactNode, useState } from 'react'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Segmented } from '@/components/ui/Segmented'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { useAuth } from '@/lib/auth'
import { formatFullDateOrdinal, parseSqlDate } from '@/lib/dates'
import { formatSiren, REGIMES, SOURCE_NAMES } from '@/lib/reporting'
import { SettingCard, SettingRow } from '@/features/settings/SettingRow'
import { type CompanyPatch, useReportingSettings } from './useReportingSettings'

const REGIME_OPTIONS = Object.entries(REGIMES).map(([value, label]) => ({ value, label }))
const SALE_DATES = [
  { value: 'commande', label: 'Commande' },
  { value: 'expedition', label: 'Expédition' },
]

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
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

/** Une adresse e-mail, enregistrée en quittant le champ ; vide, elle s'efface. */
function EmailSetting({
  value,
  placeholder,
  onSave,
}: {
  value: string | null
  placeholder: string
  onSave: (next: string | null) => void
}) {
  const [draft, setDraft] = useState(value ?? '')
  const clean = draft.trim()
  const invalid = clean !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)
  return (
    <input
      type="email"
      className="setting-input"
      value={draft}
      placeholder={placeholder}
      aria-invalid={invalid}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        if (!invalid && clean !== (value ?? '')) onSave(clean === '' ? null : clean)
      }}
    />
  )
}

export function ReportingSettingsPage({ entityId }: { entityId: string }) {
  const { entities } = useAuth()
  const { company, sources, error, problem, save, toggleSource } = useReportingSettings(entityId)
  const [stopping, setStopping] = useState(false)
  if (error) return <p className="admin-page__error">{error}</p>
  if (!company) return null

  const entity = entities.find((candidate) => candidate.actor_id === entityId)
  const update = (patch: CompanyPatch) => void save(patch)

  return (
    <div className="admin-page reporting-settings">
      <header className="reporting__head">
        <div className="admin-home__head">
          <h1 className="admin-home__title">Réglages</h1>
          <p className="admin-page__lede">
            Le reporting de {entity?.brand_name ?? 'ton enseigne'} : ce qui est déclaré, d’où
            viennent les chiffres, qui est prévenu.
          </p>
        </div>
        <span className="reporting-settings__saved">Chaque changement s’enregistre aussitôt</span>
      </header>
      {problem && <p className="admin-page__error">{problem}</p>}

      <div className="reporting-settings__sections">
        <Section title="L’entreprise" note="Repris de ta fiche enseigne.">
          <SettingRow title="Nom légal">
            {entity?.legal_name ?? 'À remplir dans tes réglages'}
          </SettingRow>
          <SettingRow title="SIREN" note="Doit être le même que sur ton compte SuperPDP.">
            {entity?.siren ? formatSiren(entity.siren) : 'À remplir dans tes réglages'}
          </SettingRow>
          <SettingRow
            title="Régime de TVA"
            note="Fixe le calendrier des déclarations : par décade au réel normal mensuel, chaque mois sinon."
          >
            <Select
              label="Régime de TVA"
              value={company.regime_tva}
              options={REGIME_OPTIONS}
              onChange={(regime_tva) => update({ regime_tva })}
            />
          </SettingRow>
        </Section>

        <Section title="Les ventes" note="Comment une journée est comptée.">
          <SettingRow
            title="Date d’une vente"
            note="Le jour où une commande compte. À confirmer avec ton expert-comptable."
          >
            <Segmented
              label="Date d’une vente"
              options={SALE_DATES}
              value={company.date_de_vente}
              onChange={(date_de_vente) => update({ date_de_vente })}
            />
          </SettingRow>
          <SettingRow
            title="Ce qui bloque une journée"
            note="Vente hors de France, taux autre que 20 %, devise autre que l’euro, client entreprise, carte cadeau, total négatif. Tu valides la journée à la main."
          >
            <span className="reporting-settings__fixed">
              <Lock size={14} strokeWidth={2} aria-hidden="true" />
              Toujours
            </span>
          </SettingRow>
        </Section>

        <Section title="Les sources" note="Lues chaque matin.">
          {sources.map((source) => (
            <SettingRow
              key={source.id}
              title={SOURCE_NAMES[source.type] ?? source.type}
              note={source.identifiant}
            >
              <Switch
                on={source.actif}
                label={`Lire ${SOURCE_NAMES[source.type] ?? source.type}`}
                onToggle={() => void toggleSource(source)}
              />
            </SettingRow>
          ))}
          <SettingRow
            title="Stripe"
            note="Jamais lu : ses paiements sont déjà comptés dans Shopify."
          >
            Ignoré
          </SettingRow>
        </Section>

        <Section
          title="SuperPDP"
          note="La plateforme agréée qui transmet tes ventes à l’administration."
        >
          <SettingRow
            title="Environnement"
            note="La production s’ouvre à la main dans la base, jamais depuis cet écran."
          >
            <span
              className={
                company.environnement === 'sandbox'
                  ? 'reporting-chip reporting-chip--sent'
                  : 'reporting-chip reporting-chip--validated'
              }
            >
              {company.environnement === 'sandbox' ? 'Bac à sable' : 'Production'}
            </span>
          </SettingRow>
          <SettingRow
            title="Premier envoi réel"
            note="Rien ne part à l’administration avant cette date."
          >
            {company.envoi_a_partir_du
              ? formatFullDateOrdinal(parseSqlDate(company.envoi_a_partir_du))
              : 'Pas encore fixé'}
          </SettingRow>
        </Section>

        <Section
          title="Les alertes"
          note="Un seul e-mail, seulement quand il y a quelque chose à faire."
        >
          <SettingRow
            title="Adresse d’alerte"
            note="Journée à vérifier, source muette, déclaration refusée."
          >
            <EmailSetting
              value={company.alerte_email}
              placeholder="L’adresse de ton compte"
              onSave={(alerte_email) => update({ alerte_email })}
            />
          </SettingRow>
          <SettingRow
            title="Rappel avant échéance"
            note="Trois jours avant, si une journée de la décade n’est pas partie."
          >
            <Switch
              on={company.rappel_echeance}
              label="Rappel avant échéance"
              onToggle={() => update({ rappel_echeance: !company.rappel_echeance })}
            />
          </SettingRow>
        </Section>

        <Section
          title="L’expert-comptable"
          note="Pour que ta déclaration de TVA colle aux chiffres envoyés."
        >
          <SettingRow
            title="Récapitulatif mensuel"
            note="Le 3 de chaque mois, les totaux du mois précédent par décade."
          >
            <Switch
              on={company.recap_comptable}
              label="Récapitulatif mensuel"
              onToggle={() => update({ recap_comptable: !company.recap_comptable })}
            />
          </SettingRow>
          <SettingRow
            title="Adresse de collecte Pennylane"
            note="Le récapitulatif y arrive comme une pièce comptable."
          >
            <EmailSetting
              value={company.recap_comptable_email}
              placeholder="collecte@…pennylane.com"
              onSave={(recap_comptable_email) => update({ recap_comptable_email })}
            />
          </SettingRow>
        </Section>

        <Section title="L’abonnement">
          <SettingRow
            title="Reporting"
            note="4 € HT par mois, en plus de ton forfait, sur la même facture."
          >
            4 € HT / mois
          </SettingRow>
          {company.actif ? (
            <SettingRow
              title="Arrêter le reporting"
              note="Plus rien n’est déclaré pour cette enseigne. Les journées déjà envoyées restent chez SuperPDP."
            >
              <Button className="reporting-settings__stop" onClick={() => setStopping(true)}>
                Arrêter
              </Button>
            </SettingRow>
          ) : (
            <SettingRow
              title="Le reporting est arrêté"
              note="Rien n’est déclaré pour cette enseigne."
            >
              <Button onClick={() => update({ actif: true })}>Reprendre</Button>
            </SettingRow>
          )}
        </Section>
      </div>

      {stopping && (
        <ConfirmDialog
          title="Arrêter le reporting ?"
          text="Plus aucune journée ne sera déclarée. Sans déclaration, l’amende est de 500 € par envoi manquant."
          confirmLabel="Arrêter"
          busy={false}
          problem={null}
          onConfirm={() => {
            setStopping(false)
            update({ actif: false })
          }}
          onClose={() => setStopping(false)}
        />
      )}
    </div>
  )
}
