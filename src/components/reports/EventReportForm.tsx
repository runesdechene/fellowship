import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { useEventReport, saveEventReport } from '@/hooks/use-reports'
import { Button } from '@/components/ui/button'
import { Lock, Plus, X } from 'lucide-react'

interface EventReportFormProps {
  eventId: string
}

export function EventReportForm({ eventId }: EventReportFormProps) {
  const { user, profile } = useAuth()
  const { report: existing } = useEventReport(eventId)
  const [boothCost, setBoothCost] = useState('')
  const [charges, setCharges] = useState('')
  const [revenue, setRevenue] = useState('')
  const [wins, setWins] = useState<string[]>([])
  const [improvements, setImprovements] = useState<string[]>([])
  const [newWin, setNewWin] = useState('')
  const [newImprovement, setNewImprovement] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (existing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBoothCost(existing.booth_cost?.toString() ?? '')
      setCharges(existing.charges?.toString() ?? '')
      setRevenue(existing.revenue?.toString() ?? '')
      setWins(existing.wins ?? [])
      setImprovements(existing.improvements ?? [])
    }
  }, [existing])

  if (profile?.plan !== 'pro') {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-secondary p-4 text-sm">
        <Lock className="h-4 w-4 text-primary" />
        <span>Le bilan post-événement est une fonctionnalité <strong>Pro</strong></span>
      </div>
    )
  }

  const profit = (parseFloat(revenue) || 0) - (parseFloat(boothCost) || 0) - (parseFloat(charges) || 0)

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    await saveEventReport({
      user_id: user.id,
      event_id: eventId,
      booth_cost: boothCost ? parseFloat(boothCost) : null,
      charges: charges ? parseFloat(charges) : null,
      revenue: revenue ? parseFloat(revenue) : null,
      wins,
      improvements,
    })
    setSaving(false)
  }

  const addItem = (list: string[], setList: (v: string[]) => void, value: string, clearFn: (v: string) => void) => {
    if (value.trim()) {
      setList([...list, value.trim()])
      clearFn('')
    }
  }

  const removeItem = (list: string[], setList: (v: string[]) => void, index: number) => {
    setList(list.filter((_, i) => i !== index))
  }

  const inputClass = "w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"

  return (
    <div className="space-y-4 rounded-xl border border-primary/20 bg-secondary p-4">
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Bilan privé</h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Coût emplacement (€)</label>
          <input type="number" className={inputClass} value={boothCost} onChange={e => setBoothCost(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Charges (€)</label>
          <input type="number" className={inputClass} value={charges} onChange={e => setCharges(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Chiffre d'affaires (€)</label>
          <input type="number" className={inputClass} value={revenue} onChange={e => setRevenue(e.target.value)} />
        </div>
      </div>

      <div className="rounded-lg bg-card p-3 text-center">
        <p className="text-xs text-muted-foreground">Bénéfice</p>
        <p className={`text-xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
          {profit.toFixed(2)} €
        </p>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Points réussis</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {wins.map((w, i) => (
            <span key={i} className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs text-green-700">
              {w}
              <button onClick={() => removeItem(wins, setWins, i)}><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input className={inputClass} placeholder="Ajouter un point réussi" value={newWin} onChange={e => setNewWin(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem(wins, setWins, newWin, setNewWin))} />
          <Button size="icon" variant="ghost" onClick={() => addItem(wins, setWins, newWin, setNewWin)}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Points à améliorer</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {improvements.map((im, i) => (
            <span key={i} className="flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs text-orange-700">
              {im}
              <button onClick={() => removeItem(improvements, setImprovements, i)}><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input className={inputClass} placeholder="Ajouter un point à améliorer" value={newImprovement} onChange={e => setNewImprovement(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem(improvements, setImprovements, newImprovement, setNewImprovement))} />
          <Button size="icon" variant="ghost" onClick={() => addItem(improvements, setImprovements, newImprovement, setNewImprovement)}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>

      <Button className="w-full" onClick={handleSave} disabled={saving}>
        {saving ? 'Sauvegarde...' : 'Sauvegarder le bilan'}
      </Button>
    </div>
  )
}
