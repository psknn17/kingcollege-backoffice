import { useState, useMemo, useEffect, useRef } from "react"
import { downloadAsXlsx } from "@/utils/xlsxUtils"
import * as XLSX from "xlsx"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Badge } from "./ui/badge"
import { Switch } from "./ui/switch"
import { Textarea } from "./ui/textarea"
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Progress } from "./ui/progress"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAuth } from "@/contexts/AuthContext"
import { canPerformActions } from "@/utils/rolePermissions"
import {
  Percent,
  Tag,
  TrendingDown,
  Plus,
  Edit,
  Trash2,
  CalendarDays,
  Users,
  DollarSign,
  Copy,
  Eye,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  TrendingUp,
  Upload,
  Download,
  FileText,
  X,
  UserPlus,
  GraduationCap,
  Search
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "@/components/ui/sonner"
import { logActivity } from "@/lib/activityLog"
import { WaiveFeeManagement } from "./WaiveFeeManagement"
import { useStudents } from "@/contexts/StudentContext"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConfirmDialog } from "@/hooks/useConfirmDialog"
import { getSortedYearGroups } from "@/utils/gradeLevels"

interface Student {
  id: string
  name: string
  yearGroup: string
  parentName: string
  isActive?: boolean
}

interface DiscountCode {
  id: number
  code: string
  type: 'percentage' | 'fixed'
  value: number
  description: string
  startDate: Date
  endDate: Date
  usageLimit: number
  usedCount: number
  isActive: boolean
  targetTypes: string[]
  minAmount: number
  category: string
  createdBy: string
  period: 'general' | 'yearly' | 'termly'
  selectedStudents: Student[]
  applicableTerms?: string[]
}


interface StudentGroup {
  id: string
  name: string
  financeCode?: string
  nominalCode?: string
  students: Student[]
  discountType: string
  discountPercentage: number
  fixedAmount: number
  departments: string[]
  isActive: boolean
}

// Helper function to convert students from context to local format
const convertStudentsToDiscountFormat = (contextStudents: any[]): Student[] => {
  return contextStudents.map(student => {
    const primaryParent = student.parents?.find((p: any) => p.isPrimary) || student.parents?.[0]
    return {
      id: student.studentId, // Use studentId (e.g., KC2024001)
      name: `${student.firstName} ${student.lastName}`,
      yearGroup: (student.gradeLevel || "")
        .replace(/^pre-nursery$/i, "Pre-Nursery")
        .replace(/^nursery$/i, "Nursery")
        .replace(/^reception$/i, "Reception")
        .replace(/^year\s*(\d+)$/i, "Year $1"),
      parentName: primaryParent?.name || "N/A",
      isActive: student.status === "active"
    }
  })
}

// Load Student Groups from localStorage with specific key
const loadStudentGroupsFromStorage = (storageKey: string) => {
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error("Failed to load student groups from localStorage:", error)
  }
  return null
}

// Save Student Groups to localStorage with specific key
const saveStudentGroupsToStorage = (groups: any[], storageKey: string) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(groups))
  } catch (error) {
    console.error("Failed to save student groups to localStorage:", error)
  }
}

const mockDiscountCodes: DiscountCode[] = [
  {
    id: 1,
    code: "EARLY2024",
    type: "percentage",
    value: 15,
    description: "Early bird discount for 2024 activities",
    startDate: new Date("2024-01-01"),
    endDate: new Date("2024-12-31"),
    usageLimit: 500,
    usedCount: 234,
    isActive: true,
    targetTypes: ["Tuition", "After School", "Events"],
    minAmount: 1000,
    category: "Early Bird",
    createdBy: "Admin",
    period: "general",
    selectedStudents: []
  },
  {
    id: 2,
    code: "SIBLING10",
    type: "percentage",
    value: 10,
    description: "Sibling discount for families with multiple children",
    startDate: new Date("2024-01-01"),
    endDate: new Date("2024-12-31"),
    usageLimit: 1000,
    usedCount: 456,
    isActive: true,
    targetTypes: ["Tuition", "After School"],
    minAmount: 0,
    category: "Family",
    createdBy: "Admin",
    period: "yearly",
    selectedStudents: [] // Will be populated from StudentContext
  },
  {
    id: 3,
    code: "TERMLY15",
    type: "percentage",
    value: 15,
    description: "Termly discount for selected students",
    startDate: new Date("2024-01-01"),
    endDate: new Date("2024-04-30"),
    usageLimit: 200,
    usedCount: 89,
    isActive: true,
    targetTypes: ["Tuition"],
    minAmount: 0,
    category: "Academic",
    createdBy: "Admin",
    period: "termly",
    selectedStudents: [], // Will be populated from StudentContext
    applicableTerms: ["Term 1", "Term 2"]
  }
]


interface DiscountManagementProps {
  activeTab: string
  category?: "tuition" | "bus" | "eca" | "trip" | "exam" | "event" | "summer" | "external" // Category determines which item type the discount applies to
  onNavigateToSubPage?: (subPage: string, params?: any) => void
  onTabChange?: (tabId: string) => void
}

