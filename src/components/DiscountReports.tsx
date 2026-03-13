import { useState, useMemo, useEffect } from "react"
import { PaginationBar } from "@/components/ui/pagination-bar"
import { downloadAsXlsx, formatAcademicYear } from "@/utils/xlsxUtils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import {
  Download,
  Filter,
  Users,
  Percent,
  DollarSign,
  GraduationCap,
  ArrowUpDown
} from "lucide-react"
import { toast } from "@/components/ui/sonner"
import { useStudents } from "@/contexts/StudentContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { useDiscountOptions } from "@/contexts/DiscountOptionsContext"
import { useAcademicYears } from "@/contexts/AcademicYearContext"
import { useAuth } from "@/contexts/AuthContext"
import { canPerformActions } from "@/utils/rolePermissions"
import { usePersistedState } from "@/hooks/usePersistedState"
import { ColumnPresets } from "@/utils/tableAlignment"

// Standard Year Groups (grade levels) - consistent with StudentContext
const STANDARD_YEAR_GROUPS = [
  "Pre-Nursery", "Nursery", "Reception",
  "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6",
  "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"
]

// Storage keys - Use same key as DiscountManagement for tuition
const STUDENT_GROUPS_STORAGE_KEY = "studentGroups"
const SCHOLARSHIP_RECORDS_KEY = "scholarshipRecords"
const STAFF_CHILD_RECORDS_KEY = "staffChildRecords"
const EARLY_BIRD_RECORDS_KEY = "earlyBirdRecords"
const CREATED_INVOICES_STORAGE_KEY = "createdInvoices"

// Get fee waiver terms used from invoices for a student
const getFeeWaiverTermsFromInvoices = (studentId: string): number => {
  try {
    const stored = localStorage.getItem(CREATED_INVOICES_STORAGE_KEY)
    if (!stored) return 0
    const invoices = JSON.parse(stored)

    // Count invoices for this student that have Registration Fee Waiver in discounts
    const waiverInvoices = invoices.filter((inv: any) =>
      inv.studentId === studentId &&
      inv.discounts?.some((d: any) =>
        d.name?.toLowerCase().includes('registration fee waiver') ||
        d.name?.toLowerCase().includes('fee waiver')
      )
    )

    return waiverInvoices.length
  } catch {
    return 0
  }
}

// Helper functions to check discount types from localStorage (same as StudentList)
const hasScholarshipDiscount = (studentId: string): boolean => {
  try {
    const stored = localStorage.getItem(SCHOLARSHIP_RECORDS_KEY)
    if (!stored) return false
    const records = JSON.parse(stored)
    return records.some((record: any) =>
      record.studentId === studentId || record === studentId
    )
  } catch {
    return false
  }
}

const isStaffChildStudent = (studentId: string): boolean => {
  try {
    const stored = localStorage.getItem(STAFF_CHILD_RECORDS_KEY)
    if (!stored) return false
    const records = JSON.parse(stored)
    return records.some((record: any) =>
      record.studentId === studentId || record === studentId
    )
  } catch {
    return false
  }
}

const hasEarlyBirdDiscount = (studentId: string): boolean => {
  try {
    const stored = localStorage.getItem(EARLY_BIRD_RECORDS_KEY)
    if (!stored) return false
    const records = JSON.parse(stored)
    return records.some((record: any) =>
      record.studentId === studentId || record === studentId
    )
  } catch {
    return false
  }
}

const hasSchoolBusDiscount = (studentId: string): boolean => {
  try {
    const stored = localStorage.getItem("schoolBusRecords")
    if (!stored) return false
    const records = JSON.parse(stored)
    return records.some((record: any) =>
      record.studentId === studentId || record === studentId
    )
  } catch {
    return false
  }
}

