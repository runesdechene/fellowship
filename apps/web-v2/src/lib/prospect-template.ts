/**
 * QUOI     — remplir un modèle d'e-mail de prospection avec ce qu'on sait du prospect, et
 *            l'accroche d'un relais.
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

/** « Je prends le relais de Mathéo. » quand le dernier e-mail venait d'un autre prospectant. */
export function relayIntro(previous: string | null): string {
  return previous ? `Je prends le relais de ${previous}. ` : ''
}
