/**
 * QUOI     — le contenu d'une étape de l'arrivée : sur-titre, titre, phrase, et ses champs.
 * POURQUOI — maquettes 2102:72 (marque), 2244:2 (prénom), 2244:53 (adresse) ; le métier et la
 *            ville suivent le même gabarit (lot 10a, textes validés dans la spec).
 */
import type { ReactNode } from 'react'
import { cleanSlug } from '@/lib/vitrine-edit'
import type { WelcomeDraft, WelcomeStep } from '@/lib/welcome'
import type { SlugState } from './useSlugFree'

const TEXTS: Record<WelcomeStep, { over: string; title: string; lead: string }> = {
  brand: {
    over: 'Ton enseigne',
    title: 'Comment s’appelle ta marque ?',
    lead: 'Le nom que tes clients voient sur ton stand.',
  },
  firstName: {
    over: 'Toi',
    title: 'Et toi, qui tiens le stand ?',
    lead: 'Ton prénom, pour que les autres exposants sachent à qui ils parlent.',
  },
  craft: {
    over: 'Ton enseigne',
    title: 'Que fabriques-tu ?',
    lead: 'Ton métier, en quelques mots. Tu pourras le préciser sur ta vitrine.',
  },
  place: {
    over: 'Ton enseigne',
    title: 'Où est ton atelier ?',
    lead: 'Pour que les exposants et les festivals proches te trouvent.',
  },
  address: {
    over: 'Ton enseigne',
    title: 'Ton adresse sur Fellowship',
    lead: 'Ta vitrine, ton calendrier et ton QR code vivront ici.',
  },
}

const SLUG_SAYS: Record<SlugState, string> = {
  checking: 'Vérification…',
  free: '✓ Libre — tu pourras la changer plus tard',
  taken: 'Déjà prise',
  unknown: '',
}

interface FieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  inputMode?: 'numeric' | 'text'
  autoFocus?: boolean
  prefix?: string
  note?: ReactNode
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  autoFocus,
  prefix,
  note,
}: FieldProps) {
  return (
    <label className="door__field">
      <span className="door__label">{label}</span>
      <span className="door__input">
        {prefix && <span className="welcome__prefix">{prefix}</span>}
        <input
          value={value}
          placeholder={placeholder}
          inputMode={inputMode}
          autoFocus={autoFocus}
          maxLength={60}
          onChange={(event) => {
            onChange(event.target.value)
          }}
        />
      </span>
      {note}
    </label>
  )
}

interface WelcomeStepFieldsProps {
  step: WelcomeStep
  number: number
  total: number
  draft: WelcomeDraft
  slug: string
  slugState: SlugState
  slugProblem: string | null
  set: (patch: Partial<WelcomeDraft>) => void
  children?: ReactNode
}

export function WelcomeStepFields({
  step,
  number,
  total,
  draft,
  slug,
  slugState,
  slugProblem,
  set,
  children,
}: WelcomeStepFieldsProps) {
  const text = TEXTS[step]
  const slugNote = slugProblem ?? SLUG_SAYS[slugState]
  return (
    <>
      <div className="door__head">
        <p className="welcome__over">
          {text.over} · étape {number} sur {total}
        </p>
        <h1 className="door__title" tabIndex={-1}>
          {text.title}
        </h1>
        <p className="door__lead">{text.lead}</p>
      </div>
      {step === 'brand' && (
        <Field
          label="Nom de la marque"
          value={draft.brand}
          autoFocus
          onChange={(brand) => set({ brand })}
        />
      )}
      {step === 'firstName' && (
        <Field
          label="Ton prénom"
          value={draft.firstName}
          autoFocus
          onChange={(firstName) => set({ firstName })}
        />
      )}
      {step === 'craft' && (
        <Field
          label="Ton métier"
          value={draft.craft}
          placeholder="Maroquinerie, céramique, bijoux…"
          autoFocus
          onChange={(craft) => set({ craft })}
        />
      )}
      {step === 'place' && (
        <div className="welcome__pair">
          <Field label="Ville" value={draft.city} autoFocus onChange={(city) => set({ city })} />
          <Field
            label="Code postal"
            value={draft.postalCode}
            inputMode="numeric"
            onChange={(postalCode) => set({ postalCode })}
          />
        </div>
      )}
      {step === 'address' && (
        <>
          <Field
            label="Ton adresse"
            value={slug}
            prefix="flw.sh/"
            autoFocus
            onChange={(value) => set({ slug: cleanSlug(value), slugTouched: true })}
            note={
              slugNote && (
                <span
                  className={
                    slugState === 'free' && !slugProblem
                      ? 'welcome__note welcome__note--free'
                      : 'welcome__note welcome__note--problem'
                  }
                >
                  {slugNote}
                </span>
              )
            }
          />
          <Field
            label="Un code de parrainage ? Facultatif"
            value={draft.referral}
            placeholder="Ex. RUNES-4F2K"
            onChange={(referral) => set({ referral: referral.replace(/\s/g, '').toUpperCase() })}
            note={<span className="welcome__note">Le parrain et toi gagnez un mois de Pro.</span>}
          />
        </>
      )}
      {children}
    </>
  )
}
