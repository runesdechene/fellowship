/**
 * QUOI     — l'exposant de démonstration de la landing : son nom, ses statuts, ses montants, les
 *            prénoms de sa discussion et de ses compagnons, les champs de son dossier.
 * POURQUOI — option B du lot 11c (Uriel, 14/10/2026) : tout ce qui vit sur Fellowship vient de la
 *            base, seule la « personne » est une démonstration. Elle vit ici, et nulle part ailleurs.
 * ATTENTION — jamais le nom ni le logo d'un vrai exposant, jamais Runes de Chêne : un vrai compte
 *            montrerait de vrais chiffres. Rien d'ici n'entre dans la base.
 */
export type DemoStatus = 'interesse' | 'envoye' | 'inscrit'

export const DEMO = {
  name: 'Atelier Corne & Cuir',
  initials: 'AC',
  craft: 'Maroquinerie',
  /** Le statut de la n-ième date à venir ; la liste se répète. */
  statuses: ['inscrit', 'envoye', 'inscrit', 'interesse', 'envoye', 'interesse'] as DemoStatus[],
  /** « Mes dossiers » : ce qui est versé sur le total, pour les quatre premières dates. */
  dossiers: [
    { paid: 450, total: 450 },
    { paid: 150, total: 450 },
    { paid: 0, total: 320 },
    { paid: 0, total: 280 },
  ],
  /** « Mes bilans » : la saison passée. */
  season: { profit: 4210, best: 1180 },
  /** Les visages de l'ouverture : des initiales, jamais un vrai exposant. */
  faces: ['M', 'L', 'C', 'T', 'A'],
  /** Le fil de la communauté. */
  feed: [
    { initial: 'G', who: 'Gaël · La Forge du Nord', text: 'va à' },
    { initial: 'L', who: 'Lina · Atelier Lune', text: 'a ajouté' },
  ],
  /** « Qui y va » : les compagnons de démonstration. */
  goers: [
    { name: 'Gautier', craft: 'Bijouterie', status: 'inscrit' },
    { name: 'Lina', craft: 'Céramique', status: 'inscrit' },
    { name: 'Tom', craft: 'Coutellerie', status: 'envoye' },
    { name: 'Atelier Sauvage', craft: 'Maroquinerie', status: 'inscrit' },
    { name: 'Forge Lugdunum', craft: 'Coutellerie', status: 'inscrit' },
    { name: 'Les Bijoux d’Ysée', craft: 'Bijouterie', status: 'envoye' },
    { name: 'Papeterie du Rhône', craft: 'Papeterie', status: 'inscrit' },
    { name: 'Atelier de Jeh’', craft: 'Gravure', status: 'inscrit' },
  ] as { name: string; craft: string; status: DemoStatus }[],
  /** Les critères de l'assistant qui part à la chasse. */
  criteria: ['Médiéval, fantasy', 'À moins de 300 km', 'Juin → septembre'],
  /** Le dossier PDF rempli par l'assistant ; la signature reste à l'exposant. */
  pdfFields: [
    ['Raison sociale', 'Atelier Corne & Cuir'],
    ['N° SIRET', '123 456 789 00012'],
    ['Activité', 'Maroquinerie, cuir tanné végétal'],
    ['Dimensions du stand', '3 × 3 m, sous barnum'],
    ['Électricité', 'Oui, une prise 16 A'],
    ['Attestation d’assurance', 'attestation-rc-2027.pdf'],
  ] as [string, string][],
}
