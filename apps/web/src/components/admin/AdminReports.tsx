import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, ExternalLink, Check, XCircle, Flag } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useAdminReports } from '@/hooks/use-content-reports'
import { formatReason, type ReportStatus } from '@/lib/content-reports'
import { ResolveReportModal } from './ResolveReportModal'
import './AdminReports.css'
// Réutilise les styles .report-modal-* pour ResolveReportModal
import '@/components/reports/ReportContentModal.css'

const TABS: Array<{ key: ReportStatus | 'all'; label: string }> = [
  { key: 'pending', label: 'À traiter' },
  { key: 'resolved', label: 'Résolus' },
  { key: 'dismissed', label: 'Rejetés' },
]

export function AdminReports() {
  const navigate = useNavigate()
  const { currentActor } = useAuth()
  const [tab, setTab] = useState<ReportStatus | 'all'>('pending')
  const [resolving, setResolving] = useState<{ id: string; action: 'resolved' | 'dismissed' } | null>(null)
  const { reports, loading, refetch } = useAdminReports(tab)

  return (
    <div className="admin-reports">
      <div className="admin-reports-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={tab === t.key ? 'on' : ''}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="admin-reports-empty"><Loader2 className="animate-spin" /></div>
      ) : reports.length === 0 ? (
        <div className="admin-reports-empty"><Flag /><span>Aucun signalement dans cette catégorie</span></div>
      ) : (
        <ul className="admin-reports-list">
          {reports.map(r => (
            <li key={r.id} className="admin-report">
              <div className="admin-report-head">
                <div className="admin-report-reporter">
                  {r.reporter_avatar_url ? (
                    <img src={r.reporter_avatar_url} alt="" />
                  ) : (
                    <div className="av-fallback">{(r.reporter_label ?? '?')[0]?.toUpperCase()}</div>
                  )}
                  <span><b>{r.reporter_label ?? 'Anonyme'}</b> · {new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                <span className={`admin-report-reason reason-${r.reason}`}>{formatReason(r.reason)}</span>
              </div>

              <div className="admin-report-target">
                <span className="label">Cible {r.target_type === 'event' ? '· festival' : '· profil'} :</span>
                <button className="link" onClick={() => navigate(r.target_url)}>
                  {r.target_label} <ExternalLink strokeWidth={1.8} />
                </button>
              </div>

              {r.comment && (
                <p className="admin-report-comment">« {r.comment} »</p>
              )}

              {r.status === 'pending' && (
                <div className="admin-report-actions">
                  <button className="btn-resolve" onClick={() => setResolving({ id: r.id, action: 'resolved' })}>
                    <Check strokeWidth={2.2} /> Résoudre
                  </button>
                  <button className="btn-dismiss" onClick={() => setResolving({ id: r.id, action: 'dismissed' })}>
                    <XCircle strokeWidth={2.2} /> Rejeter
                  </button>
                </div>
              )}

              {r.status !== 'pending' && (
                <div className="admin-report-resolved">
                  <span className={`badge status-${r.status}`}>{r.status === 'resolved' ? 'Résolu' : 'Rejeté'}</span>
                  {r.admin_note && <p>« {r.admin_note} »</p>}
                  {r.resolved_at && <small>{new Date(r.resolved_at).toLocaleDateString('fr-FR')}</small>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {resolving && currentActor && (
        <ResolveReportModal
          reportId={resolving.id}
          action={resolving.action}
          adminActorId={currentActor.id}
          onClose={() => setResolving(null)}
          onResolved={async () => {
            setResolving(null)
            await refetch()
          }}
        />
      )}
    </div>
  )
}
