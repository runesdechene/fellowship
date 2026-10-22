/**
 * QUOI     — remplir un modèle d'e-mail de prospection avec ce qu'on sait du prospect, choisir le
 *            modèle proposé à l'ouverture, et l'accroche d'un relais.
 * POURQUOI — le prospectant choisit un modèle et retouche le texte rempli (spec messagerie) ; un
 *            emplacement vide s'efface proprement.
 */
interface Known {
  name: string | null
  brand: string | null
  activity: string | null
  city: string | null
  source: string | null
}

export function templateValues(p: Known): Record<string, string> {
  return {
    prénom: (p.name ?? '').trim().split(/\s+/)[0] ?? '',
    marque: p.brand ?? '',
    activité: p.activity ?? '',
    ville: p.city ?? '',
    source: p.source ?? '',
  }
}

export function fillTemplate(text: string, values: Record<string, string>): string {
  return text
    .replace(/ ?\{([a-zéèêàç]+)\}/g, (whole, key: string) => {
      const value = values[key]
      if (value === undefined) return whole
      return value ? `${whole.startsWith(' ') ? ' ' : ''}${value}` : ''
    })
    .replace(/ +,/g, ',')
}

interface Bodies {
  body: string
  body_feminine: string | null
}

/**
 * Le texte d'un modèle pour ce prospect. Un seul texte est neutre : il sert pour tous. Avec un
 * second, le premier est le masculin et le second le féminin ; sans genre connu, le masculin.
 */
export function templateBody(template: Bodies, gender: string | null): string {
  return gender === 'femme' && template.body_feminine ? template.body_feminine : template.body
}

/** Le modèle s'accorde, mais on ne sait pas comment écrire à ce prospect. */
export function genderMissing(template: Bodies, gender: string | null): boolean {
  return Boolean(template.body_feminine) && !gender
}

/** « Je prends le relais de Mathéo. » quand le dernier e-mail venait d'un autre prospectant. */
export function relayIntro(previous: string | null): string {
  return previous ? `Je prends le relais de ${previous}. ` : ''
}

/**
 * Le modèle proposé à l'ouverture : celui demandé par l'adresse (`?modele=bienvenue`), sinon le
 * premier « premier contact » tant qu'aucun e-mail n'est parti, sinon aucun (réponse libre).
 */
export function pickTemplate(
  templates: readonly { id: string; kind: string; archived_at: string | null }[],
  wanted: string | null,
  hasOutgoing: boolean,
): string | null {
  const kind = wanted ?? (hasOutgoing ? null : 'premier_contact')
  if (!kind) return null
  return templates.find((t) => t.kind === kind && !t.archived_at)?.id ?? null
}

/** Qui écrivait avant moi : le dernier expéditeur sortant, s'il n'est pas moi. */
export function previousWriter(
  messages: readonly {
    direction: string
    sender_user_id: string | null
    sender_name: string | null
  }[],
  me: string,
): string | null {
  const last = [...messages].reverse().find((m) => m.direction === 'out')
  if (!last?.sender_user_id || last.sender_user_id === me) return null
  return last.sender_name
}
