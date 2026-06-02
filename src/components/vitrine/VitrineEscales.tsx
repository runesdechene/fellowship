import { Link } from 'react-router-dom'
import { useTags } from '@/hooks/use-tags'
import { eventDurationDays, type SeasonEvent, type CompanionRow } from '@/lib/vitrine'
import { eventPath } from '@/lib/event-link'
import { avatarGradient } from '@/lib/avatar-gradient'

const MOIS = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc']

interface Props {
  events: SeasonEvent[]
  companions: Map<string, CompanionRow[]>
  onEmbed?: () => void
}

export function VitrineEscales({ events, companions, onEmbed }: Props) {
  const { tags } = useTags()
  const tagOf = (name: string) => tags.find(t => t.value === name || t.label === name)
  if (events.length === 0) return null

  return (
    <section className="v-sec">
      <div className="v-sec-h">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><polygon points="16 8 14 14 8 16 10 10" /></svg>
        Prochaines escales <span className="v-sec-c">{events.length} date{events.length !== 1 ? 's' : ''}</span>
        {onEmbed && (
          <button type="button" className="v-embed" onClick={onEmbed} title="Intégrer mon agenda sur mon site">
            <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
            Intégrer à mon site
          </button>
        )}
      </div>
      <div className="v-escales">
        {events.map(e => {
          const d = new Date(e.start_date)
          const comps = companions.get(e.id) ?? []
          const geo = [e.city, e.department ? `(${e.department})` : null].filter(Boolean).join(' ')
          const dur = eventDurationDays(e.start_date, e.end_date)
          return (
            <Link key={e.id} to={eventPath(e)} state={{ from: '/' }} className="v-escale">
              <div className="v-edate"><b>{d.getDate()}</b><span>{MOIS[d.getMonth()]}</span><i>{d.getFullYear()}</i></div>
              <div className="v-eposter">{e.image_url && <img src={e.image_url} alt="" loading="lazy" />}</div>
              <div className="v-einfo">
                <div className="v-en">{e.name}</div>
                {e.tags && e.tags.length > 0 && (
                  <div className="v-etags">
                    {e.tags.slice(0, 3).map(name => {
                      const t = tagOf(name)
                      return <span key={name} className="v-etag" style={t ? { background: t.bg, color: t.color } : undefined}>{t?.label ?? name}</span>
                    })}
                  </div>
                )}
                {geo && (
                  <div className="v-eloc">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
                    {geo}
                  </div>
                )}
                <div className="v-edur">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                  {dur} jour{dur !== 1 ? 's' : ''}
                </div>
                {comps.length > 0 && (
                  <div className="v-ecomp">
                    <div className="v-avs">
                      {comps.slice(0, 2).map(c => (
                        <span key={c.actor_id} style={!c.avatar_url ? { background: avatarGradient(c.label ?? '?') } : undefined}>
                          {c.avatar_url ? <img src={c.avatar_url} alt="" /> : (c.label?.[0]?.toUpperCase() ?? '?')}
                        </span>
                      ))}
                    </div>
                    {comps.length} compagnon{comps.length !== 1 ? 's' : ''} t'y retrouve{comps.length !== 1 ? 'nt' : ''}
                  </div>
                )}
              </div>
              <span className="v-echev" aria-hidden="true">›</span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
