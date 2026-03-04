import { createContext, useContext, useState, useEffect, ReactNode } from "react"

export interface Term {
  id: string
  name: string
  startDate: Date | null
  endDate: Date | null
  paymentDeadline: Date | null
}

export interface AcademicYear {
  id: string
  name: string
  terms: Term[]
}

interface AcademicYearContextType {
  academicYears: AcademicYear[]
  setAcademicYears: (years: AcademicYear[]) => void
  addAcademicYear: (year: AcademicYear) => void
  deleteAcademicYear: (yearId: string) => void
  updateAcademicYear: (yearId: string, updates: Partial<AcademicYear>) => void
  saveAcademicYears: () => void
}

const AcademicYearContext = createContext<AcademicYearContextType | undefined>(undefined)

const STORAGE_KEY = "academicYears"

// Helper to serialize dates to ISO strings for localStorage
const serializeAcademicYears = (years: AcademicYear[]): string => {
  return JSON.stringify(years, (key, value) => {
    if (value instanceof Date) {
      return { __type: "Date", value: value.toISOString() }
    }
    return value
  })
}

// Helper to convert value to Date if it's a date-like value
const toDateOrNull = (value: any): Date | null => {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value
  if (typeof value === "string") {
    const date = new Date(value)
    return isNaN(date.getTime()) ? null : date
  }
  if (typeof value === "object" && value.__type === "Date") {
    return new Date(value.value)
  }
  return null
}

// Helper to deserialize dates from localStorage
const deserializeAcademicYears = (json: string): AcademicYear[] => {
  const parsed = JSON.parse(json)

  // Ensure dates are properly converted + migrate id format "-" → "/"
  return parsed.map((year: any) => ({
    ...year,
    id: (year.id || "").replace(/-/g, "/"),
    name: (year.name || "").replace(/-/g, "/"),
    terms: year.terms.map((term: any) => ({
      ...term,
      startDate: toDateOrNull(term.startDate),
      endDate: toDateOrNull(term.endDate),
      paymentDeadline: toDateOrNull(term.paymentDeadline)
    }))
  }))
}

const loadFromStorage = (): AcademicYear[] | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const data = deserializeAcademicYears(stored)
      // Validate that we got valid data
      if (Array.isArray(data) && data.length > 0) {
        return data
      }
    }
  } catch (error) {
    console.error("Failed to load academic years from localStorage:", error)
    // Clear corrupted data
    localStorage.removeItem(STORAGE_KEY)
  }
  return null
}

const saveToStorage = (years: AcademicYear[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, serializeAcademicYears(years))
  } catch (error) {
    console.error("Failed to save academic years to localStorage:", error)
  }
}

const initialAcademicYears: AcademicYear[] = [
  {
    id: "2025/2026",
    name: "2025/2026",
    terms: [
      {
        id: "1",
        name: "Term 1",
        startDate: new Date("2025-08-15"),
        endDate: new Date("2025-12-20"),
        paymentDeadline: new Date("2025-08-01")
      },
      {
        id: "2",
        name: "Term 2",
        startDate: new Date("2026-01-08"),
        endDate: new Date("2026-03-20"),
        paymentDeadline: new Date("2025-12-15")
      },
      {
        id: "3",
        name: "Term 3",
        startDate: new Date("2026-04-01"),
        endDate: new Date("2026-06-15"),
        paymentDeadline: new Date("2026-03-15")
      }
    ]
  },
  {
    id: "2024/2025",
    name: "2024/2025",
    terms: [
      {
        id: "1",
        name: "Term 1",
        startDate: new Date("2024-08-15"),
        endDate: new Date("2024-12-20"),
        paymentDeadline: new Date("2024-08-01")
      },
      {
        id: "2",
        name: "Term 2",
        startDate: new Date("2025-01-08"),
        endDate: new Date("2025-03-20"),
        paymentDeadline: new Date("2024-12-15")
      },
      {
        id: "3",
        name: "Term 3",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-06-15"),
        paymentDeadline: new Date("2025-03-15")
      }
    ]
  }
]

export function AcademicYearProvider({ children }: { children: ReactNode }) {
  const [academicYears, setAcademicYearsState] = useState<AcademicYear[]>(() => {
    return loadFromStorage() || initialAcademicYears
  })

  // Manual save function - no auto-save
  const saveAcademicYears = () => {
    saveToStorage(academicYears)
  }

  const setAcademicYears = (years: AcademicYear[]) => {
    setAcademicYearsState(years)
  }

  const addAcademicYear = (year: AcademicYear) => {
    setAcademicYearsState(prev => [...prev, year].sort((a, b) => b.id.localeCompare(a.id)))
  }

  const deleteAcademicYear = (yearId: string) => {
    if (academicYears.length <= 1) return
    setAcademicYearsState(prev => prev.filter(y => y.id !== yearId))
  }

  const updateAcademicYear = (yearId: string, updates: Partial<AcademicYear>) => {
    setAcademicYearsState(prev => prev.map(y =>
      y.id === yearId ? { ...y, ...updates } : y
    ))
  }

  return (
    <AcademicYearContext.Provider value={{
      academicYears,
      setAcademicYears,
      addAcademicYear,
      deleteAcademicYear,
      updateAcademicYear,
      saveAcademicYears
    }}>
      {children}
    </AcademicYearContext.Provider>
  )
}

export function useAcademicYears() {
  const context = useContext(AcademicYearContext)
  if (context === undefined) {
    throw new Error("useAcademicYears must be used within an AcademicYearProvider")
  }
  return context
}
