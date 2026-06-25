import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Camera, LogOut, Trash2, Check, Loader2, ExternalLink, Crown, Sparkles, Mail } from 'lucide-react'
import type { EntityRow } from '@/types/database'
import { normalizeSex } from '@/lib/user-sex'

export function SettingsPage() {
  const { user, person, entities, currentActor, currentActorRow, signOut, refreshProfile } = useAuth()

  // ── Infos personnelles (compte) ────────────────────────────────────────────
  // Vivent sur la PERSONNE (table `users`, modèle acteur) — c'est cette ligne que
  // l'app affiche partout (header, switcher, avatar). L'identité publique (marque,
  // métier, bio, lien, photos, slug) se modifie sur la vitrine → table `entities`.
  // NB: on lit/écrit `users`, PAS le `profiles` legacy, sinon le nom affiché diverge.
  const [displayName, setDisplayName] = useState(person?.display_name ?? '')
  const [city, setCity] = useState(person?.city ?? '')
  const [postalCode, setPostalCode] = useState(person?.postal_code ?? '')
  const [sex, setSex] = useState<string>(normalizeSex(person?.sex))
  const [avatarUrl, setAvatarUrl] = useState(person?.avatar_url ?? '')

  // UI state
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // L'URL publique se résout sur le slug de l'ENTITÉ (cf. use-vitrine.ts), pas sur profiles.
  // On prend l'entité active si on agit en tant qu'elle, sinon la première.
  const entity: EntityRow | null =
    (currentActor?.kind === 'entity' ? (currentActorRow as EntityRow) : null) ?? entities[0] ?? null
  const entitySlug = entity?.public_slug ?? ''

  // Keep form in sync if the person loads after mount
  useEffect(() => {
    if (person) {
      setDisplayName(person.display_name ?? '')
      setCity(person.city ?? '')
      setPostalCode(person.postal_code ?? '')
      setSex(normalizeSex(person.sex))
      setAvatarUrl(person.avatar_url ?? '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person])

  // ── Avatar (photo personnelle) ───────────────────────────────────────────────
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingAvatar(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      setAvatarUrl(data.publicUrl)
    } catch (err) {
      console.error('Avatar upload error:', err)
    } finally {
      setUploadingAvatar(false)
    }
  }

  // ── Save (infos personnelles uniquement) ─────────────────────────────────────
  async function handleSave() {
    if (!user) return
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      const updates: Record<string, string | null> = {
        display_name: displayName || null,
        city: city || null,
        postal_code: postalCode || null,
        sex: sex || null,
        avatar_url: avatarUrl || null,
      }
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('actor_id', user.id)
      if (error) throw error
      await refreshProfile()
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete account ─────────────────────────────────────────────────────────
  async function handleDeleteAccount() {
    // Signs out; actual deletion would require a server-side function
    await signOut()
  }

  // ── Shared input style ─────────────────────────────────────────────────────
  const inputCls =
    'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="min-h-screen">{/* fond = --app-bg du body (page purifiée, plus de hack dégradé) */}
      <div className="page-width max-w-2xl page-padding">
        <h1 className="page-title mb-8">Paramètres</h1>

        {/* ── Section: Infos personnelles ──────────────────────────────────── */}
        <section className="mb-6 glass-card p-6">
          <h2 className="mb-1.5 text-base font-semibold">Infos personnelles</h2>
          {entity && (
            <p className="mb-5 text-sm text-muted-foreground">
              Ton nom de marque, ta présentation, ton lien et tes photos publiques se modifient sur{' '}
              <Link to={`/${entitySlug}`} className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-2">
                ta vitrine <ExternalLink className="h-3 w-3" />
              </Link>
              .
            </p>
          )}

          {/* Avatar */}
          <div className="mb-6 flex items-center gap-4">
            <div className="relative">
              <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-border bg-muted">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-muted-foreground">
                    {(displayName || entity?.brand_name || '?')[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-card text-foreground hover:bg-muted disabled:opacity-50"
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div>
              <p className="text-sm font-medium">Photo personnelle</p>
              <p className="text-xs text-muted-foreground">JPG, PNG ou GIF — max 5 Mo</p>
            </div>
          </div>

          <div className="grid gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Prénom / Nom affiché</label>
              <input
                className={inputCls}
                placeholder="Votre nom"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Ville</label>
                <input
                  className={inputCls}
                  placeholder="Paris"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Code postal</label>
                <input
                  className={inputCls}
                  placeholder="75001"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Genre</label>
              <select
                className={inputCls}
                value={sex}
                onChange={(e) => setSex(e.target.value)}
              >
                <option value="indefini">Indéfini</option>
                <option value="homme">Homme</option>
                <option value="femme">Femme</option>
              </select>
            </div>
          </div>

          {/* Save feedback */}
          {saveError && (
            <p className="mt-3 text-sm text-destructive">{saveError}</p>
          )}

          <div className="mt-6 flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sauvegarde…</>
              ) : saveSuccess ? (
                <><Check className="mr-2 h-4 w-4" />Sauvegardé</>
              ) : (
                'Sauvegarder'
              )}
            </Button>
          </div>
        </section>

        {/* ── Section: Compte ─────────────────────────────────────────────── */}
        <section className="glass-card p-6">
          <h2 className="mb-5 text-base font-semibold">Compte</h2>

          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium">Adresse e-mail</label>
            <input
              className={`${inputCls} cursor-not-allowed opacity-60`}
              value={user?.email ?? ''}
              readOnly
            />
          </div>

          {entities.length > 0 && <EntitySubscriptionsList entities={entities} />}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" onClick={signOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </Button>

            {!showDeleteConfirm ? (
              <Button
                variant="ghost"
                onClick={() => setShowDeleteConfirm(true)}
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer mon compte
              </Button>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2">
                <p className="text-sm text-destructive">Confirmer la suppression ?</p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteAccount}
                  className="ml-2"
                >
                  Oui, supprimer
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Annuler
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* ── Section: Contact ────────────────────────────────────────────── */}
        {/* Filet de sécurité post-lancement : un mailto direct, pas de form, pas de chatbot.
            Le mec qui hit un bug critique doit pouvoir nous joindre en deux clics. */}
        <section className="mt-6 glass-card p-6">
          <h2 className="mb-1.5 text-base font-semibold">Une question ? Un bug ?</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Écris-nous en direct. On lit tout, on répond.
          </p>
          <a
            href="mailto:appfellowship@pm.me?subject=Fellowship%20%E2%80%94%20Retour"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            <Mail className="h-4 w-4" />
            appfellowship@pm.me
          </a>
        </section>
      </div>
    </div>
  )
}

// ── Mes abonnements (multi-entités) ────────────────────────────────────────
// Une ligne par entité du compte avec son statut + action :
//  - free / canceled  → "Passer en Pro" → /boutique?entity=X
//  - trialing/active/past_due → "Gérer" → portail Stripe (sans basculer d'acteur)

type EntityWithSub = EntityRow & {
  subscription_status?: string | null
  billing_interval?: string | null
}

function EntitySubscriptionsList({ entities }: { entities: EntityRow[] }) {
  return (
    <div className="mb-6">
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Mes abonnements Fellowship Pro</h3>
      <div className="flex flex-col gap-2">
        {entities.map(entity => (
          <EntitySubscriptionRow key={entity.actor_id} entity={entity as EntityWithSub} />
        ))}
      </div>
    </div>
  )
}

function EntitySubscriptionRow({ entity }: { entity: EntityWithSub }) {
  const status = entity.subscription_status ?? null
  const isPro = entity.plan === 'pro'
  const isActiveSub = !!status && ['trialing', 'active', 'past_due'].includes(status)

  const label = (() => {
    if (status === 'trialing') return { text: 'Essai gratuit', tone: 'pro' as const }
    if (status === 'active') return { text: `Pro ${entity.billing_interval === 'year' ? 'annuel' : 'mensuel'}`, tone: 'pro' as const }
    if (status === 'past_due') return { text: 'Paiement échoué', tone: 'warn' as const }
    if (status === 'canceled') return { text: 'Annulé', tone: 'muted' as const }
    if (isPro) return { text: 'Pro (legacy)', tone: 'pro' as const } // Pro hérité sans sub Stripe
    return { text: 'Gratuit', tone: 'muted' as const }
  })()

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
      {entity.avatar_url
        ? <img src={entity.avatar_url} alt="" className="h-9 w-9 flex-shrink-0 rounded-full object-cover" />
        : <div className="h-9 w-9 flex-shrink-0 rounded-full bg-muted" />}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{entity.brand_name ?? '(sans nom)'}</div>
        <div className="flex items-center gap-1.5 text-xs">
          {label.tone === 'pro' && <Crown className="h-3 w-3 text-primary" strokeWidth={2} />}
          <span className={
            label.tone === 'pro' ? 'text-primary font-semibold'
            : label.tone === 'warn' ? 'text-destructive font-semibold'
            : 'text-muted-foreground'
          }>{label.text}</span>
        </div>
      </div>
      {isActiveSub ? (
        <Link
          to={`/abonnement?entity=${entity.actor_id}`}
          className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted"
        >
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
          Gérer
        </Link>
      ) : (
        <Link
          to={`/boutique?entity=${entity.actor_id}`}
          className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-[var(--accent-app)] px-3 py-1.5 text-xs font-bold text-[var(--accent-app-ink)] hover:brightness-110"
        >
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
          Passer en Pro
        </Link>
      )}
    </div>
  )
}
