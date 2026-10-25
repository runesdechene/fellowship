-- POURQUOI : la FAQ de la landing (sous l'appel final) s'édite depuis l'administration
-- (/admin/faq, maquette 2552:233, Uriel 25/10/2026). Elle était écrite en dur dans
-- LandingFaq.tsx ; ses neuf questions sont reprises ici telles quelles.
-- La landing est anonyme : elle ne lit que les questions affichées. Les admins voient et
-- écrivent tout (is_admin(), comme les prospects). Purement additif : rien de déployé ne lit
-- encore cette table.

create table public.faq_questions (
  id         uuid primary key default gen_random_uuid(),
  question   text not null check (length(trim(question)) > 0),
  answer     text not null check (length(trim(answer)) > 0),
  position   int not null default 0,          -- ordre d'affichage croissant
  visible    boolean not null default true,   -- décochée = gardée ici, absente de la landing
  created_at timestamptz not null default now()
);

alter table public.faq_questions enable row level security;

create policy faq_questions_public_read on public.faq_questions for select
  using (visible);

create policy faq_questions_admin on public.faq_questions for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

insert into public.faq_questions (position, question, answer) values
  (1, 'Comment trouver des festivals et des marchés où exposer ?',
      'Avec l’Explorer : toutes les dates par région, par catégorie et par mois, avec les avis des exposants qui y sont allés.'),
  (2, 'Comment Fellowship me relie à mes pairs ?',
      'Tu suis les exposants que tu croises, tu vois sur quels festivals ils vont, et tu poses tes questions sur chaque festival à ceux qui y sont allés.'),
  (3, 'Fellowship est-il gratuit ?',
      'Oui. L’Explorer et ton calendrier sur six mois, la communauté et ta vitrine sont gratuits, sans carte bancaire. Le Pro ouvre toute l’année.'),
  (4, 'Combien coûte le Pro ?',
      '9,99 € HT par mois à l’année, ou 11,99 € HT au mois. Les 14 premiers jours sont offerts, et tu arrêtes quand tu veux.'),
  (5, 'Comment ne plus rater une date de candidature ?',
      'Le Pro te prévient avant chaque clôture, et dès qu’un festival que tu as fait annonce sa nouvelle édition.'),
  (6, 'Mes chiffres et mes bilans sont-ils privés ?',
      'Oui. Ils ne sont visibles que par toi : ni les autres exposants, ni les organisateurs, ni l’équipe n’y ont accès.'),
  (7, 'J’organise un festival, puis-je l’ajouter ?',
      'Oui, gratuitement : « Ajouter une date », et ton festival apparaît dans l’Explorer.'),
  (8, 'Fellowship marche-t-il sur téléphone ?',
      'Oui. Il s’ouvre dans le navigateur et s’installe sur ton écran d’accueil comme une application.'),
  (9, 'Qui a créé Fellowship ?',
      'Uriel Lahoussaye, exposant et fondateur de la marque Runes de Chêne. Fellowship est né sur ses stands, d’une saison qui tenait sur des post‑it et un tableau Excel.');
