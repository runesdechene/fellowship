/**
 * QUOI     — la liste des prospects de l'administration : en-tête et boutons, quatre chiffres, le
 *            bandeau des correspondances, recherche, filtres et source, tableau modifiable, pages.
 * POURQUOI — les commerciaux démarchent, notent et voient qui s'inscrit sans quitter le tableau
 *            (spec du lot 3, maquette 2343:2).
 * ATTENTION — chaque écriture recharge tout (chiffres, filtres, correspondances) : une cellule
 *            change parfois le filtre où le prospect apparaît.
 */
import { Plus, Upload } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AdminPager } from '@/components/ui/AdminPager'
import { AdminSearch } from '@/components/ui/AdminSearch'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Segmented } from '@/components/ui/Segmented'
import {
  PROSPECT_FILTERS,
  readProspectsQuery,
  writeProspectsQuery,
  type ProspectsQuery,
} from '@/lib/prospect-list'
import { ImportDialog } from './ImportDialog'
import { MatchBanner } from './MatchBanner'
import { MatchDialog } from './MatchDialog'
import { deleteProspect, insertProspect, unlinkProspect } from './prospect-writes'
import { ProspectsStats } from './ProspectsStats'
import { ProspectsTable } from './ProspectsTable'
import { useProspects, type ProspectRow } from './useProspects'

/** Une action qui demande confirmation : supprimer, ou défaire un rapprochement. */
type Pending = { kind: 'supprimer' | 'defaire'; row: ProspectRow }

function nameOf(row: ProspectRow): string {
  return row.name ?? row.brand ?? row.email ?? 'Ce prospect'
}

export function ProspectsPage() {
  const [search, setSearch] = useSearchParams()
  const query = readProspectsQuery(search)
  const { data, error, reload } = useProspects(query)
  const [adding, setAdding] = useState(false)
  const [importing, setImporting] = useState(false)
  const [matching, setMatching] = useState(false)
  const [pending, setPending] = useState<Pending | null>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  // Seule la recherche change : elle remplace l'entrée d'historique, le retour arrière saute les frappes.
  const go = (next: Partial<ProspectsQuery>) =>
    setSearch(writeProspectsQuery({ ...query, page: 0, ...next }), {
      replace: Object.keys(next).join() === 'q',
    })

  function startAdding() {
    // La nouvelle ligne n'est visible qu'en tête de la liste complète.
    if (search.toString()) setSearch(new URLSearchParams())
    setAdding(true)
  }

  // Un échec laisse la ligne ouverte : la cellule affiche le message.
  async function add(name: string | null) {
    if (name !== null) await insertProspect({ name })
    setAdding(false)
    if (name !== null) reload()
  }

  async function confirm() {
    if (!pending) return
    setBusy(true)
    setProblem(null)
    try {
      if (pending.kind === 'supprimer') await deleteProspect(pending.row.id)
      else await unlinkProspect(pending.row.id)
      setPending(null)
      reload()
    } catch (failure) {
      setProblem(failure instanceof Error ? failure.message : 'L’action n’a pas abouti.')
    } finally {
      setBusy(false)
    }
  }

  const options = PROSPECT_FILTERS.map(({ value, label }) => {
    const count = data?.counts.get(value)
    return { value, label: count === undefined ? label : `${label} · ${count}` }
  })

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <div>
          <h1 className="admin-page__title">Prospects</h1>
          <p className="admin-page__lede">
            Les contacts à démarcher, et ceux qui ont déjà franchi le pas.
          </p>
        </div>
        <div className="prospect-actions">
          <Link to="/admin/prospects/modeles" className="button">
            Modèles et expéditeurs
          </Link>
          <Button onClick={() => setImporting(true)}>
            <Upload size={16} strokeWidth={2} aria-hidden="true" />
            Importer un fichier
          </Button>
          <Button variant="action" onClick={startAdding}>
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            Ajouter un prospect
          </Button>
        </div>
      </header>

      {data?.stats && <ProspectsStats stats={data.stats} />}
      {data && <MatchBanner count={data.matches.length} onOpen={() => setMatching(true)} />}

      <div className="admin-tools">
        <AdminSearch
          value={query.q}
          placeholder="Nom, marque, e-mail ou téléphone"
          onSearch={(q) => go({ q })}
        />
        <Segmented
          label="Filtrer"
          options={options}
          value={query.filter}
          onChange={(filter) => go({ filter })}
        />
        <label className="prospect-source">
          <span className="admin-table__sr">Suivi par</span>
          <select
            className="prospect-source__select"
            value={query.suivi}
            onChange={(event) => go({ suivi: event.target.value })}
          >
            <option value="">Suivi par : tous</option>
            <option value="moi">Suivi par : moi</option>
            {data?.followers.map((f) => (
              <option key={f.id} value={f.id}>
                Suivi par : {f.name}
              </option>
            ))}
          </select>
        </label>
        <label className="prospect-source prospect-source--next">
          <span className="admin-table__sr">Source</span>
          <select
            className="prospect-source__select"
            value={query.source}
            onChange={(event) => go({ source: event.target.value })}
          >
            <option value="">Source : toutes</option>
            {data?.sources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="admin-page__error">{error}</p>}
      {data && (
        <ProspectsTable
          rows={data.rows}
          adding={adding}
          onAdd={add}
          onCancelAdd={() => setAdding(false)}
          onChanged={reload}
          onAskDelete={(row) => setPending({ kind: 'supprimer', row })}
          onAskUnlink={(row) => setPending({ kind: 'defaire', row })}
        />
      )}
      {data && (
        <AdminPager
          page={query.page}
          shown={data.rows.length}
          total={data.total}
          onPage={(page) => go({ page })}
          empty="Aucun prospect ne correspond."
        />
      )}

      {pending && (
        <ConfirmDialog
          title={
            pending.kind === 'supprimer' ? 'Supprimer ce prospect ?' : 'Défaire le rapprochement ?'
          }
          text={
            pending.kind === 'supprimer'
              ? `${nameOf(pending.row)} disparaît de la liste. C’est définitif.`
              : `Le prospect n’est plus relié au compte de ${pending.row.user_name ?? 'cette personne'}.`
          }
          confirmLabel={pending.kind === 'supprimer' ? 'Supprimer' : 'Défaire'}
          busy={busy}
          problem={problem}
          onConfirm={() => void confirm()}
          onClose={() => {
            setPending(null)
            setProblem(null)
          }}
        />
      )}
      {importing && (
        <ImportDialog
          onClose={() => setImporting(false)}
          onDone={() => {
            setImporting(false)
            reload()
          }}
        />
      )}
      {matching && data && (
        <MatchDialog matches={data.matches} onClose={() => setMatching(false)} />
      )}
    </div>
  )
}