export function DiscountManagement({ activeTab, category = "tuition", onNavigateToSubPage, onTabChange }: DiscountManagementProps) {
  const { t } = useLanguage()
  const { user } = useAuth()
  const userCanEdit = canPerformActions(user?.role)
  const { students: contextStudents } = useStudents()

  // Determine department based on category
  const departmentType = category === "bus" ? "School Bus" : "Tuition"

  // Use category-specific localStorage key
  // For tuition, use "studentGroups" for backward compatibility
  // For bus, use "studentGroups_bus"
  const STORAGE_KEY = category === "tuition" ? "studentGroups" : `studentGroups_${category}`

  // Convert students from context to local format
  const availableStudents = useMemo<Student[]>(() =>
    convertStudentsToDiscountFormat(contextStudents),
    [contextStudents]
  )

  // Normalize grade for comparison — handles "Year 10", "year10", "Year10", "10" variations
  const normalizeGrade = (grade: string) => (grade || "").toLowerCase().replace(/\s+/g, "")

  // Match year group filter with normalization
  const matchesYearGroup = (studentGrade: string, filter: string) =>
    filter === "All" || normalizeGrade(studentGrade) === normalizeGrade(filter)

  // Dynamic search placeholder based on actual students
  const searchPlaceholder = useMemo(() => {
    const example = availableStudents.find(s => s.id)
    return example ? `Search by ID or Name (e.g., ${example.id})` : "Search by ID or Name"
  }, [availableStudents])

  const [selectedYearGroup, setSelectedYearGroup] = useState<string>("All")
  const [isInputFocused, setIsInputFocused] = useState(false)

  // Get unique year groups — always include full grade list so filter works even without students loaded
  const ALL_GRADE_LEVELS = ["Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  const uniqueYearGroups = useMemo(() => {
    const groups = new Set([
      ...ALL_GRADE_LEVELS,
      ...availableStudents.map((s: Student) => s.yearGroup).filter(Boolean)
    ])
    return getSortedYearGroups(["All", ...Array.from(groups)])
  }, [availableStudents])

  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>(mockDiscountCodes)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingDiscount, setEditingDiscount] = useState<DiscountCode | null>(null)

  // Form states for discount codes
  const [formData, setFormData] = useState({
    code: "",
    type: "percentage" as 'percentage' | 'fixed',
    value: 0,
    description: "",
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    usageLimit: 100,
    targetTypes: [] as string[],
    minAmount: 0,
    category: "",
    period: "general" as 'general' | 'yearly' | 'termly',
    selectedStudents: [] as Student[],
    applicableTerms: [] as string[]
  })

  // Generate default student groups with random students from context
  const generateDefaultGroups = (allStudents: Student[], department: string) => {
    // Filter students by grade for each group
    const year7Students = allStudents.filter(s => s.yearGroup === "Year 7").slice(0, 5)
    const year8Students = allStudents.filter(s => s.yearGroup === "Year 8").slice(0, 3)
    const year9Students = allStudents.filter(s => s.yearGroup === "Year 9").slice(0, 4)
    const year10Students = allStudents.filter(s => s.yearGroup === "Year 10").slice(0, 3)
    const year11Students = allStudents.filter(s => s.yearGroup === "Year 11").slice(0, 2)
    const year12Students = allStudents.filter(s => s.yearGroup === "Year 12").slice(0, 3)
    const year13Students = allStudents.filter(s => s.yearGroup === "Year 13").slice(0, 4)
    const year3Students = allStudents.filter(s => s.yearGroup === "Year 3").slice(0, 4)
    const year4Students = allStudents.filter(s => s.yearGroup === "Year 4").slice(0, 3)
    const year5Students = allStudents.filter(s => s.yearGroup === "Year 5").slice(0, 2)

    return [
      {
        id: "GRP001",
        name: "Scholarship Recipients",
        financeCode: "SCH-001",
        nominalCode: "4110001",
        students: year7Students,
        discountType: "percentage" as "percentage" | "fixed",
        discountPercentage: 100,
        fixedAmount: 0,
        departments: [department],
        isActive: true
      },
      {
        id: "GRP002",
        name: "Staff Children",
        financeCode: "STAFF-01",
        nominalCode: "4110002",
        students: [...year3Students, ...year4Students],
        discountType: "percentage" as "percentage" | "fixed",
        discountPercentage: 50,
        fixedAmount: 0,
        departments: [department],
        isActive: true
      },
      {
        id: "GRP003",
        name: "Corporate Partner Families",
        financeCode: "CORP-001",
        nominalCode: "4110004",
        students: [...year11Students, ...year12Students],
        discountType: "fixed" as "percentage" | "fixed",
        discountPercentage: 0,
        fixedAmount: 20000,
        departments: [department],
        isActive: true
      },
      {
        id: "GRP004",
        name: "Early Bird 2025/2026",
        financeCode: "EB-2526",
        nominalCode: "4110005",
        students: [...year9Students, ...year10Students],
        discountType: "percentage" as "percentage" | "fixed",
        discountPercentage: 5,
        fixedAmount: 0,
        departments: [department],
        isActive: true
      }
    ]
  }

  // Student Groups Management - Load from localStorage or use defaults
  const [studentGroups, setStudentGroups] = useState<StudentGroup[]>(() => {
    const saved = loadStudentGroupsFromStorage(STORAGE_KEY)
    if (saved) return saved
    return [] // Will be populated in useEffect when students are available
  })

  // Reload data when STORAGE_KEY changes (when switching between categories)
  useEffect(() => {
    const saved = loadStudentGroupsFromStorage(STORAGE_KEY)
    if (saved) {
      setStudentGroups(saved)
    } else {
      // If no saved data, generate defaults if students are available
      if (availableStudents.length > 0) {
        const defaultGroups = generateDefaultGroups(availableStudents, departmentType)
        setStudentGroups(defaultGroups)
      } else {
        setStudentGroups([])
      }
    }
  }, [STORAGE_KEY, departmentType, availableStudents])

  // Save studentGroups to localStorage when it changes (but not on initial load)
  const isInitialMount = useRef(true)
  
  // Migration: Force Reset Mock Data once to include new Finance/Nominal codes
  useEffect(() => {
    const migrationKey = "app:studentGroups_migrated_v2"
    const hasMigrated = localStorage.getItem(migrationKey)
    
    if (!hasMigrated && availableStudents.length > 0) {
      console.log("Forcing Mock Data Reset with Finance/Nominal Codes...")
      const mockData = generateDefaultGroups(availableStudents, departmentType)
      setStudentGroups(mockData)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockData))
      localStorage.setItem(migrationKey, "true")
    }
  }, [availableStudents, departmentType, STORAGE_KEY])

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    saveStudentGroupsToStorage(studentGroups, STORAGE_KEY)
  }, [studentGroups, STORAGE_KEY])
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false)
  const [groupForm, setGroupForm] = useState({
    name: "",
    financeCode: "",
    nominalCode: "",
    discountType: "percentage" as "percentage" | "fixed",
    discountPercentage: 0,
    fixedAmount: 0,
    departments: [] as string[],
    selectedStudents: [] as Student[],
    isActive: true
  })

  // Student selection states
  const [studentInput, setStudentInput] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  const [fileParseErrors, setFileParseErrors] = useState<string[]>([])

  // Group view and edit states
  const [viewGroupDialog, setViewGroupDialog] = useState<{ isOpen: boolean, group: any | null }>({ isOpen: false, group: null })
  const [editGroupDialog, setEditGroupDialog] = useState<{ isOpen: boolean, group: any | null }>({ isOpen: false, group: null })
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{ isOpen: boolean, group: any | null }>({ isOpen: false, group: null })

  // CSV Upload and Individual Add states
  const [csvUploadDialog, setCsvUploadDialog] = useState<{ isOpen: boolean, groupId: string | null }>({ isOpen: false, groupId: null })
  const [addIndividualDialog, setAddIndividualDialog] = useState<{ isOpen: boolean, groupId: string | null }>({ isOpen: false, groupId: null })
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvPreviewData, setCsvPreviewData] = useState<Student[]>([])
  const [isPreviewingCsv, setIsPreviewingCsv] = useState(false)
  const [individualStudentForm, setIndividualStudentForm] = useState({
    id: "",
    name: "",
    yearGroup: "",
    parentName: ""
  })

  // Student search states
  const [studentSearchQuery, setStudentSearchQuery] = useState("")
  const [studentSearchResults, setStudentSearchResults] = useState<Student[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [currentStudentsSearch, setCurrentStudentsSearch] = useState("")
  const [studentYearGroupFilter, setStudentYearGroupFilter] = useState("all")

  // Confirm dialog hooks
  const saveDialog = useConfirmDialog()
  const deleteDialog = useConfirmDialog()


  const getUsageProgress = (used: number, limit: number) => {
    return Math.min((used / limit) * 100, 100)
  }

  // CSV Upload handlers
  const handleCsvUpload = (file: File) => {
    setCsvFile(file)
    setIsPreviewingCsv(true)

    const reader = new FileReader()
    reader.onload = (e) => {
      const data = e.target?.result
      const workbook = XLSX.read(data, { type: "binary" })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const text = XLSX.utils.sheet_to_csv(sheet)

      const lines = text.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))

      // Map common column name variations
      const findColumn = (variations: string[]) => {
        for (const variant of variations) {
          const index = headers.findIndex(h => h === variant || h.includes(variant))
          if (index !== -1) return index
        }
        return -1
      }

      const idIndex = findColumn(['id', 'student_id', 'studentid'])
      const nameIndex = findColumn(['name', 'student_name', 'studentname'])
      const yearGroupIndex = findColumn(['year_group', 'yeargroup', 'year', 'grade', 'level'])
      const parentNameIndex = findColumn(['parent_name', 'parentname', 'parent'])

      if (idIndex === -1 || nameIndex === -1 || yearGroupIndex === -1 || parentNameIndex === -1) {
        const missing = []
        if (idIndex === -1) missing.push('id')
        if (nameIndex === -1) missing.push('name')
        if (yearGroupIndex === -1) missing.push('year_group')
        if (parentNameIndex === -1) missing.push('parent_name')

        toast.error(`Missing required columns: ${missing.join(', ')}. Found columns: ${lines[0]}`)
        setIsPreviewingCsv(false)
        setCsvFile(null)
        return
      }

      // Parse CSV data
      const students: Student[] = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        if (values.length >= 4) {
          students.push({
            id: values[idIndex],
            name: values[nameIndex],
            yearGroup: values[yearGroupIndex],
            parentName: values[parentNameIndex]
          })
        }
      }

      setCsvPreviewData(students)
      setIsPreviewingCsv(false)
    }

    reader.readAsBinaryString(file)
  }

  const handleConfirmCsvUpload = () => {
    if (!userCanEdit) return
    if (csvUploadDialog.groupId && csvPreviewData.length > 0) {
      const groupIndex = studentGroups.findIndex(g => g.id === csvUploadDialog.groupId)
      if (groupIndex !== -1) {
        const updatedGroups = [...studentGroups]
        const existingStudentIds = updatedGroups[groupIndex].students.map(s => s.id)
        const newStudents = csvPreviewData.filter(s => !existingStudentIds.includes(s.id))

        updatedGroups[groupIndex].students = [...updatedGroups[groupIndex].students, ...newStudents]
        setStudentGroups(updatedGroups)

        toast.success(`Added ${newStudents.length} students to group`)
        logActivity({
          action: "Import Students",
          module: "Discount Management",
          detail: `Imported ${newStudents.length} students via Excel to group "${updatedGroups[groupIndex].name}": ${newStudents.map(s => s.name).slice(0, 10).join(", ")}${newStudents.length > 10 ? ` and ${newStudents.length - 10} more` : ""}`
        })
        setCsvUploadDialog({ isOpen: false, groupId: null })
        setCsvFile(null)
        setCsvPreviewData([])
      }
    }
  }

  // Student search handlers
  const handleStudentSearch = (query: string) => {
    setStudentSearchQuery(query)

    if (query.trim().length < 2) {
      setStudentSearchResults([])
      setShowSearchResults(false)
      return
    }

    setIsSearching(true)

    // Simulate search delay
    setTimeout(() => {
      const lowercaseQuery = query.toLowerCase()
      const results = availableStudents.filter(student =>
        student.id.toLowerCase().includes(lowercaseQuery) ||
        student.name.toLowerCase().includes(lowercaseQuery)
      )

      setStudentSearchResults(results)
      setShowSearchResults(true)
      setIsSearching(false)
    }, 300)
  }

  const handleSelectSearchResult = (student: Student) => {
    setIndividualStudentForm({
      id: student.id,
      name: student.name,
      yearGroup: student.yearGroup,
      parentName: student.parentName
    })
    setStudentSearchQuery(student.name)
    setShowSearchResults(false)
    setStudentSearchResults([])
  }

  const clearStudentSearch = () => {
    setStudentSearchQuery("")
    setStudentSearchResults([])
    setShowSearchResults(false)
    setIndividualStudentForm({ id: "", name: "", yearGroup: "", parentName: "" })
  }

  // Individual Student handlers
  const handleAddIndividualStudent = () => {
    if (!userCanEdit) return
    const { id, name, yearGroup, parentName } = individualStudentForm

    if (!id || !name || !yearGroup || !parentName) {
      toast.error(t("discount.fillInAllFields"))
      return
    }

    if (addIndividualDialog.groupId) {
      const groupIndex = studentGroups.findIndex(g => g.id === addIndividualDialog.groupId)
      if (groupIndex !== -1) {
        const updatedGroups = [...studentGroups]
        const existingStudent = updatedGroups[groupIndex].students.find(s => s.id === id)

        if (existingStudent) {
          toast.error(t("discount.studentAlreadyExists"))
          return
        }

        const newStudent: Student = { id, name, yearGroup, parentName }
        updatedGroups[groupIndex].students = [...updatedGroups[groupIndex].students, newStudent]
        setStudentGroups(updatedGroups)

        toast.success(t("discount.studentAdded"))
        logActivity({ action: "Add Student", module: "Discount Management", detail: `Added student "${name}" (${id}) to group` })
        setAddIndividualDialog({ isOpen: false, groupId: null })
        setIndividualStudentForm({ id: "", name: "", yearGroup: "", parentName: "" })
        clearStudentSearch()
      }
    }
  }

  const resetDiscountForm = () => {
    setFormData({
      code: "",
      type: "percentage",
      value: 0,
      description: "",
      startDate: undefined,
      endDate: undefined,
      usageLimit: 100,
      targetTypes: [],
      minAmount: 0,
      category: "",
      period: "general",
      selectedStudents: [],
      applicableTerms: []
    })
    setEditingDiscount(null)
  }

  const resetGroupForm = () => {
    setGroupForm({
      name: "",
      financeCode: "",
      nominalCode: "",
      discountType: "percentage",
      discountPercentage: 0,
      fixedAmount: 0,
      departments: [],
      selectedStudents: [],
      isActive: true
    })
    setStudentInput("")
    setCurrentStudentsSearch("")
    setUploadedFile(null)
    setFileParseErrors([])
    setIsProcessingFile(false)
    setSelectedYearGroup("All")
  }

  const addStudentToGroup = () => {
    const studentId = studentInput.trim().toUpperCase()
    if (!studentId) {
      toast.error(t("discount.enterStudentID"))
      return
    }

    // Find student by ID (case-insensitive)
    const student = availableStudents.find(s => s.id.toUpperCase() === studentId)
    if (student && !groupForm.selectedStudents.find(s => s.id.toUpperCase() === studentId)) {
      setGroupForm(prev => ({
        ...prev,
        selectedStudents: [...prev.selectedStudents, student]
      }))
      setStudentInput("")
      toast.success(`Added ${student.name} (${student.id}) to group`)
      logActivity({ action: "Add Student", module: "Discount Management", detail: `Added student "${student.name}" (${student.id}) to group via ID lookup` })
    } else if (!student) {
      toast.error(`Student ID "${studentId}" not found. Available IDs: ${availableStudents.slice(0, 3).map(s => s.id).join(", ")}...`)
    } else {
      toast.error("Student already added to this group")
    }
  }

  const processCSVFile = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim())
    const errors: string[] = []
    const validStudents: Student[] = []

    // Skip header if present
    const dataLines = lines[0].includes('Student ID') || lines[0].includes('ID') ? lines.slice(1) : lines

    dataLines.forEach((line, index) => {
      const columns = line.split(',').map(col => col.trim().replace(/"/g, ''))

      if (columns.length < 1) {
        errors.push(`Line ${index + 1}: Empty line`)
        return
      }

      const studentId = columns[0].toUpperCase()

      if (!studentId) {
        errors.push(`Line ${index + 1}: Empty student ID`)
        return
      }

      // Check if student exists in database
      const existingStudent = availableStudents.find(s => s.id.toUpperCase() === studentId)
      if (!existingStudent) {
        errors.push(`Line ${index + 1}: Student ID "${studentId}" not found in database`)
        return
      }

      // Check for duplicates in current selection
      if (validStudents.find(s => s.id.toUpperCase() === studentId) ||
        groupForm.selectedStudents.find(s => s.id.toUpperCase() === studentId)) {
        errors.push(`Line ${index + 1}: Student ID "${studentId}" already selected`)
        return
      }

      validStudents.push(existingStudent)
    })

    return { validStudents, errors }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("discount.fileTooLarge"))
      return
    }

    setUploadedFile(file)
    setIsProcessingFile(true)
    setFileParseErrors([])

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: "binary" })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const text = XLSX.utils.sheet_to_csv(sheet)

        const { validStudents, errors } = processCSVFile(text)

        if (validStudents.length > 0) {
          setGroupForm(prev => ({
            ...prev,
            selectedStudents: [...prev.selectedStudents, ...validStudents]
          }))
          toast.success(`Successfully imported ${validStudents.length} students`)
          logActivity({
            action: "Import Students",
            module: "Discount Management",
            detail: `Imported ${validStudents.length} students from file: ${validStudents.map(s => s.name).slice(0, 10).join(", ")}${validStudents.length > 10 ? ` and ${validStudents.length - 10} more` : ""}`
          })
        }

        if (errors.length > 0) {
          setFileParseErrors(errors)
          if (validStudents.length === 0) {
            toast.error(`Failed to import students. Check file format.`)
          } else {
            toast.warning(`Imported ${validStudents.length} students with ${errors.length} errors`)
          }
        }
      } catch (error) {
        toast.error("Failed to process file. Please check the file format.")
        setFileParseErrors(["Failed to parse file. Please ensure it's a valid Excel file."])
      } finally {
        setIsProcessingFile(false)
      }
    }

    reader.onerror = () => {
      toast.error(t("discount.failedToReadFile"))
      setIsProcessingFile(false)
    }

    reader.readAsBinaryString(file)
  }

  const downloadStudentTemplate = () => {
    downloadAsXlsx(
      ["Student ID"],
      [],
      "student_ids_template"
    )
    toast.success(t("discount.studentIDTemplateDownloaded"))
    logActivity({ action: "Download Template", module: "Discount Management", detail: "Downloaded student ID template file" })
  }

  const removeStudentFromGroup = (studentId: string) => {
    if (!userCanEdit) return
    setGroupForm(prev => ({
      ...prev,
      selectedStudents: prev.selectedStudents.filter(s => s.id !== studentId)
    }))
  }

  const toggleStudentStatus = (studentId: string) => {
    if (!userCanEdit) return
    setGroupForm(prev => ({
      ...prev,
      selectedStudents: prev.selectedStudents.map(s =>
        s.id === studentId ? { ...s, isActive: !(s.isActive ?? true) } : s
      )
    }))
  }

  const performSaveGroup = () => {
    if (!userCanEdit) return
    const hasValidDiscount = groupForm.discountType === "percentage"
      ? groupForm.discountPercentage > 0
      : groupForm.fixedAmount > 0

    if (!groupForm.name || !hasValidDiscount) {
      toast.error(t("discount.fillRequiredFields"))
      return
    }

    if (editGroupDialog.group) {
      // Update existing group
      const updatedGroup = {
        ...editGroupDialog.group,
        name: groupForm.name,
        financeCode: groupForm.financeCode,
        nominalCode: groupForm.nominalCode,
        students: groupForm.selectedStudents,
        discountType: groupForm.discountType,
        discountPercentage: groupForm.discountPercentage,
        fixedAmount: groupForm.fixedAmount,
        departments: [departmentType], // Hardcoded based on category: Tuition Discount Groups apply to Tuition only. Bus Discount Groups apply to School Bus only.
        isActive: groupForm.isActive
      }

      setStudentGroups(prev => prev.map(g => g.id === editGroupDialog.group.id ? updatedGroup : g))
      toast.success(t("discount.groupUpdated"))
      logActivity({
        action: "Update Group",
        module: "Discount Management",
        detail: `Updated discount group "${groupForm.name}" with ${groupForm.selectedStudents.length} students: ${groupForm.selectedStudents.map(s => s.name).slice(0, 10).join(", ")}${groupForm.selectedStudents.length > 10 ? ` and ${groupForm.selectedStudents.length - 10} more` : ""}`
      })
      setEditGroupDialog({ isOpen: false, group: null })
    } else {
      // Create new group
      const newGroup = {
        id: `GRP${String(studentGroups.length + 1).padStart(3, '0')}`,
        name: groupForm.name,
        financeCode: groupForm.financeCode,
        nominalCode: groupForm.nominalCode,
        students: groupForm.selectedStudents,
        discountType: groupForm.discountType,
        discountPercentage: groupForm.discountPercentage,
        fixedAmount: groupForm.fixedAmount,
        departments: [departmentType], // Hardcoded based on category: Tuition Discount Groups apply to Tuition only. Bus Discount Groups apply to School Bus only.
        isActive: groupForm.isActive
      }

      setStudentGroups(prev => [...prev, newGroup])
      toast.success(t("discount.groupCreated"))
      logActivity({
        action: "Create Group",
        module: "Discount Management",
        detail: `Created discount group "${newGroup.name}" (${newGroup.id}) with ${newGroup.students.length} students: ${newGroup.students.map(s => s.name).slice(0, 10).join(", ")}${newGroup.students.length > 10 ? ` and ${newGroup.students.length - 10} more` : ""}`
      })
      setIsGroupDialogOpen(false)
    }
    resetGroupForm()
  }

  const handleSaveGroup = () => {
    saveDialog.confirm(() => {
      performSaveGroup()
    })
  }

  const handleViewGroup = (group: any) => {
    setViewGroupDialog({ isOpen: true, group })
  }

  const handleEditGroup = (group: any) => {
    if (!userCanEdit) return
    setEditGroupDialog({ isOpen: true, group })
    setGroupForm({
      name: group.name,
      financeCode: group.financeCode || "",
      nominalCode: group.nominalCode || "",
      discountType: group.discountType || "percentage",
      discountPercentage: group.discountPercentage,
      fixedAmount: group.fixedAmount || 0,
      departments: [...group.departments],
      selectedStudents: [...group.students],
      isActive: group.isActive ?? true
    })
  }

  const handleDeleteGroup = (group: any) => {
    if (!userCanEdit) return
    setDeleteConfirmDialog({ isOpen: true, group })
  }

  const confirmDeleteGroup = () => {
    if (deleteConfirmDialog.group) {
      setStudentGroups(prev => prev.filter(g => g.id !== deleteConfirmDialog.group.id))
      toast.success(t("discount.groupDeleted"))
      logActivity({ action: "Delete Group", module: "Discount Management", detail: `Deleted discount group "${deleteConfirmDialog.group.name}" (${deleteConfirmDialog.group.id})` })
      setDeleteConfirmDialog({ isOpen: false, group: null })
    }
  }

  const handleSaveDiscount = () => {
    if (!userCanEdit) return
    if (!formData.code || !formData.startDate || !formData.endDate) {
      toast.error("Please fill in all required fields")
      return
    }

    if (editingDiscount) {
      setDiscountCodes(prev => prev.map(discount =>
        discount.id === editingDiscount.id
          ? {
            ...discount,
            ...formData,
            startDate: formData.startDate!,
            endDate: formData.endDate!
          }
          : discount
      ))
      toast.success(t("discount.discountCodeUpdated"))
      logActivity({ action: "Update Discount Code", module: "Discount Management", detail: `Updated discount code "${formData.code}" (${formData.type}: ${formData.value})` })
    } else {
      const newDiscount: DiscountCode = {
        id: Date.now(),
        ...formData,
        startDate: formData.startDate!,
        endDate: formData.endDate!,
        usedCount: 0,
        isActive: true,
        createdBy: user?.name || "Admin"
      }
      setDiscountCodes(prev => [...prev, newDiscount])
      toast.success(t("discount.discountCodeCreated"))
      logActivity({ action: "Create Discount Code", module: "Discount Management", detail: `Created discount code "${formData.code}" (${formData.type}: ${formData.value})` })
    }

    setIsDialogOpen(false)
    resetDiscountForm()
  }

  const handleEditDiscount = (discount: DiscountCode) => {
    if (!userCanEdit) return
    setEditingDiscount(discount)
    setFormData({
      code: discount.code,
      type: discount.type,
      value: discount.value,
      description: discount.description,
      startDate: discount.startDate,
      endDate: discount.endDate,
      usageLimit: discount.usageLimit,
      targetTypes: discount.targetTypes,
      minAmount: discount.minAmount,
      category: discount.category,
      period: discount.period,
      selectedStudents: discount.selectedStudents,
      applicableTerms: discount.applicableTerms || []
    })
    setIsDialogOpen(true)
  }

  const toggleDiscountStatus = (id: number) => {
    if (!userCanEdit) return
    setDiscountCodes(prev => prev.map(discount =>
      discount.id === id
        ? { ...discount, isActive: !discount.isActive }
        : discount
    ))
    toast.success(t("discount.discountStatusUpdated"))
    const toggledDiscount = discountCodes.find(d => d.id === id)
    logActivity({ action: "Toggle Discount Status", module: "Discount Management", detail: `Toggled discount code "${toggledDiscount?.code}" to ${toggledDiscount?.isActive ? "inactive" : "active"}` })
  }

  const copyDiscountCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success(t("discount.discountCodeCopied"))
  }

  const getActiveTab = () => {
    switch (activeTab) {
      case "discount-overview":
        return "overview"
      case "student-groups":
        return "groups"
      case "waive-fee":
        return "waive-fee"
      case "discount-reports":
        return "reports"
      default:
        return "overview"
    }
  }

  const handleTabChange = (tabValue: string) => {
    if (!onTabChange) return
    switch (tabValue) {
      case "overview":
        onTabChange("discount-overview")
        break
      case "groups":
        onTabChange("student-groups")
        break
      case "waive-fee":
        onTabChange("waive-fee")
        break
      case "reports":
        onTabChange("discount-reports")
        break
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-3 md:p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
        <div>
          <h2 className="text-xl font-semibold">{t("menu.studentGroups")}</h2>
          <p className="text-sm text-muted-foreground">{t("discount.activeGroups")}</p>
        </div>
        <Dialog open={isGroupDialogOpen} onOpenChange={(open) => {
          if (!userCanEdit && open) return
          setIsGroupDialogOpen(open)
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => resetGroupForm()} disabled={!userCanEdit}>
              <Plus className="w-4 h-4 mr-2" />
              {t("discount.createStudentGroup")}
            </Button>
          </DialogTrigger>
        </Dialog>
      </div>
      <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="space-y-6">
        <TabsContent value="overview" className="space-y-6">
          {/* Overview Dashboard */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="rounded-xl gap-0">
              <CardContent className="p-4 pb-4">
                <p className="text-sm text-muted-foreground">{t("discount.studentGroupsCard")}</p>
                <p className="text-2xl font-bold">{studentGroups.length}</p>
              </CardContent>
            </Card>

            <Card className="rounded-xl gap-0">
              <CardContent className="p-4 pb-4">
                <p className="text-sm text-muted-foreground">{t("discount.totalSavings")}</p>
                <p className="text-2xl font-bold">฿127,500</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>{t("discount.topStudentGroups")}</CardTitle>
                <CardDescription>{t("discount.groupsHighestDiscount")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {studentGroups
                    .sort((a, b) => b.discountPercentage - a.discountPercentage)
                    .slice(0, 3)
                    .map((group) => (
                      <div key={group.id} className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{group.name}</h4>
                          <p className="text-sm text-muted-foreground">{group.departments.join(", ")}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {group.discountType === "fixed"
                              ? `฿${group.fixedAmount?.toLocaleString() || 0} discount`
                              : `${group.discountPercentage}% discount`
                            }
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {group.students.length} students
                          </p>
                        </div>
                      </div>
                    ))}
                  {studentGroups.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {t("discount.noStudentGroupsYet")}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("discount.groupsByDepartment")}</CardTitle>
                <CardDescription>{t("discount.distributionAcrossDept")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {["Tuition", "School Bus"].map((dept) => {
                    const count = studentGroups.filter(g => g.departments.includes(dept)).length
                    return (
                      <div key={dept} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${dept === 'Tuition' ? 'bg-blue-500' :
                            dept === 'After School' ? 'bg-green-500' :
                              dept === 'Event Management' ? 'bg-purple-500' : 'bg-orange-500'
                            }`} />
                          <span>{dept}</span>
                        </div>
                        <span className="font-medium">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("discount.studentCoverage")}</CardTitle>
                <CardDescription>{t("discount.studentsEnrolledTargeted")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Show student groups first */}
                  {studentGroups.slice(0, 3).map((group) => (
                    <div key={group.id} className="flex items-center justify-between py-2">
                      <div>
                        <h4 className="font-medium">{group.name} (Group)</h4>
                        <p className="text-xs text-muted-foreground">
                          {group.departments.join(", ")} • {group.discountType === "fixed" ? `฿${group.fixedAmount?.toLocaleString() || 0}` : `${group.discountPercentage}%`}
                        </p>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {group.students.length} students
                      </span>
                    </div>
                  ))}

                  {/* Then show individual discount codes */}
                  {discountCodes
                    .filter(d => d.selectedStudents.length > 0)
                    .slice(0, studentGroups.length > 0 ? 2 : 3)
                    .map((discount) => (
                      <div key={discount.id} className="flex items-center justify-between py-2">
                        <div>
                          <h4 className="font-medium">{discount.code}</h4>
                          <p className="text-xs text-muted-foreground">{discount.period} • {discount.targetTypes.join(", ")}</p>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {discount.selectedStudents.length} students
                        </span>
                      </div>
                    ))}

                  {studentGroups.length === 0 && discountCodes.filter(d => d.selectedStudents.length > 0).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {t("discount.noGroupsOrTargeted")}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="groups" className="space-y-6">
          <Dialog open={isGroupDialogOpen} onOpenChange={(open) => {
              if (!userCanEdit && open) return
              setIsGroupDialogOpen(open)
            }}>
              <DialogContent className="max-w-3xl p-6">
                <DialogHeader>
                  <DialogTitle>{t("discount.createStudentGroupTitle")}</DialogTitle>
                  <DialogDescription>
                    {t("discount.createStudentGroupDesc")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="group-name">{t("discount.groupName")} <span className="text-destructive">*</span></Label>
                    <Input
                      id="group-name"
                      value={groupForm.name}
                      onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                      placeholder={t("discount.groupNamePlaceholder")}
                      disabled={!userCanEdit}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Finance Code</Label>
                      <Input
                        placeholder="e.g. SCH-001"
                        value={groupForm.financeCode}
                        onChange={(e) => setGroupForm({ ...groupForm, financeCode: e.target.value })}
                        disabled={!userCanEdit}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nominal Code</Label>
                      <Input
                        placeholder="e.g. 4110001"
                        value={groupForm.nominalCode}
                        onChange={(e) => setGroupForm({ ...groupForm, nominalCode: e.target.value })}
                        disabled={!userCanEdit}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="group-discount-type">{t("discount.discountTypeLabel")} <span className="text-destructive">*</span></Label>
                      <Select
                        value={groupForm.discountType}
                        onValueChange={(value: "percentage" | "fixed") => setGroupForm({ ...groupForm, discountType: value })}
                        disabled={!userCanEdit}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">{t("discount.percentageOption")}</SelectItem>
                          <SelectItem value="fixed">{t("discount.fixedAmountOption")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {groupForm.discountType === "percentage" ? (
                      <div className="space-y-2">
                        <Label htmlFor="group-discount">{t("discount.discountPercentage")} <span className="text-destructive">*</span></Label>
                        <Input
                          id="group-discount"
                          type="number"
                          value={groupForm.discountPercentage}
                          onChange={(e) => setGroupForm({ ...groupForm, discountPercentage: Number(e.target.value) })}
                          placeholder="15"
                          min="0"
                          max="100"
                          disabled={!userCanEdit}
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="group-fixed-amount">{t("discount.fixedAmountLabel")} <span className="text-destructive">*</span></Label>
                        <Input
                          id="group-fixed-amount"
                          type="number"
                          value={groupForm.fixedAmount}
                          onChange={(e) => setGroupForm({ ...groupForm, fixedAmount: Number(e.target.value) })}
                          placeholder="1000"
                          min="0"
                          disabled={!userCanEdit}
                        />
                      </div>
                    )}
                  </div>

                  {/* Student ID Input Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>{t("discount.addStudentsToWhitelist")}</Label>
                      <span className="text-sm text-muted-foreground">
                        {t("discount.studentsAdded").replace("{count}", String(groupForm.selectedStudents.length))}
                      </span>
                    </div>



                    <Tabs defaultValue="individual" className="space-y-4">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="individual">{t("discount.individualInput")}</TabsTrigger>
                        <TabsTrigger value="csv-upload">{t("discount.csvUpload")}</TabsTrigger>
                      </TabsList>

                      <TabsContent value="individual" className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="student-input">{t("discount.searchAddStudent")}</Label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Input
                                id="student-input"
                                value={studentInput}
                                onChange={(e) => setStudentInput(e.target.value)}
                                onFocus={() => setIsInputFocused(true)}
                                onBlur={() => setTimeout(() => setIsInputFocused(false), 200)}
                                placeholder={searchPlaceholder}
                                disabled={!userCanEdit}
                              />
                            {/* Search Results Dropdown */}
                            {isInputFocused && (
                              <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {availableStudents.filter((s: Student) =>
                                  !groupForm.selectedStudents.find((sel: Student) => sel.id === s.id) &&
                                  matchesYearGroup(s.yearGroup, selectedYearGroup) &&
                                  (studentInput === "" || s.id.toLowerCase().includes(studentInput.toLowerCase()) ||
                                    s.name.toLowerCase().includes(studentInput.toLowerCase()))
                                ).length === 0 ? (
                                  <div className="px-3 py-4 text-sm text-center text-muted-foreground">No results found</div>
                                ) : (
                                  availableStudents
                                    .filter((s: Student) =>
                                      !groupForm.selectedStudents.find((sel: Student) => sel.id === s.id) &&
                                      matchesYearGroup(s.yearGroup, selectedYearGroup) &&
                                      (studentInput === "" || s.id.toLowerCase().includes(studentInput.toLowerCase()) ||
                                        s.name.toLowerCase().includes(studentInput.toLowerCase()))
                                    )
                                    .slice(0, 8)
                                    .map((student: Student) => (
                                      <div
                                        key={student.id}
                                        onMouseDown={(e: any) => {
                                          e.preventDefault()
                                          setGroupForm(prev => ({
                                            ...prev,
                                            selectedStudents: [...prev.selectedStudents, student]
                                          }))
                                          setStudentInput("")
                                          toast.success(`Added ${student.name} (${student.id})`)
                                          logActivity({ action: "Add Student", module: "Discount Management", detail: `Added student "${student.name}" (${student.id}) to group via dropdown` })
                                        }}
                                        className="px-3 py-2 hover:bg-muted cursor-pointer"
                                      >
                                        <div className="font-medium text-sm truncate">{student.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {student.id} • {student.yearGroup}
                                        </div>
                                      </div>
                                    ))
                                )}
                              </div>
                            )}
                            </div>
                            <Select
                              value={selectedYearGroup}
                              onValueChange={setSelectedYearGroup}
                              disabled={!userCanEdit}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder={t("discount.filterByYearGroup")} />
                              </SelectTrigger>
                              <SelectContent>
                                {uniqueYearGroups.map(group => (
                                  <SelectItem key={group} value={group}>
                                    {group === "All" ? t("discount.allYearGroups") : group}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {t("discount.selectYearGroupHint")}
                          </p>
                        </div>
                      </TabsContent>

                      <TabsContent value="csv-upload" className="space-y-4">
                        <div className="space-y-4">
                          {/* Excel Template */}
                          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                            <div>
                              <p className="font-medium">Excel Template</p>
                              <p className="text-sm text-muted-foreground">Download the template with correct column headers</p>
                            </div>
                            <Button variant="outline" onClick={downloadStudentTemplate}>
                              <Download className="w-4 h-4 mr-2" />
                              {t("discount.downloadTemplate")}
                            </Button>
                          </div>

                          {/* Upload File */}
                          <div className="space-y-2">
                            <Label htmlFor="csv-file-upload">{t("discount.uploadStudentCSV")} <span className="text-destructive">*</span></Label>
                            <Input
                              id="csv-file-upload"
                              type="file"
                              accept=".xlsx,.xls"
                              onChange={handleFileUpload}
                              className="cursor-pointer"
                              disabled={isProcessingFile || !userCanEdit}
                            />
                          </div>

                          {uploadedFile && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 p-2 bg-muted rounded">
                                <FileText className="w-4 h-4" />
                                <span className="text-sm">{uploadedFile.name}</span>
                                {isProcessingFile && (
                                  <div className="ml-auto">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                  </div>
                                )}
                              </div>

                              {fileParseErrors.length > 0 && (
                                <div className="bg-destructive/10 border border-destructive/20 rounded p-3">
                                  <h4 className="text-sm font-medium text-destructive mb-2">
                                    {t("discount.fileProcessErrors").replace("{count}", String(fileParseErrors.length))}
                                  </h4>
                                  <div className="max-h-24 overflow-y-auto text-xs text-destructive space-y-1">
                                    {fileParseErrors.map((error, index) => (
                                      <div key={index}>{error}</div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="text-xs text-muted-foreground space-y-1">
                            <p><strong>{t("discount.fileFormatReq")}</strong></p>
                            <p>• {t("discount.csvFileID")}</p>
                            <p>• {t("discount.csvOptionalHeader")}</p>
                            <p>• {t("discount.csvIDFormat")}</p>
                            <p>• {t("discount.csvOnePerRow")}</p>
                            <p>• {t("discount.csvMaxSize")}</p>
                          </div>

                          <div className="bg-muted/50 p-3 rounded text-xs">
                            <strong>Example Excel content:</strong>
                            <pre className="mt-1 text-muted-foreground">
                              Student ID{'\n'}KC2024001{'\n'}KC2024002{'\n'}KC2024003
                            </pre>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>

                    {/* Selected Students Preview */}
                    {groupForm.selectedStudents.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>{t("discount.selectedStudents").replace("{count}", String(groupForm.selectedStudents.length))}</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setGroupForm(prev => ({ ...prev, selectedStudents: [] }))}
                            disabled={!userCanEdit}
                          >
                            {t("discount.clearAll")}
                          </Button>
                        </div>
                        <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                          <div className="grid grid-cols-1 gap-2">
                            {groupForm.selectedStudents.map(student => (
                              <div key={student.id} className={`flex items-center justify-between p-2 rounded text-sm ${student.isActive === false ? 'bg-muted/30 opacity-60' : 'bg-muted/50'}`}>
                                <div className="flex items-center gap-2">
                                  <div>
                                    <span className="font-medium">{student.name}</span>
                                    <span className="text-muted-foreground ml-2">({student.id})</span>
                                    <span className="text-muted-foreground ml-2">{student.yearGroup}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    <Switch
                                      checked={student.isActive !== false}
                                      onCheckedChange={() => toggleStudentStatus(student.id)}
                                      disabled={!userCanEdit}
                                    />
                                    <span className={`text-xs ${student.isActive === false ? 'text-gray-400' : 'text-green-600'}`}>
                                      {student.isActive === false ? t("discount.studentInactiveStatus") : t("discount.studentActiveStatus")}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeStudentFromGroup(student.id)}
                                    className="text-red-600 hover:text-red-800 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={!userCanEdit}
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsGroupDialogOpen(false)}>
                      {t("discount.cancelBtn")}
                    </Button>
                    <Button onClick={handleSaveGroup} disabled={!userCanEdit}>
                      {t("discount.createGroup")}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

          {/* Student Groups Display */}
          <div className="space-y-4">
            {studentGroups.map((group) => (
              <Card key={group.id} className={group.isActive === false ? "opacity-60" : ""}>
                <CardContent className="p-3 md:p-6">
                  <div className="flex flex-col md:flex-row items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium">{group.name}</h4>
                        <Badge variant={group.isActive === false ? "outline" : "secondary"} className={group.isActive === false ? "text-gray-500" : ""}>
                          {group.discountType === "fixed"
                            ? `฿${group.fixedAmount?.toLocaleString() || 0} ${t("discount.discount")}`
                            : `${group.discountPercentage}% ${t("discount.discount")}`
                          }
                        </Badge>
                        {group.isActive === false && (
                          <Badge variant="outline" className="text-red-500 border-red-300">{t("discount.disabled")}</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <Users className="w-4 h-4" />
                        <span>{t("discount.studentsInWhitelist").replace("{count}", String(group.students.length))}</span>
                      </div>

                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button variant="ghost" size="sm" onClick={() => handleViewGroup(group)}>
                        <Eye className="w-4 h-4 mr-1" />
                        {t("discount.viewAll")}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEditGroup(group)} disabled={!userCanEdit}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteGroup(group)}
                        disabled={!userCanEdit}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {studentGroups.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-medium mb-2">{t("discount.noStudentGroups")}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("discount.noStudentGroupsDesc")}
                  </p>
                  <Button onClick={() => setIsGroupDialogOpen(true)} disabled={!userCanEdit}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("discount.createStudentGroup")}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* View Group Dialog */}
          <Dialog open={viewGroupDialog.isOpen} onOpenChange={(open) => setViewGroupDialog({ isOpen: open, group: null })}>
            <DialogContent className="max-w-4xl p-6">
              <DialogHeader>
                <DialogTitle>
                  {t("discount.studentListTitle").replace("{name}", viewGroupDialog.group?.name ?? "")}
                </DialogTitle>
                <DialogDescription>
                  {t("discount.completeStudentList")}
                </DialogDescription>
              </DialogHeader>

              {viewGroupDialog.group && (
                <div className="space-y-4">
                  <div className="bg-muted/30 rounded-xl p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
                      <div className="space-y-4">
                        <div className="flex flex-col">
                          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold mb-2">Group Details</span>
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 text-sm font-bold">
                              {viewGroupDialog.group.discountType === "fixed"
                                ? `฿${viewGroupDialog.group.fixedAmount?.toLocaleString() || 0} ${t("discount.discount")}`
                                : `${viewGroupDialog.group.discountPercentage}% ${t("discount.discount")}`
                              }
                            </Badge>
                            <div className="flex items-center gap-2 text-sm text-gray-600 font-medium px-3 py-1.5 bg-white rounded-lg border border-gray-100 shadow-sm">
                              <Users className="w-4 h-4 text-blue-500" />
                              {t("discount.studentsTotal").replace("{count}", String(viewGroupDialog.group.students.length))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {(viewGroupDialog.group.financeCode || viewGroupDialog.group.nominalCode) && (
                        <div className="flex gap-6 md:gap-8">
                          {viewGroupDialog.group.financeCode && (
                            <div className="space-y-1">
                              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold block mb-1">Finance Code</span>
                              <span className="text-sm font-bold text-gray-900">{viewGroupDialog.group.financeCode}</span>
                            </div>
                          )}
                          {viewGroupDialog.group.nominalCode && (
                            <div className="space-y-1">
                              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold block mb-1">Nominal Code</span>
                              <span className="text-sm font-bold text-gray-900">{viewGroupDialog.group.nominalCode}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    <div className="grid gap-2">
                      {viewGroupDialog.group.students.map((student: Student) => (
                        <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{student.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {student.id} • {student.yearGroup}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const group = viewGroupDialog.group
                          if (!group) return
                          const headers = ["Student ID", "Name", "Year Group"]
                          const rows = group.students.map((s: Student) => [s.id, s.name, s.yearGroup])
                          downloadAsXlsx(headers, rows, `${group.name}-student-list`)
                        }}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {t("discount.downloadList")}
                      </Button>
                    </div>
                    <Button onClick={() => setViewGroupDialog({ isOpen: false, group: null })}>
                      {t("discount.close")}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Edit Group Dialog */}
          <Dialog open={editGroupDialog.isOpen} onOpenChange={(open) => {
            if (!userCanEdit && open) return
            if (!open) {
              setEditGroupDialog({ isOpen: false, group: null })
              resetGroupForm()
            }
          }}>
            <DialogContent className="max-w-3xl p-6">
              <DialogHeader>
                <DialogTitle>{t("discount.editStudentGroup")}</DialogTitle>
                <DialogDescription>
                  {t("discount.editStudentGroupDesc")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Enable/Disable Group Toggle */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <Label className="text-base font-medium">{t("discount.enableGroup")}</Label>
                    <p className="text-sm text-muted-foreground">{t("discount.enableGroupDesc")}</p>
                  </div>
                  <Switch
                    checked={groupForm.isActive}
                    onCheckedChange={(checked) => setGroupForm({ ...groupForm, isActive: checked })}
                    disabled={!userCanEdit}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-group-name">{t("discount.groupName")} <span className="text-destructive">*</span></Label>
                  <Input
                    id="edit-group-name"
                    value={groupForm.name}
                    onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                    placeholder={t("discount.groupNamePlaceholder")}
                    disabled={!userCanEdit}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Finance Code</Label>
                    <Input
                      placeholder="e.g. SCH-001"
                      value={groupForm.financeCode}
                      onChange={(e) => setGroupForm({ ...groupForm, financeCode: e.target.value })}
                      disabled={!userCanEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nominal Code</Label>
                    <Input
                      placeholder="e.g. 4110001"
                      value={groupForm.nominalCode}
                      onChange={(e) => setGroupForm({ ...groupForm, nominalCode: e.target.value })}
                      disabled={!userCanEdit}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-group-discount-type">{t("discount.discountTypeLabel")} <span className="text-destructive">*</span></Label>
                    <Select
                      value={groupForm.discountType}
                      onValueChange={(value: "percentage" | "fixed") => setGroupForm({ ...groupForm, discountType: value })}
                      disabled={!userCanEdit}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">{t("discount.percentageOption")}</SelectItem>
                        <SelectItem value="fixed">{t("discount.fixedAmountOption")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {groupForm.discountType === "percentage" ? (
                    <div className="space-y-2">
                      <Label htmlFor="edit-group-discount">{t("discount.discountPercentage")}</Label>
                      <Input
                        id="edit-group-discount"
                        type="number"
                        value={groupForm.discountPercentage}
                        onChange={(e) => setGroupForm({ ...groupForm, discountPercentage: Number(e.target.value) })}
                        placeholder="15"
                        min="0"
                        max="100"
                        disabled={!userCanEdit}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="edit-group-fixed-amount">{t("discount.fixedAmountLabel")}</Label>
                      <Input
                        id="edit-group-fixed-amount"
                        type="number"
                        value={groupForm.fixedAmount}
                        onChange={(e) => setGroupForm({ ...groupForm, fixedAmount: Number(e.target.value) })}
                        placeholder="1000"
                        min="0"
                        disabled={!userCanEdit}
                      />
                    </div>
                  )}
                </div>

                {/* Student Management Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>{t("discount.manageStudentsWhitelist")}</Label>
                    <span className="text-sm text-muted-foreground">
                      {t("discount.studentsAdded").replace("{count}", String(groupForm.selectedStudents.length))}
                    </span>
                  </div>

                  <Tabs defaultValue="students" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="students">{t("discount.currentStudentsTab").replace("{count}", String(groupForm.selectedStudents.length))}</TabsTrigger>
                      <TabsTrigger value="csv-upload">{t("discount.csvUpload")}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="students" className="space-y-3">
                      {/* Add Student Search + Year Group Filter */}
                      <div className="space-y-2">
                        <Label htmlFor="edit-student-input">{t("discount.searchAddStudent")}</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              id="edit-student-input"
                              value={studentInput}
                              onChange={(e) => setStudentInput(e.target.value)}
                              placeholder={searchPlaceholder}
                            />
                          {/* Search Results Dropdown */}
                          {studentInput.length >= 1 && (
                            <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                              {availableStudents
                                .filter(s =>
                                  !groupForm.selectedStudents.find(sel => sel.id === s.id) &&
                                  (s.id.toLowerCase().includes(studentInput.toLowerCase()) ||
                                    s.name.toLowerCase().includes(studentInput.toLowerCase())) &&
                                  (studentYearGroupFilter === "all" || s.yearGroup === studentYearGroupFilter)
                                )
                                .slice(0, 10)
                                .map(student => (
                                  <div
                                    key={student.id}
                                    className="group flex items-center justify-between px-4 py-3.5 hover:bg-blue-50/80 cursor-pointer rounded-lg transition-all duration-200 border border-gray-100 hover:border-blue-200 hover:shadow-sm mb-2 last:mb-0 bg-white"
                                    onClick={() => {
                                      setGroupForm(prev => ({
                                        ...prev,
                                        selectedStudents: [...prev.selectedStudents, student]
                                      }))
                                      setStudentInput("")
                                      toast.success(`Added ${student.name} (${student.id})`)
                                      logActivity({ action: "Add Student", module: "Discount Management", detail: `Added student "${student.name}" (${student.id}) to group via dropdown` })
                                    }}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="font-semibold text-[15px] text-gray-900 truncate group-hover:text-blue-900 transition-colors">{student.name}</div>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="inline-flex items-center text-xs font-mono font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                                          ID: {student.id}
                                        </span>
                                        <span className="text-xs text-gray-500">•</span>
                                        <span className="text-xs text-gray-600 font-medium">{student.yearGroup}</span>
                                      </div>
                                    </div>
                                    <div className="h-8 w-8 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-200 group-hover:scale-110 flex-shrink-0 ml-3">
                                      <Plus className="h-4 w-4 stroke-[2.5]" />
                                    </div>
                                  </div>
                                ))}
                              {availableStudents.filter(s =>
                                !groupForm.selectedStudents.find(sel => sel.id === s.id) &&
                                (s.id.toLowerCase().includes(studentInput.toLowerCase()) ||
                                  s.name.toLowerCase().includes(studentInput.toLowerCase())) &&
                                (studentYearGroupFilter === "all" || s.yearGroup === studentYearGroupFilter)
                              ).length === 0 && (
                                  <div className="px-3 py-2 text-sm text-muted-foreground">
                                    No students found
                                  </div>
                                )}
                            </div>
                          )}
                          </div>
                          <Select value={studentYearGroupFilter} onValueChange={setStudentYearGroupFilter}>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="All Year Groups" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Year Groups</SelectItem>
                              {Array.from(new Set(groupForm.selectedStudents.map(s => s.yearGroup))).sort().map(yg => (
                                <SelectItem key={yg} value={yg}>{yg}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t("discount.typeToSearchStudent")}
                        </p>
                      </div>

                      {/* Current Student List */}
                      {groupForm.selectedStudents.length > 0 ? (
                        <div className="space-y-3">
                          <div className="border rounded-lg p-3 max-h-60 overflow-y-auto">
                            <div className="grid gap-2">
                              {groupForm.selectedStudents
                                .filter(student =>
                                  (student.name.toLowerCase().includes(studentInput.toLowerCase()) ||
                                  student.id.toLowerCase().includes(studentInput.toLowerCase()) ||
                                  studentInput === "") &&
                                  (studentYearGroupFilter === "all" || student.yearGroup === studentYearGroupFilter)
                                )
                                .map(student => (
                                  <div key={student.id} className={`flex items-center justify-between p-2 rounded text-sm ${student.isActive === false ? 'bg-muted/30 opacity-60' : 'bg-muted/50'}`}>
                                    <div className="flex items-center gap-2">
                                      <div>
                                        <span className="font-medium">{student.name}</span>
                                        <span className="text-muted-foreground ml-2">({student.id})</span>
                                        <span className="text-muted-foreground ml-2">{student.yearGroup}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-1">
                                        <Switch
                                          checked={student.isActive !== false}
                                          onCheckedChange={() => toggleStudentStatus(student.id)}
                                          disabled={!userCanEdit}
                                        />
                                        <span className={`text-xs ${student.isActive === false ? 'text-gray-400' : 'text-green-600'}`}>
                                          {student.isActive === false ? t("discount.studentInactiveStatus") : t("discount.studentActiveStatus")}
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => removeStudentFromGroup(student.id)}
                                        className="text-red-600 hover:text-red-800 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={!userCanEdit}
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          {t("discount.noStudentsInGroup")}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="csv-upload" className="space-y-3">
                      <div className="space-y-4">
                        {/* Excel Template */}
                        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                          <div>
                            <p className="font-medium">Excel Template</p>
                            <p className="text-sm text-muted-foreground">Download the template with correct column headers</p>
                          </div>
                          <Button variant="outline" onClick={downloadStudentTemplate}>
                            <Download className="w-4 h-4 mr-2" />
                            {t("discount.downloadTemplate")}
                          </Button>
                        </div>

                        {/* Upload File */}
                        <div className="space-y-2">
                          <Label htmlFor="edit-csv-file">{t("discount.uploadStudentCSV")} <span className="text-destructive">*</span></Label>
                          <Input
                            id="edit-csv-file"
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileUpload}
                            className="cursor-pointer"
                            disabled={!userCanEdit}
                          />
                        </div>

                        {uploadedFile && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                              <FileText className="h-4 w-4" />
                              <span className="text-sm font-medium">{uploadedFile.name}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setUploadedFile(null)
                                  setFileParseErrors([])
                                }}
                                className="ml-auto p-1"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>

                            {isProcessingFile && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                {t("discount.processingFile")}
                              </div>
                            )}

                            {fileParseErrors.length > 0 && (
                              <div className="space-y-2">
                                <Label>{t("discount.importErrors")}</Label>
                                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 max-h-32 overflow-y-auto">
                                  {fileParseErrors.map((error, index) => (
                                    <div key={index} className="text-sm text-destructive">
                                      {error}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => {
                    setEditGroupDialog({ isOpen: false, group: null })
                    resetGroupForm()
                  }}>
                    {t("discount.cancelBtn")}
                  </Button>
                  <Button onClick={handleSaveGroup} disabled={!userCanEdit}>
                    {t("discount.updateGroup")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={deleteConfirmDialog.isOpen} onOpenChange={(open) => {
            if (!open) setDeleteConfirmDialog({ isOpen: false, group: null })
          }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("discount.deleteStudentGroup")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("discount.deleteGroupConfirm")}
                </AlertDialogDescription>
              </AlertDialogHeader>

              {deleteConfirmDialog.group && (
                <div className="p-4 bg-muted/50 rounded-lg my-4">
                  <div className="font-medium mb-1">{deleteConfirmDialog.group.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {deleteConfirmDialog.group.students.length} students • {deleteConfirmDialog.group.discountType === "fixed" ? `฿${deleteConfirmDialog.group.fixedAmount?.toLocaleString() || 0}` : `${deleteConfirmDialog.group.discountPercentage}%`} {t("discount.discount")}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("discount.departments")} {deleteConfirmDialog.group.departments.join(", ")}
                  </div>
                </div>
              )}

              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteConfirmDialog({ isOpen: false, group: null })}>
                  {t("discount.cancelBtn")}
                </AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeleteGroup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" style={{ backgroundColor: '#dc2626', color: '#ffffff' }}>
                  {t("discount.deleteGroup")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        <TabsContent value="waive-fee" className="space-y-6">
          <WaiveFeeManagement onNavigateToSubPage={onNavigateToSubPage} />
        </TabsContent>
      </Tabs>

      {/* CSV Upload Dialog */}
      <Dialog open={csvUploadDialog.isOpen} onOpenChange={(open) => {
        if (!userCanEdit && open) return
        if (!open) {
          setCsvUploadDialog({ isOpen: false, groupId: null })
          setCsvFile(null)
          setCsvPreviewData([])
          setIsPreviewingCsv(false)
        }
      }}>
        <DialogContent className="max-w-4xl p-6">
          <DialogHeader>
            <DialogTitle>{t("discount.uploadStudentsCSV")}</DialogTitle>
            <DialogDescription>
              {t("discount.uploadCSVDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!csvFile && (
              <div
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 hover:border-primary/50 transition-colors"
                onDragOver={(e) => {
                  e.preventDefault()
                  e.currentTarget.classList.add('border-primary', 'bg-primary/5')
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                  e.currentTarget.classList.remove('border-primary', 'bg-primary/5')
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.currentTarget.classList.remove('border-primary', 'bg-primary/5')
                  const file = e.dataTransfer.files?.[0]
                  if (file && file.type === 'text/csv') {
                    handleCsvUpload(file)
                  } else {
                    toast.error("Please upload an Excel file")
                  }
                }}
              >
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">{t("discount.uploadCSVFile")}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("discount.dragDropCSV")}
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleCsvUpload(file)
                    }}
                    className="hidden"
                    id="csv-upload"
                  />
                  <Button variant="outline" asChild className="cursor-pointer">
                    <label htmlFor="csv-upload">
                      {t("discount.selectCSVFile")}
                    </label>
                  </Button>
                </div>
              </div>
            )}

            {isPreviewingCsv && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">{t("discount.processingCSV")}</p>
              </div>
            )}

            {csvFile && csvPreviewData.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{t("discount.previewStudentsFound").replace("{count}", String(csvPreviewData.length))}</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCsvFile(null)
                      setCsvPreviewData([])
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                </div>

                <div className="max-h-60 overflow-y-auto border rounded-lg">
                  <div className="grid gap-2 p-4">
                    {csvPreviewData.map((student, index) => (
                      <div key={index} className="p-2 bg-muted/50 rounded">
                        <div className="font-medium text-sm">{student.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {student.id} • {student.yearGroup}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCsvUploadDialog({ isOpen: false, groupId: null })}>
                {t("discount.cancelBtn")}
              </Button>
              <Button
                onClick={handleConfirmCsvUpload}
                disabled={!csvFile || csvPreviewData.length === 0 || !userCanEdit}
              >
                {t("discount.addStudentsBtn").replace("{count}", String(csvPreviewData.length))}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Individual Student Dialog */}
      <Dialog open={addIndividualDialog.isOpen} onOpenChange={(open) => {
        if (!userCanEdit && open) return
        if (!open) {
          setAddIndividualDialog({ isOpen: false, groupId: null })
          setIndividualStudentForm({ id: "", name: "", yearGroup: "", parentName: "" })
          clearStudentSearch()
        }
      }}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>{t("discount.addIndividualStudent")}</DialogTitle>
            <DialogDescription>
              {t("discount.addIndividualStudentDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Student Search */}
            <div className="space-y-2">
              <Label htmlFor="student-search">{t("discount.searchStudentLabel")}</Label>
              <div className="relative">
                <Input
                  id="student-search"
                  value={studentSearchQuery}
                  onChange={(e) => handleStudentSearch(e.target.value)}
                  placeholder={t("discount.searchStudentPlaceholder")}
                  className="pl-10 pr-10"
                />
                {studentSearchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearStudentSearch}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}

                {/* Search Results Dropdown */}
                {showSearchResults && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {isSearching ? (
                      <div className="p-3 text-center text-muted-foreground">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto mb-2"></div>
                        {t("discount.searching")}
                      </div>
                    ) : studentSearchResults.length > 0 ? (
                      studentSearchResults.slice(0, 8).map((student) => (
                        <div
                          key={student.id}
                          onClick={() => handleSelectSearchResult(student)}
                          className="px-3 py-2 hover:bg-muted cursor-pointer"
                        >
                          <div className="font-medium truncate">{student.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {student.id} • {student.yearGroup}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-sm text-center text-muted-foreground">No results found</div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Search by Student ID (e.g., KC2024001) or Name to auto-fill the form
              </p>
            </div>

            {/* Manual Form Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="student-id">{t("discount.studentIDLabel")}</Label>
                <Input
                  id="student-id"
                  value={individualStudentForm.id}
                  onChange={(e) => setIndividualStudentForm({ ...individualStudentForm, id: e.target.value })}
                  placeholder="KC2024001"
                  disabled={!userCanEdit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-name">{t("discount.studentNameLabel")}</Label>
                <Input
                  id="student-name"
                  value={individualStudentForm.name}
                  onChange={(e) => setIndividualStudentForm({ ...individualStudentForm, name: e.target.value })}
                  placeholder="Emma Johnson"
                  disabled={!userCanEdit}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year-group">{t("discount.yearGroupLabel")}</Label>
                <Select
                  value={individualStudentForm.yearGroup}
                  onValueChange={(value) => setIndividualStudentForm({ ...individualStudentForm, yearGroup: value })}
                  disabled={!userCanEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("discount.filterByYearGroup")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pre-Nursery">Pre-Nursery</SelectItem>
                    <SelectItem value="Nursery">Nursery</SelectItem>
                    <SelectItem value="Reception">Reception</SelectItem>
                    {Array.from({ length: 13 }, (_, i) => (
                      <SelectItem key={i + 1} value={`Year ${i + 1}`}>Year {i + 1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent-name">{t("discount.parentNameLabel")}</Label>
                <Input
                  id="parent-name"
                  disabled={!userCanEdit}
                  value={individualStudentForm.parentName}
                  onChange={(e) => setIndividualStudentForm({ ...individualStudentForm, parentName: e.target.value })}
                  placeholder="Sarah Johnson"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddIndividualDialog({ isOpen: false, groupId: null })}>
                {t("discount.cancelBtn")}
              </Button>
              <Button onClick={handleAddIndividualStudent} disabled={!userCanEdit}>
                {t("discount.addStudentBtn")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog for Save */}
      <ConfirmDialog
        open={saveDialog.isOpen}
        onOpenChange={saveDialog.setIsOpen}
        onConfirm={saveDialog.handleConfirm}
        titleKey="confirmDialog.saveTitle"
        descriptionKey="confirmDialog.saveDescription"
        confirmTextKey="common.save"
      />
    </div>
  )
}