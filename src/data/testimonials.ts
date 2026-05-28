// Témoignages d'exposants pour la Landing. UGC social proof, pas une story founder.
//
// Règle d'or : gain CONCRET vécu, pas approbation générique.
// ❌ "J'adore Fellowship !"
// ✅ "J'ai postulé à 12 festivals en 1h ce dimanche, au lieu d'un weekend en mails."
//
// Diversité à viser sur les 6 (cible V1) : marque vêtement, céramique, bijoux,
// musique/spoken, alimentation artisanale, + 1 nouveau ou 1 vétéran.
//
// Avatar : photo carrée idéale. Fallback = initials sur fond couleur de marque
// (géré par le composant si avatarUrl est null).
//
// `entitySlug` (optionnel) : lien vers leur vitrine Fellowship (preuve qu'ils sont actifs).

export interface Testimonial {
  /** Prénom (ou prénom + initiale si plusieurs). */
  name: string
  /** Métier + lieu pour ancrer la crédibilité. Ex: "Céramiste — Provence". */
  craft: string
  /** 1-2 phrases. Idéalement chiffré + temporel. */
  quote: string
  /** URL avatar carré (publique ou Supabase storage). null = initials fallback. */
  avatarUrl: string | null
  /** Optionnel : slug Fellowship pour linker vers la vitrine de la personne. */
  entitySlug?: string
}

// PLACEHOLDERS — à remplacer par Uriel avec de vrais témoignages récoltés.
// Garder le format (concret, chiffré, temporel) lors du remplacement.
export const testimonials: Testimonial[] = [
  {
    name: 'Élise',
    craft: 'Céramiste — Provence',
    quote: "J'ai postulé à 12 festivals en une heure ce dimanche. Avant je perdais mes weekends à chercher les contacts dans mes mails de l'année dernière.",
    avatarUrl: null,
  },
  {
    name: 'Mathieu',
    craft: 'Marque de vêtements — Bretagne',
    quote: "Pour la première fois je sais où j'expose en juillet entier. Avant je découvrais mes dates à 3 jours du festival.",
    avatarUrl: null,
  },
  {
    name: 'Sarah',
    craft: 'Bijoux artisanaux — Lyon',
    quote: "Voir où vont mes copines exposantes m'a fait découvrir 4 festivals dont j'avais jamais entendu parler. La communauté c'est tout.",
    avatarUrl: null,
  },
  {
    name: 'Jules',
    craft: 'Brasseur artisanal — Vosges',
    quote: "Le cockpit m'a fait gagner 6h par semaine de gestion. Plus de post-it, plus de fichiers Excel qui se perdent.",
    avatarUrl: null,
  },
  {
    name: 'Camille',
    craft: 'Verrière — Normandie',
    quote: "Mes abonnés voient quand je viens à un festival près de chez eux. J'ai doublé mes ventes au stand depuis que j'utilise Fellowship.",
    avatarUrl: null,
  },
  {
    name: 'Thomas',
    craft: 'Spoken word — Toulouse',
    quote: "10 ans que je fais le circuit. C'est la première plateforme qui me parle sans me forcer dans une case de catalogue.",
    avatarUrl: null,
  },
]
