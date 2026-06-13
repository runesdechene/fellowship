import { describe, it, expect } from 'vitest'
import { buildEmbedSnippet } from './embed-snippet'

describe('buildEmbedSnippet', () => {
  it('auto → src ?theme=auto, hauteur de repli 600, script embed.js', () => {
    const s = buildEmbedSnippet({ slug: 'rune-de-chene', theme: 'auto' })
    expect(s).toContain('https://flw.sh/@rune-de-chene/embed?theme=auto')
    expect(s).toContain('height:600px')
    expect(s).toContain('data-flwsh-embed')
    expect(s).toContain('<script src="https://flw.sh/embed.js" async></script>')
  })

  it('light → src ?theme=light', () => {
    const s = buildEmbedSnippet({ slug: 'rune-de-chene', theme: 'light' })
    expect(s).toContain('/embed?theme=light')
  })
})
