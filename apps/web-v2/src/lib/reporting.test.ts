/**
 * QUOI     — tests de lib/reporting.ts : décades, échéances, état d'un jour, montants envoyés.
 * POURQUOI — une échéance fausse coûte 500 € : le calendrier se vérifie sans navigateur.
 */
import { describe, expect, it } from 'vitest'
import {
  anomaliesOf,
  dayState,
  declarationState,
  decadeOf,
  decadeTitle,
  decadesOf,
  formatSiren,
  nextDeadline,
  reportingHeadline,
  salesOf,
  sentAmounts,
  toDayStatus,
  silentSources,
  sourceAmount,
} from './reporting'

const day = (iso: string) => new Date(`${iso}T00:00:00`)

describe('decadesOf', () => {
  it('coupe un mois de 30 jours en 10, 10, 10, échéance dix jours après', () => {
    const [first, second, third] = decadesOf(day('2026-11-15'))
    expect(first?.days).toHaveLength(10)
    expect(first?.deadline).toEqual(day('2026-11-20'))
    expect(second?.deadline).toEqual(day('2026-11-30'))
    expect(third?.end).toEqual(day('2026-11-30'))
    expect(third?.deadline).toEqual(day('2026-12-10'))
  })

  it('donne onze jours à la dernière décade d’octobre, huit à celle de février', () => {
    expect(decadesOf(day('2026-10-01'))[2]?.days).toHaveLength(11)
    expect(decadesOf(day('2027-02-01'))[2]?.days).toHaveLength(8)
  })
})

describe('decadeTitle et decadeOf', () => {
  it('écrit « 1er » et range le 11 dans la deuxième décade', () => {
    expect(decadeTitle(decadeOf(day('2026-11-04')))).toBe('Du 1er au 10 novembre')
    expect(decadeOf(day('2026-11-11')).index).toBe(2)
  })
})

describe('nextDeadline', () => {
  it('le 9 novembre, la décade du 21 au 31 octobre est encore due le 10', () => {
    expect(nextDeadline(day('2026-11-09')).deadline).toEqual(day('2026-11-10'))
  })
  it('le 11 novembre, c’est celle du 1er au 10, due le 20', () => {
    expect(nextDeadline(day('2026-11-11')).deadline).toEqual(day('2026-11-20'))
  })
})

describe('dayState', () => {
  const today = day('2026-11-09')
  it('lit le statut quand le jour a une ligne', () => {
    expect(dayState('a_verifier', day('2026-11-04'), today)).toEqual({
      mark: 'verifier',
      label: 'À vérifier',
    })
  })
  it('distingue aujourd’hui, l’avenir et un jour passé pas encore lu', () => {
    expect(dayState(null, today, today).label).toBe('Aujourd’hui')
    expect(dayState(null, day('2026-11-12'), today).label).toBe('À venir')
    expect(dayState(null, day('2026-11-02'), today).mark).toBe('attente')
  })
})

describe('reportingHeadline et toDayStatus', () => {
  it('dit d’abord ce qui bloque, puis ce qui attend, puis jusqu’où tout est parti', () => {
    expect(reportingHeadline(1, 2, null)).toBe('Une journée attend ta vérification.')
    expect(reportingHeadline(0, 2, null)).toBe('2 journées attendent encore une source.')
    expect(reportingHeadline(0, 0, day('2026-11-01'))).toBe(
      'Tout est déclaré jusqu’au 1er novembre.',
    )
  })
  it('groupe un SIREN par trois', () => {
    expect(formatSiren('844256537')).toBe('844 256 537')
  })
  it('refuse un statut inconnu', () => {
    expect(toDayStatus('envoyee')).toBe('envoyee')
    expect(toDayStatus('partie')).toBeNull()
  })
})

describe('montants', () => {
  it('additionne les lignes SuperPDP en centimes', () => {
    const lignes = [
      { tax_exclusive_amount: '118.33', tax_total: '23.67' },
      { tax_exclusive_amount: '10.00', tax_total: '2.00' },
    ]
    expect(sentAmounts(lignes)).toEqual({ ht: 12833, tva: 2567 })
    expect(sentAmounts([])).toBeNull()
  })
  it('lit une source, et la dit muette quand elle vaut null', () => {
    const detail = { shopify: { ttc: 9600 }, sumup: null }
    expect(sourceAmount(detail, 'shopify')).toBe(9600)
    expect(sourceAmount(detail, 'sumup')).toBeNull()
    expect(silentSources(detail)).toEqual(['SumUp'])
  })
  it('lit les anomalies', () => {
    expect(anomaliesOf([{ message: 'une commande part en Belgique', lien: null }])).toEqual([
      { message: 'une commande part en Belgique', detail: null, lien: null },
    ])
  })
})

describe('salesOf', () => {
  test('les ventes gardées par le serveur, Shopify puis SumUp', () => {
    const detail = {
      sumup: { ttc: 100, liste: [{ code: 'T1', ttc: 100, facturee: true }] },
      shopify: { ttc: 200, liste: [{ nom: '#1', ttc: 200, lien: 'l', facturee: false }] },
    }
    expect(salesOf(detail)).toEqual([
      { source: 'shopify', reference: '#1', ttc: 200, link: 'l', invoiced: false },
      { source: 'sumup', reference: 'T1', ttc: 100, link: null, invoiced: true },
    ])
  })

  test('une source muette ne donne aucune vente', () => {
    expect(salesOf({ shopify: null })).toEqual([])
  })
})

describe('declarationState', () => {
  const decade = decadeOf(new Date(2026, 10, 4))
  const entry = (statut: string | null) => [{ debut: '20261101', fin: '20261110', statut }]

  test('la réponse de l’administration', () => {
    expect(declarationState(entry('ppf:ereporting-rejected'), decade)?.label).toBe('Rejetée')
    expect(declarationState(entry('ppf:ereporting-response-ok'), decade)?.label).toBe('Acceptée')
  })

  test('pas encore partie, ou suivi indisponible', () => {
    expect(declarationState([], decade)).toBeNull()
    expect(declarationState(null, decade)).toBeNull()
  })
})
