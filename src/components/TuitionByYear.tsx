import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog"
import { Save, GraduationCap } from "lucide-react"
import { toast } from "@/components/ui/sonner"
import { useAcademicYears } from "@/contexts/AcademicYearContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAuth } from "@/contexts/AuthContext"
import { canPerformActions } from "@/utils/rolePermissions"

interface GradeLevelTuition {
  id: string
  gradeLevel: string
  gradeLevelOrder: number
  term1Amount: number
  term2Amount: number
  term3Amount: number
}

const gradeLevels = [
  { id: "pre-nursery", label: "Pre-Nursery", order: 1 },
  { id: "nursery", label: "Nursery", order: 2 },
  { id: "reception", label: "Reception", order: 3 },
  { id: "year1", label: "Year 1", order: 4 },
  { id: "year2", label: "Year 2", order: 5 },
  { id: "year3", label: "Year 3", order: 6 },
  { id: "year4", label: "Year 4", order: 7 },
  { id: "year5", label: "Year 5", order: 8 },
  { id: "year6", label: "Year 6", order: 9 },
  { id: "year7", label: "Year 7", order: 10 },
  { id: "year8", label: "Year 8", order: 11 },
  { id: "year9", label: "Year 9", order: 12 },
  { id: "year10", label: "Year 10", order: 13 },
  { id: "year11", label: "Year 11", order: 14 },
  { id: "year12", label: "Year 12", order: 15 },
  { id: "year13", label: "Year 13", order: 16 },
]

const TUITION_STORAGE_KEY = "tuitionByYearData"

// Migration mapping from old grade IDs to new grade IDs
const oldToNewGradeMapping: Record<string, string> = {
  "nursery": "nursery",
  "k1": "reception", // K1-K3 combined into Reception
  "k2": "reception",
  "k3": "reception",
  "g1": "year1",
  "g2": "year2",
  "g3": "year3",
  "g4": "year4",
  "g5": "year5",
  "g6": "year6",
  "g7": "year7",
  "g8": "year8",
  "g9": "year9",
  "g10": "year10",
  "g11": "year11",
  "g12": "year12",
}

// Mock tuition fees (THB) - increasing by grade level
const mockTuitionFees: Record<string, { term1: number; term2: number; term3: number }> = {
  "pre-nursery": { term1: 95000, term2: 90000, term3: 85000 },
  nursery: { term1: 105000, term2: 100000, term3: 95000 },
  reception: { term1: 115000, term2: 110000, term3: 105000 },
  year1: { term1: 125000, term2: 120000, term3: 115000 },
  year2: { term1: 135000, term2: 130000, term3: 125000 },
  year3: { term1: 145000, term2: 140000, term3: 135000 },
  year4: { term1: 155000, term2: 150000, term3: 145000 },
  year5: { term1: 165000, term2: 160000, term3: 155000 },
  year6: { term1: 180000, term2: 175000, term3: 170000 },
  year7: { term1: 200000, term2: 195000, term3: 190000 },
  year8: { term1: 215000, term2: 210000, term3: 205000 },
  year9: { term1: 230000, term2: 225000, term3: 220000 },
  year10: { term1: 260000, term2: 255000, term3: 250000 },
  year11: { term1: 290000, term2: 285000, term3: 280000 },
  year12: { term1: 320000, term2: 315000, term3: 310000 },
  year13: { term1: 350000, term2: 345000, term3: 340000 },
}

const createDefaultGrades = (): GradeLevelTuition[] => {
  return gradeLevels.map(grade => ({
    id: grade.id,
    gradeLevel: grade.label,
    gradeLevelOrder: grade.order,
    term1Amount: mockTuitionFees[grade.id]?.term1 || 0,
    term2Amount: mockTuitionFees[grade.id]?.term2 || 0,
    term3Amount: mockTuitionFees[grade.id]?.term3 || 0
  }))
}

// Create empty grades for new academic year (all amounts = 0)
const createEmptyGrades = (): GradeLevelTuition[] => {
  return gradeLevels.map(grade => ({
    id: grade.id,
    gradeLevel: grade.label,
    gradeLevelOrder: grade.order,
    term1Amount: 0,
    term2Amount: 0,
    term3Amount: 0
  }))
}

