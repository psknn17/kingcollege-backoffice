import { useState, useMemo, useEffect } from "react"
import { usePersistedState } from "@/hooks/usePersistedState"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "./ui/dialog"
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
  RotateCcw
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "@/components/ui/sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConfirmDialog } from "@/hooks/useConfirmDialog"
import { useStudents, Student, Parent, Family, convertTermFormat } from "@/contexts/StudentContext"
import { useAcademicYears } from "@/contexts/AcademicYearContext"
import { useDiscountOptions } from "@/contexts/DiscountOptionsContext"
import { cn } from "./ui/utils"

const gradeLevels = [
  { id: "pre-nursery", label: "Pre-Nursery" },
  { id: "nursery", label: "Nursery" },
  { id: "reception", label: "Reception" },
  { id: "year1", label: "Year 1" },
  { id: "year2", label: "Year 2" },
  { id: "year3", label: "Year 3" },
  { id: "year4", label: "Year 4" },
  { id: "year5", label: "Year 5" },
  { id: "year6", label: "Year 6" },
  { id: "year7", label: "Year 7" },
  { id: "year8", label: "Year 8" },
  { id: "year9", label: "Year 9" },
  { id: "year10", label: "Year 10" },
  { id: "year11", label: "Year 11" },
  { id: "year12", label: "Year 12" },
  { id: "year13", label: "Year 13" },
]

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
const getStudentGroupDiscounts = (studentId: string): { name: string; discountType: string; discountPercentage: number; fixedAmount: number; departments: string[] }[] => {
  const allGroups: { name: string; discountType: string; discountPercentage: number; fixedAmount: number; departments: string[] }[] = []

  // Load from both tuition and bus categories
  const categories = ['tuition', 'bus']

  categories.forEach(category => {
    try {
      const storageKey = `studentGroups_${category}`
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
            departments: group.departments || []
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
  const { students, families, addStudent, updateStudent, deleteStudent, getSiblingDiscount, checkFeePrivilegeEligibility } = useStudents()
  const { academicYears } = useAcademicYears()
  const { getSiblingDiscountPercentage } = useDiscountOptions()
  const { user } = useAuth()
  const userCanEdit = canPerformActions(user?.role)

  // Confirmation dialog hooks
  const addConfirmDialog = useConfirmDialog()
  const editConfirmDialog = useConfirmDialog()
  const importConfirmDialog = useConfirmDialog()

  const [searchTerm, setSearchTerm] = usePersistedState("student-list:search", "")
  const [filterGrade, setFilterGrade] = usePersistedState("student-list:gradeFilter", "all")
  const [filterStatus, setFilterStatus] = usePersistedState("student-list:statusFilter", "all")
  const [filterAcademicYear, setFilterAcademicYear] = usePersistedState("student-list:academicYearFilter", "all")

  // Sorting states
  const [sortColumn, setSortColumn] = usePersistedState("student-list:sortColumn", "")
  const [sortDirection, setSortDirection] = usePersistedState<"asc" | "desc">("student-list:sortDirection", "asc")

  // Pagination states
  const [currentPage, setCurrentPage] = usePersistedState("student-list:currentPage", 1)
  const [pageSize, setPageSize] = usePersistedState("student-list:pageSize", 10)

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [formData, setFormData] = useState<Omit<Student, "id">>(emptyStudent)
  const [newParent, setNewParent] = useState<Omit<Parent, "id">>(emptyParent)
  const [activeTab, setActiveTab] = useState("basic")
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [importData, setImportData] = useState<string>("")
  const [importPreview, setImportPreview] = useState<any[]>([])
  const [importError, setImportError] = useState<string>("")

  // Promote Grade states
  const [isPromoteDialogOpen, setIsPromoteDialogOpen] = useState(false)
  const [promoteFromYear, setPromoteFromYear] = useState<string>("")
  const [promoteToYear, setPromoteToYear] = useState<string>("")
  const [promoteConfirmed, setPromoteConfirmed] = useState(false)
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())
  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set())

  const availableYears = academicYears.map((y: any) => y.id).sort((a: string, b: string) => b.localeCompare(a))

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
      // Year and Term filters disabled - students should appear in all years and terms
      // const matchesYear = filterYear === "all" || student.academicYear === filterYear
      // const matchesTerm = filterTerm === "all" || student.enrollmentTerm === filterTerm
      const matchesStatus = filterStatus === "all" || student.status === filterStatus
      const matchesAcademicYear = filterAcademicYear === "all" || student.academicYear === filterAcademicYear

      return matchesSearch && matchesGrade && matchesStatus && matchesAcademicYear
    })
  }, [students, searchTerm, filterGrade, filterStatus, filterAcademicYear])

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

  // Reset to page 1 when filters change
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setCurrentPage(1)
  }

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

  const getGradeLabel = (gradeId: string) => {
    return gradeLevels.find(g => g.id === gradeId)?.label || gradeId
  }

  const getTermLabel = (termId: string) => {
    return getTermOptions(t).find(term => term.id === termId)?.label || termId
  }

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

  const generateStudentId = () => {
    const year = new Date().getFullYear()
    const count = students.length + 1
    return `KC${year}${count.toString().padStart(3, "0")}`
  }

  const handleAddStudent = () => {
    setFormData({
      ...emptyStudent,
      studentId: generateStudentId(),
      academicYear: availableYears[0] || ""
    })
    setActiveTab("basic")
    setIsAddDialogOpen(true)
  }

  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student)
    const { id, ...studentData } = student
    setFormData(studentData)
    setActiveTab("basic")
    setIsEditDialogOpen(true)
  }

  const handleViewStudent = (student: Student) => {
    setSelectedStudent(student)
    setIsViewDialogOpen(true)
  }

  const handleDeleteStudent = (student: Student) => {
    setSelectedStudent(student)
    setIsDeleteDialogOpen(true)
  }

  const performSaveNewStudent = () => {
    const now = new Date()
    const currentUser = "Admin" // TODO: Replace with actual logged-in user
    const newStudent: Student = {
      id: `STU${Date.now()}`,
      ...formData,
      createdBy: currentUser,
      createdAt: now,
      updatedBy: currentUser,
      updatedAt: now
    }
    addStudent(newStudent)
    toast.success("Student added successfully")
    setIsAddDialogOpen(false)
    setFormData(emptyStudent)
  }

  const handleSaveNewStudent = () => {
    addConfirmDialog.confirm(() => {
      performSaveNewStudent()
    })
  }

  const performSaveEditStudent = () => {
    if (selectedStudent) {
      const currentUser = "Admin" // TODO: Replace with actual logged-in user
      updateStudent(selectedStudent.id, {
        ...formData,
        updatedBy: currentUser,
        updatedAt: new Date()
      })
      toast.success("Student updated successfully")
      setIsEditDialogOpen(false)
      setSelectedStudent(null)
    }
  }

  const handleSaveEditStudent = () => {
    editConfirmDialog.confirm(() => {
      performSaveEditStudent()
    })
  }

  const handleConfirmDelete = () => {
    if (selectedStudent) {
      deleteStudent(selectedStudent.id)
      toast.success("Student deleted successfully")
      setIsDeleteDialogOpen(false)
      setSelectedStudent(null)
    }
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
        student.dateOfBirth ? format(student.dateOfBirth, "yyyy-MM-dd") : "",
        student.gender,
        student.gradeLevel,
        student.academicYear,
        student.status,
        family?.familyName || "",
        student.childOrder,
        student.enrollmentDate ? format(student.enrollmentDate, "yyyy-MM-dd") : "",
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
        student.createdAt ? format(student.createdAt, "yyyy-MM-dd HH:mm") : "",
        student.updatedBy,
        student.updatedAt ? format(student.updatedAt, "yyyy-MM-dd HH:mm") : ""
      ]
    })

    const csvContent = [
      headers.join(","),
      ...rows.map((row: any[]) => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n")

    // Create and download file
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `students_export_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success(`Exported ${filteredStudents.length} students to CSV`)
  }

  const handleImport = () => {
    setImportData("")
    setImportPreview([])
    setImportError("")
    setIsImportDialogOpen(true)
  }

  const parseCSV = (csvText: string) => {
    const lines = csvText.split("\n").filter(line => line.trim())
    if (lines.length < 2) {
      setImportError("CSV file must have headers and at least one data row")
      return
    }

    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""))
    const requiredHeaders = ["Student ID", "First Name", "Last Name", "Year Group", "Academic Year"]
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))

    if (missingHeaders.length > 0) {
      setImportError(`Missing required columns: ${missingHeaders.join(", ")}`)
      return
    }

    const parsed = lines.slice(1).map((line, index) => {
      const values = line.match(/("([^"]*(?:""[^"]*)*)"|[^,]*)/g) || []
      const cleanValues = values.map(v => v.trim().replace(/^"|"$/g, "").replace(/""/g, '"'))

      const row: any = {}
      headers.forEach((header, i) => {
        row[header] = cleanValues[i] || ""
      })
      row._rowIndex = index + 2
      return row
    })

    setImportPreview(parsed)
    setImportError("")
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith(".csv")) {
      setImportError("Please upload a CSV file")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setImportData(text)
      parseCSV(text)
    }
    reader.readAsText(file)
  }

  const performConfirmImport = () => {
    if (importPreview.length === 0) {
      toast.error("No data to import")
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

      const newStudent: Student = {
        id: `STU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        studentId: row["Student ID"],
        firstName: row["First Name"],
        lastName: row["Last Name"],
        nickname: row["Nickname"] || "",
        dateOfBirth: row["Date of Birth"] ? new Date(row["Date of Birth"]) : null,
        gender: (row["Gender"]?.toLowerCase() || "other") as "male" | "female" | "other",
        gradeLevel: row["Year Group"]?.toLowerCase().replace(" ", "") || "",
        academicYear: row["Academic Year"] || availableYears[0] || "",
        status: (row["Status"]?.toLowerCase() || "active") as "active" | "graduated" | "withdrawn" | "on_leave",
        familyId: "",
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

      // Add parents if provided
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
      "Notes"
    ]

    const exampleRow = [
      "KC2024007",
      "John",
      "Doe",
      "Johnny",
      "2015-05-15",
      "male",
      "Year 4",
      "2025-2026",
      "active",
      "1",
      "2024-08-15",
      "James Doe",
      "father",
      "081-234-5678",
      "james.doe@email.com",
      "Jane Doe",
      "mother",
      "081-234-5679",
      "jane.doe@email.com",
      "Sample notes"
    ]

    const csvContent = [
      headers.join(","),
      exampleRow.map(cell => `"${cell}"`).join(",")
    ].join("\n")

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", "student_import_template.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success("Template downloaded")
  }

  // Grade progression map
  const gradeProgressionMap: Record<string, string> = {
    "nursery": "reception",
    "reception": "year1",
    "year1": "year2",
    "year2": "year3",
    "year3": "year4",
    "year4": "year5",
    "year5": "year6",
    "year6": "year7",
    "year7": "year8",
    "year8": "year9",
    "year9": "year10",
    "year10": "year11",
    "year11": "year12",
    "year12": "year13",
    "year13": "graduated" // Special case - changes status instead
  }

  // Get next grade level
  const getNextGrade = (currentGrade: string): string | null => {
    const normalizedGrade = currentGrade.toLowerCase().replace(" ", "")
    return gradeProgressionMap[normalizedGrade] || null
  }

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
      const currentGrade = student.gradeLevel.toLowerCase().replace(" ", "")
      const nextGrade = getNextGrade(currentGrade)

      if (!gradeGroups[currentGrade]) {
        gradeGroups[currentGrade] = {
          students: [],
          nextGrade: nextGrade === "graduated" ? "Graduated" : getGradeLabel(nextGrade || ""),
          isGraduation: nextGrade === "graduated"
        }
      }
      gradeGroups[currentGrade].students.push(student)
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

  // Total students to promote (only selected ones)
  const totalStudentsToPromote = useMemo(() => {
    return selectedStudentIds.size
  }, [selectedStudentIds])

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
  const handleOpenPromoteDialog = () => {
    // Set default values - use current academic year based on date
    const currentAcademicYear = getCurrentAcademicYear()
    const defaultFromYear = availableYears.includes(currentAcademicYear)
      ? currentAcademicYear
      : availableYears[0] || ""

    if (defaultFromYear) {
      setPromoteFromYear(defaultFromYear)
      // Generate next academic year
      const [startYear] = defaultFromYear.split("-").map(Number)
      const nextYear = `${startYear + 1} -${startYear + 2} `
      setPromoteToYear(nextYear)

      // Select all students by default
      const allStudentIds = students
        .filter((s: Student) => s.academicYear === defaultFromYear && s.status === "active")
        .map((s: Student) => s.id)
      setSelectedStudentIds(new Set(allStudentIds))
    }
    setPromoteConfirmed(false)
    setExpandedGrades(new Set())
    setIsPromoteDialogOpen(true)
  }

  // Update selected students when promoteFromYear changes
  const handleFromYearChange = (year: string) => {
    setPromoteFromYear(year)
    // Select all students for the new year
    const allStudentIds = students
      .filter((s: Student) => s.academicYear === year && s.status === "active")
      .map((s: Student) => s.id)
    setSelectedStudentIds(new Set(allStudentIds))

    // Update to year
    const [startYear] = year.split("-").map(Number)
    const nextYear = `${startYear + 1} -${startYear + 2} `
    setPromoteToYear(nextYear)
  }

  // Handle confirm promotion
  const handleConfirmPromotion = () => {
    if (!promoteFromYear || !promoteToYear || !promoteConfirmed) {
      toast.error("Please confirm the action before proceeding")
      return
    }

    if (selectedStudentIds.size === 0) {
      toast.error("Please select at least one student to promote")
      return
    }

    // Only promote selected students
    const studentsToPromote = students.filter(
      (s: Student) => selectedStudentIds.has(s.id)
    )

    let promotedCount = 0
    let graduatedCount = 0

    studentsToPromote.forEach((student: Student) => {
      const currentGrade = student.gradeLevel.toLowerCase().replace(" ", "")
      const nextGrade = getNextGrade(currentGrade)

      if (nextGrade === "graduated") {
        // Year 13 students graduate
        updateStudent(student.id, {
          status: "graduated",
          academicYear: promoteToYear,
          updatedBy: "Admin",
          updatedAt: new Date()
        })
        graduatedCount++
      } else if (nextGrade) {
        // Promote to next grade
        updateStudent(student.id, {
          gradeLevel: nextGrade,
          academicYear: promoteToYear,
          updatedBy: "Admin",
          updatedAt: new Date()
        })
        promotedCount++
      }
    })

    setIsPromoteDialogOpen(false)
    setPromoteConfirmed(false)
    setSelectedStudentIds(new Set())

    if (graduatedCount > 0) {
      toast.success(`Promoted ${promotedCount} students and graduated ${graduatedCount} students`)
    } else {
      toast.success(`Promoted ${promotedCount} students to ${promoteToYear} `)
    }
  }

  const studentFormContent = (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="basic">Basic Info</TabsTrigger>
        <TabsTrigger value="academic">Academic</TabsTrigger>
        <TabsTrigger value="parents">Parents</TabsTrigger>
      </TabsList>

      <TabsContent value="basic" className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Student ID</Label>
            <Input
              value={formData.studentId}
              onChange={(e) => setFormData(prev => ({ ...prev, studentId: e.target.value }))}
              placeholder="KC2024001"
              disabled={!userCanEdit}
            />
          </div>
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select
              value={formData.gender}
              onValueChange={(value: "male" | "female" | "other") => setFormData(prev => ({ ...prev, gender: value }))}
              disabled={!userCanEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>First Name *</Label>
            <Input
              value={formData.firstName}
              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              placeholder="Enter first name"
              disabled={!userCanEdit}
            />
          </div>
          <div className="space-y-2">
            <Label>Last Name *</Label>
            <Input
              value={formData.lastName}
              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
              placeholder="Enter last name"
              disabled={!userCanEdit}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nickname</Label>
            <Input
              value={formData.nickname}
              onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
              placeholder="Enter nickname"
              disabled={!userCanEdit}
            />
          </div>
          <div className="space-y-2">
            <Label>Date of Birth</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.dateOfBirth ? format(formData.dateOfBirth, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                {(() => {
                  const [showYearPicker, setShowYearPicker] = useState(true)
                  const [selectedYear, setSelectedYear] = useState<number | null>(
                    formData.dateOfBirth ? formData.dateOfBirth.getFullYear() : null
                  )
                  const currentYear = new Date().getFullYear()
                  const years = Array.from({ length: currentYear - 1950 + 1 }, (_, i) => currentYear - i)

                  if (showYearPicker) {
                    return (
                      <div className="p-4 w-80">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-sm">Select Year</h4>
                          {selectedYear && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowYearPicker(false)}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                          {years.map(year => (
                            <Button
                              key={year}
                              variant={selectedYear === year ? "default" : "outline"}
                              size="sm"
                              className="h-10"
                              onClick={() => {
                                setSelectedYear(year)
                                setShowYearPicker(false)
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
                          onClick={() => setShowYearPicker(true)}
                          className="text-sm font-medium"
                        >
                          {selectedYear || 'Select Year'} <ChevronDown className="ml-1 h-4 w-4" />
                        </Button>
                      </div>
                      <Calendar
                        mode="single"
                        selected={formData.dateOfBirth || undefined}
                        onSelect={(date) => setFormData(prev => ({ ...prev, dateOfBirth: date || null }))}
                        defaultMonth={selectedYear ? new Date(selectedYear, 0) : new Date()}
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
          <Label>Notes</Label>
          <Input
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Additional notes"
            disabled={!userCanEdit}
          />
        </div>
      </TabsContent>

      <TabsContent value="academic" className="space-y-6 mt-4">
        {/* Academic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Year Group *</Label>
            <Select
              value={formData.gradeLevel}
              onValueChange={(value) => setFormData(prev => ({ ...prev, gradeLevel: value }))}
              disabled={!userCanEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select grade" />
              </SelectTrigger>
              <SelectContent>
                {gradeLevels.map(grade => (
                  <SelectItem key={grade.id} value={grade.id}>
                    {grade.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Academic Year *</Label>
            <Select
              value={formData.academicYear}
              onValueChange={(year: string) => setFormData((prev: any) => ({ ...prev, academicYear: year }))}
              disabled={!userCanEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Enrollment Term *</Label>
            <Select
              value={formData.enrollmentTerm}
              onValueChange={(value: "term1" | "term2" | "term3") => setFormData(prev => ({ ...prev, enrollmentTerm: value }))}
              disabled={!userCanEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select term" />
              </SelectTrigger>
              <SelectContent>
                {getTermOptions(t).map(term => (
                  <SelectItem key={term.id} value={term.id}>
                    {term.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: "active" | "graduated" | "withdrawn" | "on_leave") => setFormData(prev => ({ ...prev, status: value }))}
              disabled={!userCanEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getStatusOptions(t).map(status => (
                  <SelectItem key={status.id} value={status.id}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Enrollment Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={!userCanEdit}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.enrollmentDate ? format(formData.enrollmentDate, "PPP") : "Pick a date"}
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
            <Label>Family Code</Label>
            <Select
              value={formData.familyId || "no-family"}
              onValueChange={(value) => {
                if (value === "no-family") {
                  setFormData(prev => ({ ...prev, familyId: "", childOrder: 1 }))
                } else {
                  // Auto-calculate child order based on existing family members
                  const family = families.find((f: Family) => f.id === value)
                  const familyStudents = students.filter((s: Student) => s.familyId === value && s.studentId !== formData.studentId)
                  const newChildOrder = familyStudents.length + 1
                  setFormData(prev => ({
                    ...prev,
                    familyId: value,
                    familyCode: family?.familyCode || "",
                    childOrder: newChildOrder
                  }))
                }
              }}
              disabled={!userCanEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select family" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-family">No Family</SelectItem>
                {families.map((family: Family) => (
                  <SelectItem key={family.id} value={family.id}>
                    <span className="font-mono">{family.familyCode || family.id}</span>
                    <span className="text-muted-foreground ml-2">({family.familyName})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Sibling Discount Section */}
        <div className="border rounded-lg p-4 bg-muted/30">
          <div className="space-y-3">
            <Label className="text-base font-medium flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Sibling Discount
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Child Order</Label>
                <div className="h-10 px-3 py-2 border rounded-md bg-background text-sm flex items-center font-medium">
                  {formData.childOrder === 1 ? '1st Child' :
                   formData.childOrder === 2 ? '2nd Child' :
                   formData.childOrder === 3 ? '3rd Child' :
                   formData.childOrder === 4 ? '4th Child' :
                   '5th Child+'}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Discount Rate</Label>
                <div className="h-10 px-3 py-2 border rounded-md bg-background text-sm flex items-center justify-center font-semibold">
                  {(() => {
                    const discountPct = getSiblingDiscountPercentage(formData.childOrder, formData.academicYear, formData.enrollmentTerm)
                    if (discountPct > 0) {
                      return <span className="text-green-600">{discountPct}% off</span>
                    } else {
                      return <span className="text-muted-foreground">No sibling discount</span>
                    }
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="parents" className="space-y-4 mt-4">
        {/* Existing Parents */}
        {formData.parents.length > 0 && (
          <div className="space-y-2">
            <Label>Current Parents/Guardians</Label>
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
              <Label>Name</Label>
              <Input
                value={newParent.name}
                onChange={(e) => setNewParent(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Full name"
                disabled={!userCanEdit}
              />
            </div>
            <div className="space-y-2">
              <Label>Relationship</Label>
              <Select
                value={newParent.relationship}
                onValueChange={(value: "father" | "mother" | "guardian" | "other") => setNewParent(prev => ({ ...prev, relationship: value }))}
                disabled={!userCanEdit}
              >
                <SelectTrigger onPointerDown={(e) => e.stopPropagation()}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent onPointerDown={(e) => e.stopPropagation()}>
                  <SelectItem value="father">Father</SelectItem>
                  <SelectItem value="mother">Mother</SelectItem>
                  <SelectItem value="guardian">Guardian</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={newParent.phone}
                onChange={(e) => setNewParent(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="081-234-5678"
                disabled={!userCanEdit}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{t("student.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("student.description")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleImport} disabled={!userCanEdit}>
            <Upload className="w-4 h-4 mr-2" />
            {t("common.import")}
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            {t("common.export")}
          </Button>
          <Button onClick={handleAddStudent} disabled={!userCanEdit}>
            <Plus className="w-4 h-4 mr-2" />
            {t("student.addStudent")}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("student.totalStudents")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("student.activeStudents")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("student.families")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.familyCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("common.lastUpdated")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{format(new Date(), "dd/MM/yyyy")}</div>
            <div className="text-xs text-muted-foreground">{format(new Date(), "HH:mm")}</div>
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
            {(searchTerm || filterGrade !== "all" || filterStatus !== "all" || filterAcademicYear !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("")
                  setFilterGrade("all")
                  setFilterStatus("all")
                  setFilterAcademicYear("all")
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("studentId")}>
                  <div className="flex items-center gap-1">
                    {t("student.studentId")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("name")}>
                  <div className="flex items-center gap-1">
                    {t("common.name")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("gradeLevel")}>
                  <div className="flex items-center gap-1">
                    {t("invoice.yearGroup")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("academicYear")}>
                  <div className="flex items-center gap-1">
                    {t("common.academicYear")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("enrollmentTerm")}>
                  <div className="flex items-center gap-1">
                    {t("student.term")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("familyCode")}>
                  <div className="flex items-center gap-1">
                    {t("student.familyCode")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("childOrder")}>
                  <div className="flex items-center gap-1">
                    {t("student.discountsBenefits")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("status")}>
                  <div className="flex items-center gap-1">
                    {t("common.status")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("updatedAt")}>
                  <div className="flex items-center gap-1">
                    {t("student.updated")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="p-0">
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
                    <TableCell className="font-medium">{student.studentId}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{student.firstName} {student.lastName}</p>
                        {student.nickname && (
                          <p className="text-sm text-muted-foreground">({student.nickname})</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getGradeLabel(student.gradeLevel)}</TableCell>
                    <TableCell>{student.academicYear}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getTermLabel(student.enrollmentTerm)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {getFamilyCode(student.familyId, student.familyCode)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const discounts: any[] = []
                        const siblingDiscount = getSiblingDiscount(student, student.enrollmentTerm)
                        const feeWaiver = checkFeePrivilegeEligibility(student, student.academicYear, student.enrollmentTerm)
                        const groupDiscounts = getStudentGroupDiscounts(student.studentId)
                        // Check for special discounts from localStorage records (fallback to notes)
                        const isStaff = isStaffChildStudent(student.studentId) || student.notes?.toLowerCase().includes('staff')
                        const hasScholarship = hasScholarshipDiscount(student.studentId) || student.notes?.toLowerCase().includes('scholarship')
                        const hasEarlyBird = hasEarlyBirdDiscount(student.studentId) || student.notes?.toLowerCase().includes('early bird')

                        // Sibling Discount
                        if (siblingDiscount > 0) {
                          discounts.push(
                            <Badge key="sibling" className="bg-green-100 text-green-800 text-xs">
                              {t("student.sibling")} {siblingDiscount}%
                            </Badge>
                          )
                        }

                        // Fee Waiver (only show if eligible)
                        if (feeWaiver.eligible) {
                          discounts.push(
                            <Badge key="waiver" className="bg-indigo-100 text-indigo-800 text-xs">
                              {t("student.waiver")} ฿{(feeWaiver.creditPerTerm || 0).toLocaleString()}
                            </Badge>
                          )
                        }

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
                          discounts.push(
                            <Badge key={`group-${idx}`} className="bg-teal-100 text-teal-800 text-xs">
                              {group.name} {group.discountPercentage}%
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
                    <TableCell>{getStatusBadge(student.status)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{student.updatedAt ? format(student.updatedAt, "dd/MM/yyyy") : "-"}</p>
                        <p className="text-xs text-muted-foreground">{student.updatedBy || "-"}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
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
          {sortedStudents.length > 0 && (
            <div className="flex items-center justify-between border-t pt-4 mt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Show</span>
                <Select value={pageSize.toString()} onValueChange={(value) => handlePageSizeChange(Number(value))}>
                  <SelectTrigger className="w-[70px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span>entries</span>
              </div>

              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedStudents.length)} of {sortedStudents.length} students
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1 mx-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Student Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
          </DialogHeader>
          {studentFormContent}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNewStudent} disabled={!userCanEdit || !formData.firstName || !formData.lastName || !formData.gradeLevel}>
              Add Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          {studentFormContent}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditStudent} disabled={!userCanEdit}>
              Save Changes
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
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-primary" />
                </div>
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
                  <p className="font-medium">{selectedStudent.academicYear}</p>
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
                  {/* Sibling Discount */}
                  {getSiblingDiscount(selectedStudent, selectedStudent.enrollmentTerm) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>{t("student.siblingDiscount")}</span>
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        {getSiblingDiscount(selectedStudent, selectedStudent.enrollmentTerm)}%
                      </Badge>
                    </div>
                  )}

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

                  {/* Registration Fee Waiver (only show if eligible) */}
                  {(() => {
                    const eligibility = checkFeePrivilegeEligibility(
                      selectedStudent,
                      selectedStudent.academicYear,
                      selectedStudent.enrollmentTerm
                    )
                    if (eligibility.eligible) {
                      return (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{t("student.registrationFeeWaiver")}</span>
                            <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">
                              ฿{eligibility.creditPerTerm?.toLocaleString()}/{t("student.term")}
                            </Badge>
                          </div>
                          <p className="text-xs text-indigo-600">{eligibility.reason}</p>
                        </div>
                      )
                    }
                    return null
                  })()}

                  {/* No discounts message */}
                  {getSiblingDiscount(selectedStudent, selectedStudent.enrollmentTerm) === 0 &&
                    getStudentGroupDiscounts(selectedStudent.studentId).length === 0 &&
                    !(isStaffChildStudent(selectedStudent.studentId) || selectedStudent.notes?.toLowerCase().includes('staff')) &&
                    !(hasScholarshipDiscount(selectedStudent.studentId) || selectedStudent.notes?.toLowerCase().includes('scholarship')) &&
                    !(hasEarlyBirdDiscount(selectedStudent.studentId) || selectedStudent.notes?.toLowerCase().includes('early bird')) &&
                    !checkFeePrivilegeEligibility(selectedStudent, selectedStudent.academicYear, selectedStudent.enrollmentTerm).eligible && (
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
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Delete Student</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete <strong>{selectedStudent?.firstName} {selectedStudent?.lastName}</strong>?
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={!userCanEdit}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>Import Students</DialogTitle>
            <DialogDescription>
              Upload a CSV file to import students. Download the template for the correct format.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Template Download */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div>
                <p className="font-medium">CSV Template</p>
                <p className="text-sm text-muted-foreground">Download the template with correct column headers</p>
              </div>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="csvFile">Upload CSV File</Label>
              <Input
                id="csvFile"
                type="file"
                accept=".csv"
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

            {/* Preview Table */}
            {importPreview.length > 0 && (
              <div className="space-y-2">
                <Label>Preview ({importPreview.length} students)</Label>
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-[300px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("table.studentId")}</TableHead>
                          <TableHead>{t("table.name")}</TableHead>
                          <TableHead>{t("table.yearGroup")}</TableHead>
                          <TableHead>{t("table.year")}</TableHead>
                          <TableHead>{t("table.status")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importPreview.slice(0, 10).map((row, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono text-sm">{row["Student ID"]}</TableCell>
                            <TableCell>{row["First Name"]} {row["Last Name"]}</TableCell>
                            <TableCell>{row["Year Group"]}</TableCell>
                            <TableCell>{row["Academic Year"]}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{row["Status"] || "active"}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {importPreview.length > 10 && (
                    <div className="p-2 text-center text-sm text-muted-foreground border-t">
                      ... and {importPreview.length - 10} more students
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={!userCanEdit || importPreview.length === 0 || !!importError}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import {importPreview.length > 0 ? `${importPreview.length} Students` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promote Grade Dialog */}
      <Dialog open={isPromoteDialogOpen} onOpenChange={setIsPromoteDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5" />
              Promote Students to Next Grade
            </DialogTitle>
            <DialogDescription>
              Select students to promote to the next grade level for the new academic year.
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {/* Year Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Academic Year</Label>
                <Select value={promoteFromYear} onValueChange={(year: string) => setPromoteFromYear(year)} disabled={!userCanEdit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year: string) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>To Academic Year</Label>
                <Select value={promoteToYear} onValueChange={setPromoteToYear} disabled={!userCanEdit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Show available years + next year based on selected From year */}
                    {(() => {
                      const yearsSet = new Set(availableYears)
                      // Add next year from selected "From" year
                      if (promoteFromYear) {
                        const [startYear] = promoteFromYear.split("-").map(Number)
                        yearsSet.add(`${startYear + 1} -${startYear + 2} `)
                      }
                      // Add next year from latest available year
                      if (availableYears.length > 0) {
                        const [startYear] = availableYears[0].split("-").map(Number)
                        yearsSet.add(`${startYear + 1} -${startYear + 2} `)
                      }
                      return Array.from(yearsSet).sort((a: string, b: string) => b.localeCompare(a))
                    })().map((year: string) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preview with Student Selection */}
            {getPromotionPreview.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base">
                    Select Students ({totalStudentsToPromote} selected)
                  </Label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllStudents} disabled={!userCanEdit}>
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAllStudents} disabled={!userCanEdit}>
                      Deselect All
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  {getPromotionPreview.map((row, index) => (
                    <div key={index} className={cn("border-b last:border-b-0", row.isGraduation && "bg-amber-50/50")}>
                      {/* Grade Row Header */}
                      <div
                        className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleGradeExpansion(row.currentGradeId)}
                      >
                        {/* Expand/Collapse Icon */}
                        <button className="p-0.5">
                          {expandedGrades.has(row.currentGradeId) ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>

                        {/* Grade Checkbox */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isGradeFullySelected(row.currentGradeId)}
                            ref={(el) => {
                              if (el) {
                                (el as any).indeterminate = isGradePartiallySelected(row.currentGradeId)
                              }
                            }}
                            onCheckedChange={() => toggleGradeSelection(row.currentGradeId)}
                            disabled={!userCanEdit}
                          />
                        </div>

                        {/* Grade Info */}
                        <div className="flex-1 flex items-center gap-2">
                          <span className="font-medium">{row.currentGrade}</span>
                          <span className="text-muted-foreground">→</span>
                          {row.isGraduation ? (
                            <span className="flex items-center gap-1 font-medium text-amber-700">
                              <GraduationCap className="w-4 h-4" />
                              {row.nextGrade}
                            </span>
                          ) : (
                            <span className="font-medium text-green-700">{row.nextGrade}</span>
                          )}
                        </div>

                        {/* Selected Count */}
                        <Badge variant={row.isGraduation ? "outline" : "secondary"} className="text-xs">
                          {getSelectedCountForGrade(row.currentGradeId)}/{row.count} selected
                        </Badge>
                      </div>

                      {/* Expanded Student List */}
                      {expandedGrades.has(row.currentGradeId) && (
                        <div className="pl-12 pr-3 pb-3 space-y-1">
                          {row.students.map(student => (
                            <div
                              key={student.id}
                              className="flex items-center gap-3 p-2 rounded hover:bg-muted/50"
                            >
                              <Checkbox
                                checked={selectedStudentIds.has(student.id)}
                                onCheckedChange={() => toggleStudentSelection(student.id)}
                                disabled={!userCanEdit}
                              />
                              <div className="flex-1">
                                <span className="text-sm">
                                  {student.firstName} {student.lastName}
                                </span>
                                {student.nickname && (
                                  <span className="text-xs text-muted-foreground ml-1">
                                    ({student.nickname})
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground font-mono">
                                {student.studentId}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Graduation Warning */}
                {getPromotionPreview.some(p => p.isGraduation) && (
                  <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800">Year 13 Students</p>
                      <p className="text-amber-700">
                        Year 13 students will be marked as "Graduated" instead of being promoted to a new grade.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No active students found for {promoteFromYear || "the selected year"}</p>
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
                  <label
                    htmlFor="confirm-promote"
                    className="text-sm font-medium cursor-pointer"
                  >
                    I confirm this action
                  </label>
                  <p className="text-xs text-muted-foreground">
                    This will update {totalStudentsToPromote} student records. This action cannot be easily undone.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Footer */}
          <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
            <Button variant="outline" onClick={() => setIsPromoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPromotion}
              disabled={!userCanEdit || totalStudentsToPromote === 0 || !promoteConfirmed || !promoteToYear}
              className="gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Promote {totalStudentsToPromote} Students
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Student Confirmation Dialog */}
      <ConfirmDialog
        open={addConfirmDialog.isOpen}
        onOpenChange={addConfirmDialog.setIsOpen}
        onConfirm={addConfirmDialog.handleConfirm}
        title="ยืนยันการสร้าง?"
        description="คุณต้องการสร้างนักเรียนนี้หรือไม่?"
        confirmText="สร้าง"
      />

      {/* Edit Student Confirmation Dialog */}
      <ConfirmDialog
        open={editConfirmDialog.isOpen}
        onOpenChange={editConfirmDialog.setIsOpen}
        onConfirm={editConfirmDialog.handleConfirm}
        title="ยืนยันการแก้ไข?"
        description="คุณต้องการบันทึกการแก้ไขหรือไม่?"
        confirmText="บันทึก"
      />

      {/* Import Students Confirmation Dialog */}
      <ConfirmDialog
        open={importConfirmDialog.isOpen}
        onOpenChange={importConfirmDialog.setIsOpen}
        onConfirm={importConfirmDialog.handleConfirm}
        title="ยืนยันการนำเข้า?"
        description="คุณต้องการนำเข้าข้อมูลหรือไม่?"
        confirmText="นำเข้า"
      />
    </div>
  )
}
