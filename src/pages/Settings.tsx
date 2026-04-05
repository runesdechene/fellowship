import { useState, useRef, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Camera, ImagePlus, Download, LogOut, Trash2, Check, Loader2, X } from 'lucide-react'

export function SettingsPage() {
  const { user, profile, signOut, refreshProfile } = useAuth()

  // Form state — initialised from profile
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [brandName, setBrandName] = useState(profile?.brand_name ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [website, setWebsite] = useState(profile?.website ?? '')
  const [slug, setSlug] = useState(profile?.public_slug ?? '')
  const [city, setCity] = useState(profile?.city ?? '')
  const [postalCode, setPostalCode] = useState(profile?.postal_code ?? '')
  const [sex, setSex] = useState<string>(profile?.sex ?? 'indéfini')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '')
  const [bannerUrl, setBannerUrl] = useState(profile?.banner_url ?? '')

  // UI state
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const isExposant = profile?.type === 'exposant'
  const qrUrl = `https://flw.sh/@${slug}`

  // Keep form in sync if profile loads after mount
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '')
      setBrandName(profile.brand_name ?? '')
      setBio(profile.bio ?? '')
      setWebsite(profile.website ?? '')
      setSlug(profile.public_slug ?? '')
      setCity(profile.city ?? '')
      setPostalCode(profile.postal_code ?? '')
      setSex(profile.sex ?? 'indéfini')
      setAvatarUrl(profile.avatar_url ?? '')
      setBannerUrl(profile.banner_url ?? '')
    }
  }, [profile])

  // ── Avatar upload ──────────────────────────────────────────────────────────
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

  // ── Banner upload ──────────────────────────────────────────────────────────
  async function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingBanner(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/banner-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      setBannerUrl(data.publicUrl)
    } catch (err) {
      console.error('Banner upload error:', err)
    } finally {
      setUploadingBanner(false)
    }
  }

  // ── Save profile ───────────────────────────────────────────────────────────
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
        banner_url: bannerUrl || null,
      }
      if (isExposant) {
        updates.brand_name = brandName || null
        updates.bio = bio || null
        updates.website = website || null
        updates.public_slug = slug || null
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
    a.download = `qr-${slug || 'fellowship'}.svg`
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
    'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="min-h-screen bg-background">
      <div className="page-width max-w-2xl px-4 py-8">
        <h1 className="mb-8 text-2xl font-bold">Paramètres</h1>

        {/* ── Section: Profil ──────────────────────────────────────────────── */}
        <section className="mb-6 rounded-2xl bg-card shadow-[2px_0_40px_-10px_rgba(0,0,0,0.06)] p-6">
          <h2 className="mb-5 text-base font-semibold">Profil</h2>

          {/* Avatar */}
          <div className="mb-6 flex items-center gap-4">
            <div className="relative">
              <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-border bg-muted">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-muted-foreground">
                    {(displayName || brandName || '?')[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm hover:bg-muted disabled:opacity-50"
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
              <p className="text-sm font-medium">Photo de profil</p>
              <p className="text-xs text-muted-foreground">JPG, PNG ou GIF — max 5 Mo</p>
            </div>
          </div>

          {/* Banner */}
          {isExposant && (
            <div className="mb-6">
              <p className="text-sm font-medium mb-2">Image de fond du profil</p>
              <div
                className="relative h-32 rounded-xl overflow-hidden border border-border bg-muted cursor-pointer group"
                onClick={() => bannerInputRef.current?.click()}
              >
                {bannerUrl ? (
                  <>
                    <img src={bannerUrl} alt="Bannière" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ImagePlus className="h-6 w-6 text-white" />
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setBannerUrl('') }}
                      className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
                    {uploadingBanner ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <>
                        <ImagePlus className="h-6 w-6" />
                        <span className="text-xs">Ajouter une image de fond</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBannerChange}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">Recommandé : 1200×400px. Visible sur votre profil public.</p>
            </div>
          )}

          <div className="grid gap-4">
            {/* Champ commun : display_name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Prénom / Nom affiché</label>
              <input
                className={inputCls}
                placeholder="Votre nom"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            {/* Champs exposant uniquement */}
            {isExposant && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Nom de marque</label>
                  <input
                    className={inputCls}
                    placeholder="Ma Marque"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">Biographie</label>
                  <textarea
                    className={`${inputCls} min-h-[90px] resize-y`}
                    placeholder="Quelques mots sur vous ou votre marque…"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">Site web</label>
                  <input
                    className={inputCls}
                    placeholder="https://mamarque.fr"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">Slug public</label>
                  <div className="flex items-center rounded-lg border border-border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring">
                    <span className="border-r border-border bg-muted px-3 py-2 text-sm text-muted-foreground select-none">
                      flw.sh/@
                    </span>
                    <input
                      className="flex-1 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                      placeholder="mon-slug"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Champs communs : localisation & genre */}
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

        {/* ── Section: QR Code (exposant only) ────────────────────────────── */}
        {isExposant && slug && (
          <section className="mb-6 rounded-2xl bg-card shadow-[2px_0_40px_-10px_rgba(0,0,0,0.06)] p-6">
            <h2 className="mb-2 text-base font-semibold">QR Code</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Partagez votre profil public via ce QR code.
            </p>
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
              <div className="flex-shrink-0 rounded-xl border border-border bg-white p-4 shadow-sm">
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
        <section className="rounded-2xl bg-card shadow-[2px_0_40px_-10px_rgba(0,0,0,0.06)] p-6">
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
