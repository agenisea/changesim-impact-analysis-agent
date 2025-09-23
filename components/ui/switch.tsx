'use client'

import { forwardRef } from 'react'

export interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className = '', label, ...props }, ref) => {
    return (
      <label className="flex items-center cursor-pointer">
        <div className="relative">
          <input
            type="checkbox"
            ref={ref}
            className="sr-only"
            {...props}
          />
          <div className={`block bg-gray-300 w-10 h-6 rounded-full transition-colors duration-200 ${props.checked ? 'bg-blue-600' : 'bg-gray-300'} ${className}`}></div>
          <div
            className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ${
              props.checked ? 'transform translate-x-4' : ''
            }`}
          ></div>
        </div>
        {label && <span className="ml-3 text-sm font-medium">{label}</span>}
      </label>
    )
  }
)
Switch.displayName = 'Switch'

export { Switch }