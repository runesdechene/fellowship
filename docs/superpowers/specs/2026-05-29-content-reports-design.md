# Spec — Signalements de contenu (content_reports) + privatisation des bilans

**Date :** 2026-05-29
**Branche :** `feat/da-nuit-festival-socle`
**Statut :** validé (design), à relire avant le plan d'implémentation
**Jalon :** une des dernières features avant ship V1 (suit la refonte DA festival).

---

## 1. Contexte & bug actuel

`event_reports` (table) sert aujourd'hui à stocker les **bilans post-festival**
des exposants Pro : booth_cost, charges, revenue, wins, improvements. C'est
intime, professionnel, **privé**.

**Mais :** trois policies RLS (`admin_select_reports`, `admin_update_reports`,
`admin_delete_reports`) donnent à l'admin un accès complet en lecture/écriture
sur tous les bilans. Et la page `AdminReports` les liste comme s'il s'agissait
de signalements (l'empty state dit littéralement « Aucun signalement »).

Conséquence directe : l'admin voit les revenus, charges et coûts intimes de
chaque exposant. Bug de confidentialité majeur.

Cause racine : deux concepts différents (« bilan » vs « signalement ») ont été
collés dans la même table sous le nom anglais ambigu "report".

---

## 2. Objectif & périmètre V1

**Séparer proprement les deux features :**

1. **Bilan post-festival** : reste sur la table `event_reports`, redevient
   strictement privé à son auteur (+ son entité). Aucun accès admin.
2. **Signalement de contenu** : nouvelle table `content_reports`. Tout user
   authentifié peut signaler un event ou un profil/vitrine. Workflow admin
   simple : pending → resolved/dismissed. Badge rouge sur l'entrée « Admin »
   du sidebar quand il y a des signalements à traiter.

**Cibles V1** : événement, profil/vitrine exposant.
**Cibles hors V1** (à reporter) : notes privées (n'a pas de sens), avis,
contenu uploadé (photos vitrine).

---

## 3. Migration & DB

### 3.1 Drop des 3 policies admin sur `event_reports`

```sql
drop policy if exists admin_select_reports on public.event_reports;
drop policy if exists admin_update_reports on public.event_reports;
drop policy if exists admin_delete_reports on public.event_reports;
```

Restent en place : `event_reports_write_actor` (can_act_as(actor_id)) et
`event_reports_owner_only` (user_id = auth.uid()). Le bilan est désormais
**strictement privé** à son auteur et son entité.

### 3.2 Création de `content_reports`

```sql
create table public.content_reports (
  id                     uuid primary key default gen_random_uuid(),
  reporter_actor_id      uuid not null references public.actors(id) on delete set null,
  reporter_auth_id       uuid not null references auth.users(id)   on delete set null,
  target_type            text not null check (target_type in ('event', 'profile')),
  target_id              uuid not null,
  reason                 text not null check (reason in ('spam', 'inapproprie', 'info_erronee', 'doublon')),
  comment                text,
  status                 text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  admin_note             text,
  resolved_at            timestamptz,
  resolved_by_actor_id   uuid references public.actors(id) on delete set null,
  created_at             timestamptz not null default now()
);

create index idx_content_reports_status on public.content_reports (status);
create index idx_content_reports_target on public.content_reports (target_type, target_id);
create index idx_content_reports_created_at on public.content_reports (created_at desc);
```

### 3.3 RLS de `content_reports`

```sql
alter table public.content_reports enable row level security;

-- INSERT : tout user authentifié, sous sa propre identité.
create policy content_reports_insert_authenticated on public.content_reports
  for insert with check (reporter_auth_id = auth.uid());

-- SELECT/UPDATE/DELETE : admin only. Fallback chain profile/users pour rester cohérent
-- avec isAdmin côté React (cf. bug avatar : le rôle vit côté profiles legacy).
create policy content_reports_select_admin on public.content_reports
  for select using (
    coalesce(
      (select role from public.profiles where id = auth.uid()) = 'admin',
      (select role from public.users    where auth_id = auth.uid()) = 'admin',
      false
    )
  );

create policy content_reports_update_admin on public.content_reports
  for update using (... same check ...);

create policy content_reports_delete_admin on public.content_reports
  for delete using (... same check ...);
```

(Les `same check` seront expandés en clair dans la migration finale.)

### 3.4 Types TypeScript

Régénérer les types Supabase OU étendre manuellement `src/types/supabase.ts` avec
le Row/Insert/Update de `content_reports`.

---

## 4. Architecture & composants

### 4.1 Fichiers à créer

| Fichier | Rôle |
|---|---|
| `supabase/migrations/<ts>_content_reports.sql` | Migration (drop policies + create table + RLS) |
| `src/hooks/use-content-reports.ts` | Hooks : `createContentReport`, `useAdminPendingReportsCount`, `useAdminReports(filter)` |
| `src/components/reports/ReportContentModal.tsx` | Modale signalement (cible event ou profile) |
| `src/components/reports/ReportButton.tsx` | Petit bouton icône `Flag` qui ouvre la modale |
| `src/components/admin/AdminReports.tsx` | **Refonte** : lit `content_reports`, onglets, actions résoudre/rejeter |
| `src/components/admin/ResolveReportModal.tsx` | Mini-modale pour saisir `admin_note` avant résolution/rejet |

### 4.2 Fichiers à modifier

| Fichier | Modification |
|---|---|
| `src/types/supabase.ts` | Ajouter le type `content_reports` |
| `src/pages/EventPage.tsx` | Ajouter `<ReportButton targetType="event" targetId={event.id} />` dans `.fest-hactions` |
| `src/pages/PublicProfile.tsx` | Ajouter `<ReportButton targetType="profile" targetId={...} />` en bas/coin |
| `src/components/layout/Sidebar.tsx` | Brancher `useAdminPendingReportsCount` + render `.navbadge` rouge à droite du lien Admin |

---

## 5. UI signaler — modale & bouton

### 5.1 `<ReportButton />`

Petit bouton icône (Lucide `Flag`), même dimension que les autres `fest-iconbtn`.
- Sur **EventPage** : ajouté dans `.fest-hactions` à côté de Partager / Globe.
- Sur **PublicProfile** : icône isolée discrète, soit dans le menu de la vitrine
  soit dans un coin du hero. (Position exacte à confirmer en implémentation.)
- **Caché si non authentifié** : signaler nécessite d'être connecté (RLS l'exigera anyway).
- **Caché si target appartient au reporter lui-même** : auto-signalement n'a aucun sens.

Au clic → ouvre `ReportContentModal`.

### 5.2 `<ReportContentModal />`

Props : `targetType: 'event' | 'profile'`, `targetId: string`, `targetLabel: string`, `onClose: () => void`.

Contenu :
- **Titre contextuel** : « Signaler ce festival » ou « Signaler ce profil »
- **Radio group 4 options** :
  - Spam ou promotion abusive
  - Contenu inapproprié
  - Information erronée
  - Doublon (déjà existant)
- **Textarea optionnelle** « Détails (facultatif) » — placeholder « Précise si tu veux… »
- **Bouton primaire** « Envoyer le signalement »
- **Bouton ghost** « Annuler »
- **Anti-doublon front** : avant submit, query `content_reports` où `reporter_auth_id = currentUser AND target_id = X AND status = 'pending'`. Si déjà existe → toast « Tu as déjà signalé ce contenu, l'équipe va l'examiner. » + close.
- **Après envoi** : confirmation in-modale « Merci, l'équipe va examiner. » puis close au bout de 2s.

Réutilise le pattern modale existant (overlay `fixed inset-0 z-50 bg-black/40 backdrop-blur-sm`).

---

## 6. Refonte AdminReports

### 6.1 Données

Lit `content_reports` (et non plus `event_reports`). Hook :
```ts
useAdminReports(filter: 'pending' | 'resolved' | 'dismissed' | 'all')
```
Retourne aussi les infos enrichies : reporter (label + avatar via `actor_public`),
target (label + URL clickable, via lookup `events` ou `profiles` selon target_type).

### 6.2 Layout

- **Onglets** : Pending (par défaut, avec badge count) · Résolus · Rejetés
- **Liste** (table ou liste de cartes — table OK pour densité admin) :
  - Reporter : avatar + nom + date du signalement
  - Cible : label + lien clickable (`/evenement/:id` ou `/:slug`)
  - Raison : badge coloré (spam/inapproprie/info_erronee/doublon)
  - Commentaire : extrait sur 2 lignes max, click pour étendre
  - Date du signalement
  - Actions (uniquement onglet Pending) : boutons **Résoudre** (vert) · **Rejeter** (rouge)
  - Si onglet Résolus/Rejetés : affiche `admin_note` + `resolved_at` + qui a résolu

### 6.3 Action résoudre/rejeter

Clic sur **Résoudre** ou **Rejeter** ouvre `<ResolveReportModal>` :
- Titre : « Résoudre ce signalement » ou « Rejeter ce signalement »
- Textarea optionnelle « Note admin (facultatif) » — pour traçage
- Bouton « Confirmer »

Au confirm : UPDATE `content_reports` SET status, admin_note, resolved_at, resolved_by_actor_id WHERE id = X.
Refetch automatique. Toast de confirmation.

---

## 7. Badge sidebar « Admin »

### 7.1 Hook léger

```ts
// src/hooks/use-content-reports.ts
export function useAdminPendingReportsCount() {
  const { isAdmin } = useAuth()
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!isAdmin) { setCount(0); return }
    supabase
      .from('content_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .then(({ count }) => setCount(count ?? 0))
  }, [isAdmin])
  return count
}
```

Polling ou refetch quand l'admin résout un signalement (réfléchir : event/refetch
au retour de la page admin). YAGNI realtime en V1.

