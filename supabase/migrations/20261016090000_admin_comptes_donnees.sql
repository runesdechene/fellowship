-- POURQUOI : lot 2 de l'administration V2 (spec 2026-10-15-v2-admin-lot-2-comptes-design.md).
-- Ce que l'administration retient sur les comptes et que la base ne savait pas : le téléphone
-- (saisi par un admin seulement, Uriel 15/10/2026), la suspension, qui paie l'abonnement d'une
-- enseigne (Stripe ne garde que l'e-mail du premier payeur), les notes internes et les étiquettes.
-- Additif : le code déployé n'en lit rien.

alter table public.users
  add column phone text,
  add column suspended_at timestamptz;

alter table public.entities
  add column paid_by_user uuid references public.users(actor_id) on delete set null;

create table public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.actors(id) on delete cascade,
  author_user_id uuid references public.users(actor_id) on delete set null,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);
create index admin_notes_actor_idx on public.admin_notes (actor_id, created_at desc);

create table public.admin_labels (
  actor_id uuid not null references public.actors(id) on delete cascade,
  label text not null check (length(trim(label)) > 0),
  created_at timestamptz not null default now(),
  primary key (actor_id, label)
);

alter table public.admin_notes enable row level security;
alter table public.admin_labels enable row level security;

create policy admin_notes_admin on public.admin_notes for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy admin_labels_admin on public.admin_labels for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- protect_entity_plan : définition live (20261011190000) reprise entière. Deux changements :
-- un admin peut écrire comped_pro_until et is_ambassador (offrir des mois, ambassadeur) ;
-- paid_by_user ne s'écrit que par le serveur (le webhook), comme les colonnes Stripe.
CREATE OR REPLACE FUNCTION public.protect_entity_plan()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NEW.plan IS DISTINCT FROM OLD.plan THEN
      NEW.plan := OLD.plan;
    END IF;
    IF NEW.comped_pro_until IS DISTINCT FROM OLD.comped_pro_until AND NOT is_admin() THEN
      NEW.comped_pro_until := OLD.comped_pro_until;
    END IF;
    IF NEW.is_ambassador IS DISTINCT FROM OLD.is_ambassador AND NOT is_admin() THEN
      NEW.is_ambassador := OLD.is_ambassador;
    END IF;
    NEW.stripe_customer_id := OLD.stripe_customer_id;
    NEW.stripe_subscription_id := OLD.stripe_subscription_id;
    NEW.subscription_status := OLD.subscription_status;
    NEW.billing_interval := OLD.billing_interval;
    NEW.current_period_end := OLD.current_period_end;
    NEW.trial_end := OLD.trial_end;
    NEW.discount_end := OLD.discount_end;
    NEW.discount_label := OLD.discount_label;
    NEW.paid_by_user := OLD.paid_by_user;
  END IF;
  RETURN NEW;
END;
$function$;