// Get Student Groups that a student belongs to (same as StudentList)
const getStudentGroupDiscounts = (studentId: string): { name: string; discountType: string; discountPercentage: number; fixedAmount: number }[] => {
  try {
    const stored = localStorage.getItem(STUDENT_GROUPS_STORAGE_KEY)
    if (stored) {
      const groups = JSON.parse(stored)
      return groups
        .filter((group: any) => group.isActive && group.students?.some((s: any) => s.id === studentId || s.studentId === studentId))
        .map((group: any) => ({
          name: group.name,
          discountType: group.discountType,
          discountPercentage: group.discountPercentage || 0,
          fixedAmount: group.fixedAmount || 0
        }))
    }
  } catch (error) {
    console.error("Failed to load student groups:", error)
  }
  return []
}

// Discount item interface
interface DiscountItem {
  type: "sibling" | "scholarship" | "staff" | "early_bird" | "group" | "campaign" | "fee_waiver" | "school_bus"
  name: string
  mode: "percentage" | "fixed"
  value: number  // percentage value or fixed amount
  amount: number // calculated discount amount
  appliedTo: string[]
  // For fee waiver - track terms
  termsUsed?: number    // จำนวนเทอมที่ได้รับคืนไปแล้ว
  totalTerms?: number   // จำนวนเทอมทั้งหมดที่มีสิทธิ์ได้รับ
}

// Sample student discount data
interface StudentDiscount {
  id: string
  studentId: string
  studentName: string
  yearGroup: string
  academicYear: string
  term: string
  discounts: DiscountItem[]
  totalDiscountAmount: number
  status: "active" | "graduated" | "withdrawn" | "on_leave"
}

const discountTypeStyles: Record<string, React.CSSProperties> = {
  sibling: { backgroundColor: "#dbeafe", color: "#1e40af", borderColor: "#bfdbfe" },
  scholarship: { backgroundColor: "#f3e8ff", color: "#6b21a8", borderColor: "#e9d5ff" },
  staff: { backgroundColor: "#dcfce7", color: "#166534", borderColor: "#bbf7d0" },
  early_bird: { backgroundColor: "#ffedd5", color: "#9a3412", borderColor: "#fed7aa" },
  group: { backgroundColor: "#fce7f3", color: "#9d174d", borderColor: "#fbcfe8" },
  campaign: { backgroundColor: "#cffafe", color: "#0e7490", borderColor: "#a5f3fc" },
  fee_waiver: { backgroundColor: "#fef9c3", color: "#a16207", borderColor: "#fef08a" }
}

