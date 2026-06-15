import { useState, useMemo, useEffect } from "react"
import { PaginationBar } from "@/components/ui/pagination-bar"
import { downloadAsXlsx, formatAcademicYear } from "@/utils/xlsxUtils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
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
  invoiceAmount?: number // full invoice amount before discounts
  appliedTo: string[]
  invoiceCategory?: string // e.g. "Tuition", "ECA", "Trip & Activity"
}

// Sample student discount data
interface StudentDiscount {
  id: string
  studentId: string
  studentName: string
  yearGroup: string
  academicYear: string
  term: string
  invoiceCategory: string
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
  const [viewingDiscountStudent, setViewingDiscountStudent] = useState<any>(null)

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
    const INVOICE_KEYS: { key: string; category: string }[] = [
      { key: "createdInvoices", category: "Tuition" },
      { key: "createdInvoices_eca", category: "ECA" },
      { key: "createdInvoices_trip", category: "Trip & Activity" },
      { key: "createdInvoices_exam", category: "Exam" },
      { key: "createdInvoices_bus", category: "School Bus" },
      { key: "createdInvoices_external", category: "External" },
    ]
    const seenInvoiceIds = new Set<string>()

    INVOICE_KEYS.forEach(({ key, category }) => {
      try {
        const stored = localStorage.getItem(key)
        if (!stored) return
        const invoices: any[] = JSON.parse(stored)
        invoices.forEach((inv: any) => {
          if (seenInvoiceIds.has(inv.id)) return
          seenInvoiceIds.add(inv.id)

          if (inv.status !== "paid") return

          const discountsArr: any[] = inv.discounts || []
          if (discountsArr.length === 0 || discountsArr.every((d: any) => !d.amount || d.amount <= 0)) return

          const invFullAmount = inv.netAmount ?? inv.subtotal ?? inv.finalAmount ?? inv.totalAmount ?? 0

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
                invoiceAmount: invFullAmount,
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
            invoiceCategory: category,
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
            invoiceCategory: "Tuition",
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
            invoiceCategory: "Tuition",
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

    // --- Mock data (always included for demo) ---
    // Concept: 1 student × 1 term = 1 row, discounts can span multiple invoice categories
    const mockStudents: StudentDiscount[] = [
      // Term 1
      { id: "mock-t1-01", studentId: "KC20250001", studentName: "Charlotte Johnson", yearGroup: "Year 12", academicYear: "2025/2026", term: "Term 1", invoiceCategory: "Tuition",
        discounts: [
          { type: "staff", name: "Staff Children", mode: "percentage", value: 50, amount: 70000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "sibling", name: "Sibling Discount", mode: "percentage", value: 10, amount: 14000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "staff", name: "Staff Children", mode: "percentage", value: 50, amount: 4000, appliedTo: ["ECA"], invoiceCategory: "ECA" },
        ], totalDiscountAmount: 88000, status: "active" },
      { id: "mock-t1-02", studentId: "KC20250003", studentName: "Oliver Smith", yearGroup: "Year 8", academicYear: "2025/2026", term: "Term 1", invoiceCategory: "Tuition",
        discounts: [
          { type: "sibling", name: "Sibling Discount", mode: "percentage", value: 10, amount: 14000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "early_bird", name: "Early Bird Discount", mode: "percentage", value: 5, amount: 7000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "group", name: "Corporate Partner", mode: "percentage", value: 15, amount: 21000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
        ], totalDiscountAmount: 42000, status: "active" },
      { id: "mock-t1-03", studentId: "KC20250005", studentName: "Sophia Williams", yearGroup: "Year 5", academicYear: "2025/2026", term: "Term 1", invoiceCategory: "Tuition",
        discounts: [
          { type: "scholarship", name: "Scholarship", mode: "percentage", value: 100, amount: 140000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
        ], totalDiscountAmount: 140000, status: "active" },
      { id: "mock-t1-04", studentId: "KC20250008", studentName: "Liam Brown", yearGroup: "Year 10", academicYear: "2025/2026", term: "Term 1", invoiceCategory: "Tuition",
        discounts: [
          { type: "group", name: "Corporate Partner", mode: "percentage", value: 15, amount: 21000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "early_bird", name: "Early Bird Discount", mode: "percentage", value: 5, amount: 7000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "sibling", name: "Sibling Discount", mode: "percentage", value: 10, amount: 800, appliedTo: ["ECA"], invoiceCategory: "ECA" },
        ], totalDiscountAmount: 28800, status: "active" },
      { id: "mock-t1-05", studentId: "KC20250010", studentName: "Emma Davis", yearGroup: "Year 3", academicYear: "2025/2026", term: "Term 1", invoiceCategory: "Tuition",
        discounts: [
          { type: "sibling", name: "Sibling Discount", mode: "percentage", value: 10, amount: 9500, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "campaign", name: "Refer a Friend", mode: "fixed", value: 5000, amount: 5000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "sibling", name: "Sibling Discount", mode: "percentage", value: 10, amount: 800, appliedTo: ["Trip"], invoiceCategory: "Trip & Activity" },
        ], totalDiscountAmount: 15300, status: "active" },
      { id: "mock-t1-06", studentId: "KC20250012", studentName: "Noah Wilson", yearGroup: "Year 7", academicYear: "2025/2026", term: "Term 1", invoiceCategory: "Tuition",
        discounts: [
          { type: "staff", name: "Staff Children", mode: "percentage", value: 50, amount: 65000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "staff", name: "Staff Children", mode: "percentage", value: 50, amount: 5000, appliedTo: ["ECA"], invoiceCategory: "ECA" },
          { type: "staff", name: "Staff Children", mode: "percentage", value: 50, amount: 1500, appliedTo: ["Trip"], invoiceCategory: "Trip & Activity" },
        ], totalDiscountAmount: 71500, status: "active" },
      { id: "mock-t1-07", studentId: "KC20250015", studentName: "Ava Taylor", yearGroup: "Year 1", academicYear: "2025/2026", term: "Term 1", invoiceCategory: "Tuition",
        discounts: [
          { type: "school_bus", name: "School Bus Discount", mode: "fixed", value: 3000, amount: 3000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "early_bird", name: "Early Bird Discount", mode: "percentage", value: 5, amount: 4500, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
        ], totalDiscountAmount: 7500, status: "active" },
      { id: "mock-t1-08", studentId: "KC20250018", studentName: "Isabella Martinez", yearGroup: "Year 9", academicYear: "2025/2026", term: "Term 1", invoiceCategory: "Tuition",
        discounts: [
          { type: "scholarship", name: "Scholarship", mode: "percentage", value: 50, amount: 70000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "sibling", name: "Sibling Discount", mode: "percentage", value: 10, amount: 14000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "scholarship", name: "Scholarship", mode: "percentage", value: 50, amount: 4500, appliedTo: ["ECA"], invoiceCategory: "ECA" },
        ], totalDiscountAmount: 88500, status: "active" },
      { id: "mock-t1-09", studentId: "KC20250020", studentName: "Mia Anderson", yearGroup: "Pre-Nursery", academicYear: "2025/2026", term: "Term 1", invoiceCategory: "Tuition",
        discounts: [
          { type: "early_bird", name: "Early Bird Discount", mode: "percentage", value: 5, amount: 4500, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "group", name: "Embassy Staff", mode: "percentage", value: 20, amount: 18000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
        ], totalDiscountAmount: 22500, status: "active" },
      { id: "mock-t1-10", studentId: "KC20250022", studentName: "Ethan Thomas", yearGroup: "Year 13", academicYear: "2025/2026", term: "Term 1", invoiceCategory: "Tuition",
        discounts: [
          { type: "group", name: "Embassy Staff", mode: "percentage", value: 20, amount: 32000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "staff", name: "Staff Children", mode: "percentage", value: 50, amount: 80000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
        ], totalDiscountAmount: 112000, status: "active" },

      // Term 2
      { id: "mock-t2-01", studentId: "KC20250001", studentName: "Charlotte Johnson", yearGroup: "Year 12", academicYear: "2025/2026", term: "Term 2", invoiceCategory: "Tuition",
        discounts: [
          { type: "staff", name: "Staff Children", mode: "percentage", value: 50, amount: 70000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "sibling", name: "Sibling Discount", mode: "percentage", value: 10, amount: 14000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "staff", name: "Staff Children", mode: "percentage", value: 50, amount: 4000, appliedTo: ["ECA"], invoiceCategory: "ECA" },
        ], totalDiscountAmount: 88000, status: "active" },
      { id: "mock-t2-02", studentId: "KC20250003", studentName: "Oliver Smith", yearGroup: "Year 8", academicYear: "2025/2026", term: "Term 2", invoiceCategory: "Tuition",
        discounts: [
          { type: "sibling", name: "Sibling Discount", mode: "percentage", value: 10, amount: 14000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "early_bird", name: "Early Bird Discount", mode: "percentage", value: 5, amount: 7000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
        ], totalDiscountAmount: 21000, status: "active" },
      { id: "mock-t2-03", studentId: "KC20250005", studentName: "Sophia Williams", yearGroup: "Year 5", academicYear: "2025/2026", term: "Term 2", invoiceCategory: "Tuition",
        discounts: [
          { type: "scholarship", name: "Scholarship", mode: "percentage", value: 100, amount: 140000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
        ], totalDiscountAmount: 140000, status: "active" },
      { id: "mock-t2-04", studentId: "KC20250008", studentName: "Liam Brown", yearGroup: "Year 10", academicYear: "2025/2026", term: "Term 2", invoiceCategory: "Tuition",
        discounts: [
          { type: "group", name: "Corporate Partner", mode: "percentage", value: 15, amount: 21000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "sibling", name: "Sibling Discount", mode: "percentage", value: 10, amount: 14000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
        ], totalDiscountAmount: 35000, status: "active" },
      { id: "mock-t2-05", studentId: "KC20250010", studentName: "Emma Davis", yearGroup: "Year 3", academicYear: "2025/2026", term: "Term 2", invoiceCategory: "Tuition",
        discounts: [
          { type: "sibling", name: "Sibling Discount", mode: "percentage", value: 10, amount: 9500, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "school_bus", name: "School Bus Discount", mode: "fixed", value: 3000, amount: 3000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "sibling", name: "Sibling Discount", mode: "percentage", value: 10, amount: 1800, appliedTo: ["ECA"], invoiceCategory: "ECA" },
        ], totalDiscountAmount: 14300, status: "active" },
      { id: "mock-t2-06", studentId: "KC20250025", studentName: "James Lee", yearGroup: "Year 6", academicYear: "2025/2026", term: "Term 2", invoiceCategory: "Tuition",
        discounts: [
          { type: "staff", name: "Staff Children", mode: "percentage", value: 50, amount: 55000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "sibling", name: "Sibling Discount", mode: "percentage", value: 10, amount: 11000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "staff", name: "Staff Children", mode: "percentage", value: 50, amount: 2500, appliedTo: ["Trip"], invoiceCategory: "Trip & Activity" },
        ], totalDiscountAmount: 68500, status: "active" },
      { id: "mock-t2-07", studentId: "KC20250018", studentName: "Isabella Martinez", yearGroup: "Year 9", academicYear: "2025/2026", term: "Term 2", invoiceCategory: "Tuition",
        discounts: [
          { type: "scholarship", name: "Scholarship", mode: "percentage", value: 50, amount: 70000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "sibling", name: "Sibling Discount", mode: "percentage", value: 10, amount: 14000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
        ], totalDiscountAmount: 84000, status: "active" },
      { id: "mock-t2-08", studentId: "KC20250028", studentName: "Lucas Garcia", yearGroup: "Year 2", academicYear: "2025/2026", term: "Term 2", invoiceCategory: "Tuition",
        discounts: [
          { type: "campaign", name: "Refer a Friend", mode: "fixed", value: 5000, amount: 5000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "early_bird", name: "Early Bird Discount", mode: "percentage", value: 5, amount: 4500, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
        ], totalDiscountAmount: 9500, status: "active" },
      { id: "mock-t2-09", studentId: "KC20250022", studentName: "Ethan Thomas", yearGroup: "Year 13", academicYear: "2025/2026", term: "Term 2", invoiceCategory: "Tuition",
        discounts: [
          { type: "group", name: "Embassy Staff", mode: "percentage", value: 20, amount: 32000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "staff", name: "Staff Children", mode: "percentage", value: 50, amount: 80000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
        ], totalDiscountAmount: 112000, status: "active" },
      { id: "mock-t2-10", studentId: "KC20250030", studentName: "Harper Clark", yearGroup: "Nursery", academicYear: "2025/2026", term: "Term 2", invoiceCategory: "Tuition",
        discounts: [
          { type: "early_bird", name: "Early Bird Discount", mode: "percentage", value: 5, amount: 4000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "group", name: "Corporate Partner", mode: "percentage", value: 15, amount: 12000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
        ], totalDiscountAmount: 16000, status: "active" },

      // Term 3
      { id: "mock-t3-01", studentId: "KC20250001", studentName: "Charlotte Johnson", yearGroup: "Year 12", academicYear: "2025/2026", term: "Term 3", invoiceCategory: "Tuition",
        discounts: [
          { type: "staff", name: "Staff Children", mode: "percentage", value: 50, amount: 70000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "sibling", name: "Sibling Discount", mode: "percentage", value: 10, amount: 14000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "staff", name: "Staff Children", mode: "percentage", value: 50, amount: 4000, appliedTo: ["ECA"], invoiceCategory: "ECA" },
          { type: "staff", name: "Staff Children", mode: "percentage", value: 50, amount: 1500, appliedTo: ["Trip"], invoiceCategory: "Trip & Activity" },
        ], totalDiscountAmount: 89500, status: "active" },
      { id: "mock-t3-02", studentId: "KC20250003", studentName: "Oliver Smith", yearGroup: "Year 8", academicYear: "2025/2026", term: "Term 3", invoiceCategory: "Tuition",
        discounts: [
          { type: "sibling", name: "Sibling Discount", mode: "percentage", value: 10, amount: 14000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "group", name: "Corporate Partner", mode: "percentage", value: 15, amount: 21000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
        ], totalDiscountAmount: 35000, status: "active" },
      { id: "mock-t3-03", studentId: "KC20250005", studentName: "Sophia Williams", yearGroup: "Year 5", academicYear: "2025/2026", term: "Term 3", invoiceCategory: "Tuition",
        discounts: [
          { type: "scholarship", name: "Scholarship", mode: "percentage", value: 100, amount: 140000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "scholarship", name: "Scholarship", mode: "percentage", value: 100, amount: 8000, appliedTo: ["ECA"], invoiceCategory: "ECA" },
        ], totalDiscountAmount: 148000, status: "active" },
      { id: "mock-t3-04", studentId: "KC20250008", studentName: "Liam Brown", yearGroup: "Year 10", academicYear: "2025/2026", term: "Term 3", invoiceCategory: "Tuition",
        discounts: [
          { type: "group", name: "Corporate Partner", mode: "percentage", value: 15, amount: 21000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "early_bird", name: "Early Bird Discount", mode: "percentage", value: 5, amount: 7000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "sibling", name: "Sibling Discount", mode: "percentage", value: 10, amount: 14000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
        ], totalDiscountAmount: 42000, status: "active" },
      { id: "mock-t3-05", studentId: "KC20250010", studentName: "Emma Davis", yearGroup: "Year 3", academicYear: "2025/2026", term: "Term 3", invoiceCategory: "Tuition",
        discounts: [
          { type: "sibling", name: "Sibling Discount", mode: "percentage", value: 10, amount: 9500, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "sibling", name: "Sibling Discount", mode: "percentage", value: 10, amount: 1800, appliedTo: ["ECA"], invoiceCategory: "ECA" },
          { type: "staff", name: "Staff Children", mode: "percentage", value: 50, amount: 9000, appliedTo: ["ECA"], invoiceCategory: "ECA" },
        ], totalDiscountAmount: 20300, status: "active" },
      { id: "mock-t3-06", studentId: "KC20250018", studentName: "Isabella Martinez", yearGroup: "Year 9", academicYear: "2025/2026", term: "Term 3", invoiceCategory: "Tuition",
        discounts: [
          { type: "scholarship", name: "Scholarship", mode: "percentage", value: 50, amount: 70000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "sibling", name: "Sibling Discount", mode: "percentage", value: 10, amount: 14000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "campaign", name: "Refer a Friend", mode: "fixed", value: 5000, amount: 5000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
        ], totalDiscountAmount: 89000, status: "active" },
      { id: "mock-t3-07", studentId: "KC20250015", studentName: "Ava Taylor", yearGroup: "Year 1", academicYear: "2025/2026", term: "Term 3", invoiceCategory: "Tuition",
        discounts: [
          { type: "school_bus", name: "School Bus Discount", mode: "fixed", value: 3000, amount: 3000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "early_bird", name: "Early Bird Discount", mode: "percentage", value: 5, amount: 4500, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
        ], totalDiscountAmount: 7500, status: "active" },
      { id: "mock-t3-08", studentId: "KC20250022", studentName: "Ethan Thomas", yearGroup: "Year 13", academicYear: "2025/2026", term: "Term 3", invoiceCategory: "Tuition",
        discounts: [
          { type: "group", name: "Embassy Staff", mode: "percentage", value: 20, amount: 32000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "staff", name: "Staff Children", mode: "percentage", value: 50, amount: 80000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
        ], totalDiscountAmount: 112000, status: "graduated" },
      { id: "mock-t3-09", studentId: "KC20250032", studentName: "Amelia White", yearGroup: "Reception", academicYear: "2025/2026", term: "Term 3", invoiceCategory: "Tuition",
        discounts: [
          { type: "staff", name: "Staff Children", mode: "percentage", value: 50, amount: 45000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "sibling", name: "Sibling Discount", mode: "percentage", value: 10, amount: 9000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
        ], totalDiscountAmount: 54000, status: "active" },
      { id: "mock-t3-10", studentId: "KC20250035", studentName: "Benjamin Harris", yearGroup: "Year 11", academicYear: "2025/2026", term: "Term 3", invoiceCategory: "Tuition",
        discounts: [
          { type: "early_bird", name: "Early Bird Discount", mode: "percentage", value: 5, amount: 7500, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "group", name: "Corporate Partner", mode: "percentage", value: 15, amount: 22500, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
          { type: "school_bus", name: "School Bus Discount", mode: "fixed", value: 3000, amount: 3000, appliedTo: ["Tuition"], invoiceCategory: "Tuition" },
        ], totalDiscountAmount: 33000, status: "active" },
    ]
    result.push(...mockStudents)

    return result
  }, [students])

  // Collect all unique discount names from real data for the filter
  const DISCOUNT_MODULES = ["Tuition", "ECA", "Trip & Activity", "Exam", "School Bus"]

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

    const matchesType = filterType === "all" || student.invoiceCategory === filterType
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
    // Collect unique discount names across all filtered students (preserve insertion order)
    const discountNameSet = new Set<string>()
    filteredStudents.forEach(s => s.discounts.forEach(d => discountNameSet.add(d.name)))
    const discountCols = Array.from(discountNameSet)

    const showTerm = filterTerm !== "all"

    const headers = [
      "Student ID",
      "Student Name",
      "Year Group",
      "Academic Year",
      ...(showTerm ? ["Term"] : []),
      ...discountCols
    ]

    // 1 row per student — sum invoice amounts across all matching invoices
    type StudentRow = {
      studentId: string
      studentName: string
      yearGroup: string
      academicYear: string
      term: string
      discountMap: Record<string, number>
    }
    const studentMap = new Map<string, StudentRow>()

    filteredStudents.forEach(s => {
      if (!studentMap.has(s.studentId)) {
        studentMap.set(s.studentId, {
          studentId: s.studentId,
          studentName: s.studentName,
          yearGroup: s.yearGroup,
          academicYear: s.academicYear,
          term: s.term,
          discountMap: {}
        })
      }
      const entry = studentMap.get(s.studentId)!
      s.discounts.forEach(d => {
        entry.discountMap[d.name] = (entry.discountMap[d.name] ?? 0) + d.amount
      })
    })

    const rows: (string | number)[][] = Array.from(studentMap.values()).map(s => [
      s.studentId,
      s.studentName,
      s.yearGroup,
      formatAcademicYear(s.academicYear),
      ...(showTerm ? [s.term] : []),
      ...discountCols.map(col => s.discountMap[col] ?? "")
    ])

    downloadAsXlsx(headers, rows, `discount-report-${new Date().toISOString().split('T')[0]}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-3 md:p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <label className="text-sm font-medium text-muted-foreground">Module</label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="h-9">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="All Modules" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Modules</SelectItem>
                      {DISCOUNT_MODULES.map(mod => (
                        <SelectItem key={mod} value={mod}>{mod}</SelectItem>
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
        <CardContent className="p-0 overflow-x-auto">
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
                  {/* Discounts - CENTER aligned (count) */}
                  <TableHead align="center">{t("discountReports.discounts")}</TableHead>
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
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
                      {/* Discounts - CENTER aligned (count, clickable) */}
                      <TableCell align="center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="font-medium text-primary underline-offset-4 hover:underline"
                          onClick={() => setViewingDiscountStudent(student)}
                        >
                          {student.discounts.length}
                        </Button>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

      {/* Discount Detail Dialog */}
      <Dialog open={!!viewingDiscountStudent} onOpenChange={(open) => !open && setViewingDiscountStudent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("discountReports.discountsDetail")}</DialogTitle>
            {viewingDiscountStudent && (
              <p className="text-sm text-muted-foreground">
                {viewingDiscountStudent.studentName} ({viewingDiscountStudent.studentId})
              </p>
            )}
          </DialogHeader>
          {viewingDiscountStudent && (() => {
            // Group discounts by invoiceCategory
            const groupedByCat = viewingDiscountStudent.discounts.reduce((acc: Record<string, DiscountItem[]>, d: DiscountItem) => {
              const cat = d.invoiceCategory || viewingDiscountStudent.invoiceCategory || "Other"
              if (!acc[cat]) acc[cat] = []
              acc[cat].push(d)
              return acc
            }, {} as Record<string, DiscountItem[]>)

            return (
              <div className="space-y-4">
                {viewingDiscountStudent.term && viewingDiscountStudent.term !== "-" && (
                  <span className="text-sm text-muted-foreground">{viewingDiscountStudent.term}</span>
                )}

                {Object.entries(groupedByCat).map(([cat, items]) => (
                  <div key={cat} className="space-y-1">
                    <Badge variant="secondary">{cat}</Badge>
                    <div className="space-y-1 pl-2">
                      {(items as DiscountItem[]).map((d, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1">
                          <span className="text-sm">{d.name}</span>
                          <span className="text-sm font-medium">
                            {d.mode === "percentage" ? `${d.value}%` : formatCurrency(d.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
