import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Camera, Download, LogOut, Trash2, Check, Loader2, ExternalLink } from 'lucide-react'
import type { EntityRow } from '@/types/database'

export function SettingsPage() {
  const { user, profile, entities, currentActor, currentActorRow, signOut, refreshProfile } = useAuth()

  // ── Infos personnelles (compte) ────────────────────────────────────────────
  // Ne vivent QUE ici, sur `profiles`. L'identité publique (marque, métier, bio,
  // lien, photos de la vitrine, slug) se modifie sur la vitrine → table `entities`.
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [city, setCity] = useState(profile?.city ?? '')
  const [postalCode, setPostalCode] = useState(profile?.postal_code ?? '')
  const [sex, setSex] = useState<string>(profile?.sex ?? 'indéfini')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '')

  // UI state
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // QR / partage : l'URL publique se résout sur le slug de l'ENTITÉ (cf. use-vitrine.ts),
  // pas sur profiles. On prend l'entité active si on agit en tant qu'elle, sinon la première.
  const entity: EntityRow | null =
    (currentActor?.kind === 'entity' ? (currentActorRow as EntityRow) : null) ?? entities[0] ?? null
  const entitySlug = entity?.public_slug ?? ''
  const qrUrl = `https://flw.sh/@${entitySlug}`

  // Keep form in sync if profile loads after mount
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '')
      setCity(profile.city ?? '')
      setPostalCode(profile.postal_code ?? '')
      setSex(profile.sex ?? 'indéfini')
      setAvatarUrl(profile.avatar_url ?? '')
    }
  }, [profile])

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
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
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

  // ── QR download ───────────────────────────────────────────────────────────
  function handleDownloadQR() {
    const svg = document.getElementById('fellowship-qr') as unknown as SVGSVGElement | null
    if (!svg) return
    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(svg)
    const blob = new Blob([svgStr], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-${entitySlug || 'fellowship'}.svg`
    a.click()
    URL.revokeObjectURL(url)
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
    <div
      className="min-h-screen"
      style={{
        // Top transparent (laisse la nav fader proprement dans le radial du body),
        // puis bascule en --background opaque avant les cartes pour cacher le radial
        // qui sinon créait une zone gradient visible derrière le 1er container.
        background: 'linear-gradient(to bottom, transparent 0, hsl(var(--background)) 120px)',
      }}
    >
      <div className="page-width max-w-2xl page-padding">
        <h1 className="page-title mb-8">Paramètres</h1>

        {/* ── Section: Infos personnelles ──────────────────────────────────── */}
        <section className="mb-6 rounded-2xl bg-card p-6">
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
                <option value="indéfini">Indéfini</option>
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

        {/* ── Section: QR Code (partage de la vitrine) ────────────────────── */}
        {entity && entitySlug && (
          <section className="mb-6 rounded-2xl bg-card p-6">
            <h2 className="mb-2 text-base font-semibold">QR Code</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Partagez votre vitrine publique via ce QR code.
            </p>
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
              <div className="flex-shrink-0 rounded-xl bg-white p-4">
                <QRCodeSVG
                  id="fellowship-qr"
                  value={qrUrl}
                  size={160}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium break-all text-muted-foreground">{qrUrl}</p>
                <Button variant="outline" onClick={handleDownloadQR} className="w-fit">
                  <Download className="mr-2 h-4 w-4" />
                  Télécharger (SVG)
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* ── Section: Compte ─────────────────────────────────────────────── */}
        <section className="rounded-2xl bg-card p-6">
          <h2 className="mb-5 text-base font-semibold">Compte</h2>

          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium">Adresse e-mail</label>
            <input
              className={`${inputCls} cursor-not-allowed opacity-60`}
              value={user?.email ?? ''}
              readOnly
            />
          </div>

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
      </div>
    </div>
  )
}
