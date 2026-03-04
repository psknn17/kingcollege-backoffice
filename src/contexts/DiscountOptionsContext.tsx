import { createContext, useContext, useState, useEffect, ReactNode } from "react"

// Interfaces
interface SiblingDiscount {
  childOrder: string
  label: string
  percentage: number
  enabled: boolean
}


interface RegistrationFeeSettings {
  applicationFee: number
  registrationFee: number
  securityDeposit: number
  waitListFee: number
  applicationFeeRefundable: boolean
  registrationFeeRefundable: boolean
  securityDepositRefundable: boolean
}

interface RegistrationPrivilege {
  id: string
  condition: string
  privilege: string
  enabled: boolean
}

export interface DiscountOptionsData {
  academicYear: string
  siblingDiscounts: SiblingDiscount[]
  registrationFees: RegistrationFeeSettings
  registrationPrivileges: RegistrationPrivilege[]
  waiverAfter3rdYear: {
    enabled: boolean
    minimumGradeLevel: number
    minimumTerms: number  // First child waits this many terms before receiving
    creditAmount: number
    termsToCredit: number
    firstChildImmediate: boolean  // false = first child waits, true = first child gets immediately
    secondChildImmediate: boolean // true = second child+ gets immediately
  }
  waiverImmediate: {
    enabled: boolean
    creditAmount: number
    termsToCredit: number
    limitedFamily: number
  }
}

interface DiscountOptionsContextType {
  allData: Record<string, DiscountOptionsData>
  getDiscountOptions: (academicYear: string, term: string) => DiscountOptionsData
  getSiblingDiscountPercentage: (childOrder: number, academicYear: string, term: string) => number
  getRegistrationFees: (academicYear: string, term: string) => RegistrationFeeSettings
  getWaiverSettings: (academicYear: string, term: string) => DiscountOptionsData["waiverAfter3rdYear"]
  updateDiscountOptions: (academicYear: string, term: string, updates: Partial<DiscountOptionsData>) => void
  refreshData: () => void
}

const DISCOUNT_OPTIONS_STORAGE_KEY = "discountOptions"

// Default values
const defaultSiblingDiscounts: SiblingDiscount[] = [
  { childOrder: "first", label: "First Child", percentage: 0, enabled: true },
  { childOrder: "second", label: "Second Child", percentage: 0, enabled: true },
  { childOrder: "third", label: "Third child sibling discount (5%)", percentage: 5, enabled: true },
  { childOrder: "fourth", label: "Fourth child sibling discount (10%)", percentage: 10, enabled: true },
  { childOrder: "fifth", label: "Fifth child sibling discount (20%)", percentage: 20, enabled: true },
]


const defaultRegistrationFees: RegistrationFeeSettings = {
  applicationFee: 5000,
  registrationFee: 225000,
  securityDeposit: 200000,
  waitListFee: 225000,
  applicationFeeRefundable: false,
  registrationFeeRefundable: false,
  securityDepositRefundable: true,
}

const defaultRegistrationPrivileges: RegistrationPrivilege[] = [
  {
    id: "1",
    condition: "First child enrolled in Year 3+",
    privilege: "Registration fee waiver after 3 terms (receives from term 4 onwards)",
    enabled: true,
  },
  {
    id: "2",
    condition: "Second child or subsequent children",
    privilege: "Registration fee waiver immediately (75,000 × 3 terms)",
    enabled: true,
  },
  {
    id: "3",
    condition: "If first child withdraws",
    privilege: "Siblings will not receive waiver from the following term",
    enabled: true,
  },
]

const createDefaultData = (academicYear: string): DiscountOptionsData => ({
  academicYear,
  siblingDiscounts: defaultSiblingDiscounts,
  registrationFees: defaultRegistrationFees,
  registrationPrivileges: defaultRegistrationPrivileges,
  waiverAfter3rdYear: {
    enabled: false,
    minimumGradeLevel: 3,
    minimumTerms: 3,  // First child waits 3 terms, receives from 4th term
    creditAmount: 225000,
    termsToCredit: 3,
    firstChildImmediate: false,  // First child waits 3 terms
    secondChildImmediate: true,  // Second child+ gets immediately
  },
  waiverImmediate: {
    enabled: true,
    creditAmount: 225000,
    termsToCredit: 3,
    limitedFamily: 100,
  },
})

