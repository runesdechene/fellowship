import { decideAccess, toAccessState } from './access'

describe('toAccessState', () => {
  it('attend tant que la session se lit', () => {
    expect(toAccessState({ authLoading: true, hasUser: false, check: 'pending' })).toEqual({ status: 'loading' })
  })
  it('sans compte, ne demande rien à la base', () => {
    expect(toAccessState({ authLoading: false, hasUser: false, check: 'pending' })).toEqual({
      status: 'ready', hasSession: false, hasAccess: false,
    })
  })
  it('attend la réponse de la base pour un compte connecté', () => {
    expect(toAccessState({ authLoading: false, hasUser: true, check: 'pending' })).toEqual({ status: 'loading' })
  })
  it('traduit la réponse de la base', () => {
    expect(toAccessState({ authLoading: false, hasUser: true, check: 'allowed' })).toEqual({
      status: 'ready', hasSession: true, hasAccess: true,
    })
    expect(toAccessState({ authLoading: false, hasUser: true, check: 'refused' })).toEqual({
      status: 'ready', hasSession: true, hasAccess: false,
    })
    expect(toAccessState({ authLoading: false, hasUser: true, check: 'error' })).toEqual({ status: 'error' })
  })
})

describe('decideAccess', () => {
  it('attend pendant le chargement', () => {
    expect(decideAccess({ status: 'loading' })).toBe('wait')
  })
  it('envoie un visiteur sans session vers la connexion de la V2', () => {
    expect(decideAccess({ status: 'ready', hasSession: false, hasAccess: false })).toBe('login')
  })
  it('ouvre la V2 à un admin', () => {
    expect(decideAccess({ status: 'ready', hasSession: true, hasAccess: true })).toBe('allow')
  })
  it('renvoie un compte non admin vers la V1', () => {
    expect(decideAccess({ status: 'ready', hasSession: true, hasAccess: false })).toBe('leave')
  })
  it('renvoie vers la V1 si la vérification échoue, plutôt qu’un écran blanc', () => {
    expect(decideAccess({ status: 'error' })).toBe('leave')
  })
})
