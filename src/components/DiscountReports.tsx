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
  ArrowUpDown,
  ChevronDown,
  Search,
  TrendingDown,
  Tag
} from "lucide-react"
import { cn } from "./ui/utils"
import { toast } from "@/components/ui/sonner"
import { logActivity } from "@/lib/activityLog"
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
  type: "sibling" | "scholarship" | "staff" | "early_bird" | "group" | "campaign" | "school_bus"
  name: string
  mode: "percentage" | "fixed"
  value: number  // percentage value or fixed amount
  amount: number // calculated discount amount
  appliedTo: string[]
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
  campaign: { backgroundColor: "#cffafe", color: "#0e7490", borderColor: "#a5f3fc" }
}

export function DiscountReports() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const userCanEdit = canPerformActions(user?.role)
  const { students, families, getSiblingDiscount } = useStudents()
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
      school_bus: "School Bus Discount"
    }
    return labelMap[type] || type
  }

  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [filterType, setFilterType] = useState<string>("all")

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

  // Build discount entries from real invoice data (createdInvoices in localStorage)
  const studentDiscounts: StudentDiscount[] = useMemo(() => {
    const result: StudentDiscount[] = []

    // --- Source 1: Real invoices with stored discounts ---
    const INVOICE_KEYS = ["createdInvoices", "createdInvoices_eca", "createdInvoices_trip", "createdInvoices_exam", "createdInvoices_bus", "createdInvoices_external"]
    const seenInvoiceIds = new Set<string>()

    INVOICE_KEYS.forEach(key => {
      try {
        const stored = localStorage.getItem(key)
        if (!stored) return
        const invoices: any[] = JSON.parse(stored)
        invoices.forEach((inv: any) => {
          if (seenInvoiceIds.has(inv.id)) return
          seenInvoiceIds.add(inv.id)

          const discountsArr: any[] = inv.discounts || []
          if (discountsArr.length === 0 || discountsArr.every((d: any) => !d.amount || d.amount <= 0)) return

          const discountItems: DiscountItem[] = discountsArr
            .filter((d: any) => d.amount > 0)
            .map((d: any) => {
              let type: DiscountItem["type"] = "group"
              const nameLower = (d.name || "").toLowerCase()
              if (nameLower.includes("sibling")) type = "sibling"
              else if (nameLower.includes("scholarship")) type = "scholarship"
              else if (nameLower.includes("staff")) type = "staff"
              else if (nameLower.includes("early bird") || nameLower.includes("early_bird")) type = "early_bird"
              else if (nameLower.includes("bus")) type = "school_bus"
              else if (nameLower.includes("campaign")) type = "campaign"

              return {
                type,
                name: d.name || "Discount",
                mode: (d.percentage ? "percentage" : "fixed") as DiscountItem["mode"],
                value: d.percentage || d.amount,
                amount: d.amount,
                appliedTo: ["Tuition"]
              }
            })

          if (discountItems.length === 0) return

          const totalDiscountAmount = discountItems.reduce((sum, d) => sum + d.amount, 0)

          // Parse term display name
          const termName = inv.termName || inv.term || ""
          const termDisplay = termName.toLowerCase().includes("term")
            ? termName.replace(/^.*?(term\s*\d+)/i, "$1").replace(/term(\d)/i, "Term $1")
            : termName

          const ctx = students.find(s => s.studentId === inv.studentId)

          result.push({
            id: inv.id,
            studentId: inv.studentId || "",
            studentName: inv.studentName || (ctx ? `${ctx.firstName} ${ctx.lastName}` : ""),
            yearGroup: inv.studentGrade || ctx?.gradeLevel || "",
            academicYear: inv.academicYear || ctx?.academicYear || "",
            term: termDisplay,
            discounts: discountItems,
            totalDiscountAmount,
            status: (ctx?.status || "active") as StudentDiscount["status"]
          })
        })
      } catch { /* skip invalid storage */ }
    })

    // --- Source 2: Student groups (students with active group discounts not yet invoiced) ---
    try {
      const stored = localStorage.getItem(STUDENT_GROUPS_STORAGE_KEY)
      if (stored) {
        const groups: any[] = JSON.parse(stored).filter((g: any) => g.isActive !== false)
        const invoicedStudentIds = new Set(result.map(r => r.studentId))

        // Collect group discounts per student
        const groupMap = new Map<string, { info: any; discounts: DiscountItem[]; ctx: any }>()

        groups.forEach(group => {
          (group.students || []).forEach((gs: any) => {
            const sid = gs.id || gs.studentId || ""
            if (!sid || invoicedStudentIds.has(sid)) return

            if (!groupMap.has(sid)) {
              const ctx = students.find(s => s.studentId === sid)
              groupMap.set(sid, { info: gs, discounts: [], ctx })
            }

            const entry = groupMap.get(sid)!
            if (group.discountType === "percentage" && (group.discountPercentage || 0) > 0) {
              entry.discounts.push({
                type: "group",
                name: group.name,
                mode: "percentage",
                value: group.discountPercentage,
                amount: 0, // no invoice yet, amount unknown
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

        groupMap.forEach((data, sid) => {
          if (data.discounts.length === 0) return
          const ctx = data.ctx
          const gs = data.info
          const totalDiscountAmount = data.discounts.reduce((sum, d) => sum + d.amount, 0)

          result.push({
            id: `grp-${sid}`,
            studentId: sid,
            studentName: gs.name || (ctx ? `${ctx.firstName} ${ctx.lastName}` : sid),
            yearGroup: gs.yearGroup || ctx?.gradeLevel || "",
            academicYear: ctx?.academicYear || "",
            term: "-",
            discounts: data.discounts,
            totalDiscountAmount,
            status: (ctx?.status || "active") as StudentDiscount["status"]
          })
        })
      }
    } catch { /* skip */ }

    // --- Source 3: Scholarship, Staff Child, Early Bird records (not yet invoiced) ---
    const invoicedStudentIds = new Set(result.map(r => r.studentId))
    const specialRecords: { key: string; type: DiscountItem["type"]; name: string; percentage: number }[] = [
      { key: SCHOLARSHIP_RECORDS_KEY, type: "scholarship", name: "Scholarship", percentage: 100 },
      { key: STAFF_CHILD_RECORDS_KEY, type: "staff", name: "Staff Child Discount", percentage: 50 },
      { key: EARLY_BIRD_RECORDS_KEY, type: "early_bird", name: "Early Bird Discount", percentage: 5 },
    ]

    specialRecords.forEach(({ key, type, name, percentage }) => {
      try {
        const stored = localStorage.getItem(key)
        if (!stored) return
        const records: any[] = JSON.parse(stored)
        records.forEach((rec: any) => {
          const sid = rec.studentId || rec
          if (typeof sid !== "string" || invoicedStudentIds.has(sid)) return

          const ctx = students.find(s => s.studentId === sid)
          if (!ctx) return

          result.push({
            id: `${type}-${sid}`,
            studentId: sid,
            studentName: `${ctx.firstName} ${ctx.lastName}`,
            yearGroup: ctx.gradeLevel || "",
            academicYear: ctx.academicYear || "",
            term: "-",
            discounts: [{
              type,
              name,
              mode: "percentage",
              value: percentage,
              amount: 0,
              appliedTo: ["Tuition"]
            }],
            totalDiscountAmount: 0,
            status: (ctx.status || "active") as StudentDiscount["status"]
          })
          invoicedStudentIds.add(sid) // avoid duplicates across sources
        })
      } catch { /* skip */ }
    })

    return result
  }, [students])

  // Collect all unique discount names from real data for the filter
  const discountNameOptions = useMemo(() => {
    const names = new Set<string>()
    studentDiscounts.forEach(sd => {
      sd.discounts.forEach(d => names.add(d.name))
    })
    return [...names].sort()
  }, [studentDiscounts])

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
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
        <div>
          <h2 className="text-xl font-semibold">{t("discountReports.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("discountReports.subtitle")}
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          {t("discountReports.exportCsv")}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Total Students</p>
            </div>
            <p className="text-2xl font-bold">{totalStudents}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <Percent className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Total Discount</p>
            </div>
            <p className="text-2xl font-bold">฿{totalDiscountAmountSum.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Avg. Discount / Student</p>
            </div>
            <p className="text-2xl font-bold">฿{totalStudents > 0 ? Math.round(totalDiscountAmountSum / totalStudents).toLocaleString() : "0"}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Discount Types</p>
            </div>
            <p className="text-2xl font-bold">{new Set(filteredStudents.flatMap(s => s.discounts.map(d => d.type))).size}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("discountReports.nameOrId")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="shrink-0">
              <Filter className="w-4 h-4 mr-2" />
              Filters
              <ChevronDown className={cn("w-4 h-4 ml-2 transition-transform", showFilters && "rotate-180")} />
            </Button>
          </div>

          {showFilters && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">{t("discountReports.academicYear")}</label>
                  <Select value={filterAcademicYear} onValueChange={setFilterAcademicYear}>
                    <SelectTrigger className="h-9">
                      <Filter className="w-4 h-4 mr-2" />
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
                      <Filter className="w-4 h-4 mr-2" />
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
                      <Filter className="w-4 h-4 mr-2" />
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
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder={t("discountReports.allTypes")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("discountReports.allTypes")}</SelectItem>
                      {discountNameOptions.map(name => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">{t("discountReports.studentStatus") || "Student Status"}</label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-9">
                      <Filter className="w-4 h-4 mr-2" />
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

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { clearFilters(); toast.success(t("common.filtersCleared")); }} className="h-9">{t("common.clear")}</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Discount Table */}
      <Card>
        <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
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
