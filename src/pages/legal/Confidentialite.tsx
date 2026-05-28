import { LegalLayout } from '@/components/legal/LegalLayout'
import { LEGAL } from '@/lib/legal'

export function ConfidentialitePage() {
  return (
    <LegalLayout title="Politique de confidentialité" slug="confidentialite">
      <p>
        La présente politique décrit la manière dont {LEGAL.company} traite les
        données personnelles des utilisateurs de Fellowship, conformément au
        Règlement (UE) 2016/679 (RGPD) et à la loi Informatique et Libertés.
      </p>

      <h2>1. Responsable de traitement</h2>
      <p>
        <strong>{LEGAL.company}</strong>, {LEGAL.address}.<br />
        Point de contact pour les questions relatives à la protection des données :
        {' '}<a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.<br />
        Aucun délégué à la protection des données (DPO) n'est désigné, la
        désignation n'étant pas obligatoire pour {LEGAL.company} au regard de son
        activité et de son volume de traitement.
      </p>

      <h2>2. Données collectées et finalités</h2>
      <ul>
        <li><strong>Adresse email</strong> — création de compte (authentification
          par lien magique), communications transactionnelles. Base légale :
          exécution du contrat (CGU).</li>
        <li><strong>Profil personnel</strong> — nom d'affichage, avatar, biographie.
          Base légale : consentement.</li>
        <li><strong>Entité exposante</strong> — marque, slug public, vitrine,
          informations commerciales. Base légale : consentement.</li>
        <li><strong>Contenus publiés</strong> — événements, descriptions, photos,
          bilans publics. Base légale : consentement.</li>
        <li><strong>Bilans privés</strong> — données strictement personnelles du
          créateur, <strong>jamais partagées sans son action explicite</strong>.
          Base légale : consentement.</li>
        <li><strong>Participations et relations</strong> — événements suivis,
          abonnements à d'autres exposants. Base légale : exécution contractuelle.</li>
        <li><strong>Signalements émis et reçus</strong> — modération et sécurité
          de la communauté. Base légale : intérêt légitime.</li>
        <li><strong>Logs techniques</strong> — adresse IP de connexion (conservée
          par Supabase Auth à des fins de sécurité), navigateur. Base légale :
          intérêt légitime.</li>
      </ul>

      <h2>3. Géolocalisation</h2>
      <p>
        Aucune donnée de localisation n'est transmise ni stockée sur les serveurs
        de Fellowship. Lorsque la fonctionnalité « distance » sera disponible, le
        calcul sera effectué <strong>exclusivement côté navigateur</strong> à partir
        d'une saisie volontaire de l'utilisateur, et la position obtenue ne quittera
        jamais le terminal.
      </p>

      <h2>4. Durées de conservation</h2>
      <ul>
        <li>Compte actif : pendant toute la durée de vie du compte.</li>
        <li>Après suppression du compte : conservation 30 jours dans les sauvegardes
          techniques (en vue d'un éventuel rollback), puis purge complète.</li>
        <li>Logs d'authentification Supabase : 90 jours.</li>
        <li>Signalements résolus : 2 ans, à des fins de preuve en cas de
          contestation de modération.</li>
        <li>Documents comptables (factures Pro) : 10 ans (obligation légale,
          art. L123-22 du Code de commerce).</li>
      </ul>

      <h2>5. Sous-traitants</h2>
      <ul>
        <li><strong>{LEGAL.database.name}</strong> ({LEGAL.database.address}) —
          authentification, base de données, stockage des contenus. Politique :{' '}
          <a href={LEGAL.database.privacy} target="_blank" rel="noopener noreferrer">{LEGAL.database.privacy}</a>.</li>
        <li><strong>{LEGAL.hosting.name}</strong> ({LEGAL.hosting.address}) —
          hébergement front. Certifié Data Privacy Framework (DPF). Politique :{' '}
          <a href={LEGAL.hosting.privacy} target="_blank" rel="noopener noreferrer">{LEGAL.hosting.privacy}</a>.</li>
        <li><strong>{LEGAL.payment.name}</strong> ({LEGAL.payment.address}) —
          traitement des paiements de l'abonnement Pro. Conforme PCI-DSS.
          Fellowship n'accède jamais aux numéros de carte. Politique :{' '}
          <a href={LEGAL.payment.privacy} target="_blank" rel="noopener noreferrer">{LEGAL.payment.privacy}</a>.</li>
      </ul>

      <h2>6. Transferts hors Union européenne</h2>
      <p>
        Netlify (États-Unis) opère sous le cadre <em>Data Privacy Framework</em>
        approuvé par la Commission européenne. Les données structurées sont
        traitées par Supabase sur son instance située à Francfort (Allemagne) et
        ne quittent pas l'Union européenne dans le cadre du fonctionnement
        nominal du service. Stripe Payments Europe est établie en Irlande (UE).
      </p>

      <h2>7. Vos droits</h2>
      <p>
        Conformément aux articles 15 à 22 du RGPD, vous disposez d'un droit
        d'accès, de rectification, d'effacement, à la portabilité, à la limitation
        du traitement et d'opposition. Pour exercer ces droits, écrivez à{' '}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. Une réponse vous sera
        adressée sous un délai d'un mois.
      </p>

      <h2>8. Réclamation auprès de la CNIL</h2>
      <p>
        Si vous estimez, après nous avoir contactés, que vos droits ne sont pas
        respectés, vous pouvez adresser une réclamation à la CNIL (Commission
        nationale de l'informatique et des libertés), 3 Place de Fontenoy, 75007
        Paris, ou via{' '}
        <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>.
      </p>

      <h2>9. Cookies</h2>
      <p>
        Fellowship utilise uniquement des <strong>cookies essentiels</strong> au
        fonctionnement du service :
      </p>
      <ul>
        <li>Cookies de session Supabase Auth — maintenir votre connexion.</li>
        <li>Cookies Stripe — sécurité du paiement lorsqu'une transaction
          d'abonnement Pro est en cours.</li>
      </ul>
      <p>
        Aucun cookie tiers de mesure d'audience, de traçage publicitaire ou de
        profilage n'est déposé. Les cookies essentiels sont dispensés du recueil
        du consentement préalable au titre de l'article 82 de la loi
        Informatique et Libertés.
      </p>

      <h2>10. Modification de la présente politique</h2>
      <p>
        Toute modification substantielle de la présente politique sera notifiée
        par courriel et par bannière in-app au moins 30 jours avant son entrée
        en vigueur.
      </p>
    </LegalLayout>
  )
}
