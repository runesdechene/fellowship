/**
 * QUOI     — la barre de la création d'une date : « × Quitter », les quatre étapes, l'état du
 *            brouillon.
 * POURQUOI — maquette 2082:2 (lot 10b) : elle remplace la barre du haut le temps de la création.
 *            Une étape déjà atteinte se rouvre d'un clic ; une étape pas encore atteinte, non.
 */
import { Check, X } from 'lucide-react'
import { Fragment } from 'react'
import { STEPS } from './useEventDraft'

interface CreateBarProps {
  step: number
  /** La plus loin des étapes atteintes. */
  reached: number
  onStep: (step: number) => void
  onQuit: () => void
  draft: 'quiet' | 'kept' | 'refused'
}

export function CreateBar({ step, reached, onStep, onQuit, draft }: CreateBarProps) {
  return (
    <div className="create-bar">
      <button type="button" className="create-bar__quit" onClick={onQuit}>
        <X size={14} strokeWidth={2} />
        Quitter
      </button>
      <ol className="create-bar__steps" aria-label="Étapes">
        {STEPS.map((label, index) => {
          const classes = ['create-bar__step']
          if (index === step) classes.push('create-bar__step--current')
          else if (index <= reached) classes.push('create-bar__step--done')
          const content = (
            <>
              <span className="create-bar__number">{index + 1}</span>
              {label}
            </>
          )
          return (
            <Fragment key={label}>
              {index > 0 && <li className="create-bar__link" aria-hidden="true" />}
              <li>
                {index !== step && index <= reached ? (
                  <button
                    type="button"
                    className={classes.join(' ')}
                    onClick={() => {
                      onStep(index)
                    }}
                  >
                    {content}
                  </button>
                ) : (
                  <span
                    className={classes.join(' ')}
                    aria-current={index === step ? 'step' : undefined}
                  >
                    {content}
                  </span>
                )}
              </li>
            </Fragment>
          )
        })}
      </ol>
      <span className="create-bar__draft" role="status">
        {draft === 'kept' && (
          <>
            <Check size={13} strokeWidth={2} />
            Brouillon enregistré
          </>
        )}
        {draft === 'refused' && 'Brouillon non gardé'}
      </span>
    </div>
  )
}
