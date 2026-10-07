import { LegalLayout } from '@/components/legal/LegalLayout'
import { LEGAL } from '@/lib/legal'

export function MentionsLegalesPage() {
  return (
    <LegalLayout title="Mentions légales" slug="mentions-legales">
      <h2>1. Éditeur du site</h2>
      <p>
        <strong>{LEGAL.company}</strong>, entreprise individuelle.<br />
        Siège social : {LEGAL.address}<br />
        RCS : {LEGAL.rcs}<br />
        TVA intracommunautaire : {LEGAL.vat}
      </p>

      <h2>2. Directeur de la publication</h2>
      <p>{LEGAL.director}</p>

      <h2>3. Contact</h2>
      <p>
        Pour toute question relative au présent site ou aux services Fellowship :
        {' '}<a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
      </p>

      <h2>4. Marque</h2>
      <p>
        {LEGAL.brand}, propriété de {LEGAL.company}. Toute reproduction, imitation
        ou usage non autorisé de la marque, du logo ou des éléments graphiques de
        Fellowship expose à des poursuites au titre des articles L713-2 et suivants
        du Code de la propriété intellectuelle.
      </p>

      <h2>5. Hébergement du site</h2>
      <p>
        Hébergement front : <strong>{LEGAL.hosting.name}</strong>, {LEGAL.hosting.address}.<br />
        Politique de confidentialité de l'hébergeur :{' '}
        <a href={LEGAL.hosting.privacy} target="_blank" rel="noopener noreferrer">{LEGAL.hosting.privacy}</a>.
      </p>
      <p>
        Hébergement base de données et authentification : <strong>{LEGAL.database.name}</strong>, {LEGAL.database.address}.<br />
        Politique :{' '}
        <a href={LEGAL.database.privacy} target="_blank" rel="noopener noreferrer">{LEGAL.database.privacy}</a>.
      </p>

      <h2>6. Statut juridique de Fellowship</h2>
      <p>
        Fellowship est à la fois <strong>éditeur d'un service de communication
        au public en ligne</strong> au sens de l'article 6-III de la loi du 21 juin
        2004 pour la confiance dans l'économie numérique (LCEN), et{' '}
        <strong>hébergeur</strong> au sens de l'article 6-I-2 de cette même loi
        pour les contenus mis en ligne par ses utilisateurs (events, profils,
        bilans publics, commentaires, vitrines).
      </p>
      <p>
        À ce titre, l'éditeur n'est pas soumis à une obligation générale de
        surveillance des contenus mais agit promptement, dès qu'il en a connaissance,
        pour retirer tout contenu manifestement illicite qui lui aurait été signalé.
      </p>

      <h2>7. Signalement de contenu illicite</h2>
      <p>
        Tout contenu publié sur Fellowship peut être signalé via le bouton
        « Signaler » présent sur chaque profil, événement ou commentaire. Un
        signalement peut également être adressé par courriel à{' '}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> en précisant la nature
        du contenu, son URL et la motivation du signalement.
      </p>

      <h2>8. Loi applicable</h2>
      <p>
        Les présentes mentions légales sont régies par le droit français.
      </p>
    </LegalLayout>
  )
}
