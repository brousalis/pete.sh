'use client'

import * as React from 'react'

export function ToggleSwitch({
  checked,
  onCheckedChange,
  label,
  disabled,
}: {
  checked: boolean
  onCheckedChange: (v: boolean) => void
  label?: string
  disabled?: boolean
}) {
  const id = React.useId()

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      if (!disabled) {
        onCheckedChange(!checked)
      }
    }
  }

  return (
    <div className="inline-flex items-center gap-3">
      {label && (
        <label htmlFor={id} className="text-muted-foreground text-xs">
          {label}
        </label>
      )}
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onCheckedChange(!checked)}
        onKeyDown={handleKeyDown}
        className={`ring-border focus-visible:ring-ring relative inline-flex h-7 w-12 items-center rounded-full ring-1 transition-colors outline-none ring-inset focus-visible:ring-2 ${
          checked ? 'bg-brand' : 'bg-muted'
        } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-[22px] rounded-full shadow-sm transition-transform ${
            checked ? 'translate-x-5.5' : 'translate-x-0'
          } ${checked ? 'bg-muted dark:bg-white' : 'bg-card dark:bg-foreground'}`}
        />
        <span className="sr-only">{checked ? 'On' : 'Off'}</span>
      </button>
    </div>
  )
}
