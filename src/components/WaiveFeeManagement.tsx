import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Badge } from "./ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Progress } from "./ui/progress"
import { useLanguage } from "@/contexts/LanguageContext"
import {
  Upload,
  Download,
  FileText,
  X,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  Calendar,
  Award,
  CreditCard,
  Clock,
  Target,
  TrendingUp,
  DollarSign,
  Eye,
  BarChart3,
  Filter,
  Search,
  RotateCcw,
  Home,
  Building2,
  GraduationCap,
  Gift
} from "lucide-react"
import { toast } from "@/components/ui/sonner"
import { Switch } from "./ui/switch"
import { useAcademicYears } from "@/contexts/AcademicYearContext"
import { formatAcademicYear } from "@/utils/xlsxUtils"
import { useStudents } from "@/contexts/StudentContext"
import { useDiscountOptions } from "@/contexts/DiscountOptionsContext"

// Types
interface WaiverRecord {
  id: string
  familyCode: string
  academicYear: string
  term: number
  studentType: 'older' | 'younger'
  studentName: string
  studentGrade: string
  waiverAmount: number
  status: 'active' | 'completed' | 'pending'
  startDate: string
  endDate: string
}

interface WaiverSummary {
  academicYear: string
  termSummaries: {
    term: number
    totalStudents: number
    totalFamilies: number
    totalAmount: number
    olderSiblings: number
    youngerSiblings: number
  }[]
  yearlyTotal: {
    totalStudents: number
    totalFamilies: number
    totalAmount: number
  }
}

// Waiver amount constant (can be moved to settings later)
const WAIVER_AMOUNT = 75000

// Static function to get current academic year
const getCurrentAcademicYearStatic = () => {
  const now = new Date()
  const month = now.getMonth() + 1 // 1-12
  const year = now.getFullYear()

  if (month >= 5) {
    return `${year}-${year + 1}`
  } else {
    return `${year - 1}-${year}`
  }
}

interface WaiveFeeManagementProps {
  onNavigateToSubPage?: (subPage: string, params?: any) => void
}

