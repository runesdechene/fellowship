import { LegalLayout } from '@/components/legal/LegalLayout'
import { LEGAL } from '@/lib/legal'

export function ChartePage() {
  return (
    <LegalLayout title="Charte communautaire" slug="charte-communautaire">
      <blockquote>
        Chez Fellowship, on est convaincus qu'un bon outil pro repose sur une
        communauté saine. Voici les règles qu'on applique — courtes, claires,
        et qu'on fait respecter.
      </blockquote>

      <h2>Les six principes</h2>

      <h3>1. Pas de haine, pas de harcèlement, pas de discrimination</h3>
      <p>
        Aucune tolérance pour les contenus visant une personne ou un groupe en
        raison de son origine, de son genre, de son orientation sexuelle, de sa
        religion, de son handicap ou de tout autre critère discriminatoire.
      </p>

      <h3>2. Pas de pub déguisée hors de ta vitrine</h3>
      <p>
        Ta vitrine est faite pour mettre en avant ton activité. Les autres
        espaces (commentaires, fil d'actualité, messagerie) ne sont pas des
        panneaux d'affichage.
      </p>

      <h3>3. Pas d'usurpation d'identité</h3>
      <p>
        Ne te fais pas passer pour une autre marque, une autre personne ou une
        autre structure exposante.
      </p>

      <h3>4. Pas de spam</h3>
      <p>
        Commentaires, messages et signalements doivent être de bonne foi.
        Sollicitations répétitives, contenus dupliqués massivement et faux
        signalements relèvent du spam.
      </p>

      <h3>5. Reste dans ta thématique</h3>
      <p>
        Fellowship est un outil pour les artisans, les créateurs et les
        organisateurs d'événements. Les contenus hors-sujet seront retirés.
      </p>

      <h3>6. Respecte le droit d'auteur</h3>
      <p>
        Ne publie que des photos, textes et œuvres que tu as le droit de
        partager. En cas de contestation, le contenu sera retiré à première
        demande motivée.
      </p>

      <h2>Comment ça se passe quand quelqu'un sort des clous</h2>

      <ol>
        <li>
          <strong>Avertissement par courriel.</strong> La plupart des dérapages
          s'arrêtent là.
        </li>
        <li>
          <strong>Suspension temporaire du compte.</strong> Durée variable selon
          la gravité.
        </li>
        <li>
          <strong>Suppression définitive du compte.</strong> Réservée aux cas
          graves ou en cas de récidive.
        </li>
      </ol>

      <p>
        Chaque décision est documentée (note d'administration consultable par
        l'utilisateur concerné sur simple demande). Tout recours peut être
        adressé à <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>

      <h2>Plutôt signaler qu'attaquer</h2>
      <p>
        Si un contenu te paraît violer la présente charte, utilise le bouton
        <strong> « Signaler »</strong> présent sur chaque profil, événement ou
        commentaire. C'est plus efficace, et tu protèges la communauté sans
        t'exposer.
      </p>

      <p>
        La présente charte fait partie intégrante des{' '}
        <a href="/legal/cgu">Conditions générales d'utilisation</a> de Fellowship.
      </p>
    </LegalLayout>
  )
}
