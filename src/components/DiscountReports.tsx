import { useState, useMemo, useEffect } from "react"
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
import { useStudents } from "@/contexts/StudentContext"
import { useLanguage } from "@/contexts/LanguageContext"

// Storage keys
const STUDENT_GROUPS_STORAGE_KEY = "studentGroups"
const FEE_WAIVER_STORAGE_KEY = "feeWaiverRecords"
const SCHOLARSHIP_RECORDS_KEY = "scholarshipRecords"
const STAFF_CHILD_RECORDS_KEY = "staffChildRecords"
const EARLY_BIRD_RECORDS_KEY = "earlyBirdRecords"

// Load Student Groups from localStorage
const loadStudentGroups = () => {
  try {
    const stored = localStorage.getItem(STUDENT_GROUPS_STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch (error) {
    console.error("Failed to load student groups:", error)
  }
  return []
}

// Load Fee Waiver records from localStorage
const loadFeeWaiverRecords = () => {
  try {
    const stored = localStorage.getItem(FEE_WAIVER_STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch (error) {
    console.error("Failed to load fee waiver records:", error)
  }
  return []
}

// Load Scholarship records from localStorage
const loadScholarshipRecords = () => {
  try {
    const stored = localStorage.getItem(SCHOLARSHIP_RECORDS_KEY)
    if (stored) return JSON.parse(stored)
  } catch (error) {
    console.error("Failed to load scholarship records:", error)
  }
  return []
}

// Load Staff Child records from localStorage
const loadStaffChildRecords = () => {
  try {
    const stored = localStorage.getItem(STAFF_CHILD_RECORDS_KEY)
    if (stored) return JSON.parse(stored)
  } catch (error) {
    console.error("Failed to load staff child records:", error)
  }
  return []
}

// Load Early Bird records from localStorage
const loadEarlyBirdRecords = () => {
  try {
    const stored = localStorage.getItem(EARLY_BIRD_RECORDS_KEY)
    if (stored) return JSON.parse(stored)
  } catch (error) {
    console.error("Failed to load early bird records:", error)
  }
  return []
}

// Discount item interface
interface DiscountItem {
  type: "sibling" | "scholarship" | "staff" | "early_bird" | "group" | "campaign" | "fee_waiver"
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
  parentName: string
  discounts: DiscountItem[]
  originalAmount: number
  totalDiscountAmount: number
  finalAmount: number
  status: "active" | "pending" | "expired"
  validFrom: string
  validTo: string
}

const discountTypeLabels: Record<string, { label: string; color: string }> = {
  sibling: { label: "Sibling", color: "bg-blue-100 text-blue-800" },
  scholarship: { label: "Scholarship", color: "bg-purple-100 text-purple-800" },
  staff: { label: "Staff", color: "bg-green-100 text-green-800" },
  early_bird: { label: "Early Bird", color: "bg-orange-100 text-orange-800" },
  group: { label: "Group", color: "bg-pink-100 text-pink-800" },
  campaign: { label: "Campaign", color: "bg-cyan-100 text-cyan-800" },
  fee_waiver: { label: "Fee Waiver", color: "bg-emerald-100 text-emerald-800" }
}

export function DiscountReports() {
  const { t } = useLanguage()
  const { students, families, getSiblingDiscount } = useStudents()

  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterYearGroup, setFilterYearGroup] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  // Sorting states
  const [sortColumn, setSortColumn] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Load external data
  const [studentGroups, setStudentGroups] = useState<any[]>([])
  const [feeWaiverRecords, setFeeWaiverRecords] = useState<any[]>([])
  const [scholarshipRecords, setScholarshipRecords] = useState<any[]>([])
  const [staffChildRecords, setStaffChildRecords] = useState<any[]>([])
  const [earlyBirdRecords, setEarlyBirdRecords] = useState<any[]>([])

  useEffect(() => {
    setStudentGroups(loadStudentGroups())
    setFeeWaiverRecords(loadFeeWaiverRecords())
    setScholarshipRecords(loadScholarshipRecords())
    setStaffChildRecords(loadStaffChildRecords())
    setEarlyBirdRecords(loadEarlyBirdRecords())
  }, [])

  // Transform students to StudentDiscount format
  const studentDiscounts: StudentDiscount[] = useMemo(() => {
    return students.map(student => {
      // Get sibling discount percentage
      const siblingDiscountPercent = getSiblingDiscount(student, student.enrollmentTerm)

      // Get parent name from student's parents
      const primaryParent = student.parents.find(p => p.isPrimary) || student.parents[0]
      const parentName = primaryParent?.name || "N/A"

      // Calculate amounts (assuming base tuition of 450,000 THB)
      const baseTuition = 450000

      // Build discounts array
      const discounts: DiscountItem[] = []

      // 1. Sibling Discount
      if (siblingDiscountPercent > 0) {
        const childOrderLabel = student.childOrder === 2 ? "Second" :
                               student.childOrder === 3 ? "Third" :
                               student.childOrder === 4 ? "Fourth" :
                               student.childOrder >= 5 ? "Fifth+" : ""
        const discountAmount = Math.round(baseTuition * siblingDiscountPercent / 100)
        discounts.push({
          type: "sibling",
          name: `${childOrderLabel} Child Discount`,
          mode: "percentage",
          value: siblingDiscountPercent,
          amount: discountAmount,
          appliedTo: ["Tuition"]
        })
      }

      // 2. Group Discount (from Student Groups)
      const studentInGroups = studentGroups.filter((group: any) =>
        group.isActive && group.students?.some((s: any) =>
          s.studentId === student.studentId || s.id === student.id
        )
      )

      studentInGroups.forEach((group: any) => {
        if (group.discountType === "percentage" && group.discountPercentage > 0) {
          const discountAmount = Math.round(baseTuition * group.discountPercentage / 100)
          discounts.push({
            type: "group",
            name: group.name,
            mode: "percentage",
            value: group.discountPercentage,
            amount: discountAmount,
            appliedTo: ["Tuition"]
          })
        } else if (group.discountType === "fixed" && group.fixedAmount > 0) {
          discounts.push({
            type: "group",
            name: group.name,
            mode: "fixed",
            value: group.fixedAmount,
            amount: group.fixedAmount,
            appliedTo: ["Tuition"]
          })
        }
      })

      // 3. Fee Waiver (Registration Fee Waiver)
      const studentWaiver = feeWaiverRecords.find((record: any) =>
        record.studentId === student.studentId || record.studentId === student.id
      )

      if (studentWaiver && studentWaiver.status === "approved") {
        discounts.push({
          type: "fee_waiver",
          name: "Registration Fee Waiver",
          mode: "fixed",
          value: studentWaiver.amount || 225000,
          amount: studentWaiver.amount || 225000,
          appliedTo: ["Registration Fee"]
        })
      }

      // 4. Scholarship Discount
      const hasScholarship = scholarshipRecords.some((record: any) =>
        record.studentId === student.studentId || record.studentId === student.id || record === student.studentId
      ) || student.notes?.toLowerCase().includes('scholarship')

      if (hasScholarship) {
        // Default 50% scholarship, can be customized in record
        const scholarshipRecord = scholarshipRecords.find((record: any) =>
          record.studentId === student.studentId || record.studentId === student.id
        )
        const scholarshipPercent = scholarshipRecord?.percentage || 50
        const discountAmount = Math.round(baseTuition * scholarshipPercent / 100)
        discounts.push({
          type: "scholarship",
          name: "Scholarship Discount",
          mode: "percentage",
          value: scholarshipPercent,
          amount: discountAmount,
          appliedTo: ["Tuition"]
        })
      }

      // 5. Staff Child Discount
      const isStaffChild = staffChildRecords.some((record: any) =>
        record.studentId === student.studentId || record.studentId === student.id || record === student.studentId
      ) || student.notes?.toLowerCase().includes('staff')

      if (isStaffChild) {
        // Default 50% staff child discount, can be customized in record
        const staffRecord = staffChildRecords.find((record: any) =>
          record.studentId === student.studentId || record.studentId === student.id
        )
        const staffPercent = staffRecord?.percentage || 50
        const discountAmount = Math.round(baseTuition * staffPercent / 100)
        discounts.push({
          type: "staff",
          name: "Staff Child Discount",
          mode: "percentage",
          value: staffPercent,
          amount: discountAmount,
          appliedTo: ["Tuition"]
        })
      }

      // 6. Early Bird Discount
      const hasEarlyBird = earlyBirdRecords.some((record: any) =>
        record.studentId === student.studentId || record.studentId === student.id || record === student.studentId
      ) || student.notes?.toLowerCase().includes('early bird')

      if (hasEarlyBird) {
        // Default 5% early bird discount, can be customized in record
        const earlyBirdRecord = earlyBirdRecords.find((record: any) =>
          record.studentId === student.studentId || record.studentId === student.id
        )
        const earlyBirdPercent = earlyBirdRecord?.percentage || 5
        const discountAmount = Math.round(baseTuition * earlyBirdPercent / 100)
        discounts.push({
          type: "early_bird",
          name: "Early Bird Discount",
          mode: "percentage",
          value: earlyBirdPercent,
          amount: discountAmount,
          appliedTo: ["Tuition"]
        })
      }

      const totalDiscountAmount = discounts.reduce((sum, d) => sum + d.amount, 0)

      return {
        id: student.id,
        studentId: student.studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        yearGroup: student.gradeLevel,
        parentName,
        discounts,
        originalAmount: baseTuition,
        totalDiscountAmount,
        finalAmount: baseTuition - totalDiscountAmount,
        status: student.status === "active" ? "active" : student.status === "on_leave" ? "pending" : "expired",
        validFrom: student.academicYear.split("-")[0] + "-08-01",
        validTo: student.academicYear.split("-")[1] + "-07-31"
      } as StudentDiscount
    }).filter(s => s.discounts.length > 0) // Only show students with discounts
  }, [students, getSiblingDiscount, studentGroups, feeWaiverRecords, scholarshipRecords, staffChildRecords, earlyBirdRecords])

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("")
    setFilterType("all")
    setFilterYearGroup("all")
    setFilterStatus("all")
  }

  // Get unique year groups from actual students
  const yearGroups = [...new Set(studentDiscounts.map(s => s.yearGroup))].sort()

  // Filter students
  const filteredStudents = studentDiscounts.filter(student => {
    const matchesSearch =
      student.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.parentName.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = filterType === "all" || student.discounts.some(d => d.type === filterType)
    const matchesYearGroup = filterYearGroup === "all" || student.yearGroup === filterYearGroup
    const matchesStatus = filterStatus === "all" || student.status === filterStatus

    return matchesSearch && matchesType && matchesYearGroup && matchesStatus
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
        case "parentName":
          aValue = a.parentName
          bValue = b.parentName
          break
        case "originalAmount":
          aValue = a.originalAmount
          bValue = b.originalAmount
          break
        case "totalDiscountAmount":
          aValue = a.totalDiscountAmount
          bValue = b.totalDiscountAmount
          break
        case "finalAmount":
          aValue = a.finalAmount
          bValue = b.finalAmount
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

  const handleExport = () => {
    // Create CSV content - each discount gets its own row
    const headers = ["Student ID", "Student Name", "Year Group", "Parent Name", "Discount Type", "Discount Name", "Mode", "Value", "Discount Amount", "Amount", "Discount", "Net", "Applied To", "Status", "Valid From", "Valid To"]
    const rows: (string | number)[][] = []

    filteredStudents.forEach(s => {
      s.discounts.forEach((d, idx) => {
        rows.push([
          s.studentId,
          s.studentName,
          s.yearGroup,
          s.parentName,
          discountTypeLabels[d.type].label,
          d.name,
          d.mode,
          d.mode === "percentage" ? `${d.value}%` : d.value,
          d.amount,
          idx === 0 ? s.originalAmount : "", // Only show on first row
          idx === 0 ? s.totalDiscountAmount : "",
          idx === 0 ? s.finalAmount : "",
          d.appliedTo.join("; "),
          s.status,
          s.validFrom,
          s.validTo
        ])
      })
    })

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `discount-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
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
      <div className="grid gap-4 md:grid-cols-4">
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("discountReports.averageDiscount")}</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averagePercentage}%</div>
            <p className="text-xs text-muted-foreground">{t("discountReports.avgPercentageDiscount")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("discountReports.yearGroups")}</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{yearGroups.length}</div>
            <p className="text-xs text-muted-foreground">{t("discountReports.withDiscountStudents")}</p>
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
              <Button className="h-9">{t("discountReports.apply")}</Button>
              <Button variant="outline" onClick={clearFilters} className="h-9">{t("discountReports.clear")}</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                  <SelectItem value="sibling">{t("discountReports.sibling")}</SelectItem>
                  <SelectItem value="scholarship">{t("discountReports.scholarship")}</SelectItem>
                  <SelectItem value="staff">{t("discountReports.staff")}</SelectItem>
                  <SelectItem value="early_bird">{t("discountReports.earlyBird")}</SelectItem>
                  <SelectItem value="group">{t("discountReports.group")}</SelectItem>
                  <SelectItem value="campaign">{t("discountReports.campaign")}</SelectItem>
                  <SelectItem value="fee_waiver">{t("discountReports.feeWaiver")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("discountReports.status")}</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("discountReports.allStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("discountReports.allStatus")}</SelectItem>
                  <SelectItem value="active">{t("discountReports.active")}</SelectItem>
                  <SelectItem value="pending">{t("discountReports.pending")}</SelectItem>
                  <SelectItem value="expired">{t("discountReports.expired")}</SelectItem>
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
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort("studentId")}>
                    <div className="flex items-center gap-1">
                      {t("discountReports.studentId")}
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort("studentName")}>
                    <div className="flex items-center gap-1">
                      {t("discountReports.studentName")}
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort("yearGroup")}>
                    <div className="flex items-center gap-1">
                      {t("discountReports.yearGroup")}
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort("parentName")}>
                    <div className="flex items-center gap-1">
                      {t("discountReports.parent")}
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>{t("discountReports.discountTypes")}</TableHead>
                  <TableHead>{t("discountReports.discountsDetail")}</TableHead>
                  <TableHead className="text-right cursor-pointer hover:bg-muted" onClick={() => handleSort("originalAmount")}>
                    <div className="flex items-center justify-end gap-1">
                      {t("discountReports.amount")}
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer hover:bg-muted" onClick={() => handleSort("totalDiscountAmount")}>
                    <div className="flex items-center justify-end gap-1">
                      {t("discountReports.discount")}
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer hover:bg-muted" onClick={() => handleSort("finalAmount")}>
                    <div className="flex items-center justify-end gap-1">
                      {t("discountReports.net")}
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>{t("discountReports.appliedTo")}</TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort("status")}>
                    <div className="flex items-center gap-1">
                      {t("discountReports.status")}
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      {t("discountReports.noStudentsFound")}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-mono text-sm">{student.studentId}</TableCell>
                      <TableCell className="font-medium">{student.studentName}</TableCell>
                      <TableCell>{student.yearGroup}</TableCell>
                      <TableCell className="text-muted-foreground">{student.parentName}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap justify-center">
                          {student.discounts.map((d, idx) => (
                            <Badge key={idx} className={discountTypeLabels[d.type].color}>
                              {discountTypeLabels[d.type].label}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
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
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(student.originalAmount)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-green-600">
                        {student.totalDiscountAmount > 0 ? `-${formatCurrency(student.totalDiscountAmount)}` : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-medium">
                        {formatCurrency(student.finalAmount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap justify-center">
                          {[...new Set(student.discounts.flatMap(d => d.appliedTo))].map(item => (
                            <Badge key={item} variant="secondary" className="text-xs bg-gray-100 text-gray-800">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={student.status === "active" ? "default" : student.status === "pending" ? "secondary" : "outline"}
                          className={student.status === "active" ? "bg-green-100 text-green-800" : ""}
                        >
                          {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Discount Summary by Type */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("discountReports.discountByType")}</CardTitle>
            <CardDescription>{t("discountReports.breakdownByCategory")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(discountTypeLabels).map(([type, { label, color }]) => {
                // Count students who have this discount type
                const studentsWithType = studentDiscounts.filter(s =>
                  s.discounts.some(d => d.type === type)
                )
                // Sum up the discount amounts for this type
                const total = studentDiscounts.reduce((sum, s) => {
                  const typeDiscounts = s.discounts.filter(d => d.type === type)
                  return sum + typeDiscounts.reduce((dSum, d) => dSum + d.amount, 0)
                }, 0)
                return (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={color}>{t(`discountReports.${type === "early_bird" ? "earlyBird" : type === "fee_waiver" ? "feeWaiver" : type}`)}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {studentsWithType.length} {t("discountReports.students")}
                      </span>
                    </div>
                    <span className="font-medium">{formatCurrency(total)}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("discountReports.discountByYearGroup")}</CardTitle>
            <CardDescription>{t("discountReports.breakdownByYearGroup")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {yearGroups.map(year => {
                const studentsInYear = studentDiscounts.filter(s => s.yearGroup === year)
                const total = studentsInYear.reduce((sum, s) => sum + s.totalDiscountAmount, 0)
                return (
                  <div key={year} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{year}</span>
                      <span className="text-sm text-muted-foreground">
                        {studentsInYear.length} {t("discountReports.students")}
                      </span>
                    </div>
                    <span className="font-medium">{formatCurrency(total)}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
