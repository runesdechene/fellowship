/**
 * QUOI     — tests de la peinture du fond de carte : quelle couleur pour quelle couche.
 * POURQUOI — lot 13 : le fond OpenFreeMap est recoloré aux couleurs de l'app ; une couche oubliée se
 *            verrait en bleu ou en vert vif au milieu du papier.
 */
import { describe, expect, test } from 'vitest'
import { layerPaint, type MapPalette } from './map-style'

const palette: MapPalette = {
  land: '#land',
  landAlt: '#alt',
  water: '#water',
  green: '#green',
  building: '#bati',
  road: '#road',
  roadMajor: '#major',
  text: '#text',
  halo: '#halo',
}

describe('layerPaint', () => {
  test('le fond, l’eau, la verdure, les bâtiments', () => {
    expect(layerPaint({ id: 'background', type: 'background' }, palette)).toEqual([
      ['background-color', '#land'],
    ])
    expect(layerPaint({ id: 'water', type: 'fill' }, palette)).toEqual([['fill-color', '#water']])
    expect(layerPaint({ id: 'landcover_wood', type: 'fill' }, palette)).toEqual([
      ['fill-color', '#green'],
    ])
    expect(layerPaint({ id: 'building', type: 'fill' }, palette)).toEqual([['fill-color', '#bati']])
    expect(layerPaint({ id: 'landuse_residential', type: 'fill' }, palette)).toEqual([
      ['fill-color', '#alt'],
    ])
  })
  test('les routes, grandes et petites, et les rivières', () => {
    expect(layerPaint({ id: 'highway_motorway', type: 'line' }, palette)).toEqual([
      ['line-color', '#major'],
    ])
    expect(layerPaint({ id: 'highway_minor', type: 'line' }, palette)).toEqual([
      ['line-color', '#road'],
    ])
    expect(layerPaint({ id: 'waterway', type: 'line' }, palette)).toEqual([
      ['line-color', '#water'],
    ])
  })
  test('les noms, avec leur halo', () => {
    expect(layerPaint({ id: 'place_city', type: 'symbol' }, palette)).toEqual([
      ['text-color', '#text'],
      ['text-halo-color', '#halo'],
      ['text-halo-width', 1.4],
    ])
  })
  test('une couche inconnue n’est pas touchée', () => {
    expect(layerPaint({ id: 'x', type: 'hillshade' }, palette)).toEqual([])
  })
})
