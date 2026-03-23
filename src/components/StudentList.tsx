import { useState, useMemo, useEffect } from "react"
import { usePersistedState } from "@/hooks/usePersistedState"
import { PaginationBar } from "@/components/ui/pagination-bar"
import { downloadAsXlsx, parseXlsxOrCsvFile, XLSX_ACCEPT, formatAcademicYear } from "@/utils/xlsxUtils"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "./ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog"
import { Checkbox } from "./ui/checkbox"
import { Badge } from "./ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { SearchInput } from "./ui/advanced-filter"
import { EmptySearchResults, EmptyDataState } from "./ui/states"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAuth } from "@/contexts/AuthContext"
import { canPerformActions } from "@/utils/rolePermissions"
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Users,
  GraduationCap,
  Download,
  Upload,
  Filter,
  CalendarIcon,
  Phone,
  Mail,
  User,
  Percent,
  CreditCard,
  ArrowUpCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Minus,
  ArrowUpDown,
  RotateCcw,
  UserCheck,
  Home
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "@/components/ui/sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { ColumnPresets } from "@/utils/tableAlignment"
import { useConfirmDialog } from "@/hooks/useConfirmDialog"
import { useStudents, Student, Parent, Family, convertTermFormat } from "@/contexts/StudentContext"
import { useAcademicYears } from "@/contexts/AcademicYearContext"
import { useDiscountOptions } from "@/contexts/DiscountOptionsContext"
import { cn } from "./ui/utils"
import { gradeLevels, gradeProgressionMap, getGradeLabel, getNextGrade } from "@/utils/grades"
import { logActivity } from "@/lib/activityLog"

const getStatusOptions = (t: (key: string) => string) => [
  { id: "active", label: t("studentStatus.active"), color: "bg-green-100 text-green-800" },
  { id: "graduated", label: t("studentStatus.graduated"), color: "bg-blue-100 text-blue-800" },
  { id: "withdrawn", label: t("studentStatus.withdrawn"), color: "bg-red-100 text-red-800" },
  { id: "on_leave", label: t("studentStatus.onLeave"), color: "bg-amber-100 text-amber-800" },
]

const getTermOptions = (t: (key: string) => string) => [
  { id: "term1", label: t("term.term1") },
  { id: "term2", label: t("term.term2") },
  { id: "term3", label: t("term.term3") },
]

const getTermLabel = (termId: string | undefined): string => {
  if (!termId) return "-"
  const terms: Record<string, string> = {
    term1: "Term 1",
    term2: "Term 2",
    term3: "Term 3"
  }
  return terms[termId] || termId
}

const DISCOUNT_OPTIONS_STORAGE_KEY = "discountOptions"
const SCHOLARSHIP_RECORDS_KEY = "scholarshipRecords"
const STAFF_CHILD_RECORDS_KEY = "staffChildRecords"
const EARLY_BIRD_RECORDS_KEY = "earlyBirdRecords"

// Helper functions to check discount types from localStorage
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

// Get Registration Fees from Discount Options
const getRegistrationFees = (academicYear: string, term: string): { applicationFee: number; registrationFee: number; securityDeposit: number; waitListFee: number } | null => {
  try {
    const stored = localStorage.getItem(DISCOUNT_OPTIONS_STORAGE_KEY)
    if (stored) {
      const allData = JSON.parse(stored)
      const convertedTerm = convertTermFormat(term)
      const storageKey = `${academicYear}_${convertedTerm}`
      const options = allData[storageKey]
      if (options?.registrationFees) {
        return {
          applicationFee: options.registrationFees.applicationFee || 5000,
          registrationFee: options.registrationFees.registrationFee || 225000,
          securityDeposit: options.registrationFees.securityDeposit || 200000,
          waitListFee: options.registrationFees.waitListFee || 225000
        }
      }
    }
  } catch (error) {
    console.error("Failed to load registration fees:", error)
  }
  // Return defaults if not found
  return {
    applicationFee: 5000,
    registrationFee: 225000,
    securityDeposit: 200000,
    waitListFee: 225000
  }
}

// Get Student Groups that a student belongs to (from all categories)
const getStudentGroupDiscounts = (studentId: string): { name: string; discountType: string; discountPercentage: number; fixedAmount: number; departments: string[]; category: string }[] => {
  const allGroups: { name: string; discountType: string; discountPercentage: number; fixedAmount: number; departments: string[]; category: string }[] = []

  // Load from all invoice categories (tuition uses "studentGroups", others use "studentGroups_<category>")
  const categoryKeys: { category: string; storageKey: string }[] = [
    { category: "tuition", storageKey: "studentGroups" },
    { category: "eca", storageKey: "studentGroups_eca" },
    { category: "trip", storageKey: "studentGroups_trip" },
    { category: "exam", storageKey: "studentGroups_exam" },
    { category: "bus", storageKey: "studentGroups_bus" },
  ]

  categoryKeys.forEach(({ category, storageKey }) => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const groups = JSON.parse(stored)
        const matchingGroups = groups
          .filter((group: any) => group.students?.some((s: any) => s.id === studentId))
          .map((group: any) => ({
            name: group.name,
            discountType: group.discountType,
            discountPercentage: group.discountPercentage || 0,
            fixedAmount: group.fixedAmount || 0,
            departments: group.departments || [],
            category,
          }))
        allGroups.push(...matchingGroups)
      }
    } catch (error) {
      console.error(`Failed to load student groups from ${category}:`, error)
    }
  })

  return allGroups
}


const emptyStudent: Omit<Student, "id"> = {
  studentId: "",
  firstName: "",
  lastName: "",
  nickname: "",
  dateOfBirth: null,
  gender: "male",
  gradeLevel: "",
  academicYear: "",
  enrollmentTerm: "term1",
  status: "active",
  withdrawalAcademicYear: undefined,
  withdrawalTerm: undefined,
  familyId: "",
  childOrder: 1,
  parents: [],
  enrollmentDate: null,
  notes: "",
  createdBy: "",
  createdAt: new Date(),
  updatedBy: "",
  updatedAt: new Date()
}

const emptyParent: Omit<Parent, "id"> = {
  name: "",
  relationship: "father",
  phone: "",
  email: "",
  isPrimary: false
}

interface StudentListProps {
  onNavigate?: (sectionId: string) => void
}

