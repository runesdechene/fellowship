/**
 * QUOI     — sépare une réponse reçue du message cité qu'elle recopie (« Le … a écrit : », « > »).
 * POURQUOI — le fil montre ce que le prospect a écrit ; la citation se déplie à la demande.
 */
const QUOTE_START = /^(Le .+ a écrit\s?:|On .+ wrote:|>)/m

export function splitQuoted(text: string): { main: string; quoted: string } {
  const match = QUOTE_START.exec(text)
  if (!match) return { main: text.trim(), quoted: '' }
  return { main: text.slice(0, match.index).trim(), quoted: text.slice(match.index).trim() }
}
