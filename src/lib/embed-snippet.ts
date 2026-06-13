import type { EmbedTheme } from './embed-params'

const EMBED_ORIGIN = 'https://flw.sh'
const FALLBACK_HEIGHT = 600

export interface SnippetOpts {
  slug: string
  theme: EmbedTheme
}

export function buildEmbedSnippet({ slug, theme }: SnippetOpts): string {
  const src = `${EMBED_ORIGIN}/@${slug}/embed?theme=${theme}`
  return [
    `<iframe src="${src}"`,
    `        data-flwsh-embed style="width:100%;border:0;height:${FALLBACK_HEIGHT}px;display:block;margin:auto"`,
    `        loading="lazy" title="Calendrier ${slug}"></iframe>`,
    `<script src="${EMBED_ORIGIN}/embed.js" async></script>`,
  ].join('\n')
}
