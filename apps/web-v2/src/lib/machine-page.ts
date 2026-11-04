/**
 * QUOI     — la page qu'un agent IA lit sans exécuter le JavaScript : tête de page, JSON-LD
 *            schema.org et corps en clair, pour une fiche ou une sélection, puis posés dans la coque
 *            de l'application (`index.html`).
 * POURQUOI — sans ça, un agent lit sur flw.sh une coque vide et Fellowship n'existe pas pour lui.
 *            Spec : docs/superpowers/specs/2026-11-03-pages-pour-les-ia-design.md.
 * ATTENTION — tout texte vient de la base, donc de n'importe qui : il est échappé ici, toujours.
 *            Le JSON-LD n'est pas exécuté par le navigateur : la CSP (`script-src 'self'`) ne le
 *            bloque pas et n'a pas à l'autoriser. React remplace le corps au montage.
 */
import { formatDateRange, formatLongRange, parseSqlDate } from './dates'
import { zoneOf } from './regions'
import { reasonOf, type Selection, type SelectionEvent } from './selection'

const SITE = 'https://flw.sh'
// Le titre de la coque, gardé pour le lui rendre quand l'application change de page.
const SHELL_TITLE = 'fellowship:shell-title'

export type MachineEvent = SelectionEvent & {
  description: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
}

export type MachinePage = {
  title: string
  description: string
  canonical: string
  image: string | null
  jsonLd: object
  /** HTML déjà échappé, posé dans `#root`. */
  body: string
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

/** Le texte d'une description riche, sans ses balises ni ses entités (« &amp; » → « & »). */
function plainText(rich: string | null): string {
  return (rich ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#\d+|[a-z]+);/gi, (entity, name: string) =>
      name.startsWith('#')
        ? String.fromCodePoint(Number(name.slice(1)))
        : (ENTITIES[name.toLowerCase()] ?? entity),
    )
    .replace(/\s+/g, ' ')
    .trim()
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Un lien saisi n'est gardé que s'il mène au web : jamais `javascript:` ni `data:`. */
function httpUrl(url: string | null): string | null {
  try {
    return url && ['http:', 'https:'].includes(new URL(url).protocol) ? url : null
  } catch {
    return null
  }
}

function withSafeLinks<T extends SelectionEvent>(event: T): T {
  return {
    ...event,
    registration_url: httpUrl(event.registration_url),
    image_url: httpUrl(event.image_url),
  }
}

function yearOf(event: SelectionEvent): number {
  return parseSqlDate(event.start_date).getFullYear()
}

function eventUrl(event: SelectionEvent): string {
  return `${SITE}/evenements/${encodeURIComponent(event.slug)}`
}

/** « à Vaulruz (Suisse) » */
function placeOf(event: SelectionEvent): string {
  const zone = zoneOf(event)
  return zone ? `à ${event.city} (${zone})` : `à ${event.city}`
}

/** La phrase de faits d'une fiche : dates, lieu, stand, date limite, intérêt. */
function factsOf(event: SelectionEvent): string {
  const when = formatLongRange(parseSqlDate(event.start_date), parseSqlDate(event.end_date))
  const reason = reasonOf(event)
  return `${when} ${placeOf(event)}.${reason ? ` ${capitalize(reason)}.` : ''}`
}

function eventLd(event: MachineEvent | SelectionEvent): Record<string, unknown> {
  const machine = 'address' in event ? event : null
  return {
    '@type': 'Event',
    name: event.name,
    startDate: event.start_date,
    endDate: event.end_date,
    url: eventUrl(event),
    ...(event.image_url && { image: event.image_url }),
    location: {
      '@type': 'Place',
      name: event.city,
      address: {
        '@type': 'PostalAddress',
        ...(machine?.address && { streetAddress: machine.address }),
        addressLocality: event.city,
        // Pays seulement s'il se lit : une fiche suisse saisie par le formulaire arrive en « FR ».
        ...(zoneOf(event) && { addressCountry: event.country }),
      },
      ...(machine?.latitude != null &&
        machine.longitude != null && {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: machine.latitude,
            longitude: machine.longitude,
          },
        }),
    },
    ...(event.registration_url && {
      offers: { '@type': 'Offer', url: event.registration_url, name: 'Candidature exposant' },
    }),
  }
}

export function eventPage(input: MachineEvent): MachinePage {
  const event = withSafeLinks(input)
  const heading = `${event.name} ${String(yearOf(event))}`
  const facts = factsOf(event)
  const text = plainText(event.description)
  const rating =
    event.rating !== null && event.rating_count > 0
      ? `Note des exposants : ${event.rating.toLocaleString('fr-FR')} / 5 (${String(event.rating_count)} avis)`
      : null
  const body = [
    `<main><h1>${escapeHtml(heading)}</h1>`,
    `<p>${escapeHtml(facts)}</p>`,
    event.registration_url &&
      `<p><a href="${escapeHtml(event.registration_url)}">Candidater comme exposant</a></p>`,
    rating && `<p>${escapeHtml(rating)}</p>`,
    text && `<p>${escapeHtml(text)}</p>`,
    '</main>',
  ]
    .filter(Boolean)
    .join('')
  return {
    title: `${heading} · ${event.city} · Fellowship`,
    description: `${facts}${text ? ` ${text}` : ''}`.slice(0, 300),
    canonical: eventUrl(event),
    image: event.image_url,
    jsonLd: {
      '@context': 'https://schema.org',
      ...eventLd(event),
      ...(text && { description: text }),
    },
    body,
  }
}

function lineOf(event: SelectionEvent): string {
  const when = formatDateRange(parseSqlDate(event.start_date), parseSqlDate(event.end_date), 'long')
  const reason = reasonOf(event)
  return (
    `<li><a href="/evenements/${encodeURIComponent(event.slug)}">${escapeHtml(event.name)}</a>` +
    ` — ${escapeHtml(`${when} ${String(yearOf(event))}, ${event.city}`)}` +
    `${reason ? `. ${escapeHtml(reason)}` : ''}</li>`
  )
}

export function selectionPage(selection: Selection, path: string): MachinePage {
  const all = [...selection.top, ...selection.others].map(withSafeLinks)
  const description = `Les ${String(selection.top.length)} dates à ne pas rater, puis toutes les autres : prix du stand, date limite et lien de candidature, choisis par Fellowship.`
  const body = [
    `<main><h1>${escapeHtml(selection.title)}</h1>`,
    `<p>${escapeHtml(description)}</p>`,
    `<ol>${selection.top.map(lineOf).join('')}</ol>`,
    selection.others.length > 0 &&
      `<h2>Les autres dates</h2><ul>${selection.others.map(lineOf).join('')}</ul>`,
    '</main>',
  ]
    .filter(Boolean)
    .join('')
  return {
    title: selection.title,
    description,
    canonical: `${SITE}${path}`,
    image: all[0]?.image_url ?? null,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: selection.title,
      itemListElement: all.map((event, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: eventLd(event),
      })),
    },
    body,
  }
}

