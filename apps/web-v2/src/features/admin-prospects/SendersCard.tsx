/**
 * QUOI     — le bloc « Expéditeurs » : une ligne par adresse @equipe.flw.sh, sa signature, ses envois
 *            du jour face au palier conseillé, son état.
 * POURQUOI — chaque prospectant écrit depuis sa propre adresse (Uriel, 16/10/2026) ; le palier
 *            rappelle la montée en charge d'un domaine neuf, sans rien bloquer.
 */
import { AtSign } from 'lucide-react'
import { AdminCard } from '@/components/ui/AdminCard'
import type { Sender } from './useProspect'

interface Props {
  senders: Sender[]
  onEdit: (sender: Sender) => void
}

export function SendersCard({ senders, onEdit }: Props) {
  return (
    <AdminCard title="Expéditeurs" Icon={AtSign} tone="bleu">
      {senders.length === 0 && (
        <p className="templates-empty">
          Aucune adresse pour l’instant : « Ajouter un expéditeur » crée la tienne.
        </p>
      )}
      <ul className="templates-list">
        {senders.map((s) => (
          <li key={s.id} className="templates-row">
            <span className="templates-row__main">
              <span className="templates-row__name">{s.user_name ?? s.display_name}</span>
              <span className="templates-row__meta">{s.alias}@equipe.flw.sh</span>
            </span>
            <span className="templates-row__main">
              <span className="templates-row__text">Signature</span>
              <span className="templates-row__meta">{s.signature || '—'}</span>
            </span>
            <span className="templates-row__main">
              <span className="templates-row__text">
                {s.envoyes_aujourdhui} envoyés aujourd’hui
              </span>
              <span
                className={
                  s.envoyes_aujourdhui > s.palier
                    ? 'templates-row__meta templates-row__meta--alert'
                    : 'templates-row__meta'
                }
              >
                palier conseillé : {s.palier} par jour
              </span>
            </span>
            <span className={s.active ? 'type-chip type-chip--sauge' : 'type-chip type-chip--gris'}>
              {s.active ? 'Actif' : 'Désactivé'}
            </span>
            <button
              type="button"
              className="sheet-link sheet-link--button"
              onClick={() => onEdit(s)}
            >
              Modifier
            </button>
          </li>
        ))}
      </ul>
    </AdminCard>
  )
}