const loadFromStorage = (): Record<string, DiscountOptionsData> => {
  try {
    const stored = localStorage.getItem(DISCOUNT_OPTIONS_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error("Failed to load discount options from localStorage:", error)
  }
  return {}
}

const DiscountOptionsContext = createContext<DiscountOptionsContextType | undefined>(undefined)

export function DiscountOptionsProvider({ children }: { children: ReactNode }) {
  const [allData, setAllData] = useState<Record<string, DiscountOptionsData>>(() => {
    return loadFromStorage()
  })

  // Refresh data from localStorage (useful when DiscountOptions page saves new data)
  const refreshData = () => {
    setAllData(loadFromStorage())
  }

  // Listen for storage changes (when DiscountOptions saves)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === DISCOUNT_OPTIONS_STORAGE_KEY) {
        refreshData()
      }
    }
    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  // Get discount options for a specific year (term is kept for API compatibility but not used for lookup)
  const getDiscountOptions = (academicYear: string, term: string): DiscountOptionsData => {
    // Storage key is just the academic year (e.g., "2024/2025")
    return allData[academicYear] || createDefaultData(academicYear)
  }

  // Get sibling discount percentage by child order
  const getSiblingDiscountPercentage = (childOrder: number, academicYear: string, term: string): number => {
    const options = getDiscountOptions(academicYear, term)
    const discounts = options.siblingDiscounts

    // Map child order number to discount index
    let discountIndex: number
    if (childOrder <= 0) return 0
    if (childOrder === 1) discountIndex = 0
    else if (childOrder === 2) discountIndex = 1
    else if (childOrder === 3) discountIndex = 2
    else if (childOrder === 4) discountIndex = 3
    else discountIndex = 4 // 5th and beyond

    const discount = discounts[discountIndex]
    if (discount && discount.enabled) {
      return discount.percentage
    }
    return 0
  }

  // Get registration fees
  const getRegistrationFees = (academicYear: string, term: string): RegistrationFeeSettings => {
    return getDiscountOptions(academicYear, term).registrationFees
  }


  // Get waiver settings
  // Get waiver settings
  const getWaiverSettings = (academicYear: string, term: string) => {
    return getDiscountOptions(academicYear, term).waiverAfter3rdYear
  }

  // Update discount options
  const updateDiscountOptions = (academicYear: string, term: string, updates: Partial<DiscountOptionsData>) => {
    setAllData(prev => {
      const current = prev[academicYear] || createDefaultData(academicYear)
      const newData = {
        ...prev,
        [academicYear]: { ...current, ...updates }
      }
      localStorage.setItem(DISCOUNT_OPTIONS_STORAGE_KEY, JSON.stringify(newData))
      return newData
    })
  }

  return (
    <DiscountOptionsContext.Provider value={{
      allData,
      getDiscountOptions,
      getSiblingDiscountPercentage,
      getRegistrationFees,
      getWaiverSettings,
      updateDiscountOptions,
      refreshData
    }}>
      {children}
    </DiscountOptionsContext.Provider>
  )
}

export function useDiscountOptions() {
  const context = useContext(DiscountOptionsContext)
  if (context === undefined) {
    throw new Error("useDiscountOptions must be used within a DiscountOptionsProvider")
  }
  return context
}

// Helper function to check fee privilege eligibility
export function checkFeePrivilegeEligibility(
  studentGradeLevel: number,
  childOrder: number,
  enrollmentTerm: "term1" | "term2" | "term3",
  enrollmentYear: string,
  currentYear: string,
  currentTerm: "term1" | "term2" | "term3",
  hasWithdrawnSibling: boolean,
  firstChildWithdrawn: boolean,  // If first child has withdrawn
  waiverSettings: DiscountOptionsData["waiverAfter3rdYear"]
): {
  eligible: boolean
  reason: string
  completedTerms: number
  startsFromTerm: string | null
} {
  // Check if waiver is enabled
  if (!waiverSettings.enabled) {
    return { eligible: false, reason: "Fee waiver privilege is disabled", completedTerms: 0, startsFromTerm: null }
  }

  // Check minimum grade level requirement
  if (studentGradeLevel < waiverSettings.minimumGradeLevel) {
    return {
      eligible: false,
      reason: `Must enroll in Year ${waiverSettings.minimumGradeLevel}+ (currently Year ${studentGradeLevel})`,
      completedTerms: 0,
      startsFromTerm: null
    }
  }

  // If first child has withdrawn, subsequent children lose discount in the following term
  if (firstChildWithdrawn && childOrder > 1) {
    return {
      eligible: false,
      reason: "First child has withdrawn - siblings not eligible from next term",
      completedTerms: 0,
      startsFromTerm: null
    }
  }

  // Check if student has any withdrawn sibling (family with withdrawn student)
  if (hasWithdrawnSibling) {
    return { eligible: false, reason: "Family has withdrawn student - not eligible", completedTerms: 0, startsFromTerm: null }
  }

  // Second child+ gets privilege immediately (if enabled)
  if (childOrder >= 2 && waiverSettings.secondChildImmediate) {
    return { eligible: true, reason: "Second child or later - immediate privilege", completedTerms: 0, startsFromTerm: "immediate" }
  }

  // First child logic: must wait minimumTerms before receiving
  if (childOrder === 1) {
    // Calculate completed terms
    const enrollmentYearNum = parseInt(enrollmentYear.split(/[-/]/)[0])
    const currentYearNum = parseInt(currentYear.split(/[-/]/)[0])
    const termToNumber = (term: string) => {
      if (term === "term1") return 1
      if (term === "term2") return 2
      return 3
    }

    const enrollmentTermNum = termToNumber(enrollmentTerm)
    const currentTermNum = termToNumber(currentTerm)

    // Calculate total terms completed
    const yearsDiff = currentYearNum - enrollmentYearNum
    let completedTerms = (yearsDiff * 3) + (currentTermNum - enrollmentTermNum)

    // Check if completed minimum terms
    if (completedTerms >= waiverSettings.minimumTerms) {
      // Calculate when the waiver starts (term after completing minimumTerms)
      const startTermNum = ((enrollmentTermNum - 1 + waiverSettings.minimumTerms) % 3) + 1
      const startYear = enrollmentYearNum + Math.floor((enrollmentTermNum - 1 + waiverSettings.minimumTerms) / 3)
      const startsFromTerm = `Term ${startTermNum}, ${startYear}-${startYear + 1}`

      return {
        eligible: true,
        reason: `Completed ${completedTerms} terms - eligible from term ${waiverSettings.minimumTerms + 1}`,
        completedTerms,
        startsFromTerm
      }
    }

    const termsRemaining = waiverSettings.minimumTerms - completedTerms
    return {
      eligible: false,
      reason: `Need ${termsRemaining} more term(s) (completed ${completedTerms}/${waiverSettings.minimumTerms})`,
      completedTerms,
      startsFromTerm: null
    }
  }

  return { eligible: false, reason: "Not eligible", completedTerms: 0, startsFromTerm: null }
}
