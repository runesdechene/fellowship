import { useState, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import { useProfile } from '@/hooks/useProfile'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { ArrowRight, Loader2, Upload, User } from 'lucide-react'

export function OnboardingPage() {
  const { user } = useAuth()
  const { updateProfile } = useProfile()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    company: '',
    bio: '',
  })

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null

    const fileExt = avatarFile.name.split('.').pop()
    const filePath = `${user.id}/avatar.${fileExt}`

    const { error } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatarFile, { upsert: true })

    if (error) {
      console.error('Avatar upload error:', error)
      return null
    }

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    let avatar_url: string | null = null
    if (avatarFile) {
      avatar_url = await uploadAvatar()
    }

    const { error } = await updateProfile({
      ...formData,
      ...(avatar_url && { avatar_url }),
      onboarding_completed: true,
    })

    if (error) {
      console.error('Profile update error:', error)
      setLoading(false)
      return
    }

    // Force page reload to refresh profile state
    window.location.href = '/app'
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <span className="text-lg font-bold text-primary-foreground">F</span>
          </div>
          <h1 className="text-2xl font-bold">Bienvenue sur Fellowship</h1>
          <p className="mt-2 text-muted-foreground">
            Parlez-nous de votre structure
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border bg-muted transition-colors hover:border-primary hover:bg-muted/80"
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-8 w-8 text-muted-foreground" />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
                <Upload className="h-6 w-6 text-white" />
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground">Logo ou photo de profil</p>
          </div>

          {/* Nom de la structure */}
          <div className="space-y-2">
            <label htmlFor="company" className="text-sm font-medium">
              Nom de votre structure <span className="text-destructive">*</span>
            </label>
            <input
              id="company"
              name="company"
              type="text"
              required
              value={formData.company}
              onChange={handleChange}
              placeholder="Acme Inc."
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label htmlFor="bio" className="text-sm font-medium">
              Bio de votre entreprise{' '}
              <span className="text-muted-foreground">(optionnel)</span>
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={3}
              value={formData.bio}
              onChange={handleChange}
              placeholder="Décrivez votre activité en quelques mots..."
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || !formData.company}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="mr-2 h-4 w-4" />
            )}
            Continuer
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Vous pourrez modifier ces informations plus tard dans les paramètres.
        </p>
      </div>
    </div>
  )
}
