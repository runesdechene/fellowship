import { LegalLayout } from '@/components/legal/LegalLayout'
import { LEGAL } from '@/lib/legal'

export function CGUPage() {
  return (
    <LegalLayout title="Conditions générales d'utilisation" slug="cgu">
      <p>
        Les présentes Conditions Générales d'Utilisation (« CGU ») encadrent
        l'usage gratuit de l'application Fellowship, éditée par {LEGAL.company}.
        L'utilisation du service implique l'acceptation pleine et entière des
        présentes CGU ainsi que de la <a href="/legal/confidentialite">Politique de confidentialité</a>.
      </p>

      <h2>1. Objet</h2>
      <p>
        Les présentes CGU ont pour objet de définir les modalités d'accès et
        d'usage du service Fellowship par les utilisateurs particuliers et
        professionnels, dans son périmètre gratuit.
      </p>

      <h2>2. Inscription et compte</h2>
      <p>
        L'inscription requiert d'avoir au moins 18 ans. L'utilisateur s'engage à
        fournir des informations exactes et à les tenir à jour. L'authentification
        s'effectue par lien magique (sans mot de passe) reçu par courriel. Le
        compte est strictement personnel et incessible.
      </p>

      <h2>3. Acteurs personnels et entités professionnelles</h2>
      <p>
        Un utilisateur peut, en plus de son profil personnel, créer une ou
        plusieurs entités professionnelles (exposants). L'abonnement Pro de
        Fellowship est attaché à l'entité, et non à la personne. Une même
        personne peut donc administrer plusieurs entités, chacune avec son
        propre plan.
      </p>

      <h2>4. Comportements interdits</h2>
      <p>L'utilisateur s'interdit notamment :</p>
      <ul>
        <li>de publier ou diffuser tout contenu illicite, en particulier des
          contenus à caractère haineux, discriminatoire, portant atteinte à des
          mineurs, à la dignité humaine, à la vie privée ou aux droits d'autrui ;</li>
        <li>de porter atteinte à la marque {LEGAL.brand} ou aux droits de
          propriété intellectuelle de tiers ;</li>
        <li>d'effectuer du <em>spam</em> ou des sollicitations commerciales non
          consenties via les fonctions de messagerie ou de commentaire ;</li>
        <li>de procéder à toute extraction automatisée (<em>scraping</em>),
          ingénierie inverse, ou tentative d'altération du fonctionnement du
          service ;</li>
        <li>d'usurper l'identité d'une autre personne, d'une marque ou d'une
          structure.</li>
      </ul>

      <h2>5. Statut d'hébergeur</h2>
      <p>
        Fellowship n'opère pas de contrôle <em>a priori</em> sur les contenus
        publiés par ses utilisateurs. Conformément à l'article 6-I-2 de la loi
        n° 2004-575 du 21 juin 2004 (LCEN), l'éditeur n'est pas tenu d'une
        obligation générale de surveillance mais agit promptement pour retirer
        tout contenu manifestement illicite qui lui aurait été signalé.
      </p>

      <h2>6. Modération</h2>
      <p>
        Fellowship applique la{' '}
        <a href="/legal/charte-communautaire">Charte communautaire</a> à
        l'ensemble des contenus publiés. Les sanctions sont graduées :
      </p>
      <ol>
        <li>Avertissement par courriel.</li>
        <li>Suspension temporaire du compte.</li>
        <li>Suppression définitive du compte.</li>
      </ol>
      <p>
        Chaque décision est documentée par une note administrative et reste
        consultable par l'utilisateur concerné sur simple demande. Tout recours
        peut être adressé à <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>

      <h2>7. Propriété intellectuelle</h2>
      <p>
        La marque {LEGAL.brand}, le logo, l'interface, le code source et les
        textes éditoriaux de Fellowship sont la propriété exclusive de{' '}
        {LEGAL.company}.
      </p>
      <p>
        Les contenus publiés par l'utilisateur (événements, photos, descriptions,
        vitrines, bilans publics) restent sa propriété. L'utilisateur accorde
        toutefois à {LEGAL.company} une <strong>licence non-exclusive, mondiale,
        gratuite et pour la durée d'existence de son compte</strong>, à des fins
        d'affichage, de reproduction technique nécessaire au fonctionnement du
        service, et de promotion du service Fellowship lui-même. Cette licence
        cesse à la suppression du compte.
      </p>

      <h2>8. Responsabilité</h2>
      <p>
        Le service est fourni « en l'état », en phase de développement actif.
        {' '}{LEGAL.company} s'engage à une obligation de moyens, non de résultat,
        s'agissant de la disponibilité, de la conformité et de l'exactitude des
        fonctionnalités. La responsabilité de l'éditeur ne saurait être engagée
        au-delà des pertes directes prévisibles, et dans la limite autorisée par
        la loi applicable.
      </p>

      <h2>9. Suspension et résiliation du compte</h2>
      <p>
        L'utilisateur peut supprimer son compte à tout moment depuis les
        Réglages. {LEGAL.company} peut suspendre ou supprimer un compte en cas
        de manquement grave aux présentes CGU ou à la Charte communautaire,
        avec notification motivée par courriel.
      </p>

      <h2>10. Modification des CGU</h2>
      <p>
        Toute modification substantielle des présentes CGU sera notifiée par
        courriel et par bannière in-app au moins 30 jours avant son entrée en
        vigueur. La poursuite de l'usage du service après ce délai vaut
        acceptation de la nouvelle version.
      </p>

      <h2>11. Loi applicable et juridiction</h2>
      <p>
        Les présentes CGU sont régies par le droit français. Tout litige relatif
        à leur formation, leur exécution ou leur interprétation sera soumis au
        Tribunal Judiciaire de Nice, dans le ressort duquel se situe le siège de{' '}
        {LEGAL.company}.
      </p>
    </LegalLayout>
  )
}