export function StudentList({ onNavigate }: StudentListProps = {}) {
  const { t } = useLanguage()
  const { students, families, addStudent, updateStudent, deleteStudent, addFamily, updateFamily } = useStudents()
  const { academicYears } = useAcademicYears()
  const { user } = useAuth()
  const userCanEdit = canPerformActions(user?.role)

  // Confirmation dialog hooks
  const addConfirmDialog = useConfirmDialog()
  const editConfirmDialog = useConfirmDialog()
  const importConfirmDialog = useConfirmDialog()
  const deleteConfirmDialog = useConfirmDialog()

  const [searchTerm, setSearchTerm] = useState("")
  const [filterGrade, setFilterGrade] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterAcademicYear, setFilterAcademicYear] = useState("all")
  const [filterTerm, setFilterTerm] = useState("all")

  // Sorting states
  const [sortColumn, setSortColumn] = useState("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [formData, setFormData] = useState<Omit<Student, "id">>(emptyStudent)
  const [newParent, setNewParent] = useState<Omit<Parent, "id">>(emptyParent)
  const [activeTab, setActiveTab] = useState("basic")

  // Date of Birth picker states (lifted from IIFE to avoid hooks rule violation)
  const [showDobYearPicker, setShowDobYearPicker] = useState(true)
  const [selectedDobYear, setSelectedDobYear] = useState<number | null>(null)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [importData, setImportData] = useState<string>("")
  const [importPreview, setImportPreview] = useState<any[]>([])
  const [importError, setImportError] = useState<string>("")
  const [showAllPreview, setShowAllPreview] = useState(false)

  // Promote Grade states
  const [isPromoteDialogOpen, setIsPromoteDialogOpen] = useState(false)
  const [promoteFromYear, setPromoteFromYear] = useState<string>("")
  const [promoteToYear, setPromoteToYear] = useState<string>("")
  const [promoteConfirmed, setPromoteConfirmed] = useState(false)
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())
  const [promoteSelectedIds, setPromoteSelectedIds] = useState<Set<string>>(new Set())
  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set())
  const [promoteSearch, setPromoteSearch] = useState("")

  // Promoted years lock (prevent double-promotion)
  const PROMOTED_YEARS_KEY = "promotedAcademicYears"
  const getPromotedYears = (): string[] => {
    try { return JSON.parse(localStorage.getItem(PROMOTED_YEARS_KEY) || "[]") } catch { return [] }
  }
  const isYearAlreadyPromoted = (toYear: string) => getPromotedYears().includes(toYear)

  const availableYears = academicYears.map((y: any) => y.id).sort((a: string, b: string) => b.localeCompare(a))

  // Build invoice terms map: studentId -> sorted array of term numbers ("1", "2", "3")
  const invoiceTermsMap = useMemo(() => {
    const map = new Map<string, string[]>()
    try {
      const stored = localStorage.getItem("createdInvoices")
      if (!stored) return map
      const invoices: any[] = JSON.parse(stored)
      const sets = new Map<string, Set<string>>()
      invoices.forEach((inv: any) => {
        if (!inv.studentId) return
        const termStr = inv.termName || inv.term || ""
        const m = termStr.match(/[Tt]erm\s*(\d+)/)
        if (!m) return
        if (!sets.has(inv.studentId)) sets.set(inv.studentId, new Set())
        sets.get(inv.studentId)!.add(m[1])
      })
      sets.forEach((terms, sid) => map.set(sid, Array.from(terms).sort()))
    } catch { /* ignore */ }
    return map
  }, [students])

  // Filter students - Note: Year and Term filters are disabled to show all students across all years/terms
  const filteredStudents = useMemo(() => {
    return students.filter((student: Student) => {
      const matchesSearch =
        student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.familyCode && student.familyCode.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesGrade = filterGrade === "all" || student.gradeLevel === filterGrade
      const matchesTerm = (() => {
        if (filterTerm === "all") return true
        const termNum = filterTerm.replace("term", "") // "term1" → "1"
        const invoiceTerms = invoiceTermsMap.get(student.studentId)
        if (invoiceTerms && invoiceTerms.length > 0) return invoiceTerms.includes(termNum)
        return student.enrollmentTerm === filterTerm
      })()
      const matchesStatus = filterStatus === "all" || student.status === filterStatus
      const matchesAcademicYear = filterAcademicYear === "all" || student.academicYear === filterAcademicYear

      return matchesSearch && matchesGrade && matchesTerm && matchesStatus && matchesAcademicYear
    })
  }, [students, searchTerm, filterGrade, filterTerm, filterStatus, filterAcademicYear, invoiceTermsMap])

  // Sorting functions
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const sortedStudents = useMemo(() => {
    if (!sortColumn) return filteredStudents
    return [...filteredStudents].sort((a: Student, b: Student) => {
      let aValue: any
      let bValue: any

      switch (sortColumn) {
        case "studentId":
          aValue = a.studentId
          bValue = b.studentId
          break
        case "name":
          aValue = `${a.firstName} ${a.lastName}`
          bValue = `${b.firstName} ${b.lastName}`
          break
        case "gradeLevel":
          aValue = a.gradeLevel
          bValue = b.gradeLevel
          break
        case "academicYear":
          aValue = a.academicYear
          bValue = b.academicYear
          break
        case "enrollmentTerm":
          aValue = a.enrollmentTerm
          bValue = b.enrollmentTerm
          break
        case "familyCode":
          aValue = a.familyCode || ""
          bValue = b.familyCode || ""
          break
        case "familyId":
          aValue = a.familyId || ""
          bValue = b.familyId || ""
          break
        case "childOrder":
          aValue = a.childOrder
          bValue = b.childOrder
          break
        case "status":
          aValue = a.status
          bValue = b.status
          break
        case "updatedAt":
          aValue = a.updatedAt?.getTime() || 0
          bValue = b.updatedAt?.getTime() || 0
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
  }, [filteredStudents, sortColumn, sortDirection])

  // Pagination logic
  const totalPages = Math.ceil(sortedStudents.length / pageSize)
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return sortedStudents.slice(startIndex, startIndex + pageSize)
  }, [sortedStudents, currentPage, pageSize])

  // Reset to page 1 when filters or sorting changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterGrade, filterStatus, sortColumn, sortDirection])

  // Stats
  const stats = useMemo(() => {
    const activeStudentsCount: number = students.filter((s: Student) => s.status === "active").length
    const totalStudentsCount: number = students.length
    const familyCount: number = families.length
    return { active: activeStudentsCount, total: totalStudentsCount, familyCount: familyCount }
  }, [students, families])

  // getGradeLabel is now imported from @/utils/grades

  const getStatusBadge = (status: string) => {
    const statusOption = getStatusOptions(t).find(s => s.id === status)
    return statusOption ? (
      <Badge className={cn("font-normal", statusOption.color)}>
        {statusOption.label}
      </Badge>
    ) : null
  }

  const getFamilyCode = (familyId: string, studentFamilyCode?: string) => {
    if (studentFamilyCode) return studentFamilyCode
    return families.find((f: Family) => f.id === familyId)?.familyCode || "-"
  }

  // Get or create family by family code
  const getOrCreateFamily = (
    familyCode: string,
    studentId: string,
    familyData?: { familyName?: string; email?: string; phone?: string }
  ): string => {
    if (!familyCode || familyCode.trim() === "") return ""

    // เงื่อนไขที่ 3: มี familycode และมีในระบบ → เพิ่มนักเรียนเข้า family เดิม
    const existingFamily = families.find((f: Family) => f.familyCode === familyCode)
    if (existingFamily) {
      const updates: Partial<Family> = {}
      
      // Update student list if not already present
      if (!existingFamily.studentIds.includes(studentId)) {
        updates.studentIds = [...existingFamily.studentIds, studentId]
      }
      
      // Audit Fix: Sync Email/Phone to Family Group if currently empty
      if (!existingFamily.email && familyData?.email) {
        updates.email = familyData.email
      }
      if (!existingFamily.phone && familyData?.phone) {
        updates.phone = familyData.phone
      }

      if (Object.keys(updates).length > 0) {
        updateFamily(existingFamily.id, updates)
      }
      return existingFamily.id
    }

    // เงื่อนไขที่ 2: มี familycode แต่ไม่มีในระบบ → สร้าง family ใหม่พร้อมข้อมูลทั้งหมด
    const newFamily: Family = {
      id: `FAM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      familyCode: familyCode,
      familyName: familyData?.familyName || familyCode,
      studentIds: [studentId],
      primaryContactId: "",
      address: "",
      email: familyData?.email || "",
      phone: familyData?.phone,
      createdAt: new Date()
    }
    addFamily(newFamily)
    return newFamily.id
  }

  // Update existing family info if missing (Sync)
  const syncFamilyData = (familyId: string, familyData: { email?: string; phone?: string }) => {
    const family = families.find(f => f.id === familyId)
    if (!family) return

    const updates: Partial<Family> = {}
    if (!family.email && familyData.email) updates.email = familyData.email
    if (!family.phone && familyData.phone) updates.phone = familyData.phone

    if (Object.keys(updates).length > 0) {
      updateFamily(familyId, updates)
    }
  }

  const handleAddStudent = () => {
    setFormData({
      ...emptyStudent,
      academicYear: availableYears[0] || ""
    })
    setActiveTab("basic")
    setShowDobYearPicker(true)
    setSelectedDobYear(null)
    setIsAddDialogOpen(true)
  }

  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student)
    const { id, ...studentData } = student
    // Normalize academicYear format: "2025/2026" → "2025/2026" to match dropdown options
    setFormData({ ...studentData, academicYear: (studentData.academicYear || "").replace(/-/g, "/") })
    setActiveTab("basic")
    setShowDobYearPicker(!studentData.dateOfBirth)
    setSelectedDobYear(studentData.dateOfBirth ? studentData.dateOfBirth.getFullYear() : null)
    setIsEditDialogOpen(true)
  }

  const handleViewStudent = (student: Student) => {
    setSelectedStudent(student)
    setIsViewDialogOpen(true)
  }

  const performDeleteStudent = (student: Student) => {
    deleteStudent(student.id)
    logActivity({
      action: "Deleted student",
      module: "Student Management",
      detail: `${student.firstName} ${student.lastName} (ID: ${student.studentId})`
    })
    toast.success("Student deleted successfully")
  }

  const handleDeleteStudent = (student: Student) => {
    setSelectedStudent(student)
    deleteConfirmDialog.confirm(() => performDeleteStudent(student))
  }

  const performSaveNewStudent = () => {
    if (!formData.firstName || !formData.lastName || !formData.gradeLevel || !formData.academicYear || !formData.enrollmentTerm) {
      toast.error("Please fill in all required fields")
      return
    }

    const now = new Date()
    const currentUser = "Admin"

    const primaryParent = formData.parents.find(p => p.isPrimary)
    const parentEmail = primaryParent?.email || ""
    const parentPhone = primaryParent?.phone || ""
    const familyName = formData.lastName || formData.familyCode || ""

    // สร้าง ID ล่วงหน้าเพื่อส่งให้ family
    const studentId = `STU${Date.now()}`

    // เงื่อนไขที่ 1: ไม่มี familyCode → ไม่เพิ่มเข้า family ใดๆ
    // เงื่อนไขที่ 2-3: มี familyCode → สร้างใหม่หรือเพิ่มเข้าของเดิม พร้อมข้อมูลทั้งหมด
    const familyId = formData.familyCode
      ? getOrCreateFamily(formData.familyCode, studentId, {
          familyName,
          email: parentEmail,
          phone: parentPhone
        })
      : ""

    const newStudent: Student = {
      id: studentId,
      ...formData,
      familyId: familyId,
      createdBy: currentUser,
      createdAt: now,
      updatedBy: currentUser,
      updatedAt: now
    }
    addStudent(newStudent)
    logActivity({
      action: "Created student",
      module: "Student Management",
      detail: `${newStudent.firstName} ${newStudent.lastName} (ID: ${newStudent.studentId})`
    })

    toast.success(t("student.studentAdded"))
    setIsAddDialogOpen(false)
    setFormData(emptyStudent)
  }

  const handleSaveNewStudent = () => {
    addConfirmDialog.confirm(() => {
      performSaveNewStudent()
    })
  }

  const performSaveEditStudent = () => {
    if (!formData.firstName || !formData.lastName || !formData.gradeLevel || !formData.academicYear || !formData.enrollmentTerm) {
      toast.error("Please fill in all required fields")
      return
    }

    if (selectedStudent) {
      const currentUser = "Admin"

      const primaryParent = formData.parents.find(p => p.isPrimary)
      const parentEmail = primaryParent?.email || ""
      const parentPhone = primaryParent?.phone || ""
      const familyName = formData.lastName || formData.familyCode || ""

      const familyId = formData.familyCode
        ? getOrCreateFamily(formData.familyCode, selectedStudent.id, {
            familyName,
            email: parentEmail,
            phone: parentPhone
          })
        : ""

      updateStudent(selectedStudent.id, {
        ...formData,
        familyId: familyId,
        updatedBy: currentUser,
        updatedAt: new Date()
      })

      logActivity({
        action: "Updated student",
        module: "Student Management",
        detail: `${formData.firstName} ${formData.lastName} (ID: ${formData.studentId})`
      })

      toast.success(t("student.studentUpdated"))
      setIsEditDialogOpen(false)
      setSelectedStudent(null)
    }
  }

  const handleSaveEditStudent = () => {
    editConfirmDialog.confirm(() => {
      performSaveEditStudent()
    })
  }


  const handleAddParent = () => {
    const parent: Parent = {
      id: `P${Date.now()}`,
      ...newParent,
      isPrimary: formData.parents.length === 0
    }
    setFormData(prev => ({
      ...prev,
      parents: [...prev.parents, parent]
    }))
    setNewParent(emptyParent)
  }

  const handleRemoveParent = (parentId: string) => {
    setFormData(prev => ({
      ...prev,
      parents: prev.parents.filter((p: Parent) => p.id !== parentId)
    }))
  }

  const handleExport = () => {
    // Create CSV content
    const headers = [
      "Student ID",
      "First Name",
      "Last Name",
      "Nickname",
      "Date of Birth",
      "Gender",
      "Year Group",
      "Academic Year",
      "Status",
      "Family Code",
      "Child Order",
      "Enrollment Date",
      "Parent 1 Name",
      "Parent 1 Relationship",
      "Parent 1 Phone",
      "Parent 1 Email",
      "Parent 2 Name",
      "Parent 2 Relationship",
      "Parent 2 Phone",
      "Parent 2 Email",
      "Notes",
      "Created By",
      "Created At",
      "Updated By",
      "Updated At"
    ]

    const rows = filteredStudents.map((student: Student) => {
      const parent1 = student.parents[0]
      const parent2 = student.parents[1]
      const family = families.find((f: any) => f.id === student.familyId)

      return [
        student.studentId,
        student.firstName,
        student.lastName,
        student.nickname,
        student.dateOfBirth ? format(student.dateOfBirth, "dd/MM/yyyy") : "",
        student.gender,
        student.gradeLevel,
        formatAcademicYear(student.academicYear),
        student.status,
        family?.familyName || "",
        student.childOrder,
        student.enrollmentDate ? format(student.enrollmentDate, "dd/MM/yyyy") : "",
        parent1?.name || "",
        parent1?.relationship || "",
        parent1?.phone || "",
        parent1?.email || "",
        parent2?.name || "",
        parent2?.relationship || "",
        parent2?.phone || "",
        parent2?.email || "",
        student.notes,
        student.createdBy,
        student.createdAt ? format(student.createdAt, "dd/MM/yyyy HH:mm") : "",
        student.updatedBy,
        student.updatedAt ? format(student.updatedAt, "dd/MM/yyyy HH:mm") : ""
      ]
    })

    downloadAsXlsx(headers, rows, `students_export_${format(new Date(), "yyyyMMdd_HHmmss")}`)

    toast.success(`Exported ${filteredStudents.length} students to Excel`)
  }

  const handleImport = () => {
    setImportData("")
    setImportPreview([])
    setImportError("")
    setIsImportDialogOpen(true)
  }

  // Find which academic year contains the given date (checks term date ranges)
  const findAcademicYearByDate = (date: Date): string => {
    for (const ay of academicYears) {
      for (const term of ay.terms) {
        if (term.startDate && term.endDate) {
          if (date >= new Date(term.startDate) && date <= new Date(term.endDate)) {
            return ay.name
          }
        }
      }
    }
    // Fallback: most recent academic year
    return academicYears.length > 0 ? academicYears[academicYears.length - 1].name : (availableYears[0] || "")
  }

  // Parse iSAMS format rows (1 row per contact) into normalized student rows (1 per student)
  const parseISAMSRows = (rows: any[]): any[] => {
    const today = new Date()
    const academicYear = findAcademicYearByDate(today)

    // Group rows by School Code
    const groups = new Map<string, any[]>()
    for (const row of rows) {
      const schoolCode = String(row["School Code"] || "").trim()
      if (!schoolCode) continue
      if (!groups.has(schoolCode)) groups.set(schoolCode, [])
      groups.get(schoolCode)!.push(row)
    }

    const result: any[] = []
    let idx = 1
    for (const [schoolCode, contactRows] of groups) {
      const first = contactRows[0]
      const yearCode = String(first["Year Code"] || "").trim()
      const yearGroup = yearCode ? `Year ${yearCode}` : ""

      const parents = contactRows.map((row, i) => {
        const forename = String(row["Primary Contact Forename"] || "").trim()
        const surname = String(row["Primary Contact Surname"] || "").trim()
        const name = [forename, surname].filter(Boolean).join(" ")
        const rel = String(row["Relation Type"] || "").trim().toLowerCase()
        const relationship = rel === "mother" ? "mother" : rel === "father" ? "father" : "guardian"
        return {
          name,
          relationship,
          phone: String(row["Primary Contact Mobile"] || "").trim(),
          email: String(row["Primary Contact Email"] || "").trim(),
          isPrimary: i === 0
        }
      })

      const p1 = parents[0]
      const p2 = parents[1]

      result.push({
        "Student ID": schoolCode,
        "First Name": String(first["Forename"] || "").trim(),
        "Last Name": String(first["Surname"] || "").trim(),
        "Nickname": String(first["Preferred Name"] || "").trim(),
        "Date of Birth": first["Date of Birth"] || "",
        "Gender": String(first["Gender"] || "").trim().toLowerCase(),
        "Year Group": yearGroup,
        "Academic Year": academicYear,
        "Family Code": String(first["Student Billing Account Code"] || "").trim(),
        "Enrollment Date": first["Enrolment Date"] || "",
        "Status": "active",
        "Parent 1 Name": p1?.name || "",
        "Parent 1 Relationship": p1?.relationship || "",
        "Parent 1 Phone": p1?.phone || "",
        "Parent 1 Email": p1?.email || "",
        "Parent 2 Name": p2?.name || "",
        "Parent 2 Relationship": p2?.relationship || "",
        "Parent 2 Phone": p2?.phone || "",
        "Parent 2 Email": p2?.email || "",
        _parents: parents,
        _rowIndex: idx++
      })
    }
    return result
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const rows = await parseXlsxOrCsvFile(file)
      if (rows.length === 0) {
        setImportError(t("student.fileHasNoData"))
        return
      }

      const fileHeaders = Object.keys(rows[0])

      // Detect iSAMS format (School Code + Forename columns)
      if (fileHeaders.includes("School Code") && fileHeaders.includes("Forename")) {
        const parsed = parseISAMSRows(rows)
        if (parsed.length === 0) {
          setImportError("No valid student data found in iSAMS file")
          return
        }
        setImportPreview(parsed)
        setImportError("")
        setShowAllPreview(false)
        return
      }

      // Accept alternative column names:
      // "Name" → covers "First Name" + "Last Name" (will split on first space)
      // "Year" → covers "Academic Year"
      const hasName = fileHeaders.includes("First Name") || fileHeaders.includes("Name")
      const hasYear = fileHeaders.includes("Academic Year") || fileHeaders.includes("Year")
      const hasStudentId = fileHeaders.includes("Student ID")
      const hasYearGroup = fileHeaders.includes("Year Group")

      const missing: string[] = []
      if (!hasStudentId) missing.push("Student ID")
      if (!hasYearGroup) missing.push("Year Group")
      if (!hasName) missing.push("First Name (or Name)")
      if (!hasYear) missing.push("Academic Year (or Year)")

      if (missing.length > 0) {
        setImportError(`Missing required columns: ${missing.join(", ")}. Found: ${fileHeaders.join(", ")}`)
        return
      }

      const parsed = rows.map((row, index) => ({ ...row, _rowIndex: index + 2 }))

      setImportPreview(parsed)
      setImportError("")
      setShowAllPreview(false)
    } catch {
      setImportError(t("student.failedToParse"))
    }
  }

  const performConfirmImport = () => {
    if (importPreview.length === 0) {
      toast.error(t("student.noDataToImport"))
      return
    }

    const now = new Date()
    const currentUser = "Admin"
    let imported = 0
    let skipped = 0

    importPreview.forEach(row => {
      // Check if student already exists
      const existingStudent = students.find((s: Student) => s.studentId === row["Student ID"])
      if (existingStudent) {
        skipped++
        return
      }

      // Support both "First Name"/"Last Name" and combined "Name" column
      const combinedName = row["Name"] || ""
      const nameParts = combinedName.trim().split(/\s+/)
      const firstName = row["First Name"] || (nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : nameParts[0]) || ""
      const lastName = row["Last Name"] || (nameParts.length > 1 ? nameParts[nameParts.length - 1] : "") || ""

      // Support both "Academic Year" and "Year" column — normalize dash to slash
      const academicYear = (row["Academic Year"] || row["Year"] || availableYears[0] || "").replace(/-/g, "/")

      const parentEmail = row["Parent 1 Email"] || ""
      const parentPhone = row["Parent 1 Phone"] || ""
      const familyCode = row["Family Code"] || ""
      const familyName = lastName || familyCode

      // สร้าง ID ล่วงหน้าเพื่อส่งให้ family
      const studentId = `STU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // เงื่อนไขที่ 1: ไม่มี familyCode → ไม่เพิ่มเข้า family ใดๆ
      // เงื่อนไขที่ 2-3: มี familyCode → สร้างใหม่หรือเพิ่มเข้าของเดิม พร้อมข้อมูลทั้งหมด
      const familyId = familyCode
        ? getOrCreateFamily(familyCode, studentId, {
            familyName,
            email: parentEmail,
            phone: parentPhone
          })
        : ""

      const newStudent: Student = {
        id: studentId,
        studentId: row["Student ID"],
        firstName,
        lastName,
        nickname: row["Nickname"] || "",
        dateOfBirth: row["Date of Birth"] ? new Date(row["Date of Birth"]) : null,
        gender: (row["Gender"]?.toLowerCase() || "other") as "male" | "female" | "other",
        gradeLevel: row["Year Group"]?.toLowerCase().replace(" ", "") || "",
        academicYear,
        status: (row["Status"]?.toLowerCase() || "active") as "active" | "graduated" | "withdrawn" | "on_leave",
        familyId: familyId,
        familyCode: familyCode,
        childOrder: parseInt(row["Child Order"]) || 1,
        parents: [],
        enrollmentTerm: "term1",
        enrollmentDate: row["Enrollment Date"] ? new Date(row["Enrollment Date"]) : null,
        notes: row["Notes"] || "",
        createdBy: currentUser,
        createdAt: now,
        updatedBy: currentUser,
        updatedAt: now
      }

      // Add parents — use _parents array (iSAMS format) if available, else use Parent 1/2 columns
      if (row["_parents"] && Array.isArray(row["_parents"])) {
        row["_parents"].forEach((parent: any, i: number) => {
          if (parent.name) {
            newStudent.parents.push({
              id: `P${Date.now()}_${i}`,
              name: parent.name,
              relationship: parent.relationship as "father" | "mother" | "guardian" | "other",
              phone: parent.phone || "",
              email: parent.email || "",
              isPrimary: i === 0
            })
          }
        })
      } else {
        if (row["Parent 1 Name"]) {
          newStudent.parents.push({
            id: `P${Date.now()}_1`,
            name: row["Parent 1 Name"],
            relationship: (row["Parent 1 Relationship"]?.toLowerCase() || "guardian") as "father" | "mother" | "guardian" | "other",
            phone: row["Parent 1 Phone"] || "",
            email: row["Parent 1 Email"] || "",
            isPrimary: true
          })
        }

        if (row["Parent 2 Name"]) {
          newStudent.parents.push({
            id: `P${Date.now()}_2`,
            name: row["Parent 2 Name"],
            relationship: (row["Parent 2 Relationship"]?.toLowerCase() || "guardian") as "father" | "mother" | "guardian" | "other",
            phone: row["Parent 2 Phone"] || "",
            email: row["Parent 2 Email"] || "",
            isPrimary: false
          })
        }
      }

      addStudent(newStudent)
      imported++
    })

    setIsImportDialogOpen(false)
    toast.success(`Imported ${imported} students${skipped > 0 ? `, skipped ${skipped} duplicates` : ""} `)
  }

  const handleConfirmImport = () => {
    importConfirmDialog.confirm(() => {
      performConfirmImport()
    })
  }

  const downloadTemplate = () => {
    // iSAMS format — one row per contact (multiple rows per student)
    const headers = [
      "Forename",
      "Preferred Name",
      "Surname",
      "Full Name",
      "Year Code",
      "School Code",
      "Student Billing Account Code",
      "Contact Billing Account Code",
      "Gender",
      "Date of Birth",
      "Primary Contact Email",
      "Primary Contact Forename",
      "Primary Contact Surname",
      "Primary Contact Mobile",
      "Relation Type",
      "Enrolment Date"
    ]

    const exampleRows = [
      ["John", "Johnny", "Doe", "John Doe", "4", "100001", "DOE0001", "JD100001", "Male", "2015-05-15", "james.doe@email.com", "James", "Doe", "+66 81 234 5678", "Father", "2024-08-15"],
      ["John", "Johnny", "Doe", "John Doe", "4", "100001", "DOE0001", "JA100001", "Male", "2015-05-15", "jane.doe@email.com", "Jane", "Doe", "+66 81 234 5679", "Mother", "2024-08-15"],
    ]

    downloadAsXlsx(headers, exampleRows, "student_import_template")

    toast.success(t("student.templateDownloaded"))
  }

  // gradeProgressionMap, getNextGrade are now imported from @/utils/grades

  // Get promotion preview data with individual students
  const getPromotionPreview = useMemo(() => {
    if (!promoteFromYear) return []

    const studentsToPromote = students.filter(
      (s: Student) => s.academicYear === promoteFromYear && s.status === "active"
    )

    // Group by current grade with student details
    const gradeGroups: Record<string, {
      students: Student[];
      nextGrade: string;
      isGraduation: boolean
    }> = {}

    studentsToPromote.forEach((student: Student) => {
      const nextGrade = getNextGrade(student.gradeLevel)
      const groupKey = student.gradeLevel.toLowerCase().replace(/[\s-]/g, "")

      if (!gradeGroups[groupKey]) {
        gradeGroups[groupKey] = {
          students: [],
          nextGrade: nextGrade === "graduated" ? "Graduated" : getGradeLabel(nextGrade || ""),
          isGraduation: nextGrade === "graduated"
        }
      }
      gradeGroups[groupKey].students.push(student)
    })

    // Convert to array and sort by grade order
    return Object.entries(gradeGroups)
      .map(([grade, data]) => ({
        currentGrade: getGradeLabel(grade),
        currentGradeId: grade,
        nextGrade: data.nextGrade,
        students: data.students.sort((a, b) => a.firstName.localeCompare(b.firstName)),
        count: data.students.length,
        isGraduation: data.isGraduation
      }))
      .sort((a, b) => {
        const gradeOrder = gradeLevels.map(g => g.id)
        return gradeOrder.indexOf(a.currentGradeId) - gradeOrder.indexOf(b.currentGradeId)
      })
  }, [students, promoteFromYear])

  // Total students to promote (selected ones in promote dialog)
  const totalStudentsToPromote = useMemo(() => {
    return promoteSelectedIds.size
  }, [students, promoteFromYear])

  // Get selected count per grade
  const getSelectedCountForGrade = (gradeId: string) => {
    const gradeData = getPromotionPreview.find(g => g.currentGradeId === gradeId)
    if (!gradeData) return 0
    return gradeData.students.filter(s => selectedStudentIds.has(s.id)).length
  }

  // Check if all students in a grade are selected
  const isGradeFullySelected = (gradeId: string) => {
    const gradeData = getPromotionPreview.find(g => g.currentGradeId === gradeId)
    if (!gradeData) return false
    return gradeData.students.every(s => selectedStudentIds.has(s.id))
  }

  // Check if some students in a grade are selected
  const isGradePartiallySelected = (gradeId: string) => {
    const gradeData = getPromotionPreview.find(g => g.currentGradeId === gradeId)
    if (!gradeData) return false
    const selectedCount = gradeData.students.filter(s => selectedStudentIds.has(s.id)).length
    return selectedCount > 0 && selectedCount < gradeData.students.length
  }

  // Toggle all students in a grade
  const toggleGradeSelection = (gradeId: string) => {
    const gradeData = getPromotionPreview.find(g => g.currentGradeId === gradeId)
    if (!gradeData) return

    setSelectedStudentIds(prev => {
      const newSet = new Set(prev)
      const isFullySelected = gradeData.students.every(s => newSet.has(s.id))

      if (isFullySelected) {
        // Deselect all
        gradeData.students.forEach(s => newSet.delete(s.id))
      } else {
        // Select all
        gradeData.students.forEach(s => newSet.add(s.id))
      }
      return newSet
    })
  }

  // Toggle individual student
  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(studentId)) {
        newSet.delete(studentId)
      } else {
        newSet.add(studentId)
      }
      return newSet
    })
  }

  // Toggle grade expansion
  const toggleGradeExpansion = (gradeId: string) => {
    setExpandedGrades(prev => {
      const newSet = new Set(prev)
      if (newSet.has(gradeId)) {
        newSet.delete(gradeId)
      } else {
        newSet.add(gradeId)
      }
      return newSet
    })
  }

  // Select all students
  const selectAllStudents = () => {
    const allIds = getPromotionPreview.flatMap(g => g.students.map(s => s.id))
    setSelectedStudentIds(new Set(allIds))
  }

  // Deselect all students
  const deselectAllStudents = () => {
    setSelectedStudentIds(new Set())
  }

  // Calculate current academic year based on today's date
  const getCurrentAcademicYear = () => {
    const now = new Date()
    const month = now.getMonth() + 1 // 1-12
    const year = now.getFullYear()

    // If month >= 5 (May), academic year = currentYear-nextYear
    // If month < 5 (Jan-Apr), academic year = previousYear-currentYear
    if (month >= 5) {
      return `${year} -${year + 1} `
    } else {
      return `${year - 1} -${year} `
    }
  }

  // Handle promote dialog open
  const getNextAcademicYear = (fromYear: string): string => {
    const [startYear] = fromYear.split(/[-/]/).map(Number)
    return `${startYear + 1}/${startYear + 2}`
  }

  const handleOpenPromoteDialog = () => {
    const currentAcademicYear = getCurrentAcademicYear()
    const defaultFromYear = availableYears.includes(currentAcademicYear)
      ? currentAcademicYear
      : availableYears[0] || ""

    if (defaultFromYear) {
      setPromoteFromYear(defaultFromYear)
      setPromoteToYear(getNextAcademicYear(defaultFromYear))
      const allIds = students
        .filter((s: Student) => s.academicYear === defaultFromYear && s.status === "active")
        .map((s: Student) => s.id)
      setPromoteSelectedIds(new Set(allIds))
    }
    setPromoteConfirmed(false)
    setExpandedGrades(new Set())
    setPromoteSearch("")
    setIsPromoteDialogOpen(true)
  }

  // Update from year in promote dialog
  const handleFromYearChange = (year: string) => {
    setPromoteFromYear(year)
    setPromoteToYear(getNextAcademicYear(year))
    const allIds = students
      .filter((s: Student) => s.academicYear === year && s.status === "active")
      .map((s: Student) => s.id)
    setPromoteSelectedIds(new Set(allIds))
  }

  // Handle confirm promotion
  const handleConfirmPromotion = () => {
    if (!promoteFromYear || !promoteToYear || !promoteConfirmed) {
      toast.error(t("student.confirmBeforeProceeding"))
      return
    }

    // Prevent double promotion
    if (isYearAlreadyPromoted(promoteToYear)) {
      toast.error(t("student.alreadyPromoted").replace("{year}", promoteToYear))
      return
    }

    const studentsToPromote = students.filter(
      (s: Student) => promoteSelectedIds.has(s.id)
    )

    if (studentsToPromote.length === 0) {
      toast.error(t("student.selectAtLeastOne"))
      return
    }

    let promotedCount = 0
    let graduatedCount = 0
    const now = new Date()

    studentsToPromote.forEach((student: Student) => {
      const nextGrade = getNextGrade(student.gradeLevel)
      const newId = `${student.id}-${promoteToYear.replace(/[^0-9]/g, "")}`

      if (nextGrade === "graduated") {
        // Year 13 → create new record as graduated
        addStudent({
          ...student,
          id: newId,
          gradeLevel: "Year 13",
          status: "graduated",
          academicYear: promoteToYear,
          enrollmentTerm: "term1",
          updatedBy: user?.name || "Admin",
          updatedAt: now,
          createdAt: now
        })
        graduatedCount++
      } else if (nextGrade) {
        // Promote to next grade → create new record, keep old record intact
        addStudent({
          ...student,
          id: newId,
          gradeLevel: nextGrade,
          academicYear: promoteToYear,
          enrollmentTerm: "term1",
          updatedBy: user?.name || "Admin",
          updatedAt: now,
          createdAt: now
        })
        promotedCount++
      }
    })

    // Lock this promotion year
    const promotedYears = getPromotedYears()
    localStorage.setItem(PROMOTED_YEARS_KEY, JSON.stringify([...promotedYears, promoteToYear]))

    setIsPromoteDialogOpen(false)
    setPromoteConfirmed(false)

    if (promotedCount > 0) {
      logActivity({
        action: `Promoted students`,
        module: "Student Management",
        detail: `Successfully promoted ${promotedCount} students to Year ${promoteToYear}`
      })
    }

    if (graduatedCount > 0) {
      logActivity({
        action: `Graduated students`,
        module: "Student Management",
        detail: `Successfully marked ${graduatedCount} students as graduated for Year ${promoteToYear}`
      })
    }

    if (graduatedCount > 0) {
      toast.success(t("student.promotedAndGraduated").replace("{promoted}", String(promotedCount)).replace("{graduated}", String(graduatedCount)))
    } else {
      toast.success(t("student.promotedStudents").replace("{promoted}", String(promotedCount)).replace("{year}", promoteToYear))
    }
  }

  const studentFormContent = (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="basic">{t("student.basicInfo")}</TabsTrigger>
        <TabsTrigger value="academic">{t("student.academic")}</TabsTrigger>
        <TabsTrigger value="parents">{t("student.parentsTab")}</TabsTrigger>
      </TabsList>

      <TabsContent value="basic" className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("student.studentId")}</Label>
            <Input
              value={formData.studentId}
              onChange={(e) => setFormData(prev => ({ ...prev, studentId: e.target.value }))}
              placeholder="KC2024001"
              disabled={!userCanEdit}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("student.gender")}</Label>
            <Select
              value={formData.gender}
              onValueChange={(value: "male" | "female" | "other") => setFormData(prev => ({ ...prev, gender: value }))}
              disabled={!userCanEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">{t("student.male")}</SelectItem>
                <SelectItem value="female">{t("student.female")}</SelectItem>
                <SelectItem value="other">{t("student.other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("student.firstName")} <span className="text-destructive">*</span></Label>
            <Input
              value={formData.firstName}
              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              placeholder={t("student.firstName")}
              disabled={!userCanEdit}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("student.lastName")} <span className="text-destructive">*</span></Label>
            <Input
              value={formData.lastName}
              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
              placeholder={t("student.lastName")}
              disabled={!userCanEdit}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("student.nickname")}</Label>
            <Input
              value={formData.nickname}
              onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
              placeholder={t("student.nickname")}
              disabled={!userCanEdit}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("student.dateOfBirth")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={!userCanEdit}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.dateOfBirth ? format(formData.dateOfBirth, "PPP") : t("student.pickADate")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                {(() => {
                  const currentYear = new Date().getFullYear()
                  const years = Array.from({ length: currentYear - 1950 + 1 }, (_, i) => currentYear - i)

                  if (showDobYearPicker) {
                    return (
                      <div className="p-4 w-80">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-sm">Select Year</h4>
                          {selectedDobYear && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowDobYearPicker(false)}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                          {years.map(year => (
                            <Button
                              key={year}
                              variant={selectedDobYear === year ? "default" : "outline"}
                              size="sm"
                              className="h-10"
                              onClick={() => {
                                setSelectedDobYear(year)
                                setShowDobYearPicker(false)
                              }}
                            >
                              {year}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div>
                      <div className="flex items-center justify-between p-2 border-b">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowDobYearPicker(true)}
                          className="text-sm font-medium"
                        >
                          {selectedDobYear || 'Select Year'} <ChevronDown className="ml-1 h-4 w-4" />
                        </Button>
                      </div>
                      <Calendar
                        mode="single"
                        selected={formData.dateOfBirth || undefined}
                        onSelect={(date) => setFormData(prev => ({ ...prev, dateOfBirth: date || null }))}
                        defaultMonth={selectedDobYear ? new Date(selectedDobYear, 0) : new Date()}
                        fromYear={1950}
                        toYear={currentYear}
                      />
                    </div>
                  )
                })()}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t("student.notes")}</Label>
          <Input
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder={t("student.notes")}
            disabled={!userCanEdit}
          />
        </div>
      </TabsContent>

      <TabsContent value="academic" className="space-y-6 mt-4">
        {/* Academic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("student.yearGroup")} <span className="text-destructive">*</span></Label>
            <Select
              value={formData.gradeLevel}
              onValueChange={(value) => setFormData(prev => ({ ...prev, gradeLevel: value }))}
              disabled={!userCanEdit}
            >
              <SelectTrigger onPointerDown={(e) => e.stopPropagation()}>
                <SelectValue placeholder={t("student.selectGrade")} />
              </SelectTrigger>
              <SelectContent onPointerDown={(e) => e.stopPropagation()}>
                {gradeLevels.map(grade => (
                  <SelectItem key={grade.id} value={grade.id}>
                    {grade.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("student.academicYear")} <span className="text-destructive">*</span></Label>
            <Select
              value={formData.academicYear}
              onValueChange={(year: string) => setFormData((prev: any) => ({ ...prev, academicYear: year }))}
              disabled={!userCanEdit}
            >
              <SelectTrigger onPointerDown={(e) => e.stopPropagation()}>
                <SelectValue placeholder={t("student.selectYear")} />
              </SelectTrigger>
              <SelectContent onPointerDown={(e) => e.stopPropagation()}>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("student.enrollmentTerm")} <span className="text-destructive">*</span></Label>
            <Select
              value={formData.enrollmentTerm}
              onValueChange={(value: "term1" | "term2" | "term3") => setFormData(prev => ({ ...prev, enrollmentTerm: value }))}
              disabled={!userCanEdit}
            >
              <SelectTrigger onPointerDown={(e) => e.stopPropagation()}>
                <SelectValue placeholder={t("student.selectTerm")} />
              </SelectTrigger>
              <SelectContent onPointerDown={(e) => e.stopPropagation()}>
                {getTermOptions(t).map(term => (
                  <SelectItem key={term.id} value={term.id}>
                    {term.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("student.status")}</Label>
            <Select
              value={formData.status}
              onValueChange={(value: "active" | "graduated" | "withdrawn" | "on_leave") => setFormData(prev => ({
                ...prev,
                status: value,
                // Clear withdrawal fields when switching away from "withdrawn"
                withdrawalAcademicYear: value === "withdrawn" ? prev.withdrawalAcademicYear : undefined,
                withdrawalTerm: value === "withdrawn" ? prev.withdrawalTerm : undefined,
              }))}
              disabled={!userCanEdit}
            >
              <SelectTrigger onPointerDown={(e) => e.stopPropagation()}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent onPointerDown={(e) => e.stopPropagation()}>
                {getStatusOptions(t).map(status => (
                  <SelectItem key={status.id} value={status.id}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Withdrawal Effective Term — shown only when status is "withdrawn" */}
        {formData.status === "withdrawn" && (
          <div className="border rounded-lg p-4 bg-red-50 border-red-200 space-y-3">
            <div>
              <p className="text-sm font-medium text-red-800">Withdrawal Effective From</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sibling discounts and fee waivers will be removed starting from this term.
                Invoices for earlier terms are not affected.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("student.academicYear")}</Label>
                <Select
                  value={formData.withdrawalAcademicYear || ""}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, withdrawalAcademicYear: value }))}
                  disabled={!userCanEdit}
                >
                  <SelectTrigger onPointerDown={(e) => e.stopPropagation()}>
                    <SelectValue placeholder={t("student.selectYear")} />
                  </SelectTrigger>
                  <SelectContent onPointerDown={(e) => e.stopPropagation()}>
                    {availableYears.map((year: string) => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("student.term")}</Label>
                <Select
                  value={formData.withdrawalTerm || ""}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, withdrawalTerm: value }))}
                  disabled={!userCanEdit}
                >
                  <SelectTrigger onPointerDown={(e) => e.stopPropagation()}>
                    <SelectValue placeholder={t("student.selectTerm")} />
                  </SelectTrigger>
                  <SelectContent onPointerDown={(e) => e.stopPropagation()}>
                    {getTermOptions(t).map(term => (
                      <SelectItem key={term.id} value={term.id}>{term.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("student.enrollmentDate")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={!userCanEdit}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.enrollmentDate ? format(formData.enrollmentDate, "PPP") : t("student.pickADate")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.enrollmentDate || undefined}
                  onSelect={(date) => setFormData(prev => ({ ...prev, enrollmentDate: date || null }))}
                  initialFocus
                  disabled={!userCanEdit}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>{t("student.familyCode")}</Label>
            <Input
              value={formData.familyCode || ""}
              onChange={(e) => {
                const inputCode = e.target.value
                setFormData(prev => ({ ...prev, familyCode: inputCode }))
              }}
              placeholder={t("student.familyCodePlaceholder")}
              disabled={!userCanEdit}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              {formData.familyCode && families.find((f: Family) => f.familyCode === formData.familyCode)
                ? `✓ Existing family: ${families.find((f: Family) => f.familyCode === formData.familyCode)?.familyName}`
                : formData.familyCode
                ? "⚠ New family will be created"
                : t("student.optionalFamilyCode")}
            </p>
          </div>
        </div>

      </TabsContent>

      <TabsContent value="parents" className="space-y-4 mt-4">
        {/* Existing Parents */}
        {formData.parents.length > 0 && (
          <div className="space-y-2">
            <Label>{t("student.currentParentsGuardians")}</Label>
            <div className="space-y-2">
              {formData.parents.map((parent: Parent) => (
                <div key={parent.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{parent.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {parent.relationship} · {parent.phone} · {parent.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {parent.isPrimary && <Badge variant="secondary">Primary</Badge>}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => handleRemoveParent(parent.id)}
                      disabled={!userCanEdit}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add New Parent */}
        <div className="border rounded-lg p-4 space-y-4">
          <Label className="text-base font-medium">Add Parent/Guardian</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("student.nameLabel")}</Label>
              <Input
                value={newParent.name}
                onChange={(e) => setNewParent(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t("student.parentName")}
                disabled={!userCanEdit}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("student.relationship")}</Label>
              <Select
                value={newParent.relationship}
                onValueChange={(value: "father" | "mother" | "guardian" | "other") => setNewParent(prev => ({ ...prev, relationship: value }))}
                disabled={!userCanEdit}
              >
                <SelectTrigger onPointerDown={(e) => e.stopPropagation()}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent onPointerDown={(e) => e.stopPropagation()}>
                  <SelectItem value="father">{t("student.father")}</SelectItem>
                  <SelectItem value="mother">{t("student.mother")}</SelectItem>
                  <SelectItem value="guardian">{t("student.guardian")}</SelectItem>
                  <SelectItem value="other">{t("student.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("student.phoneLabel")}</Label>
              <Input
                value={newParent.phone}
                onChange={(e) => setNewParent(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="081-234-5678"
                disabled={!userCanEdit}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("student.emailLabel")}</Label>
              <Input
                type="email"
                value={newParent.email}
                onChange={(e) => setNewParent(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@example.com"
                disabled={!userCanEdit}
              />
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleAddParent}
            disabled={!userCanEdit || !newParent.name || !newParent.phone}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Parent
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
        <div>
          <h2 className="text-xl font-semibold">{t("student.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("student.description")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            {t("common.export")}
          </Button>
          <Button variant="outline" onClick={handleImport} disabled={!userCanEdit} className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            {t("common.import")}
          </Button>
          <Button variant="outline" onClick={handleOpenPromoteDialog} disabled={!userCanEdit} className="flex items-center gap-2">
            <ArrowUpCircle className="w-4 h-4" />
            {t("student.promoteGrade")}
          </Button>
          <Button onClick={handleAddStudent} disabled={!userCanEdit} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {t("student.addStudent")}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("student.totalStudents")}</p>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("student.activeStudents")}</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <Home className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("student.families")}</p>
            </div>
            <p className="text-2xl font-bold">{stats.familyCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("common.lastUpdated")}</p>
            </div>
            <p className="text-2xl font-bold">{format(new Date(), "dd/MM/yyyy")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[250px]">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={t("student.searchPlaceholder")}
              />
            </div>
            <Select value={filterGrade} onValueChange={setFilterGrade}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder={t("student.yearGroup")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("invoice.allYearGroups")}</SelectItem>
                {gradeLevels.map(grade => (
                  <SelectItem key={grade.id} value={grade.label}>
                    {grade.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t("common.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("invoice.allStatus")}</SelectItem>
                {getStatusOptions(t).map(status => (
                  <SelectItem key={status.id} value={status.id}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterAcademicYear} onValueChange={setFilterAcademicYear}>
              <SelectTrigger className="w-[180px]">
                <CalendarIcon className="w-4 h-4 mr-2" />
                <SelectValue placeholder={t("common.academicYear")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.allAcademicYears")}</SelectItem>
                {availableYears.map((year: string) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterTerm} onValueChange={setFilterTerm}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t("student.term")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.allTerms")}</SelectItem>
                {getTermOptions(t).map(term => (
                  <SelectItem key={term.id} value={term.id}>
                    {term.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(searchTerm || filterGrade !== "all" || filterStatus !== "all" || filterAcademicYear !== "all" || filterTerm !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("")
                  setFilterGrade("all")
                  setFilterStatus("all")
                  setFilterAcademicYear("all")
                  setFilterTerm("all")
                }}
                className="text-muted-foreground"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {t("common.clearFilters")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Student Table */}
      <Card>
        <CardContent className="pt-6">
          {selectedStudentIds.size > 0 && (
            <div className="mb-4 flex items-center justify-end gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-sm font-medium text-red-800">
                {selectedStudentIds.size} item{selectedStudentIds.size > 1 ? 's' : ''} selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  deleteConfirmDialog.confirm(() => {
                    selectedStudentIds.forEach(id => deleteStudent(id))
                    toast.success(`Deleted ${selectedStudentIds.size} student${selectedStudentIds.size > 1 ? 's' : ''} successfully`)
                    setSelectedStudentIds(new Set())
                  })
                }}
                disabled={!userCanEdit}
                style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete Selected
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedStudentIds(new Set())}
              >
                Cancel
              </Button>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                {/* Checkbox - Center */}
                <TableHead className="w-12" align="center">
                  <Checkbox
                    checked={paginatedStudents.length > 0 && paginatedStudents.every((s: Student) => selectedStudentIds.has(s.id))}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedStudentIds(new Set(paginatedStudents.map((s: Student) => s.id)))
                      } else {
                        setSelectedStudentIds(new Set())
                      }
                    }}
                    disabled={!userCanEdit}
                  />
                </TableHead>
                {/* Student ID - Left */}
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("studentId")} align="left">
                  <div className="flex items-center gap-1">
                    {t("student.studentId")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Name - Left */}
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("name")} align="left">
                  <div className="flex items-center gap-1">
                    {t("common.name")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Year Group - Left */}
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("gradeLevel")} align="left">
                  <div className="flex items-center gap-1">
                    {t("invoice.yearGroup")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Academic Year - Left */}
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("academicYear")} align="left">
                  <div className="flex items-center gap-1">
                    {t("common.academicYear")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Term - Center (Badge) */}
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("enrollmentTerm")} align="center">
                  <div className="flex items-center justify-center gap-1">
                    {t("student.term")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Family Code - Center (Badge) */}
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("familyCode")} align="center">
                  <div className="flex items-center gap-1">
                    {t("student.familyCode")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Discounts/Benefits - Left */}
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("childOrder")} align="left">
                  <div className="flex items-center gap-1">
                    {t("student.discountsBenefits")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Status - Center (Badge) */}
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("status")} align="center">
                  <div className="flex items-center gap-1">
                    {t("common.status")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Updated - Left (Date) */}
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("updatedAt")} align="left">
                  <div className="flex items-center gap-1">
                    {t("student.updated")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Actions - Center */}
                <TableHead className="text-center" align="center">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="p-0">
                    {searchTerm || filterGrade !== "all" || filterStatus !== "all" ? (
                      <EmptySearchResults
                        onClear={() => {
                          setSearchTerm("")
                          setFilterGrade("all")
                          setFilterStatus("all")
                          setCurrentPage(1)
                        }}
                      />
                    ) : (
                      <EmptyDataState type="students" onCreate={handleAddStudent} />
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedStudents.map((student: Student) => (
                  <TableRow key={student.id}>
                    {/* Checkbox - Center */}
                    <TableCell align="center">
                      <Checkbox
                        checked={selectedStudentIds.has(student.id)}
                        onCheckedChange={(checked) => {
                          const newSet = new Set(selectedStudentIds)
                          if (checked) {
                            newSet.add(student.id)
                          } else {
                            newSet.delete(student.id)
                          }
                          setSelectedStudentIds(newSet)
                        }}
                        disabled={!userCanEdit}
                      />
                    </TableCell>
                    {/* Student ID - Left */}
                    <TableCell className="font-medium" align="left">{student.studentId}</TableCell>
                    {/* Name - Left */}
                    <TableCell align="left">
                      <div>
                        <p className="font-medium">{student.firstName} {student.lastName}</p>
                        {student.nickname && (
                          <p className="text-sm text-muted-foreground">({student.nickname})</p>
                        )}
                      </div>
                    </TableCell>
                    {/* Year Group - Left */}
                    <TableCell align="left">{getGradeLabel(student.gradeLevel)}</TableCell>
                    {/* Academic Year - Left */}
                    <TableCell align="left">{formatAcademicYear(student.academicYear)}</TableCell>
                    {/* Term - Center (Badge) */}
                    <TableCell align="center">
                      {(() => {
                        const termToNum = (t: string) => t === "term1" ? 1 : t === "term2" ? 2 : 3
                        const start = termToNum(student.enrollmentTerm || "term1")
                        const end = student.withdrawalTerm ? termToNum(student.withdrawalTerm) : 3
                        const termNums = []
                        for (let i = start; i <= end; i++) termNums.push(i)
                        return (
                          <div className="flex gap-1 justify-center flex-wrap">
                            {termNums.map(n => (
                              <Badge key={n} variant="outline">Term {n}</Badge>
                            ))}
                          </div>
                        )
                      })()}
                    </TableCell>
                    {/* Family Code - Center (Badge) */}
                    <TableCell align="center">
                      <Badge variant="outline" className="font-mono">
                        {getFamilyCode(student.familyId, student.familyCode)}
                      </Badge>
                    </TableCell>
                    {/* Discounts/Benefits - Left */}
                    <TableCell align="left">
                      {(() => {
                        const discounts: any[] = []
                        const groupDiscounts = getStudentGroupDiscounts(student.studentId)
                        // Check for special discounts from localStorage records (fallback to notes)
                        const isStaff = isStaffChildStudent(student.studentId) || student.notes?.toLowerCase().includes('staff')
                        const hasScholarship = hasScholarshipDiscount(student.studentId) || student.notes?.toLowerCase().includes('scholarship')
                        const hasEarlyBird = hasEarlyBirdDiscount(student.studentId) || student.notes?.toLowerCase().includes('early bird')

                        // Staff Child
                        if (isStaff) {
                          discounts.push(
                            <Badge key="staff" className="bg-blue-100 text-blue-800 text-xs">
                              {t("student.staff")} 50%
                            </Badge>
                          )
                        }

                        // Scholarship
                        if (hasScholarship) {
                          discounts.push(
                            <Badge key="scholarship" className="bg-purple-100 text-purple-800 text-xs">
                              {t("student.scholarship")}
                            </Badge>
                          )
                        }

                        // Early Bird
                        if (hasEarlyBird) {
                          discounts.push(
                            <Badge key="earlybird" className="bg-amber-100 text-amber-800 text-xs">
                              {t("student.earlyBird")} 5%
                            </Badge>
                          )
                        }

                        // Student Group Discounts
                        groupDiscounts.forEach((group: any, idx: number) => {
                          const discountLabel = group.discountType === "fixed"
                            ? `฿${(group.fixedAmount || 0).toLocaleString()}`
                            : `${group.discountPercentage}%`
                          const categoryLabel = group.category === "tuition" ? "" : ` (${group.category?.toUpperCase()})`
                          discounts.push(
                            <Badge key={`group-${idx}`} className="bg-teal-100 text-teal-800 text-xs">
                              {group.name} {discountLabel}{categoryLabel}
                            </Badge>
                          )
                        })

                        if (discounts.length === 0) {
                          return <span className="text-muted-foreground">-</span>
                        }

                        return (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {discounts}
                          </div>
                        )
                      })()}
                    </TableCell>
                    {/* Status - Center (Badge) */}
                    <TableCell align="center">{getStatusBadge(student.status)}</TableCell>
                    {/* Updated - Left (Date) */}
                    <TableCell align="left">
                      <div className="text-sm">
                        <p>{student.updatedAt ? format(student.updatedAt, "dd/MM/yyyy") : "-"}</p>
                        <p className="text-xs text-muted-foreground">{student.updatedBy || "-"}</p>
                      </div>
                    </TableCell>
                    {/* Actions - Center */}
                    <TableCell align="center">
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleViewStudent(student)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEditStudent(student)} disabled={!userCanEdit}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteStudent(student)} disabled={!userCanEdit}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          <PaginationBar
            currentPage={currentPage}
            pageSize={pageSize}
            totalCount={sortedStudents.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
          />
        </CardContent>
      </Card>

      {/* Add Student Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} modal={true}>
        <DialogContent className="max-w-2xl p-6">
          <DialogHeader>
            <DialogTitle>{t("student.addNewStudent")}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
            {studentFormContent}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSaveNewStudent} disabled={!userCanEdit || !formData.firstName || !formData.lastName || !formData.gradeLevel}>
              {t("student.addStudent")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} modal={true}>
        <DialogContent className="max-w-2xl p-6">
          <DialogHeader>
            <DialogTitle>{t("student.editStudent")}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
            {studentFormContent}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSaveEditStudent} disabled={!userCanEdit}>
              {t("common.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Student Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl p-6">
          <DialogHeader>
            <DialogTitle>{t("student.studentDetails")}</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">
                    {selectedStudent.firstName} {selectedStudent.lastName}
                  </h3>
                  {selectedStudent.nickname && (
                    <p className="text-muted-foreground">({selectedStudent.nickname})</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">{selectedStudent.studentId}</Badge>
                    {getStatusBadge(selectedStudent.status)}
                  </div>
                </div>
              </div>

              {/* Academic Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">{t("student.yearGroup")}</p>
                  <p className="font-medium">{getGradeLabel(selectedStudent.gradeLevel)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("common.academicYear")}</p>
                  <p className="font-medium">{formatAcademicYear(selectedStudent.academicYear)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("student.enrollmentTerm")}</p>
                  <p className="font-medium">{getTermLabel(selectedStudent.enrollmentTerm)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("student.familyCode")}</p>
                  <p className="font-medium">{getFamilyCode(selectedStudent.familyId, selectedStudent.familyCode)} ({t("student.child")} #{selectedStudent.childOrder})</p>
                </div>
              </div>

              {/* Discounts & Benefits */}
              <div className="border rounded-lg p-4 bg-green-50/50">
                <h4 className="font-medium mb-3 flex items-center gap-2 text-green-800">
                  <Percent className="w-4 h-4" />
                  {t("student.discountsBenefits")}
                </h4>
                <div className="space-y-2">
                  {/* Student Group Discounts */}
                  {getStudentGroupDiscounts(selectedStudent.studentId).map((group, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{group.name}</span>
                      <Badge className="bg-cyan-100 text-cyan-800 hover:bg-cyan-100">
                        {group.discountType === "percentage" ? `${group.discountPercentage}% ` : `฿${group.fixedAmount.toLocaleString()} `}
                      </Badge>
                    </div>
                  ))}

                  {/* Staff Child Discount */}
                  {(isStaffChildStudent(selectedStudent.studentId) || selectedStudent.notes?.toLowerCase().includes('staff')) && (
                    <div className="flex justify-between text-sm">
                      <span>{t("student.staffChild")}</span>
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">50%</Badge>
                    </div>
                  )}

                  {/* Scholarship */}
                  {(hasScholarshipDiscount(selectedStudent.studentId) || selectedStudent.notes?.toLowerCase().includes('scholarship')) && (
                    <div className="flex justify-between text-sm">
                      <span>{t("student.scholarship")}</span>
                      <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">{t("student.yes")}</Badge>
                    </div>
                  )}

                  {/* Early Bird */}
                  {(hasEarlyBirdDiscount(selectedStudent.studentId) || selectedStudent.notes?.toLowerCase().includes('early bird')) && (
                    <div className="flex justify-between text-sm">
                      <span>{t("student.earlyBird")}</span>
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">5%</Badge>
                    </div>
                  )}

                  {/* No discounts message */}
                  {getStudentGroupDiscounts(selectedStudent.studentId).length === 0 &&
                    !(isStaffChildStudent(selectedStudent.studentId) || selectedStudent.notes?.toLowerCase().includes('staff')) &&
                    !(hasScholarshipDiscount(selectedStudent.studentId) || selectedStudent.notes?.toLowerCase().includes('scholarship')) &&
                    !(hasEarlyBirdDiscount(selectedStudent.studentId) || selectedStudent.notes?.toLowerCase().includes('early bird')) && (
                      <span className="text-sm text-muted-foreground">{t("student.noDiscountsApplied")}</span>
                    )}
                </div>
              </div>

              {/* Parents */}
              {selectedStudent.parents.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">{t("student.parentsGuardians")}</h4>
                  <div className="space-y-2">
                    {selectedStudent.parents.map((parent: Parent) => (
                      <div key={parent.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{parent.name}</p>
                          <p className="text-sm text-muted-foreground capitalize">{t(`student.${parent.relationship}`)}</p>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4" /> {parent.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="w-4 h-4" /> {parent.email}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedStudent.notes && (
                <div>
                  <h4 className="font-medium mb-2">{t("common.notes")}</h4>
                  <p className="text-muted-foreground">{selectedStudent.notes}</p>
                </div>
              )}

              {/* Audit Info */}
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-3 text-sm text-muted-foreground">{t("student.recordInformation")}</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t("student.createdBy")}</p>
                    <p className="font-medium">{selectedStudent.createdBy || "System"}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedStudent.createdAt ? format(selectedStudent.createdAt, "PPP 'at' p") : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("student.lastUpdatedBy")}</p>
                    <p className="font-medium">{selectedStudent.updatedBy || "System"}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedStudent.updatedAt ? format(selectedStudent.updatedAt, "PPP 'at' p") : "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              {t("common.close")}
            </Button>
            <Button onClick={() => {
              setIsViewDialogOpen(false)
              if (selectedStudent) handleEditStudent(selectedStudent)
            }} disabled={!userCanEdit}>
              <Edit className="w-4 h-4 mr-2" />
              {t("common.edit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmDialog.isOpen} onOpenChange={deleteConfirmDialog.setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("student.deleteStudentTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedStudent
                ? t("student.deleteStudentConfirm").replace("{name}", `${selectedStudent.firstName} ${selectedStudent.lastName}`)
                : t("student.deleteStudentGeneric")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteConfirmDialog.handleConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
              style={{
                display: 'inline-flex',
                visibility: 'visible',
                opacity: 1,
                backgroundColor: '#dc2626',
                color: 'white',
                padding: '0.5rem 1rem'
              }}
            >
              {t("student.deleteAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-4xl w-[90vw] flex flex-col max-h-[90vh] p-0">
          <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle>{t("student.importStudentsTitle")}</DialogTitle>
            <DialogDescription>
              {t("student.importStudentsDesc")}
            </DialogDescription>
          </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Template Download */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div>
                <p className="font-medium">{t("student.excelTemplate")}</p>
                <p className="text-sm text-muted-foreground">{t("student.excelTemplateDesc")}</p>
              </div>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                {t("student.downloadTemplate")}
              </Button>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="csvFile">{t("student.uploadFile")} <span className="text-destructive">*</span></Label>
              <Input
                id="csvFile"
                type="file"
                accept={XLSX_ACCEPT}
                onChange={handleFileUpload}
                className="cursor-pointer"
                disabled={!userCanEdit}
              />
            </div>

            {/* Error Display */}
            {importError && (
              <div className="p-3 border border-red-200 bg-red-50 rounded-lg text-red-700 text-sm">
                {importError}
              </div>
            )}

            {/* Warning: Missing Parent 1 Email */}
            {importPreview.length > 0 && (() => {
              const missingEmail = importPreview.filter(row => !row["Parent 1 Email"])
              if (missingEmail.length === 0) return null
              return (
                <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                  <p className="font-semibold mb-1">
                    ⚠️ {missingEmail.length} student{missingEmail.length > 1 ? "s" : ""} missing Parent 1 Email — invoice emails will not be sent to these students.
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-yellow-700">
                    {missingEmail.map((row, i) => {
                      const name = row["Name"] || `${row["First Name"] || ""} ${row["Last Name"] || ""}`.trim() || "—"
                      const id = row["Student ID"] || "—"
                      return <li key={i}>{id} — {name}</li>
                    })}
                  </ul>
                </div>
              )
            })()}

            {/* Preview Table */}
            {importPreview.length > 0 && (
              <div className="space-y-2">
                <Label>{t("student.preview").replace("{count}", String(importPreview.length))}</Label>
                <div className="border rounded-lg overflow-x-auto">
                  <Table className="min-w-[640px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead align="left" className="w-28">{t("table.studentId")}</TableHead>
                        <TableHead align="left">{t("table.name")}</TableHead>
                        <TableHead align="left" className="w-24">{t("table.yearGroup")}</TableHead>
                        <TableHead align="left" className="w-28">{t("table.year")}</TableHead>
                        <TableHead align="left" className="w-32">{t("student.familyCodeHeader")}</TableHead>
                        <TableHead align="center" className="w-20">{t("table.status")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(showAllPreview ? importPreview : importPreview.slice(0, 10)).map((row, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm whitespace-nowrap" align="left">{row["Student ID"]}</TableCell>
                          <TableCell align="left" className="max-w-xs">
                            <span className="block truncate" title={row["Name"] || `${row["First Name"] || ""} ${row["Last Name"] || ""}`.trim()}>
                              {row["Name"] || `${row["First Name"] || ""} ${row["Last Name"] || ""}`.trim()}
                            </span>
                          </TableCell>
                          <TableCell align="left" className="whitespace-nowrap">{row["Year Group"]}</TableCell>
                          <TableCell align="left" className="whitespace-nowrap">{row["Academic Year"] || row["Year"]}</TableCell>
                          <TableCell align="left" className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {row["Family Code"] || <span className="text-orange-400 text-xs">— no family</span>}
                          </TableCell>
                          <TableCell align="center">
                            <Badge variant="outline">{row["Status"] || "active"}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {importPreview.length > 10 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground"
                    onClick={() => setShowAllPreview(!showAllPreview)}
                  >
                    {showAllPreview
                      ? "▲ แสดงน้อยลง"
                      : `▼ ดูเพิ่มเติม ${importPreview.length - 10} รายการ`}
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="p-6 pt-4 border-t flex justify-end gap-2 shrink-0">
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={!userCanEdit || importPreview.length === 0 || !!importError}
            >
              <Upload className="w-4 h-4 mr-2" />
              {importPreview.length > 0 ? t("student.importCount").replace("{count}", String(importPreview.length)) : t("common.import")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Promote Grade Dialog */}
      <Dialog open={isPromoteDialogOpen} onOpenChange={setIsPromoteDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5" />
              {t("student.promoteStudentsTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("student.promoteStudentsDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {/* Year Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("student.fromAcademicYear")}</Label>
                <Select value={promoteFromYear} onValueChange={handleFromYearChange} disabled={!userCanEdit}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("student.selectYear")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year: string) => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("student.toAcademicYearLabel")}</Label>
                <div className="flex h-10 items-center rounded-md border bg-muted/50 px-3 text-sm font-medium">
                  {promoteToYear || "-"}
                </div>
              </div>
            </div>

            {/* Preview */}
            {getPromotionPreview.length > 0 ? (
              <div className="space-y-3">
                <Label className="text-base">{t("student.promotePreview").replace("{count}", String(totalStudentsToPromote))}</Label>
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    className="pl-9 h-9"
                    placeholder={t("common.search") + "..."}
                    value={promoteSearch}
                    onChange={e => setPromoteSearch(e.target.value)}
                  />
                </div>
                <div className="border rounded-lg overflow-hidden">
                  {getPromotionPreview.map((row, index) => {
                    const filteredStudents = promoteSearch
                      ? row.students.filter(s =>
                          `${s.firstName} ${s.lastName} ${s.nickname} ${s.studentId}`
                            .toLowerCase().includes(promoteSearch.toLowerCase())
                        )
                      : row.students
                    if (promoteSearch && filteredStudents.length === 0) return null
                    return (
                    <div key={index} className={cn("border-b last:border-b-0", row.isGraduation && "bg-amber-50/50")}>
                      {/* Grade header row - clickable to expand */}
                      <div
                        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/40"
                        onClick={() => {
                          setExpandedGrades(prev => {
                            const next = new Set(prev)
                            next.has(row.currentGradeId) ? next.delete(row.currentGradeId) : next.add(row.currentGradeId)
                            return next
                          })
                        }}
                      >
                        {expandedGrades.has(row.currentGradeId)
                          ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        }
                        <div className="flex-1 flex items-center gap-2">
                          <span className="font-medium">{row.currentGrade}</span>
                          <span className="text-muted-foreground">→</span>
                          {row.isGraduation ? (
                            <span className="flex items-center gap-1 font-medium text-amber-700">
                              <GraduationCap className="w-4 h-4" />
                              {t("student.graduated")}
                            </span>
                          ) : (
                            <span className="font-medium text-green-700">{row.nextGrade}</span>
                          )}
                        </div>
                        <Badge variant={row.isGraduation ? "outline" : "secondary"} className="text-xs">
                          {t("student.countPeople").replace("{count}", String(row.count))}
                        </Badge>
                      </div>
                      {/* Expanded student list */}
                      {(expandedGrades.has(row.currentGradeId) || promoteSearch) && filteredStudents.length > 0 && (
                        <div className="pl-9 pr-3 pb-2 space-y-1">
                          {filteredStudents.map(student => (
                            <div key={student.id} className="flex items-center gap-3 py-1 px-2 rounded hover:bg-muted/40 text-sm cursor-pointer"
                              onClick={() => setPromoteSelectedIds(prev => {
                                const next = new Set(prev)
                                next.has(student.id) ? next.delete(student.id) : next.add(student.id)
                                return next
                              })}
                            >
                              <Checkbox
                                checked={promoteSelectedIds.has(student.id)}
                                onCheckedChange={() => setPromoteSelectedIds(prev => {
                                  const next = new Set(prev)
                                  next.has(student.id) ? next.delete(student.id) : next.add(student.id)
                                  return next
                                })}
                                onClick={e => e.stopPropagation()}
                              />
                              <span className="flex-1">{student.firstName} {student.lastName}{student.nickname ? ` (${student.nickname})` : ""}</span>
                              <Badge variant="outline" className="text-xs font-mono">{student.studentId}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    )
                  })}
                </div>

                {getPromotionPreview.some(p => p.isGraduation) && (
                  <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700">{t("student.year13NewRecord")}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{t("student.noActiveInYear").replace("{year}", promoteFromYear)}</p>
              </div>
            )}

            {/* Confirmation Checkbox */}
            {totalStudentsToPromote > 0 && (
              <div className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30">
                <Checkbox
                  id="confirm-promote"
                  checked={promoteConfirmed}
                  onCheckedChange={(checked) => setPromoteConfirmed(checked === true)}
                  disabled={!userCanEdit}
                />
                <div className="space-y-1">
                  <label htmlFor="confirm-promote" className="text-sm font-medium cursor-pointer">
                    {t("student.promoteConfirmTitle")}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {t("student.promoteConfirmDesc").replace("{count}", String(totalStudentsToPromote)).replace("{year}", promoteToYear)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
            {promoteToYear && isYearAlreadyPromoted(promoteToYear) && (
              <p className="text-sm text-destructive font-medium mr-auto">
                {t("student.alreadyPromoted").replace("{year}", promoteToYear)}
              </p>
            )}
            <Button variant="outline" onClick={() => setIsPromoteDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleConfirmPromotion}
              disabled={!userCanEdit || totalStudentsToPromote === 0 || !promoteConfirmed || !promoteToYear || isYearAlreadyPromoted(promoteToYear)}
              className="gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {t("student.promoteCount").replace("{count}", String(totalStudentsToPromote))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Student Confirmation Dialog */}
      <ConfirmDialog
        open={addConfirmDialog.isOpen}
        onOpenChange={addConfirmDialog.setIsOpen}
        onConfirm={addConfirmDialog.handleConfirm}
        titleKey="confirmDialog.createTitle"
        descriptionKey="confirmDialog.createDescription"
        confirmTextKey="common.create"
      />

      {/* Edit Student Confirmation Dialog */}
      <ConfirmDialog
        open={editConfirmDialog.isOpen}
        onOpenChange={editConfirmDialog.setIsOpen}
        onConfirm={editConfirmDialog.handleConfirm}
        titleKey="confirmDialog.editTitle"
        descriptionKey="confirmDialog.editDescription"
        confirmTextKey="common.save"
      />

      {/* Import Students Confirmation Dialog */}
      <ConfirmDialog
        open={importConfirmDialog.isOpen}
        onOpenChange={importConfirmDialog.setIsOpen}
        onConfirm={importConfirmDialog.handleConfirm}
        titleKey="confirmDialog.importTitle"
        descriptionKey="confirmDialog.importDescription"
        confirmTextKey="common.import"
      />
    </div>
  )
}
