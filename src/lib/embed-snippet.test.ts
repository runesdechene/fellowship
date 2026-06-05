import { describe, it, expect } from 'vitest'
import { buildEmbedSnippet } from './embed-snippet'

describe('buildEmbedSnippet', () => {
  it('vignette auto → src mini+auto, hauteur de repli 360, script embed.js', () => {
    const s = buildEmbedSnippet({ slug: 'rune-de-chene', view: 'mini', theme: 'auto' })
    expect(s).toContain('https://flw.sh/@rune-de-chene/embed?view=mini&theme=auto')
    expect(s).toContain('height:360px')
    expect(s).toContain('data-flwsh-embed')
    expect(s).toContain('<script src="https://flw.sh/embed.js" async></script>')
  })

  it('pleine page light → src full+light, hauteur de repli 600', () => {
    const s = buildEmbedSnippet({ slug: 'rune-de-chene', view: 'full', theme: 'light' })
    expect(s).toContain('view=full&theme=light')
    expect(s).toContain('height:600px')
  })
})
