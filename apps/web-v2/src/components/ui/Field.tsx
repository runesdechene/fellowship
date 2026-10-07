import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

interface FieldProps {
  label: string
  required?: boolean
  children: ReactNode
}

export function Field({ label, required = false, children }: FieldProps) {
  return (
    <label className="field">
      <span className="field__label">
        {label}
        {required && <span className="field__required"> *</span>}
      </span>
      {children}
    </label>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="control" />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className="control control--area" />
}

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  title: string
  note?: string
}

export function Toggle({ checked, onChange, title, note }: ToggleProps) {
  return (
    <button
      type="button"
      className={checked ? 'toggle toggle--on' : 'toggle'}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
    >
      <span className="toggle__switch" />
      <span className="toggle__text">
        <span className="toggle__title">{title}</span>
        {note && <span className="toggle__note">{note}</span>}
      </span>
    </button>
  )
}
