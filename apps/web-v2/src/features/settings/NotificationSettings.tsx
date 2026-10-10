/**
 * QUOI     — la section Notifications des Réglages : la carte du téléphone, puis les six lignes et
 *            leur interrupteur « Téléphone ».
 * POURQUOI — lot 8e : la cloche reçoit tout ; chaque ligne décide si elle sonne aussi sur le
 *            téléphone (maquettes `2189:302` et `2189:982`).
 * ATTENTION — la liste est grisée et inerte tant que CE téléphone n'est pas activé. Les deux
 *            lignes Pro sont verrouillées si la personne n'a aucune enseigne Pro : un clic ouvre la
 *            bulle du Pro.
 */
import { useState } from 'react'
import { ProBadge } from '@/components/ui/ProBadge'
import { ProBubble } from '@/components/ui/ProBubble'
import { useAuth } from '@/lib/auth'
import { isPro } from '@/lib/plan'
import { PUSH_LINES } from '@/lib/push-lines'
import { usePhonePush } from '@/lib/usePhonePush'
import { usePushMuted } from '@/lib/usePushMuted'
import { PhoneCard } from './PhoneCard'

export function NotificationSettings() {
  const phone = usePhonePush()
  const lines = usePushMuted()
  const { entities } = useAuth()
  const [inviting, setInviting] = useState(false)
  const active = phone.state === 'active'
  const now = new Date()
  const anyPro = entities.some((entity) => isPro(entity, now))

  return (
    <section id="notifications" className="settings-section">
      <div className="settings-section__head">
        <h2 className="settings-section__title">Notifications</h2>
        <p className="settings-section__note">
          Ce qui sonne aussi sur ton téléphone. La cloche, elle, reçoit tout.
        </p>
      </div>
      <PhoneCard phone={phone} />
      <div className={active ? 'push-lines' : 'push-lines push-lines--off'}>
        <p className="push-lines__head">Téléphone</p>
        {PUSH_LINES.map((line) => {
          const locked = line.pro && !anyPro
          const on = !locked && !lines.muted.includes(line.key)
          const classes = ['push-line']
          if (on) classes.push('push-line--on')
          if (locked) classes.push('push-line--locked')
          return (
            <button
              key={line.key}
              type="button"
              role="switch"
              aria-checked={on}
              aria-label={line.title}
              className={classes.join(' ')}
              disabled={!active || lines.saving}
              onClick={() => {
                if (locked) setInviting(true)
                else void lines.toggle(line.key)
              }}
            >
              <span className="push-line__text">
                <span className="push-line__title">
                  {line.title}
                  {line.pro && <ProBadge />}
                </span>
                <span className="push-line__detail">{line.detail}</span>
              </span>
              <span className="push-line__switch" />
            </button>
          )
        })}
      </div>
      {lines.failed && (
        <p className="settings-section__error">Ton choix n’a pas pu être enregistré.</p>
      )}
      {inviting && (
        <ProBubble
          title="Ne rate plus une candidature"
          text="Le Pro te prévient de la clôture des candidatures et des nouvelles éditions."
          onClose={() => {
            setInviting(false)
          }}
        />
      )}
    </section>
  )
}
