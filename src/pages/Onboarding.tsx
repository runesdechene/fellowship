import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Store, Eye } from 'lucide-react'

export function OnboardingPage() {
  const { profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [accountType, setAccountType] = useState<'exposant' | 'public' | null>(null)
  const [formData, setFormData] = useState({
    display_name: '',
    brand_name: '',
    city: '',
    postal_code: '',
    public_slug: '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!profile || !accountType) return
    setSaving(true)

    const updates: Record<string, string> = {
      display_name: accountType === 'exposant' ? formData.brand_name : formData.display_name,
      city: formData.city,
      postal_code: formData.postal_code,
      type: accountType,
    }

    if (accountType === 'exposant') {
      updates.brand_name = formData.brand_name
      updates.public_slug = formData.public_slug
    }

    await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id)

    await refreshProfile()
    setSaving(false)
    navigate('/explorer')
  }

  const inputClass = "w-full rounded-full border border-input bg-card px-5 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-ring"

  // Step 0: Choose account type
  const typeStep = (
    <div key="type" className="space-y-6">
      <h2 className="page-title text-center">Bienvenue sur Fellowship !</h2>
      <p className="text-muted-foreground text-center">Vous êtes...</p>
      <div className="flex flex-col gap-3">
        <button
          onClick={() => { setAccountType('exposant'); setStep(1) }}
          className="flex items-center gap-4 rounded-2xl bg-card p-5 text-left transition-colors hover:bg-muted"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Store strokeWidth={1.5} className="h-6 w-6" />
          </div>
          <div>
            <div className="font-bold text-foreground">Exposant / Artisan</div>
            <div className="text-sm text-muted-foreground">Je participe à des événements et je veux être visible</div>
          </div>
        </button>
        <button
          onClick={() => { setAccountType('public'); setStep(1) }}
          className="flex items-center gap-4 rounded-2xl bg-card p-5 text-left transition-colors hover:bg-muted"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Eye strokeWidth={1.5} className="h-6 w-6" />
          </div>
          <div>
            <div className="font-bold text-foreground">Visiteur / Public</div>
            <div className="text-sm text-muted-foreground">Je veux découvrir des événements et suivre des exposants</div>
          </div>
        </button>
      </div>
    </div>
  )

  const exposantSteps = [
    typeStep,
    <div key="brand" className="space-y-4">
      <h2 className="text-2xl font-bold">Comment s'appelle votre marque ?</h2>
      <input
        type="text"
        className={inputClass}
        placeholder="Atelier Lumière"
        value={formData.brand_name}
        onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
        autoFocus
      />
      <Button className="w-full" size="lg" onClick={() => setStep(2)} disabled={!formData.brand_name}>
        Continuer
      </Button>
    </div>,
    <div key="city" className="space-y-4">
      <h2 className="text-2xl font-bold">Où êtes-vous basé ?</h2>
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
      <Button className="w-full" size="lg" onClick={() => setStep(3)} disabled={!formData.city}>
        Continuer
      </Button>
    </div>,
    <div key="slug" className="space-y-4">
      <h2 className="text-2xl font-bold">Votre lien public</h2>
      <p className="text-muted-foreground">Les visiteurs vous trouveront ici</p>
      <div className="flex items-center gap-0 rounded-full border border-input bg-card text-lg overflow-hidden">
        <span className="px-5 py-3 text-muted-foreground">flw.sh/@</span>
        <input
          type="text"
          className="w-full bg-card px-0 py-3 focus:outline-none"
          placeholder="atelier-lumiere"
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
    typeStep,
    <div key="name" className="space-y-4">
      <h2 className="text-2xl font-bold">Comment vous appelez-vous ?</h2>
      <input
        type="text"
        className={inputClass}
        placeholder="Votre prénom"
        value={formData.display_name}
        onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
        autoFocus
      />
      <Button className="w-full" size="lg" onClick={() => setStep(2)} disabled={!formData.display_name}>
        Continuer
      </Button>
    </div>,
    <div key="postal" className="space-y-4">
      <h2 className="text-2xl font-bold">Votre code postal</h2>
      <p className="text-muted-foreground">Pour découvrir les événements près de chez vous</p>
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

  const steps = accountType === 'exposant' ? exposantSteps : accountType === 'public' ? publicSteps : [typeStep]
  const totalSteps = accountType === 'exposant' ? 4 : accountType === 'public' ? 3 : 1

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center gap-2">
          {Array.from({ length: totalSteps }, (_, i) => (
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