### 7.2 Rendu

Dans `Sidebar.tsx`, branche `useAdminPendingReportsCount()` quand `isAdmin`.
Rend `<span className="navbadge">{count}</span>` à droite du lien « Admin » si count > 0.
Réutilise la classe existante (rouge `#e5484d`).

### 7.3 Mobile / collapsed

- Collapsed sidebar : badge caché (cohérent avec `navlabel` qui est hidden)
- Mobile BottomBar : pas concerné (Admin n'y est pas)

---

## 8. Sécurité — checklist

- ✓ Bilan privé : drop des 3 policies admin sur `event_reports`. Admin perd la lecture.
- ✓ `content_reports` INSERT : `reporter_auth_id = auth.uid()` côté policy → impossible d'usurper.
- ✓ `content_reports` SELECT/UPDATE/DELETE : admin only via fallback chain profile/users (cohérent avec isAdmin React).
- ✓ Pas d'info bilan dans `AdminReports` refondu (revenue/charges/booth_cost retirés visuellement).
- ✓ Anti-doublon front + check unicité côté insert via filtre exists (pas un constraint DB strict pour permettre re-signalement après resolution).
- ✗ **Hors V1** : rate-limit, captcha (YAGNI tant qu'il n'y a pas d'abus).

---

## 9. États & cas limites

- **Non authentifié** : bouton Signaler caché.
- **Reporter = owner du target** : bouton caché (event.created_by_actor === currentActor.id, ou profile.id === person.id).
- **Target supprimé** : l'admin voit toujours le report (admin_note possible), mais le lien target peut 404. Tolérance acceptable en V1.
- **Plusieurs reporters sur même target** : autorisé. L'admin voit plusieurs lignes — ça peut même indiquer un consensus.
- **Reporter signale 2x le même target en pending** : bloqué par check anti-doublon front.
- **Reporter signale même target après résolution** : autorisé (nouveau cycle).

---

## 10. Tests

Suivre `reference_react_test_infra` (fonctions pures, pas de RTL render).

- `src/lib/content-reports.ts` (nouveau, fonctions pures) :
  - `canReport(currentActor, target)` : retourne false si user non connecté, ou si target appartient au currentActor.
  - `formatReason(reason: string)` : retourne le label FR humain.
- Tests RLS via SQL ou un test d'intégration léger : confirmer qu'un user A ne lit pas les reports d'un autre, qu'un admin lit tout, qu'un user peut insert son propre report.

Couverture front (modale, admin page) : pas de RTL — visuel par Uriel.

---

## 11. Hors périmètre V1 — différé

- Notification au reporteur quand son signalement est traité (V1.5).
- Signaler une note privée (n'a aucun sens, RLS le bloque déjà).
- Signaler un avis (V2 : avec spec dédiée car l'avis a sa propre RLS).
- Actions admin riches : supprimer l'event, bannir l'user, masquer le contenu (V2).
- Réputation reporteur (auto-trust si beaucoup de bons signalements).
- Rate-limit / captcha (à ajouter si abus observé).
- Realtime du badge admin (polling/refetch suffit en V1).

---

## 12. Vérification avant « fait »

- `pnpm build` vert
- `pnpm lint` vert
- Migration appliquée en prod via MCP `apply_migration`
- Test manuel : signaler un event en festivalier → l'admin voit dans la page, peut résoudre, badge sidebar décroît
- Test manuel : connecté en exposant Pro, le bilan post-festival n'apparaît PLUS dans AdminReports
- code-review du diff avant merge
