/**
 * QUOI     — tests de lib/access.ts : ce qu'un visiteur sans compte ne voit pas.
 * POURQUOI — la logique pure se teste ici, sans navigateur (méthode du dépôt : .claude/rules/dev.md).
 */
import { hiddenFromVisitor } from './access'

describe('hiddenFromVisitor', () => {
  it('une fiche privée est cachée sans session, jamais à une session ouverte', () => {
    expect(hiddenFromVisitor(true, false)).toBe(true)
    expect(hiddenFromVisitor(true, true)).toBe(false)
    expect(hiddenFromVisitor(false, false)).toBe(false)
  })
})