export function DiscountReports() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const userCanEdit = canPerformActions(user?.role)
  const { students, families, getSiblingDiscount, checkFeePrivilegeEligibility } = useStudents()
  const { getSiblingDiscountPercentage } = useDiscountOptions()
  const { academicYears: academicYearsFromContext } = useAcademicYears()

  // Helper function to get translated discount type label
  const getDiscountTypeLabel = (type: string): string => {
    const labelMap: Record<string, string> = {
      sibling: t("discountReports.sibling"),
      scholarship: t("discountReports.scholarship"),
      staff: t("discountReports.staff"),
      early_bird: t("discountReports.earlyBird"),
      group: t("discountReports.group"),
      campaign: t("discountReports.campaign"),
      fee_waiver: t("discountReports.feeWaiver"),
      school_bus: "School Bus Discount"
    }
    return labelMap[type] || type
  }

  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")

  // Load discount group names from sub-menu (studentGroups localStorage)
  const discountGroupNames = useMemo(() => {
    try {
      const stored = localStorage.getItem(STUDENT_GROUPS_STORAGE_KEY)
      if (!stored) return []
      const groups: { name: string; isActive?: boolean }[] = JSON.parse(stored)
      return groups.filter(g => g.isActive !== false).map(g => g.name)
    } catch {
      return []
    }
  }, [])
  const [filterYearGroup, setFilterYearGroup] = useState<string>("all")
  const [filterAcademicYear, setFilterAcademicYear] = useState<string>("all")
  const [filterTerm, setFilterTerm] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  // Sorting states
  const [sortColumn, setSortColumn] = useState("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const itemsPerPage = pageSize

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterType, filterYearGroup, filterAcademicYear, filterTerm, filterStatus])

  // Build discount entries directly from discount groups (iterate groups → students)
  const studentDiscounts: StudentDiscount[] = useMemo(() => {
    const TERMS = ["Term 1", "Term 2", "Term 3"]
    const baseTuition = 450000

    // Read groups directly from localStorage
    let groups: any[] = []
    try {
      const stored = localStorage.getItem(STUDENT_GROUPS_STORAGE_KEY)
      if (stored) groups = JSON.parse(stored).filter((g: any) => g.isActive !== false)
    } catch { groups = [] }

    if (groups.length === 0) return []

    // Merge discounts per student (a student may be in multiple groups)
    const studentMap = new Map<string, {
      info: any
      discounts: DiscountItem[]
      contextStudent: any
    }>()

    groups.forEach(group => {
      const groupStudents: any[] = group.students || []
      groupStudents.forEach(gs => {
        const sid: string = gs.id || gs.studentId || ""
        if (!sid) return

        if (!studentMap.has(sid)) {
          const ctx = students.find(s => s.studentId === sid)
          studentMap.set(sid, { info: gs, discounts: [], contextStudent: ctx })
        }

        const entry = studentMap.get(sid)!
        if (group.discountType === "percentage" && (group.discountPercentage || 0) > 0) {
          const amount = Math.round(baseTuition * group.discountPercentage / 100)
          entry.discounts.push({
            type: "group",
            name: group.name,
            mode: "percentage",
            value: group.discountPercentage,
            amount,
            appliedTo: ["Tuition"]
          })
        } else if (group.discountType === "fixed" && (group.fixedAmount || 0) > 0) {
          entry.discounts.push({
            type: "group",
            name: group.name,
            mode: "fixed",
            value: group.fixedAmount,
            amount: group.fixedAmount,
            appliedTo: ["Tuition"]
          })
        }
      })
    })

    // Expand each student × 3 terms
    const result: StudentDiscount[] = []
    studentMap.forEach((data, sid) => {
      if (data.discounts.length === 0) return
      const ctx = data.contextStudent
      const gs = data.info
      const totalDiscountAmount = data.discounts.reduce((sum, d) => sum + d.amount, 0)

      TERMS.forEach((term, idx) => {
        result.push({
          id: `grp-${sid}-${idx}`,
          studentId: sid,
          studentName: gs.name || (ctx ? `${ctx.firstName} ${ctx.lastName}` : sid),
          yearGroup: gs.yearGroup || ctx?.gradeLevel || "",
          academicYear: ctx?.academicYear || "2025/2026",
          term,
          discounts: data.discounts,
          totalDiscountAmount,
          status: (ctx?.status || gs.isActive === false ? "withdrawn" : "active") as StudentDiscount["status"]
        })
      })
    })

    return result
  }, [students])

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("")
    setFilterType("all")
    setFilterYearGroup("all")
    setFilterAcademicYear("all")
    setFilterTerm("all")
    setFilterStatus("all")
    setCurrentPage(1)
  }

  // Use standard year groups from constant
  const yearGroups = STANDARD_YEAR_GROUPS

  // Get academic years from context (settings) + years from data
  const contextYears = academicYearsFromContext.map(y => y.id)
  const dataYears = [...new Set(studentDiscounts.map(s => s.academicYear))]
  const academicYears = [...new Set([...contextYears, ...dataYears])].sort().reverse()

  // Filter students
  const filteredStudents = studentDiscounts.filter(student => {
    const matchesSearch =
      student.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = filterType === "all" || student.discounts.some(d => d.name === filterType)
    const matchesYearGroup = filterYearGroup === "all" || student.yearGroup === filterYearGroup
    const matchesAcademicYear = filterAcademicYear === "all" || student.academicYear === filterAcademicYear
    const matchesTerm = filterTerm === "all" || student.term === filterTerm
    const matchesStatus = filterStatus === "all" || student.status === filterStatus

    return matchesSearch && matchesType && matchesYearGroup && matchesAcademicYear && matchesTerm && matchesStatus
  })

  // Calculate summary stats
  const totalStudents = filteredStudents.length
  const totalDiscountAmountSum = filteredStudents.reduce((sum, s) => sum + s.totalDiscountAmount, 0)

  // Calculate average discount - consider all individual discounts
  const allDiscounts = filteredStudents.flatMap(s => s.discounts)
  const percentageDiscounts = allDiscounts.filter(d => d.mode === "percentage")
  const averagePercentage = percentageDiscounts.length > 0
    ? Math.round(percentageDiscounts.reduce((sum, d) => sum + d.value, 0) / percentageDiscounts.length)
    : 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Sorting functions
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const getSortedStudents = (students: StudentDiscount[]) => {
    if (!sortColumn) return students
    return [...students].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortColumn) {
        case "studentId":
          aValue = a.studentId
          bValue = b.studentId
          break
        case "studentName":
          aValue = a.studentName
          bValue = b.studentName
          break
        case "yearGroup":
          aValue = a.yearGroup
          bValue = b.yearGroup
          break
        case "academicYear":
          aValue = a.academicYear
          bValue = b.academicYear
          break
        case "term":
          aValue = a.term
          bValue = b.term
          break
        case "totalDiscountAmount":
          aValue = a.totalDiscountAmount
          bValue = b.totalDiscountAmount
          break
        case "status":
          aValue = a.status
          bValue = b.status
          break
        default:
          return 0
      }

      if (typeof aValue === "string") {
        const comparison = aValue.localeCompare(bValue)
        return sortDirection === "asc" ? comparison : -comparison
      } else {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue
      }
    })
  }

  // Apply sorting to filtered students
  const sortedStudents = getSortedStudents(filteredStudents)

  // Pagination logic
  const totalPages = Math.ceil(sortedStudents.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedStudents = sortedStudents.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  const resetPage = () => setCurrentPage(1)

  const handleExport = () => {
    // Create CSV content - each discount gets its own row
    const headers = ["Student ID", "Student Name", "Year Group", "Academic Year", "Term", "Discount Type", "Discount Name", "Mode", "Value", "Discount Amount", "Total Discount", "Status"]
    const rows: (string | number)[][] = []

    filteredStudents.forEach(s => {
      s.discounts.forEach((d, idx) => {
        rows.push([
          s.studentId,
          s.studentName,
          s.yearGroup,
          formatAcademicYear(s.academicYear),
          s.term,
          getDiscountTypeLabel(d.type),
          d.name,
          d.mode,
          d.mode === "percentage" ? `${d.value}%` : d.value,
          d.amount,
          idx === 0 ? s.totalDiscountAmount : "",
          s.status
        ])
      })
    })

    downloadAsXlsx(headers, rows, `discount-report-${new Date().toISOString().split('T')[0]}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{t("discountReports.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("discountReports.subtitle")}
          </p>
        </div>
        <Button onClick={handleExport} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          {t("discountReports.exportCsv")}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("discountReports.totalStudents")}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">{t("discountReports.withDiscountsApplied")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("discountReports.totalDiscount")}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalDiscountAmountSum)}</div>
            <p className="text-xs text-muted-foreground">{t("discountReports.totalSavingsProvided")}</p>
          </CardContent>
        </Card>

      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="w-4 h-4" />
              {t("discountReports.searchFilter")}
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={() => toast.success(t("common.filtersApplied"))} className="h-9">{t("common.apply")}</Button>
              <Button variant="outline" onClick={() => { clearFilters(); toast.success(t("common.filtersCleared")); }} className="h-9">{t("common.clear")}</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("discountReports.search")}</label>
              <Input
                placeholder={t("discountReports.nameOrId")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("discountReports.academicYear")}</label>
              <Select value={filterAcademicYear} onValueChange={setFilterAcademicYear}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("discountReports.allAcademicYears") || "All Academic Years"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("discountReports.allAcademicYears") || "All Academic Years"}</SelectItem>
                  {academicYears.map(year => (
                    <SelectItem key={year} value={year}>{formatAcademicYear(year)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("discountReports.term")}</label>
              <Select value={filterTerm} onValueChange={setFilterTerm}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("discountReports.allTerms") || "All Terms"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("discountReports.allTerms") || "All Terms"}</SelectItem>
                  <SelectItem value="Term 1">Term 1</SelectItem>
                  <SelectItem value="Term 2">Term 2</SelectItem>
                  <SelectItem value="Term 3">Term 3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("discountReports.yearGroup")}</label>
              <Select value={filterYearGroup} onValueChange={setFilterYearGroup}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("discountReports.allYearGroups")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("discountReports.allYearGroups")}</SelectItem>
                  {yearGroups.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("discountReports.discountType")}</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("discountReports.allTypes")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("discountReports.allTypes")}</SelectItem>
                  {discountGroupNames.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("discountReports.studentStatus") || "Student Status"}</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("discountReports.allStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("discountReports.allStatus")}</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="graduated">Graduated</SelectItem>
                  <SelectItem value="withdrawn">Withdrawn</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student Discount Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("discountReports.studentDiscountDetails")}</CardTitle>
          <CardDescription>
            {t("discountReports.showingOf").replace("{shown}", String(filteredStudents.length)).replace("{total}", String(studentDiscounts.length))}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {/* Student ID - LEFT aligned (text/ID) */}
                  <TableHead align="left" className="cursor-pointer hover:bg-muted" onClick={() => handleSort("studentId")}>
                    <div className="flex items-center gap-1">
                      {t("discountReports.studentId")}
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  {/* Student Name - LEFT aligned (text) */}
                  <TableHead align="left" className="cursor-pointer hover:bg-muted" onClick={() => handleSort("studentName")}>
                    <div className="flex items-center gap-1">
                      {t("discountReports.studentName")}
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  {/* Year Group/Grade - CENTER aligned (badge/status) */}
                  <TableHead align="center" className="cursor-pointer hover:bg-muted" onClick={() => handleSort("yearGroup")}>
                    <div className="flex items-center justify-center gap-1">
                      {t("discountReports.yearGroup")}
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  {/* Academic Year - LEFT aligned (text) */}
                  <TableHead align="left" className="cursor-pointer hover:bg-muted" onClick={() => handleSort("academicYear")}>
                    <div className="flex items-center gap-1">
                      {t("discountReports.academicYear")}
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  {/* Term - LEFT aligned (text) */}
                  <TableHead align="left" className="cursor-pointer hover:bg-muted" onClick={() => handleSort("term")}>
                    <div className="flex items-center gap-1">
                      {t("discountReports.term")}
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  {/* Discount Types - LEFT aligned (text/badges) */}
                  <TableHead align="left">{t("discountReports.discountTypes")}</TableHead>
                  {/* Discount Details - LEFT aligned (text) */}
                  <TableHead align="left">{t("discountReports.discountsDetail")}</TableHead>
                  {/* Status - CENTER aligned (badge) */}
                  <TableHead align="center" className="cursor-pointer hover:bg-muted" onClick={() => handleSort("status")}>
                    <div className="flex items-center justify-center gap-1">
                      {t("discountReports.studentStatus") || "Student Status"}
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {t("discountReports.noStudentsFound")}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedStudents.map((student) => (
                    <TableRow key={student.id}>
                      {/* Student ID - LEFT aligned (matches header) */}
                      <TableCell align="left" className="font-mono text-sm">{student.studentId}</TableCell>
                      {/* Student Name - LEFT aligned (matches header) */}
                      <TableCell align="left" className="font-medium">{student.studentName}</TableCell>
                      {/* Year Group/Grade - CENTER aligned (matches header) */}
                      <TableCell align="center">{student.yearGroup}</TableCell>
                      {/* Academic Year - LEFT aligned (matches header) */}
                      <TableCell align="left">{formatAcademicYear(student.academicYear)}</TableCell>
                      {/* Term - LEFT aligned (matches header) */}
                      <TableCell align="left">{student.term}</TableCell>
                      {/* Discount Types - LEFT aligned (matches header) */}
                      <TableCell align="left">
                        <div className="flex gap-1 flex-wrap">
                          {student.discounts.map((d, idx) => (
                            <Badge key={idx} variant="outline" style={discountTypeStyles[d.type]}>
                              {d.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      {/* Discount Details - LEFT aligned (matches header) */}
                      <TableCell align="left">
                        <div className="space-y-1">
                          {student.discounts.map((d, idx) => (
                            <div key={idx} className="text-sm">
                              <span className="text-muted-foreground">{d.name}: </span>
                              <span className="text-green-600 font-medium">
                                {d.mode === "percentage" ? `${d.value}%` : formatCurrency(d.value)}
                              </span>
                              {d.type === "fee_waiver" && d.termsUsed !== undefined && d.totalTerms !== undefined && (
                                <span className="text-blue-600 ml-1">
                                  ({d.termsUsed}/{d.totalTerms} {t("discountReports.terms") || "terms"})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      {/* Status - CENTER aligned (matches header) */}
                      <TableCell align="center">
                        <Badge
                          variant="outline"
                          className={
                            student.status === "active" ? "bg-green-100 text-green-800 border-green-200" :
                            student.status === "graduated" ? "bg-blue-100 text-blue-800 border-blue-200" :
                            student.status === "withdrawn" ? "bg-red-100 text-red-800 border-red-200" :
                            "bg-amber-100 text-amber-800 border-amber-200"
                          }
                        >
                          {student.status === "on_leave" ? "On Leave" : student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <PaginationBar
            currentPage={currentPage}
            pageSize={pageSize}
            totalCount={sortedStudents.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
          />
        </CardContent>
      </Card>

      {/* Discount Summary by Year Group */}
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("discountReports.discountByYearGroup")}</CardTitle>
            <CardDescription>{t("discountReports.breakdownByYearGroup")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-2">
                {yearGroups.slice(0, Math.ceil(yearGroups.length / 2)).map(year => {
                  const studentsInYear = studentDiscounts.filter(s => s.yearGroup === year)
                  const total = studentsInYear.reduce((sum, s) => sum + s.totalDiscountAmount, 0)
                  return (
                    <div key={year} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div>
                        <span className="font-medium">{formatAcademicYear(year)}</span>
                        <p className="text-xs text-muted-foreground">
                          {studentsInYear.length} {t("discountReports.students")}
                        </p>
                      </div>
                      <span className="font-semibold text-primary">{formatCurrency(total)}</span>
                    </div>
                  )
                })}
              </div>
              {/* Right Column */}
              <div className="space-y-2">
                {yearGroups.slice(Math.ceil(yearGroups.length / 2)).map(year => {
                  const studentsInYear = studentDiscounts.filter(s => s.yearGroup === year)
                  const total = studentsInYear.reduce((sum, s) => sum + s.totalDiscountAmount, 0)
                  return (
                    <div key={year} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div>
                        <span className="font-medium">{formatAcademicYear(year)}</span>
                        <p className="text-xs text-muted-foreground">
                          {studentsInYear.length} {t("discountReports.students")}
                        </p>
                      </div>
                      <span className="font-semibold text-primary">{formatCurrency(total)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
