import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Plus } from 'lucide-react'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export function TagInput({ value, onChange, placeholder = 'Ajouter un tag...' }: TagInputProps) {
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])

  // Fetch community tags for autocomplete
  useEffect(() => {
    if (input.length < 2) {
      setSuggestions([]) // eslint-disable-line react-hooks/set-state-in-effect
      return
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('events')
        .select('tags')
        .not('tags', 'eq', '{}')
        .limit(50)

      if (data) {
        const allTags = data.flatMap(e => e.tags ?? [])
        const unique = [...new Set(allTags)]
        const filtered = unique
          .filter(t => t.toLowerCase().includes(input.toLowerCase()))
          .filter(t => !value.includes(t))
          .slice(0, 5)
        setSuggestions(filtered)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [input, value])

  const addTag = (tag: string) => {
    const trimmed = tag.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInput('')
    setSuggestions([])
  }

  const removeTag = (tag: string) => {
    onChange(value.filter(t => t !== tag))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    }
  }

  return (
    <div className="space-y-2">
      {/* Current tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map(tag => (
            <span key={tag} className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <input
          type="text"
          className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder={placeholder}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl bg-card p-1 shadow-[2px_0_40px_-10px_rgba(0,0,0,0.06)] shadow-lg">
            {suggestions.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => addTag(tag)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
              >
                <Plus className="h-3 w-3 text-muted-foreground" />
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