// Migrate old grade data to new format while preserving tuition amounts
const migrateGradeData = (oldGrades: GradeLevelTuition[]): GradeLevelTuition[] => {
  // Create new grades with EMPTY values (not default values)
  const newGrades = createEmptyGrades()

  // Check if data needs migration (look for old IDs like k1, g1, etc.)
  const hasOldFormat = oldGrades.some(g =>
    g.id.startsWith('k') || g.id.startsWith('g') ||
    g.gradeLevel.includes('Kindergarten') || g.gradeLevel.includes('Grade ')
  )

  // Check if data has old single tuitionAmount field
  const hasOldTuitionField = oldGrades.some(g => 'tuitionAmount' in g && !('term1Amount' in g))

  if (!hasOldFormat && !hasOldTuitionField) {
    // Data is already in new format, return as-is but ensure all grades exist
    return newGrades.map(newGrade => {
      const existingGrade = oldGrades.find(og => og.id === newGrade.id)
      return existingGrade ? {
        ...newGrade,
        term1Amount: existingGrade.term1Amount || 0,
        term2Amount: existingGrade.term2Amount || 0,
        term3Amount: existingGrade.term3Amount || 0
      } : newGrade
    })
  }

  // Migrate old data to new format
  oldGrades.forEach(oldGrade => {
    const newId = oldToNewGradeMapping[oldGrade.id] || oldGrade.id
    const targetGrade = newGrades.find(g => g.id === newId)
    if (targetGrade) {
      // If old format had single tuitionAmount, spread it across all terms
      const oldAmount = (oldGrade as any).tuitionAmount || 0
      if (oldAmount > 0) {
        if (targetGrade.term1Amount === 0) targetGrade.term1Amount = oldAmount
        if (targetGrade.term2Amount === 0) targetGrade.term2Amount = oldAmount
        if (targetGrade.term3Amount === 0) targetGrade.term3Amount = oldAmount
      }
      // Also handle new term fields if they exist
      if (oldGrade.term1Amount) targetGrade.term1Amount = oldGrade.term1Amount
      if (oldGrade.term2Amount) targetGrade.term2Amount = oldGrade.term2Amount
      if (oldGrade.term3Amount) targetGrade.term3Amount = oldGrade.term3Amount
    }
  })

  return newGrades
}

const loadTuitionFromStorage = (): Record<string, GradeLevelTuition[]> | null => {
  try {
    const stored = localStorage.getItem(TUITION_STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      // Migrate each year's data to new format
      const migratedData: Record<string, GradeLevelTuition[]> = {}
      for (const year of Object.keys(data)) {
        migratedData[year] = migrateGradeData(data[year])
      }
      return migratedData
    }
  } catch (error) {
    console.error("Failed to load tuition data from localStorage:", error)
  }
  return null
}