/** Pose la page dans la coque de l'application ; le reste du HTML est gardé tel quel. */
export function injectPage(indexHtml: string, page: MachinePage): string {
  // `<` échappé : un texte « </script> » ne peut pas fermer le bloc avant la fin.
  const json = JSON.stringify(page.jsonLd).replace(/</g, '\\u003c')
  const shellTitle = /<title>([\s\S]*?)<\/title>/.exec(indexHtml)?.[1] ?? ''
  const head = [
    `<meta name="${SHELL_TITLE}" content="${shellTitle}" />`,
    `<meta property="og:title" content="${escapeHtml(page.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(page.description)}" />`,
    page.image && `<meta property="og:image" content="${escapeHtml(page.image)}" />`,
    `<link rel="canonical" href="${escapeHtml(page.canonical)}" />`,
    `<script type="application/ld+json">${json}</script>`,
  ]
    .filter(Boolean)
    .join('')
  // Remplacements par fonction : un « $& » saisi dans une fiche reste du texte, pas un motif.
  return indexHtml
    .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escapeHtml(page.title)}</title>`)
    .replace(
      /<meta\s+name="description"[\s\S]*?\/>/,
      () => `<meta name="description" content="${escapeHtml(page.description)}" />`,
    )
    .replace('</head>', () => `${head}</head>`)
    .replace('<div id="root"></div>', () => `<div id="root">${page.body}</div>`)
}

/**
 * Au premier changement d'adresse dans l'application, la tête de page de la fiche servie ne vaut
 * plus : on rend à la coque son titre et on retire ce que `injectPage` avait ajouté.
 */
export function restoreShell(doc: Document): void {
  const shellTitle = doc.querySelector(`meta[name="${SHELL_TITLE}"]`)
  if (!shellTitle) return
  doc.title = shellTitle.getAttribute('content') ?? doc.title
  doc
    .querySelectorAll(
      `meta[name="${SHELL_TITLE}"], meta[property^="og:"], link[rel="canonical"], script[type="application/ld+json"]`,
    )
    .forEach((node) => {
      node.remove()
    })
}