export function WaiveFeeManagement({ onNavigateToSubPage }: WaiveFeeManagementProps = {}) {
  const { t } = useLanguage()
  const { academicYears } = useAcademicYears()
  const { students, families, getStudentsByFamily } = useStudents()
  const { getDiscountOptions, updateDiscountOptions } = useDiscountOptions()
  const [selectedYear, setSelectedYear] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Get current discount options for waiver settings
  const currentAcademicYearForSettings = selectedYear || getCurrentAcademicYearStatic()
  const currentDiscountOptions = getDiscountOptions(currentAcademicYearForSettings, "1")
  const waiverSettings = currentDiscountOptions.waiverAfter3rdYear

  // Update waiver settings
  const updateWaiverSettings = (updates: Partial<typeof waiverSettings>) => {
    updateDiscountOptions(currentAcademicYearForSettings, "1", {
      waiverAfter3rdYear: { ...waiverSettings, ...updates }
    })
  }

  // Generate waiver records from Family Groups data
  const waiverRecords = useMemo(() => {
    const records: WaiverRecord[] = []
    const currentYear = getCurrentAcademicYearStatic()

    // Only include years that are <= current academic year (no future years)
    const availableYears = academicYears
      .map(y => y.id)
      .filter(year => year <= currentYear)

    // Get families with more than 1 child (eligible for sibling waiver)
    const eligibleFamilies = families.filter(family => {
      const familyStudents = getStudentsByFamily(family.id)
      return familyStudents.length > 1
    })

    eligibleFamilies.forEach(family => {
      const familyStudents = getStudentsByFamily(family.id)
        .filter(s => s.status === 'active')
        .sort((a, b) => a.childOrder - b.childOrder)

      // Get students who are 2nd child or later (eligible for waiver)
      const eligibleStudents = familyStudents.filter(s => s.childOrder >= 2)

      availableYears.forEach(year => {
        // Generate records for each term (1, 2, 3)
        for (let term = 1; term <= 3; term++) {
          eligibleStudents.forEach(student => {
            // Determine student type based on child order
            const studentType: 'older' | 'younger' = student.childOrder === familyStudents.length ? 'younger' : 'older'

            // Determine status based on current academic year
            let status: 'active' | 'completed' | 'pending' = 'pending'
            if (year < currentYear) {
              status = 'completed'
            } else if (year === currentYear) {
              status = 'active'
            }

            records.push({
              id: `${family.familyCode}-${year}-T${term}-${student.id}`,
              familyCode: family.familyCode,
              academicYear: year,
              term,
              studentType,
              studentName: `${student.firstName} ${student.lastName}`,
              studentGrade: student.gradeLevel,
              waiverAmount: WAIVER_AMOUNT,
              status,
              startDate: `${year.split('-')[0]}-0${((term - 1) * 4) + 1}-01`,
              endDate: `${year.split('-')[0]}-${String(term * 4).padStart(2, '0')}-30`
            })
          })
        }
      })
    })

    return records
  }, [families, students, academicYears, getStudentsByFamily])

  // Get available years from Term Settings (show all years, including future)
  const availableYearsFromContext = academicYears
    .map(y => y.id)
    .sort((a, b) => b.localeCompare(a))

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

  // Set default year when context loads
  useEffect(() => {
    if (availableYearsFromContext.length > 0 && !selectedYear) {
      const currentAcademicYear = getCurrentAcademicYear()
      // Use current academic year if available, otherwise use the first (newest) year
      if (availableYearsFromContext.includes(currentAcademicYear)) {
        setSelectedYear(currentAcademicYear)
      } else {
        setSelectedYear(availableYearsFromContext[0])
      }
    }
  }, [availableYearsFromContext, selectedYear])

  // Calculate summary data
  const calculateWaiverSummary = (year: string): WaiverSummary => {
    const yearRecords = waiverRecords.filter(record => record.academicYear === year)

    const termSummaries = [1, 2, 3].map(termNumber => {
      const termRecords = yearRecords.filter(record => record.term === termNumber)
      const uniqueFamilies = new Set(termRecords.map(record => record.familyCode))

      return {
        term: termNumber,
        totalStudents: termRecords.length,
        totalFamilies: uniqueFamilies.size,
        totalAmount: termRecords.reduce((sum, record) => sum + record.waiverAmount, 0),
        olderSiblings: termRecords.filter(record => record.studentType === 'older').length,
        youngerSiblings: termRecords.filter(record => record.studentType === 'younger').length
      }
    })

    // Count unique students and families (not duplicated across terms)
    const uniqueStudents = new Set(yearRecords.map(record => record.studentName)).size
    const uniqueFamilies = new Set(yearRecords.map(record => record.familyCode)).size

    const yearlyTotal = {
      totalStudents: uniqueStudents,
      totalFamilies: uniqueFamilies,
      totalAmount: yearRecords.reduce((sum, record) => sum + record.waiverAmount, 0)
    }

    return {
      academicYear: year,
      termSummaries,
      yearlyTotal
    }
  }

  // Use available years from Term Settings context
  const availableYears = availableYearsFromContext

  // Filter records for list view
  const filteredRecords = waiverRecords.filter(record => {
    const matchesYear = record.academicYear === selectedYear
    const matchesStatus = filterStatus === 'all' || record.status === filterStatus
    const matchesSearch = searchQuery === '' ||
      record.familyCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.studentName.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesYear && matchesStatus && matchesSearch
  })

  // Group filtered records by term
  const recordsByTerm = filteredRecords.reduce((acc, record) => {
    if (!acc[record.term]) {
      acc[record.term] = []
    }
    acc[record.term].push(record)
    return acc
  }, {} as Record<number, WaiverRecord[]>)

  const currentSummary = calculateWaiverSummary(selectedYear)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">{t("waiveFee.active")}</Badge>
      case 'completed':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">{t("waiveFee.completed")}</Badge>
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">{t("waiveFee.pending")}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const resetFilters = () => {
    const currentAcademicYear = getCurrentAcademicYear()
    // Use current academic year if available, otherwise use the first (newest) year
    if (availableYears.includes(currentAcademicYear)) {
      setSelectedYear(currentAcademicYear)
    } else {
      setSelectedYear(availableYears[0] || '')
    }
    setFilterStatus('all')
    setSearchQuery('')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="mb-2">{t("waiveFee.title")}</h2>
          <p className="text-muted-foreground">
            {t("waiveFee.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            {t("waiveFee.exportData")}
          </Button>
          <Button className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            {t("waiveFee.importCsv")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2 min-w-[200px]">
              <Label>{t("waiveFee.academicYear")}</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year}>{formatAcademicYear(year)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" onClick={resetFilters} className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              {t("waiveFee.reset")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("waiveFee.totalStudents")}</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentSummary.yearlyTotal.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              {t("waiveFee.receivingWaivers").replace("{year}", selectedYear)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("waiveFee.totalFamilies")}</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentSummary.yearlyTotal.totalFamilies}</div>
            <p className="text-xs text-muted-foreground">
              {t("waiveFee.familiesBenefiting")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("waiveFee.totalWaiverAmount")}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(currentSummary.yearlyTotal.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {t("waiveFee.totalWaiversFor").replace("{year}", selectedYear)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("waiveFee.averagePerFamily")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentSummary.yearlyTotal.totalFamilies > 0
                ? formatCurrency(currentSummary.yearlyTotal.totalAmount / currentSummary.yearlyTotal.totalFamilies)
                : '฿0'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {t("waiveFee.avgWaiverPerFamily")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Registration Fee Waiver Program */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Gift className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-base">{t("waiveFee.registrationFeeWaiverProgram")}</CardTitle>
                <CardDescription>{t("waiveFee.configureWaiver")}</CardDescription>
              </div>
            </div>
            <Switch
              checked={waiverSettings.enabled}
              onCheckedChange={(checked) => updateWaiverSettings({ enabled: checked })}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">{t("waiveFee.minYearGroup")}</Label>
              <Input
                type="number"
                value={waiverSettings.minimumGradeLevel}
                onChange={(e) => updateWaiverSettings({ minimumGradeLevel: parseInt(e.target.value) || 3 })}
                disabled={!waiverSettings.enabled}
                min={1}
                max={13}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{t("waiveFee.minTerms1stChild")}</Label>
              <Input
                type="number"
                value={waiverSettings.minimumYears}
                onChange={(e) => updateWaiverSettings({ minimumYears: parseInt(e.target.value) || 3 })}
                disabled={!waiverSettings.enabled}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{t("waiveFee.creditAmountThb")}</Label>
              <Input
                type="number"
                value={waiverSettings.creditAmount}
                onChange={(e) => updateWaiverSettings({ creditAmount: Number(e.target.value) })}
                disabled={!waiverSettings.enabled}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{t("waiveFee.termsToCredit")}</Label>
              <Input
                type="number"
                value={waiverSettings.termsToCredit}
                onChange={(e) => updateWaiverSettings({ termsToCredit: Number(e.target.value) })}
                disabled={!waiverSettings.enabled}
                min={1}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-100">
            <div>
              <Label className="text-sm font-medium text-purple-900">{t("waiveFee.firstChildPrivilege")}</Label>
              <p className="text-sm text-purple-700 mt-1">{t("waiveFee.skipMinTerms")}</p>
            </div>
            <Switch
              checked={waiverSettings.firstChildImmediate}
              onCheckedChange={(checked) => updateWaiverSettings({ firstChildImmediate: checked })}
              disabled={!waiverSettings.enabled}
            />
          </div>

          {/* Eligibility Summary */}
          {waiverSettings.enabled && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <h5 className="text-sm font-medium mb-3">{t("waiveFee.eligibilitySummary")}</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <span>{t("waiveFee.yearPlusStudents").replace("{year}", String(waiverSettings.minimumGradeLevel))}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <span>{waiverSettings.firstChildImmediate ? t("waiveFee.firstChildImmediate") : t("waiveFee.firstChildAfterTerms").replace("{terms}", String(waiverSettings.minimumYears))}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <span>{t("waiveFee.secondChildImmediate").replace("{year}", String(waiverSettings.minimumGradeLevel))}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <span>{t("waiveFee.creditPerTerm").replace("{amount}", formatCurrency(waiverSettings.creditAmount / waiverSettings.termsToCredit)).replace("{terms}", String(waiverSettings.termsToCredit))}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Multi-Year Summary Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {t("waiveFee.multiYearSummary")}
          </CardTitle>
          <CardDescription>
            {t("waiveFee.avgWaiverAcrossYears")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-max">
              {/* Header Row */}
              <div className="grid grid-cols-[120px_repeat(5,160px)] gap-2 mb-4">
                <div className="font-medium text-sm text-muted-foreground flex items-center justify-center">
                  {t("waiveFee.academicYear")}
                </div>
                {availableYears.map(year => (
                  <div key={year} className="font-medium text-sm text-center p-2 bg-muted rounded-lg flex flex-col items-center gap-2">
                    <span>{formatAcademicYear(year)}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-6 px-2"
                      onClick={() => onNavigateToSubPage?.('waive-fee-year-details', { academicYear: year })}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      {t("waiveFee.viewMore")}
                    </Button>
                  </div>
                ))}
              </div>

              {/* Data Rows */}
              <div className="space-y-2">
                {[1, 2, 3].map(termNumber => (
                  <div key={termNumber} className="grid grid-cols-[120px_repeat(5,160px)] gap-2">
                    <div className="font-medium text-sm bg-muted rounded-lg flex items-center justify-center p-2">
                      {t("waiveFee.term").replace("{num}", String(termNumber))}
                    </div>
                    {availableYears.map(year => {
                      const yearSummary = calculateWaiverSummary(year)
                      const termSummary = yearSummary.termSummaries.find(t => t.term === termNumber)
                      const averagePerStudent = termSummary && termSummary.totalStudents > 0
                        ? termSummary.totalAmount / termSummary.totalStudents
                        : WAIVER_AMOUNT

                      return (
                        <div key={`${year}-${termNumber}`} className="border rounded-lg p-3 bg-card hover:bg-accent/50 transition-colors">
                          <div className="space-y-1">
                            <div className="text-lg font-bold text-center">
                              {formatCurrency(averagePerStudent)}
                            </div>
                            <div className="text-xs text-muted-foreground text-center">
                              {t("waiveFee.studentsCount").replace("{count}", String(termSummary?.totalStudents || 0))}
                            </div>
                            <div className="text-xs text-muted-foreground text-center">
                              {t("waiveFee.familiesCount").replace("{count}", String(termSummary?.totalFamilies || 0))}
                            </div>
                            {termSummary && termSummary.totalStudents > 0 && (
                              <div className="text-xs text-center">
                                <span className="text-orange-600">
                                  {termSummary.olderSiblings}{t("waiveFee.olderSibling")}
                                </span>
                                {" / "}
                                <span className="text-green-600">
                                  {termSummary.youngerSiblings}{t("waiveFee.youngerSibling")}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>

              {/* Summary Row */}
              <div className="grid grid-cols-[120px_repeat(5,160px)] gap-2 mt-4 pt-4 border-t">
                <div className="font-medium text-sm bg-primary/10 rounded-lg flex items-center justify-center p-2">
                  {t("waiveFee.yearTotal")}
                </div>
                {availableYears.map(year => {
                  const yearSummary = calculateWaiverSummary(year)
                  const yearAveragePerStudent = yearSummary.yearlyTotal.totalStudents > 0
                    ? yearSummary.yearlyTotal.totalAmount / yearSummary.yearlyTotal.totalStudents
                    : WAIVER_AMOUNT

                  return (
                    <div key={`${year}-total`} className="border-2 border-primary/20 rounded-lg p-3 bg-primary/5">
                      <div className="space-y-1">
                        <div className="text-lg font-bold text-center text-primary">
                          {formatCurrency(yearAveragePerStudent)}
                        </div>
                        <div className="text-xs text-muted-foreground text-center">
                          {t("waiveFee.studentsCount").replace("{count}", String(yearSummary.yearlyTotal.totalStudents))}
                        </div>
                        <div className="text-xs text-muted-foreground text-center">
                          {t("waiveFee.familiesCount").replace("{count}", String(yearSummary.yearlyTotal.totalFamilies))}
                        </div>
                        <div className="text-xs text-muted-foreground text-center">
                          {formatCurrency(yearSummary.yearlyTotal.totalAmount)} {t("waiveFee.total")}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> {t("waiveFee.noteValues")}
            </p>
          </div>
        </CardContent>
      </Card>




    </div>
  )
}