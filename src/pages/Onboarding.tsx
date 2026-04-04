import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

export function OnboardingPage() {
  const { profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState({
    display_name: '',
    brand_name: '',
    city: '',
    postal_code: '',
    public_slug: '',
  })
  const [saving, setSaving] = useState(false)

  const isExposant = profile?.type === 'exposant'

  const handleSubmit = async () => {
    if (!profile) return
    setSaving(true)

    const updates: Record<string, string> = {
      display_name: formData.display_name,
      city: formData.city,
      postal_code: formData.postal_code,
    }

    if (isExposant) {
      updates.brand_name = formData.brand_name
      updates.public_slug = formData.public_slug
    }

    await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id)

    await refreshProfile()
    setSaving(false)
    navigate(isExposant ? '/dashboard' : '/explorer')
  }

  const inputClass = "w-full rounded-xl border border-input bg-background px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-ring"

  const exposantSteps = [
    <div key="brand" className="space-y-4">
      <h2 className="text-2xl font-bold">Bienvenue sur Fellowship !</h2>
      <p className="text-muted-foreground">Comment s'appelle ta marque ?</p>
      <input
        type="text"
        className={inputClass}
        placeholder="Rune de Chêne"
        value={formData.brand_name}
        onChange={(e) => setFormData({ ...formData, brand_name: e.target.value, display_name: formData.display_name || e.target.value })}
        autoFocus
      />
      <Button className="w-full" size="lg" onClick={() => setStep(1)} disabled={!formData.brand_name}>
        Continuer
      </Button>
    </div>,
    <div key="city" className="space-y-4">
      <h2 className="text-2xl font-bold">Où es-tu basé ?</h2>
      <p className="text-muted-foreground">Ta ville et ton code postal</p>
      <input
        type="text"
        className={inputClass}
        placeholder="Lyon"
        value={formData.city}
        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
        autoFocus
      />
      <input
        type="text"
        className={inputClass}
        placeholder="69000"
        value={formData.postal_code}
        onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
      />
      <Button className="w-full" size="lg" onClick={() => setStep(2)} disabled={!formData.city}>
        Continuer
      </Button>
    </div>,
    <div key="slug" className="space-y-4">
      <h2 className="text-2xl font-bold">Ton lien public</h2>
      <p className="text-muted-foreground">Les visiteurs te trouveront ici</p>
      <div className="flex items-center gap-0 rounded-xl border border-input bg-background text-lg">
        <span className="px-4 py-3 text-muted-foreground">flw.sh/@</span>
        <input
          type="text"
          className="w-full rounded-r-xl bg-background px-0 py-3 focus:outline-none"
          placeholder="rune-de-chene"
          value={formData.public_slug}
          onChange={(e) => setFormData({ ...formData, public_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
          autoFocus
        />
      </div>
      <Button className="w-full" size="lg" onClick={handleSubmit} disabled={!formData.public_slug || saving}>
        {saving ? 'Enregistrement...' : "C'est parti !"}
      </Button>
    </div>,
  ]

  const publicSteps = [
    <div key="name" className="space-y-4">
      <h2 className="text-2xl font-bold">Bienvenue sur Fellowship !</h2>
      <p className="text-muted-foreground">Comment tu t'appelles ?</p>
      <input
        type="text"
        className={inputClass}
        placeholder="Ton prénom"
        value={formData.display_name}
        onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
        autoFocus
      />
      <Button className="w-full" size="lg" onClick={() => setStep(1)} disabled={!formData.display_name}>
        Continuer
      </Button>
    </div>,
    <div key="postal" className="space-y-4">
      <h2 className="text-2xl font-bold">Ton code postal</h2>
      <p className="text-muted-foreground">Pour découvrir les événements près de chez toi</p>
      <input
        type="text"
        className={inputClass}
        placeholder="69000"
        value={formData.postal_code}
        onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
        autoFocus
      />
      <Button className="w-full" size="lg" onClick={handleSubmit} disabled={!formData.postal_code || saving}>
        {saving ? 'Enregistrement...' : 'Découvrir les événements'}
      </Button>
    </div>,
  ]

  const steps = isExposant ? exposantSteps : publicSteps

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>
        {steps[step]}
      </div>
    </div>
  )
}
