/**
 * QUOI     — les tests de lib/activity.ts : la fusion du fil du réseau.
 * POURQUOI — le fil mêle quatre sources ; mal trié ou mal daté, il raconte une autre histoire.
 */
import { describe, expect, it } from 'vitest'
import { mergeFeed } from './activity'

describe('mergeFeed', () => {
  const item = (id: string, iso: string) => ({ id, occurredAt: new Date(iso) })

  it('du plus récent au plus ancien, coupé à la limite', () => {
    const feed = mergeFeed(
      [
        [item('a', '2026-10-05T10:00:00'), item('b', '2026-10-07T10:00:00')],
        [item('c', '2026-10-06T10:00:00')],
      ],
      2,
    )
    expect(feed.map((entry) => entry.id)).toEqual(['b', 'c'])
  })
})