const saveTuitionToStorage = (data: Record<string, GradeLevelTuition[]>) => {
  try {
    localStorage.setItem(TUITION_STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error("Failed to save tuition data to localStorage:", error)
  }
}

export function TuitionByYear() {
  const { academicYears } = useAcademicYears()
  const { t } = useLanguage()
  const { user } = useAuth()
  const userCanEdit = canPerformActions(user?.role)

  // Initialize tuition data from localStorage or empty object
  const [tuitionData, setTuitionData] = useState<Record<string, GradeLevelTuition[]>>(() => {
    return loadTuitionFromStorage() || {}
  })
  const [selectedYear, setSelectedYear] = useState<string>("")

  // Get available years from the context (Term Settings)
  const availableYears = useMemo(() => {
    return academicYears.map(y => y.id).sort((a, b) => b.localeCompare(a))
  }, [academicYears])

  // Calculate current academic year based on today's date
  const getCurrentAcademicYear = () => {
    const now = new Date()
    const month = now.getMonth() + 1 // 1-12
    const year = now.getFullYear()

    // If month >= 5 (May), academic year = currentYear-nextYear
    // If month < 5 (Jan-Apr), academic year = previousYear-currentYear
    if (month >= 5) {
      return `${year}-${year + 1}`
    } else {
      return `${year - 1}-${year}`
    }
  }

  // Set default selected year when available years change
  useEffect(() => {
    if (availableYears.length > 0 && (!selectedYear || !availableYears.includes(selectedYear))) {
      const currentAcademicYear = getCurrentAcademicYear()
      // Use current academic year if available, otherwise use the first (newest) year
      if (availableYears.includes(currentAcademicYear)) {
        setSelectedYear(currentAcademicYear)
      } else {
        setSelectedYear(availableYears[0])
      }
    }
  }, [availableYears, selectedYear])

  // Years that should have mock data pre-populated
  const yearsWithMockData = ["2024-2025"]

  // Initialize tuition data for new academic years
  useEffect(() => {
    setTuitionData(prev => {
      const updated = { ...prev }
      let hasChanges = false
      for (const year of availableYears) {
        if (!updated[year]) {
          // Use mock data for specified years, empty grades for others
          if (yearsWithMockData.includes(year)) {
            updated[year] = createDefaultGrades()
            console.log(`[TuitionByYear] Created default grades with mock data for year: ${year}`)
          } else {
            updated[year] = createEmptyGrades()
            console.log(`[TuitionByYear] Created empty grades for new year: ${year}`)
          }
          hasChanges = true
        }
      }
      // Remove years that no longer exist in Term Settings
      for (const year of Object.keys(updated)) {
        if (!availableYears.includes(year)) {
          delete updated[year]
          hasChanges = true
        }
      }
      return hasChanges ? updated : prev
    })
  }, [availableYears])

  const currentYearGrades = tuitionData[selectedYear] || []
  const [isSaveConfirmDialogOpen, setIsSaveConfirmDialogOpen] = useState(false)

  const updateTuitionAmount = (gradeId: string, term: 'term1Amount' | 'term2Amount' | 'term3Amount', amount: number) => {
    setTuitionData(prev => ({
      ...prev,
      [selectedYear]: (prev[selectedYear] || []).map(grade =>
        grade.id === gradeId ? { ...grade, [term]: amount } : grade
      )
    }))
  }

  const handleSaveAll = () => {
    console.log("Saving tuition data:", tuitionData)
    saveTuitionToStorage(tuitionData)
    toast.success(t("tuition.savedSuccess"))
    setIsSaveConfirmDialogOpen(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Calculate row total (all 3 terms)
  const getRowTotal = (grade: GradeLevelTuition) => {
    return grade.term1Amount + grade.term2Amount + grade.term3Amount
  }

  // Calculate column totals
  const getTerm1Total = () => currentYearGrades.reduce((sum, g) => sum + g.term1Amount, 0)
  const getTerm2Total = () => currentYearGrades.reduce((sum, g) => sum + g.term2Amount, 0)
  const getTerm3Total = () => currentYearGrades.reduce((sum, g) => sum + g.term3Amount, 0)
  const getGrandTotal = () => getTerm1Total() + getTerm2Total() + getTerm3Total()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{t("tuition.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("tuition.description")}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="academic-year" className="text-sm whitespace-nowrap">{t("common.academicYear")}:</Label>
            <Select value={selectedYear} onValueChange={setSelectedYear} disabled={!userCanEdit}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t("tuition.selectYear")} />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setIsSaveConfirmDialogOpen(true)} disabled={!userCanEdit} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            {t("tuition.saveAllChanges")}
          </Button>
        </div>
      </div>

      {/* Tuition Table with 3 Terms */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            {t("tuition.feesAcademicYear")} {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">{t("tuition.no")}</TableHead>
                <TableHead className="w-[140px]">{t("tuition.yearGroup")}</TableHead>
                <TableHead className="text-center">{t("tuition.term1")} (THB)</TableHead>
                <TableHead className="text-center">{t("tuition.term2")} (THB)</TableHead>
                <TableHead className="text-center">{t("tuition.term3")} (THB)</TableHead>
                <TableHead className="text-right w-[140px]">{t("common.total")} (THB)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentYearGrades
                .sort((a, b) => a.gradeLevelOrder - b.gradeLevelOrder)
                .map((grade, index) => (
                  <TableRow key={grade.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-medium">{grade.gradeLevel}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={grade.term1Amount || ""}
                        onChange={(e) => updateTuitionAmount(grade.id, 'term1Amount', parseFloat(e.target.value) || 0)}
                        placeholder={t("tuition.term1")}
                        className="w-full text-center"
                        min={0}
                        disabled={!userCanEdit}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={grade.term2Amount || ""}
                        onChange={(e) => updateTuitionAmount(grade.id, 'term2Amount', parseFloat(e.target.value) || 0)}
                        placeholder={t("tuition.term2")}
                        className="w-full text-center"
                        min={0}
                        disabled={!userCanEdit}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={grade.term3Amount || ""}
                        onChange={(e) => updateTuitionAmount(grade.id, 'term3Amount', parseFloat(e.target.value) || 0)}
                        placeholder={t("tuition.term3")}
                        className="w-full text-center"
                        min={0}
                        disabled={!userCanEdit}
                      />
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(getRowTotal(grade))}
                    </TableCell>
                  </TableRow>
                ))}
              {/* Total Row */}
              <TableRow className="bg-muted/50 font-bold border-t-2">
                <TableCell></TableCell>
                <TableCell className="font-bold">{t("common.total")}</TableCell>
                <TableCell className="text-center font-bold text-primary">
                  {formatCurrency(getTerm1Total())}
                </TableCell>
                <TableCell className="text-center font-bold text-primary">
                  {formatCurrency(getTerm2Total())}
                </TableCell>
                <TableCell className="text-center font-bold text-primary">
                  {formatCurrency(getTerm3Total())}
                </TableCell>
                <TableCell className="text-right font-bold text-primary text-lg">
                  {formatCurrency(getGrandTotal())}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Save Confirmation Dialog */}
      <Dialog open={isSaveConfirmDialogOpen} onOpenChange={setIsSaveConfirmDialogOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>{t("tuition.confirmSaveTitle")}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              {t("tuition.confirmSaveMessage")} {selectedYear}?
            </p>
            <div className="mt-4 p-3 bg-muted rounded-md space-y-2">
              <p className="text-sm">
                <span className="font-medium">{t("tuition.term1Total")}:</span> {formatCurrency(getTerm1Total())}
              </p>
              <p className="text-sm">
                <span className="font-medium">{t("tuition.term2Total")}:</span> {formatCurrency(getTerm2Total())}
              </p>
              <p className="text-sm">
                <span className="font-medium">{t("tuition.term3Total")}:</span> {formatCurrency(getTerm3Total())}
              </p>
              <div className="border-t pt-2 mt-2">
                <p className="text-sm font-bold text-primary">
                  <span>{t("tuition.grandTotal")}:</span> {formatCurrency(getGrandTotal())}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveConfirmDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSaveAll} disabled={!userCanEdit}>
              {t("tuition.confirmSave")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
