import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import './MonthPicker.css'

interface MonthOption {
  value: string
  label: string
}

interface MonthPickerProps {
  options: MonthOption[]
  value: string
  onChange: (value: string) => void
}

export function MonthPicker({ options, value, onChange }: MonthPickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selectedLabel = options.find(o => o.value === value)?.label ?? ''

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className={`month-picker ${open ? 'open' : ''}`} ref={ref}>
      <button
        className="month-picker-trigger"
        onClick={() => setOpen(!open)}
      >
        {selectedLabel}
        <ChevronDown strokeWidth={1.5} />
      </button>
      {open && (
        <div className="month-picker-dropdown">
          {options.map(opt => (
            <button
              key={opt.value}
              className={`month-picker-option ${opt.value === value ? 'selected' : ''}`}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
