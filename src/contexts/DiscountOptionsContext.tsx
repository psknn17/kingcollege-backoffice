import { createContext, useContext, useState, useEffect, ReactNode } from "react"

// Interfaces
interface SiblingDiscount {
  childOrder: string
  label: string
  percentage: number
  enabled: boolean
}

interface LatePaymentSettings {
  chargePercentage: number
  chargeFrequency: "monthly" | "weekly"
  gracePeriodDays: number
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
  latePayment: LatePaymentSettings
  registrationFees: RegistrationFeeSettings
  registrationPrivileges: RegistrationPrivilege[]
  waiverAfter3rdYear: {
    enabled: boolean
    minimumGradeLevel: number
    minimumYears: number
    creditAmount: number
    termsToCredit: number
    firstChildImmediate: boolean
  }
  waiverImmediate: {
    enabled: boolean
    creditAmount: number
    termsToCredit: number
    limitedFamilies: number
  }
}

interface DiscountOptionsContextType {
  allData: Record<string, DiscountOptionsData>
  getDiscountOptions: (academicYear: string, term: string) => DiscountOptionsData
  getSiblingDiscountPercentage: (childOrder: number, academicYear: string, term: string) => number
  getRegistrationFees: (academicYear: string, term: string) => RegistrationFeeSettings
  getLatePaymentSettings: (academicYear: string, term: string) => LatePaymentSettings
  getWaiverSettings: (academicYear: string, term: string) => DiscountOptionsData["waiverAfter3rdYear"]
  refreshData: () => void
}

const DISCOUNT_OPTIONS_STORAGE_KEY = "discountOptions"

// Default values
const defaultSiblingDiscounts: SiblingDiscount[] = [
  { childOrder: "first", label: "First Child", percentage: 0, enabled: true },
  { childOrder: "second", label: "Second Child", percentage: 0, enabled: true },
  { childOrder: "third", label: "Third Child", percentage: 5, enabled: true },
  { childOrder: "fourth", label: "Fourth Child", percentage: 10, enabled: true },
  { childOrder: "fifth", label: "Fifth Child and subsequent", percentage: 20, enabled: true },
]

const defaultLatePayment: LatePaymentSettings = {
  chargePercentage: 1.5,
  chargeFrequency: "monthly",
  gracePeriodDays: 0,
  enabled: true,
}

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
    condition: "First child enrolled in academic year 2025-2026 or 2026-2027",
    privilege: "Registration fee waiver after the 3rd year",
    enabled: true,
  },
  {
    id: "2",
    condition: "Any subsequent child or children enrolled at the same time",
    privilege: "Registration fee waiver (limited to first 100 families)",
    enabled: true,
  },
  {
    id: "3",
    condition: "Child enrolled for Year 3-12 for the academic year",
    privilege: "Registration fee waiver after the 3rd year",
    enabled: true,
  },
]

const createDefaultData = (academicYear: string): DiscountOptionsData => ({
  academicYear,
  siblingDiscounts: defaultSiblingDiscounts,
  latePayment: defaultLatePayment,
  registrationFees: defaultRegistrationFees,
  registrationPrivileges: defaultRegistrationPrivileges,
  waiverAfter3rdYear: {
    enabled: true,
    minimumGradeLevel: 3,
    minimumYears: 3,
    creditAmount: 225000,
    termsToCredit: 3,
    firstChildImmediate: true,
  },
  waiverImmediate: {
    enabled: true,
    creditAmount: 225000,
    termsToCredit: 3,
    limitedFamilies: 100,
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

  // Get discount options for a specific year and term
  const getDiscountOptions = (academicYear: string, term: string): DiscountOptionsData => {
    const storageKey = `${academicYear}_${term}`
    return allData[storageKey] || createDefaultData(academicYear)
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

  // Get late payment settings
  const getLatePaymentSettings = (academicYear: string, term: string): LatePaymentSettings => {
    return getDiscountOptions(academicYear, term).latePayment
  }

  // Get waiver settings
  const getWaiverSettings = (academicYear: string, term: string) => {
    return getDiscountOptions(academicYear, term).waiverAfter3rdYear
  }

  return (
    <DiscountOptionsContext.Provider value={{
      allData,
      getDiscountOptions,
      getSiblingDiscountPercentage,
      getRegistrationFees,
      getLatePaymentSettings,
      getWaiverSettings,
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
  hasWithdrawnSibling: boolean,
  waiverSettings: DiscountOptionsData["waiverAfter3rdYear"]
): {
  eligible: boolean
  reason: string
  completedYears: number
} {
  // Check if waiver is enabled
  if (!waiverSettings.enabled) {
    return { eligible: false, reason: "Fee waiver privilege is disabled", completedYears: 0 }
  }

  // Check if student has withdrawn sibling (no privilege for family with withdrawn student)
  if (hasWithdrawnSibling) {
    return { eligible: false, reason: "Family has withdrawn student - not eligible", completedYears: 0 }
  }

  // Check minimum grade level requirement
  if (studentGradeLevel < waiverSettings.minimumGradeLevel) {
    return {
      eligible: false,
      reason: `Must enroll in Year ${waiverSettings.minimumGradeLevel}+ (currently Year ${studentGradeLevel})`,
      completedYears: 0
    }
  }

  // First child gets privilege immediately (if enabled)
  if (childOrder === 1 && waiverSettings.firstChildImmediate) {
    return { eligible: true, reason: "First child - immediate privilege", completedYears: 0 }
  }

  // For 2nd child+, calculate completed academic years
  const enrollmentYearNum = parseInt(enrollmentYear.split("-")[0])
  const currentYearNum = parseInt(currentYear.split("-")[0])

  let completedYears = currentYearNum - enrollmentYearNum

  // If enrolled in Term 2 or Term 3, first year is half-term (doesn't count)
  if (enrollmentTerm !== "term1") {
    completedYears = Math.max(0, completedYears - 1)
  }

  // Check if completed minimum years
  if (completedYears >= waiverSettings.minimumYears) {
    return {
      eligible: true,
      reason: `Completed ${completedYears} academic years`,
      completedYears
    }
  }

  const yearsRemaining = waiverSettings.minimumYears - completedYears
  return {
    eligible: false,
    reason: `Need ${yearsRemaining} more year(s) (completed ${completedYears}/${waiverSettings.minimumYears})`,
    completedYears
  }
}
