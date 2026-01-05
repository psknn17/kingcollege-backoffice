import * as React from "react"
import { cn } from "./utils"
import { AlertCircle, CheckCircle2 } from "lucide-react"

interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  success?: string
  hint?: string
  children: React.ReactNode
  className?: string
}

export function FormField({
  label,
  required = false,
  error,
  success,
  hint,
  children,
  className
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      <div className="relative">
        {children}
      </div>
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
      {success && !error && (
        <p className="text-xs text-green-600 flex items-center gap-1.5">
          <CheckCircle2 className="h-3 w-3" />
          {success}
        </p>
      )}
      {hint && !error && !success && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}

// Validation helpers
export const validators = {
  required: (value: string) => {
    if (!value || value.trim() === "") return "This field is required"
    return null
  },
  email: (value: string) => {
    if (!value) return null
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) return "Please enter a valid email address"
    return null
  },
  phone: (value: string) => {
    if (!value) return null
    const phoneRegex = /^[\d\s\-+()]{8,}$/
    if (!phoneRegex.test(value)) return "Please enter a valid phone number"
    return null
  },
  minLength: (min: number) => (value: string) => {
    if (!value) return null
    if (value.length < min) return `Must be at least ${min} characters`
    return null
  },
  maxLength: (max: number) => (value: string) => {
    if (!value) return null
    if (value.length > max) return `Must be no more than ${max} characters`
    return null
  },
  number: (value: string) => {
    if (!value) return null
    if (isNaN(Number(value))) return "Please enter a valid number"
    return null
  },
  positiveNumber: (value: string) => {
    if (!value) return null
    const num = Number(value)
    if (isNaN(num) || num <= 0) return "Please enter a positive number"
    return null
  },
  percentage: (value: string) => {
    if (!value) return null
    const num = Number(value)
    if (isNaN(num) || num < 0 || num > 100) return "Please enter a value between 0 and 100"
    return null
  }
}

// Hook for form validation
export function useFormValidation<T extends Record<string, string>>(
  initialValues: T,
  validationRules: Partial<Record<keyof T, ((value: string) => string | null)[]>>
) {
  const [values, setValues] = React.useState<T>(initialValues)
  const [errors, setErrors] = React.useState<Partial<Record<keyof T, string>>>({})
  const [touched, setTouched] = React.useState<Partial<Record<keyof T, boolean>>>({})

  const validateField = (name: keyof T, value: string): string | null => {
    const rules = validationRules[name]
    if (!rules) return null

    for (const rule of rules) {
      const error = rule(value)
      if (error) return error
    }
    return null
  }

  const handleChange = (name: keyof T, value: string) => {
    setValues(prev => ({ ...prev, [name]: value }))
    if (touched[name]) {
      const error = validateField(name, value)
      setErrors(prev => ({ ...prev, [name]: error || undefined }))
    }
  }

  const handleBlur = (name: keyof T) => {
    setTouched(prev => ({ ...prev, [name]: true }))
    const error = validateField(name, values[name])
    setErrors(prev => ({ ...prev, [name]: error || undefined }))
  }

  const validateAll = (): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {}
    let isValid = true

    for (const key of Object.keys(validationRules) as (keyof T)[]) {
      const error = validateField(key, values[key])
      if (error) {
        newErrors[key] = error
        isValid = false
      }
    }

    setErrors(newErrors)
    setTouched(Object.keys(values).reduce((acc, key) => ({ ...acc, [key]: true }), {}))
    return isValid
  }

  const reset = () => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
  }

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    reset,
    setValues
  }
}
