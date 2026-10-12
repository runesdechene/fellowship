# components/map — la carte

- `EventMap.tsx` — la carte d'un événement (lot 13) : fond OpenFreeMap aux couleurs de l'app, l'épingle
  de l'événement, celle du point de départ et le trait à vol d'oiseau. Export par défaut, à charger par
  `lazy(() => import('@/components/map/EventMap'))` : maplibre ne part qu'avec qui ouvre la carte.
