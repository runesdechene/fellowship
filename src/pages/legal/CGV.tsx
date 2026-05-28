import { LegalLayout } from '@/components/legal/LegalLayout'
import { LEGAL } from '@/lib/legal'

export function CGVPage() {
  return (
    <LegalLayout title="Conditions générales de vente" slug="cgv">
      <p>
        Les présentes Conditions Générales de Vente (« CGV ») régissent la
        fourniture par {LEGAL.company} de l'abonnement Pro de l'application
        Fellowship.
      </p>

      <h2>1. Identification de l'éditeur</h2>
      <p>
        <strong>{LEGAL.company}</strong>, {LEGAL.address}.<br />
        RCS : {LEGAL.rcs} — TVA intracommunautaire : {LEGAL.vat}.<br />
        Contact : <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>

      <h2>2. Objet</h2>
      <p>
        Les présentes CGV ont pour objet de définir les conditions dans lesquelles{' '}
        {LEGAL.company} fournit à ses clients professionnels l'abonnement Pro de
        Fellowship.
      </p>

      <h2>3. Public visé — clause expresse</h2>
      <blockquote>
        Les présentes Conditions Générales de Vente s'adressent{' '}
        <strong>exclusivement à des clients professionnels</strong> au sens de
        l'article liminaire du Code de la consommation. À ce titre, les dispositions
        du Code de la consommation relatives au droit de rétractation
        (articles L221-18 et suivants) ne s'appliquent pas.
      </blockquote>

      <h2>4. Description du service Pro</h2>
      <p>
        L'abonnement Pro donne accès, pour l'entité professionnelle qui en
        bénéficie, à l'ensemble des fonctionnalités marquées « Pro » dans
        l'application : Calendrier complet, Communauté, Tableau de bord, et
        toute fonctionnalité Pro qui pourrait être publiée ultérieurement par
        l'éditeur. Le plan Pro est attaché à l'entité professionnelle, non à
        la personne qui la gère.
      </p>

      <h2>5. Prix</h2>
      <p>
        <strong>9,99 € HT par mois</strong>, soit <strong>11,99 € TTC</strong>
        {' '}après application de la TVA française au taux de 20 %. Les prix
        peuvent évoluer ; toute modification fera l'objet d'un préavis d'au
        moins 30 jours par courriel. Des tarifs annuels, packs spéciaux ou
        promotions ponctuelles peuvent être proposés par l'éditeur.
      </p>

      <h2>6. Souscription et paiement</h2>
      <p>
        La souscription s'effectue directement dans l'application. Le paiement
        est traité par <strong>{LEGAL.payment.name}</strong> ({LEGAL.payment.address}),
        prestataire de paiement conforme à la norme PCI-DSS. {LEGAL.company}{' '}
        n'a jamais accès aux données de carte bancaire du client.
      </p>

      <h2>7. Reconduction et résiliation</h2>
      <p>
        L'abonnement est mensuel et reconduit tacitement à chaque échéance. Le
        client peut résilier à tout moment depuis les Réglages de son compte ;
        la résiliation prend effet à la fin de la période en cours. Aucun
        remboursement au prorata n'est dû.
      </p>

      <h2>8. Facturation</h2>
      <p>
        Une facture est émise automatiquement et envoyée par courriel à chaque
        échéance. L'éditeur conserve les factures pendant 10 ans conformément
        à l'article L123-22 du Code de commerce.
      </p>

      <h2>9. Suspension pour incident de paiement</h2>
      <p>
        En cas d'échec de prélèvement, l'éditeur pourra suspendre l'accès aux
        fonctionnalités Pro après notification écrite et un délai de 15 jours
        pour régularisation. Le compte de l'entité reste actif en plan gratuit
        pendant cette suspension.
      </p>

      <h2>10. Disponibilité du service</h2>
      <p>
        L'éditeur s'engage à une obligation de moyens quant à la disponibilité
        du service. Aucun engagement de niveau de service chiffré (SLA) n'est
        consenti à ce stade de développement. Les maintenances programmées
        seront notifiées par courriel et/ou par message in-app.
      </p>

      <h2>11. Résiliation pour manquement</h2>
      <p>
        L'éditeur peut résilier l'abonnement Pro en cas de manquement grave du
        client aux présentes CGV, aux CGU ou à la Charte communautaire, avec
        préavis de 15 jours notifié par courriel. Aucun remboursement n'est dû
        en cas de résiliation pour manquement.
      </p>

      <h2>12. Sort des données après résiliation</h2>
      <p>
        À la résiliation de l'abonnement Pro, les données de l'entité sont
        conservées 30 jours (période permettant une réactivation), puis le
        compte retombe en plan gratuit. Si le client supprime intégralement son
        compte, ses données sont purgées dans les conditions définies par la{' '}
        <a href="/legal/confidentialite">Politique de confidentialité</a>. Les
        factures sont conservées 10 ans conformément à la loi.
      </p>

      <h2>13. Loi applicable et juridiction</h2>
      <p>
        Les présentes CGV sont régies par le droit français. Toute contestation
        relative à leur formation, exécution ou interprétation est soumise, en
        application de la clause attributive de compétence librement convenue
        entre professionnels, au <strong>Tribunal Judiciaire de Nice</strong>.
      </p>
    </LegalLayout>
  )
}
