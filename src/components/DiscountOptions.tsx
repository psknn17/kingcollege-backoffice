import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog"
import { Switch } from "./ui/switch"
import { Badge } from "./ui/badge"
import {
  Save,
  Users,
  Info
} from "lucide-react"
import { toast } from "@/components/ui/sonner"
import { useAcademicYears } from "@/contexts/AcademicYearContext"
import { formatAcademicYear } from "@/utils/xlsxUtils"
import { useLanguage } from "@/contexts/LanguageContext"

// Storage key for discount options
const DISCOUNT_OPTIONS_STORAGE_KEY = "discountOptions"


interface RegistrationFeeSettings {
  applicationFee: number
  registrationFee: number
  securityDeposit: number
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

interface DiscountOptionsData {
  academicYear: string
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


const defaultRegistrationFees: RegistrationFeeSettings = {
  applicationFee: 5000,
  registrationFee: 225000,
  securityDeposit: 200000,
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
  registrationFees: defaultRegistrationFees,
  registrationPrivileges: defaultRegistrationPrivileges,
  waiverAfter3rdYear: {
    enabled: true,
    minimumGradeLevel: 3,
    minimumYears: 3,
    creditAmount: 225000,
    termsToCredit: 3,
    firstChildImmediate: false, // First child must wait 3 terms
  },
  waiverImmediate: {
    enabled: true,
    creditAmount: 225000,
    termsToCredit: 3,
    limitedFamilies: 100,
  },
})

const loadFromStorage = (): Record<string, DiscountOptionsData> | null => {
  try {
    const stored = localStorage.getItem(DISCOUNT_OPTIONS_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error("Failed to load discount options from localStorage:", error)
  }
  return null
}

const saveToStorage = (data: Record<string, DiscountOptionsData>) => {
  try {
    localStorage.setItem(DISCOUNT_OPTIONS_STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error("Failed to save discount options to localStorage:", error)
  }
}

export function DiscountOptions() {
  const { t } = useLanguage()
  const { academicYears } = useAcademicYears()
  const [selectedYear, setSelectedYear] = useState<string>("")
  const [allData, setAllData] = useState<Record<string, DiscountOptionsData>>(() => {
    return loadFromStorage() || {}
  })

  const availableYears = academicYears.map(y => y.id).sort((a, b) => b.localeCompare(a))

  // Get terms for selected year
  const selectedYearData = academicYears.find(y => y.id === selectedYear)
  const availableTerms = selectedYearData?.terms || []

  // Create storage key combining year and term
  const storageKey = selectedYear ? `${selectedYear}` : ""

  // Find current academic year based on today's date and term dates
  const getCurrentAcademicYear = (): string | null => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const year of academicYears) {
      // Get the earliest start date and latest end date of all terms in this year
      let yearStart: Date | null = null
      let yearEnd: Date | null = null

      for (const term of year.terms) {
        if (term.startDate) {
          const termStart = new Date(term.startDate)
          if (!yearStart || termStart < yearStart) {
            yearStart = termStart
          }
        }
        if (term.endDate) {
          const termEnd = new Date(term.endDate)
          if (!yearEnd || termEnd > yearEnd) {
            yearEnd = termEnd
          }
        }
      }

      // Check if today falls within the academic year range
      if (yearStart && yearEnd) {
        yearStart.setHours(0, 0, 0, 0)
        yearEnd.setHours(23, 59, 59, 999)

        if (today >= yearStart && today <= yearEnd) {
          return year.id
        }
      }
    }
    return null
  }

  // Set default year based on current academic year from term settings
  const [hasInitialized, setHasInitialized] = useState(false)

  useEffect(() => {
    if (academicYears.length > 0 && !hasInitialized) {
      const currentYear = getCurrentAcademicYear()
      if (currentYear) {
        setSelectedYear(currentYear)
      } else {
        // Fallback to newest year if no current year found
        const sortedYears = academicYears.map(y => y.id).sort((a, b) => b.localeCompare(a))
        setSelectedYear(sortedYears[0])
      }
      setHasInitialized(true)
    }
  }, [academicYears, hasInitialized])

  // Handle case when selected year is no longer available
  useEffect(() => {
    if (hasInitialized && availableYears.length > 0 && selectedYear && !availableYears.includes(selectedYear)) {
      const currentYear = getCurrentAcademicYear()
      setSelectedYear(currentYear || availableYears[0])
    }
  }, [availableYears, hasInitialized])

  // Initialize data for year
  useEffect(() => {
    if (storageKey && !allData[storageKey]) {
      setAllData(prev => ({
        ...prev,
        [storageKey]: createDefaultData(selectedYear)
      }))
    }
  }, [storageKey, allData, selectedYear])

  // Manual save function
  const handleSaveChanges = () => {
    if (Object.keys(allData).length > 0) {
      saveToStorage(allData)
      toast.success(t("discountOptions.savedSuccess").replace("{year}", selectedYear))
    }
  }

  const currentData = storageKey ? (allData[storageKey] || createDefaultData(selectedYear)) : createDefaultData(selectedYear)

  const updateCurrentData = (updates: Partial<DiscountOptionsData>) => {
    if (!storageKey) return
    setAllData(prev => ({
      ...prev,
      [storageKey]: { ...currentData, ...updates }
    }))
  }


  const updateRegistrationFees = (updates: Partial<RegistrationFeeSettings>) => {
    updateCurrentData({ registrationFees: { ...currentData.registrationFees, ...updates } })
  }

  const updatePrivilege = (index: number, updates: Partial<RegistrationPrivilege>) => {
    const newPrivileges = [...currentData.registrationPrivileges]
    newPrivileges[index] = { ...newPrivileges[index], ...updates }
    updateCurrentData({ registrationPrivileges: newPrivileges })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{t("discountOptions.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("discountOptions.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">{t("discountOptions.academicYear")}:</Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t("discountOptions.selectYear")} />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year}>
                    {formatAcademicYear(year)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSaveChanges} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            {t("discountOptions.saveAllChanges")}
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800 font-medium">{t("discountOptions.schoolName")}</p>
              <p className="text-sm text-blue-700">
                {t("discountOptions.feesInfo").replace("{year}", selectedYear)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
