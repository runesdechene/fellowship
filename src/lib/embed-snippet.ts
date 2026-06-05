import type { EmbedView, EmbedTheme } from './embed-params'

const EMBED_ORIGIN = 'https://flw.sh'
const FALLBACK_HEIGHT: Record<EmbedView, number> = { mini: 360, full: 600 }

export interface SnippetOpts {
  slug: string
  view: EmbedView
  theme: EmbedTheme
}

export function buildEmbedSnippet({ slug, view, theme }: SnippetOpts): string {
  const src = `${EMBED_ORIGIN}/@${slug}/embed?view=${view}&theme=${theme}`
  const height = FALLBACK_HEIGHT[view]
  return [
    `<iframe src="${src}"`,
    `        data-flwsh-embed style="width:100%;border:0;height:${height}px;display:block;margin:auto"`,
    `        loading="lazy" title="Calendrier ${slug}"></iframe>`,
    `<script src="${EMBED_ORIGIN}/embed.js" async></script>`,
  ].join('\n')
}
