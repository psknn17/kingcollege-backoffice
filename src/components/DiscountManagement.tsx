import { useState, useMemo, useEffect, useRef } from "react"
import { downloadAsXlsx } from "@/utils/xlsxUtils"
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
      yearGroup: student.gradeLevel,
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
        name: "Year 7 Excellence",
        students: year7Students,
        discountType: "percentage" as "percentage" | "fixed",
        discountPercentage: 15,
        fixedAmount: 0,
        departments: [department],
        isActive: true
      },
      {
        id: "GRP002",
        name: "Secondary School Scholarship",
        students: [...year8Students, ...year9Students, ...year10Students],
        discountType: "percentage" as "percentage" | "fixed",
        discountPercentage: 10,
        fixedAmount: 0,
        departments: [department], // Discount applies to Tuition only
        isActive: true
      },
      {
        id: "GRP003",
        name: "Senior School Merit",
        students: [...year11Students, ...year12Students, ...year13Students],
        discountType: "fixed" as "percentage" | "fixed",
        discountPercentage: 0,
        fixedAmount: 25000,
        departments: [department],
        isActive: true
      },
      {
        id: "GRP004",
        name: "Primary School Support",
        students: [...year3Students, ...year4Students, ...year5Students],
        discountType: "percentage" as "percentage" | "fixed",
        discountPercentage: 5,
        fixedAmount: 0,
        departments: [department], // Discount applies to Tuition only
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
      const text = e.target?.result as string
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

    reader.readAsText(file)
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
      toast.error("Please fill in all fields")
      return
    }

    if (addIndividualDialog.groupId) {
      const groupIndex = studentGroups.findIndex(g => g.id === addIndividualDialog.groupId)
      if (groupIndex !== -1) {
        const updatedGroups = [...studentGroups]
        const existingStudent = updatedGroups[groupIndex].students.find(s => s.id === id)

        if (existingStudent) {
          toast.error("Student with this ID already exists in the group")
          return
        }

        const newStudent: Student = { id, name, yearGroup, parentName }
        updatedGroups[groupIndex].students = [...updatedGroups[groupIndex].students, newStudent]
        setStudentGroups(updatedGroups)

        toast.success("Student added successfully")
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
      toast.error("Please enter a student ID")
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
      toast.error("File size too large. Maximum size is 5MB.")
      return
    }

    setUploadedFile(file)
    setIsProcessingFile(true)
    setFileParseErrors([])

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const { validStudents, errors } = processCSVFile(text)

        if (validStudents.length > 0) {
          setGroupForm(prev => ({
            ...prev,
            selectedStudents: [...prev.selectedStudents, ...validStudents]
          }))
          toast.success(`Successfully imported ${validStudents.length} students`)
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
        setFileParseErrors(["Failed to parse file. Please ensure it's a valid CSV file."])
      } finally {
        setIsProcessingFile(false)
      }
    }

    reader.onerror = () => {
      toast.error("Failed to read file")
      setIsProcessingFile(false)
    }

    reader.readAsText(file)
  }

  const downloadStudentTemplate = () => {
    downloadAsXlsx(
      ["Student ID"],
      [["KC2024001"], ["KC2024002"], ["KC2024003"], ["KC2024004"], ["KC2024005"]],
      "student_ids_template"
    )
    toast.success("Student ID template downloaded")
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
      toast.error("Please fill in all required fields")
      return
    }

    if (editGroupDialog.group) {
      // Update existing group
      const updatedGroup = {
        ...editGroupDialog.group,
        name: groupForm.name,
        students: groupForm.selectedStudents,
        discountType: groupForm.discountType,
        discountPercentage: groupForm.discountPercentage,
        fixedAmount: groupForm.fixedAmount,
        departments: [departmentType], // Hardcoded based on category: Tuition Discount Groups apply to Tuition only. Bus Discount Groups apply to School Bus only.
        isActive: groupForm.isActive
      }

      setStudentGroups(prev => prev.map(g => g.id === editGroupDialog.group.id ? updatedGroup : g))
      toast.success("Student group updated successfully")
      setEditGroupDialog({ isOpen: false, group: null })
    } else {
      // Create new group
      const newGroup = {
        id: `GRP${String(studentGroups.length + 1).padStart(3, '0')}`,
        name: groupForm.name,
        students: groupForm.selectedStudents,
        discountType: groupForm.discountType,
        discountPercentage: groupForm.discountPercentage,
        fixedAmount: groupForm.fixedAmount,
        departments: [departmentType], // Hardcoded based on category: Tuition Discount Groups apply to Tuition only. Bus Discount Groups apply to School Bus only.
        isActive: groupForm.isActive
      }

      setStudentGroups(prev => [...prev, newGroup])
      toast.success("Student group created successfully")
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
      toast.success("Student group deleted successfully")
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
      toast.success("Discount code updated successfully")
    } else {
      const newDiscount: DiscountCode = {
        id: Date.now(),
        ...formData,
        startDate: formData.startDate!,
        endDate: formData.endDate!,
        usedCount: 0,
        isActive: true,
        createdBy: "Admin"
      }
      setDiscountCodes(prev => [...prev, newDiscount])
      toast.success("Discount code created successfully")
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
    toast.success("Discount status updated")
  }

  const copyDiscountCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success("Discount code copied to clipboard")
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
      <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="space-y-6">
        <TabsContent value="overview" className="space-y-6">
          {/* Overview Dashboard */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Student Groups</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {studentGroups.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  active groups
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">฿127,500</div>
                <p className="text-xs text-muted-foreground">
                  provided to families
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Top Student Groups</CardTitle>
                <CardDescription>Groups with highest discount rates</CardDescription>
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
                      No student groups created yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Groups by Department</CardTitle>
                <CardDescription>Distribution across departments</CardDescription>
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
                <CardTitle>Student Coverage</CardTitle>
                <CardDescription>Students enrolled in targeted discounts</CardDescription>
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
                      No student groups or targeted discounts available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="groups" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">{t("menu.studentGroups")}</h3>
            </div>

            <Dialog open={isGroupDialogOpen} onOpenChange={(open) => {
              if (!userCanEdit && open) return
              setIsGroupDialogOpen(open)
            }}>
              <DialogTrigger asChild>
                <Button onClick={() => resetGroupForm()} disabled={!userCanEdit}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Student Group
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl p-6">
                <DialogHeader>
                  <DialogTitle>Create Student Group</DialogTitle>
                  <DialogDescription>
                    Create a group of students with specific discount for selected departments
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="group-name">Group Name</Label>
                    <Input
                      id="group-name"
                      value={groupForm.name}
                      onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                      placeholder="Year 7 Excellence Group"
                      disabled={!userCanEdit}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="group-discount-type">Discount Type</Label>
                      <Select
                        value={groupForm.discountType}
                        onValueChange={(value: "percentage" | "fixed") => setGroupForm({ ...groupForm, discountType: value })}
                        disabled={!userCanEdit}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Amount (฿)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {groupForm.discountType === "percentage" ? (
                      <div className="space-y-2">
                        <Label htmlFor="group-discount">Discount Percentage %</Label>
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
                        <Label htmlFor="group-fixed-amount">Fixed Amount ฿</Label>
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
                      <Label>Add Students to Whitelist</Label>
                      <span className="text-sm text-muted-foreground">
                        {groupForm.selectedStudents.length} students added
                      </span>
                    </div>



                    <Tabs defaultValue="individual" className="space-y-4">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="individual">Individual Input</TabsTrigger>
                        <TabsTrigger value="csv-upload">CSV Upload</TabsTrigger>
                      </TabsList>

                      <TabsContent value="individual" className="space-y-3">
                        <div className="space-y-2">
                          <Label>Filter by Year Group</Label>
                          <Select
                            value={selectedYearGroup}
                            onValueChange={setSelectedYearGroup}
                            disabled={!userCanEdit}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select Year Group" />
                            </SelectTrigger>
                            <SelectContent>
                              {uniqueYearGroups.map(group => (
                                <SelectItem key={group} value={group}>
                                  {group === "All" ? "All Year Groups" : group}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="student-input">Search & Add Student</Label>
                          <div className="relative">
                            <div className="relative">
                              <Input
                                id="student-input"
                                value={studentInput}
                                onChange={(e) => setStudentInput(e.target.value)}
                                onFocus={() => setIsInputFocused(true)}
                                onBlur={() => setTimeout(() => setIsInputFocused(false), 200)}
                                placeholder={searchPlaceholder}
                                className="rounded-none"
                                disabled={!userCanEdit}
                              />
                            </div>
                            {/* Search Results Dropdown */}
                            {isInputFocused && (
                              <div className="absolute z-50 mt-2 bg-background border rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] max-h-[380px] overflow-y-auto w-full p-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                                {availableStudents.filter((s: Student) =>
                                  !groupForm.selectedStudents.find((sel: Student) => sel.id === s.id) &&
                                  matchesYearGroup(s.yearGroup, selectedYearGroup) &&
                                  (studentInput === "" || s.id.toLowerCase().includes(studentInput.toLowerCase()) ||
                                    s.name.toLowerCase().includes(studentInput.toLowerCase()))
                                ).length === 0 ? (
                                  <div className="py-12 px-4 text-center">
                                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                                      <Users className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <p className="text-sm font-medium text-foreground">No students found</p>
                                    <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters</p>
                                  </div>
                                ) : (
                                  availableStudents
                                    .filter((s: Student) =>
                                      !groupForm.selectedStudents.find((sel: Student) => sel.id === s.id) &&
                                      matchesYearGroup(s.yearGroup, selectedYearGroup) &&
                                      (studentInput === "" || s.id.toLowerCase().includes(studentInput.toLowerCase()) ||
                                        s.name.toLowerCase().includes(studentInput.toLowerCase()))
                                    )
                                    .slice(0, 10)
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
                                        }}
                                        className="group flex items-center justify-between px-4 py-3.5 hover:bg-blue-50/80 cursor-pointer rounded-lg transition-all duration-200 border border-gray-100 hover:border-blue-200 hover:shadow-sm mb-2 last:mb-0 bg-white"
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
                                    ))
                                )}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Select a year group or type to search, then click to add student
                          </p>
                        </div>
                      </TabsContent>

                      <TabsContent value="csv-upload" className="space-y-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label>Upload Student CSV File</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={downloadStudentTemplate}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download Template
                            </Button>
                          </div>

                          <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground mb-2">
                              Upload CSV file with student IDs
                            </p>
                            <input
                              type="file"
                              accept=".xlsx,.xls,.csv"
                              onChange={handleFileUpload}
                              className="hidden"
                              id="csv-file-upload"
                              disabled={isProcessingFile || !userCanEdit}
                            />
                            <Button asChild variant="outline" disabled={isProcessingFile || !userCanEdit}>
                              <label htmlFor="csv-file-upload" className="cursor-pointer">
                                {isProcessingFile ? "Processing..." : "Choose CSV File"}
                              </label>
                            </Button>
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
                                    File Processing Errors ({fileParseErrors.length}):
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
                            <p><strong>File format requirements:</strong></p>
                            <p>• CSV file with Student ID in the first column</p>
                            <p>• Optional header row (will be automatically detected)</p>
                            <p>• Student ID format: KC2024001, KC2024002, KC2024003, etc.</p>
                            <p>• One student ID per row</p>
                            <p>• Maximum file size: 5MB</p>
                          </div>

                          <div className="bg-muted/50 p-3 rounded text-xs">
                            <strong>Example CSV content:</strong>
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
                          <Label>Selected Students ({groupForm.selectedStudents.length})</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setGroupForm(prev => ({ ...prev, selectedStudents: [] }))}
                            disabled={!userCanEdit}
                          >
                            Clear All
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
                                      {student.isActive === false ? 'Inactive' : 'Active'}
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
                      Cancel
                    </Button>
                    <Button onClick={handleSaveGroup} disabled={!userCanEdit}>
                      Create Group
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Student Groups Display */}
          <div className="space-y-4">
            {studentGroups.map((group) => (
              <Card key={group.id} className={group.isActive === false ? "opacity-60" : ""}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium">{group.name}</h4>
                        <Badge variant={group.isActive === false ? "outline" : "secondary"} className={group.isActive === false ? "text-gray-500" : ""}>
                          {group.discountType === "fixed"
                            ? `฿${group.fixedAmount?.toLocaleString() || 0} Discount`
                            : `${group.discountPercentage}% Discount`
                          }
                        </Badge>
                        {group.departments.map(dept => (
                          <Badge key={dept} variant="outline" className="text-xs">{dept}</Badge>
                        ))}
                        {group.isActive === false && (
                          <Badge variant="outline" className="text-red-500 border-red-300">Disabled</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <Users className="w-4 h-4" />
                        <span>{group.students.length} students in whitelist</span>
                      </div>

                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleViewGroup(group)}>
                        <Eye className="w-4 h-4 mr-1" />
                        View All
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
                  <h3 className="font-medium mb-2">No Student Groups</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first student group to manage discount whitelist
                  </p>
                  <Button onClick={() => setIsGroupDialogOpen(true)} disabled={!userCanEdit}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Student Group
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
                  {viewGroupDialog.group?.name} - Student List
                </DialogTitle>
                <DialogDescription>
                  Complete list of students in this discount group
                </DialogDescription>
              </DialogHeader>

              {viewGroupDialog.group && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {viewGroupDialog.group.discountType === "fixed"
                          ? `฿${viewGroupDialog.group.fixedAmount?.toLocaleString() || 0} Discount`
                          : `${viewGroupDialog.group.discountPercentage}% Discount`
                        }
                      </Badge>
                      {viewGroupDialog.group.departments.map((dept: string) => (
                        <Badge key={dept} variant="outline" className="text-xs">{dept}</Badge>
                      ))}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {viewGroupDialog.group.students.length} students total
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
                          setCsvUploadDialog({ isOpen: true, groupId: viewGroupDialog.group?.id })
                          setViewGroupDialog({ isOpen: false, group: null })
                        }}
                        disabled={!userCanEdit}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload CSV
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setAddIndividualDialog({ isOpen: true, groupId: viewGroupDialog.group?.id })
                          setViewGroupDialog({ isOpen: false, group: null })
                        }}
                        disabled={!userCanEdit}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Individual
                      </Button>
                    </div>
                    <Button onClick={() => setViewGroupDialog({ isOpen: false, group: null })}>
                      Close
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
                <DialogTitle>Edit Student Group</DialogTitle>
                <DialogDescription>
                  Update group information and manage student whitelist
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Enable/Disable Group Toggle */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <Label className="text-base font-medium">Enable Group</Label>
                    <p className="text-sm text-muted-foreground">Toggle to enable or disable this discount group</p>
                  </div>
                  <Switch
                    checked={groupForm.isActive}
                    onCheckedChange={(checked) => setGroupForm({ ...groupForm, isActive: checked })}
                    disabled={!userCanEdit}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-group-name">Group Name</Label>
                  <Input
                    id="edit-group-name"
                    value={groupForm.name}
                    onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                    placeholder="Year 7 Excellence Group"
                    disabled={!userCanEdit}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-group-discount-type">Discount Type</Label>
                    <Select
                      value={groupForm.discountType}
                      onValueChange={(value: "percentage" | "fixed") => setGroupForm({ ...groupForm, discountType: value })}
                      disabled={!userCanEdit}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed Amount (฿)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {groupForm.discountType === "percentage" ? (
                    <div className="space-y-2">
                      <Label htmlFor="edit-group-discount">Discount Percentage %</Label>
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
                      <Label htmlFor="edit-group-fixed-amount">Fixed Amount ฿</Label>
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
                    <Label>Manage Students in Whitelist</Label>
                    <span className="text-sm text-muted-foreground">
                      {groupForm.selectedStudents.length} students
                    </span>
                  </div>

                  <Tabs defaultValue="add-student" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="add-student">Add Individual</TabsTrigger>
                      <TabsTrigger value="csv-upload">CSV Upload</TabsTrigger>
                      <TabsTrigger value="current-students">Current Students ({groupForm.selectedStudents.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="add-student" className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="edit-student-input">Search & Add Student</Label>
                        <div className="relative">
                          <div className="relative">
                            <Input
                              id="edit-student-input"
                              value={studentInput}
                              onChange={(e) => setStudentInput(e.target.value)}
                              placeholder={searchPlaceholder}
                              className="rounded-none"
                            />
                          </div>
                          {/* Search Results Dropdown */}
                          {studentInput.length >= 1 && (
                            <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                              {availableStudents
                                .filter(s =>
                                  !groupForm.selectedStudents.find(sel => sel.id === s.id) &&
                                  (s.id.toLowerCase().includes(studentInput.toLowerCase()) ||
                                    s.name.toLowerCase().includes(studentInput.toLowerCase()))
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
                                  s.name.toLowerCase().includes(studentInput.toLowerCase()))
                              ).length === 0 && (
                                  <div className="px-3 py-2 text-sm text-muted-foreground">
                                    No students found
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Type to search, then click to add student
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="csv-upload" className="space-y-3">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-csv-file">Upload Student CSV File</Label>
                          <div
                            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 hover:border-primary/50 transition-colors"
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
                                const fakeEvent = {
                                  target: { files: [file] }
                                } as unknown as React.ChangeEvent<HTMLInputElement>
                                handleFileUpload(fakeEvent)
                              } else {
                                toast.error("Please upload a CSV file")
                              }
                            }}
                          >
                            <div className="flex flex-col items-center gap-2 text-center">
                              <Upload className="h-8 w-8 text-muted-foreground" />
                              <div className="space-y-1">
                                <p className="text-sm">
                                  <label htmlFor="edit-csv-file" className={`font-medium ${userCanEdit ? 'text-primary hover:underline cursor-pointer' : 'text-muted-foreground cursor-not-allowed'}`}>
                                    Click to upload
                                  </label>
                                  {" "}or drag and drop
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  CSV file with columns: id, name, year_group, parent_name
                                </p>
                              </div>
                              <input
                                id="edit-csv-file"
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    handleFileUpload(e)
                                  }
                                }}
                                className="hidden"
                                disabled={!userCanEdit}
                              />
                            </div>
                          </div>
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
                                Processing file...
                              </div>
                            )}

                            {fileParseErrors.length > 0 && (
                              <div className="space-y-2">
                                <Label>Import Errors:</Label>
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

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={downloadStudentTemplate}
                            className="flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Download Template
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            Need a template? Download the CSV format.
                          </span>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="current-students" className="space-y-3">
                      {groupForm.selectedStudents.length > 0 ? (
                        <div className="space-y-3">
                          {/* Search Input */}
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              value={currentStudentsSearch}
                              onChange={(e) => setCurrentStudentsSearch(e.target.value)}
                              placeholder="Search students by name or ID..."
                              className="pl-10"
                            />
                          </div>

                          {/* Student List */}
                          <div className="border rounded-lg p-3 max-h-60 overflow-y-auto">
                            <div className="grid gap-2">
                              {groupForm.selectedStudents
                                .filter(student =>
                                  student.name.toLowerCase().includes(currentStudentsSearch.toLowerCase()) ||
                                  student.id.toLowerCase().includes(currentStudentsSearch.toLowerCase())
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
                                          {student.isActive === false ? 'Inactive' : 'Active'}
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
                              {groupForm.selectedStudents.filter(student =>
                                student.name.toLowerCase().includes(currentStudentsSearch.toLowerCase()) ||
                                student.id.toLowerCase().includes(currentStudentsSearch.toLowerCase())
                              ).length === 0 && currentStudentsSearch && (
                                  <div className="text-center py-4 text-muted-foreground text-sm">
                                    No students found matching "{currentStudentsSearch}"
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No students in this group
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => {
                    setEditGroupDialog({ isOpen: false, group: null })
                    resetGroupForm()
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveGroup} disabled={!userCanEdit}>
                    Update Group
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
                <AlertDialogTitle>Delete Student Group</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this student group? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>

              {deleteConfirmDialog.group && (
                <div className="p-4 bg-muted/50 rounded-lg my-4">
                  <div className="font-medium mb-1">{deleteConfirmDialog.group.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {deleteConfirmDialog.group.students.length} students • {deleteConfirmDialog.group.discountType === "fixed" ? `฿${deleteConfirmDialog.group.fixedAmount?.toLocaleString() || 0}` : `${deleteConfirmDialog.group.discountPercentage}%`} discount
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Departments: {deleteConfirmDialog.group.departments.join(", ")}
                  </div>
                </div>
              )}

              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteConfirmDialog({ isOpen: false, group: null })}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeleteGroup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" style={{ backgroundColor: '#dc2626', color: '#ffffff' }}>
                  Delete Group
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
            <DialogTitle>Upload Students via CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file to add multiple students to the group. Required columns: id, name, year_group, parent_name
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
                    toast.error("Please upload a CSV file")
                  }
                }}
              >
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Upload CSV File</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Drag and drop your CSV file here, or click to browse
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleCsvUpload(file)
                    }}
                    className="hidden"
                    id="csv-upload"
                  />
                  <Button variant="outline" asChild className="cursor-pointer">
                    <label htmlFor="csv-upload">
                      Select CSV File
                    </label>
                  </Button>
                </div>
              </div>
            )}

            {isPreviewingCsv && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">Processing CSV file...</p>
              </div>
            )}

            {csvFile && csvPreviewData.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Preview: {csvPreviewData.length} students found</h4>
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
                Cancel
              </Button>
              <Button
                onClick={handleConfirmCsvUpload}
                disabled={!csvFile || csvPreviewData.length === 0 || !userCanEdit}
              >
                Add {csvPreviewData.length} Students
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
            <DialogTitle>Add Individual Student</DialogTitle>
            <DialogDescription>
              Add a single student to the group manually
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Student Search */}
            <div className="space-y-2">
              <Label htmlFor="student-search">Search Student</Label>
              <div className="relative">
                <Input
                  id="student-search"
                  value={studentSearchQuery}
                  onChange={(e) => handleStudentSearch(e.target.value)}
                  placeholder="Search by Student ID or Name..."
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
                  <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md z-50 max-h-60 overflow-y-auto">
                    {isSearching ? (
                      <div className="p-3 text-center text-muted-foreground">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto mb-2"></div>
                        Searching...
                      </div>
                    ) : studentSearchResults.length > 0 ? (
                      <div className="py-1">
                        {studentSearchResults.map((student) => (
                          <button
                            key={student.id}
                            onClick={() => handleSelectSearchResult(student)}
                            className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
                          >
                            <div className="font-medium truncate">{student.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {student.id} • {student.yearGroup}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 text-center text-muted-foreground">
                        No students found matching "{studentSearchQuery}"
                      </div>
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
                <Label htmlFor="student-id">Student ID</Label>
                <Input
                  id="student-id"
                  value={individualStudentForm.id}
                  onChange={(e) => setIndividualStudentForm({ ...individualStudentForm, id: e.target.value })}
                  placeholder="KC2024001"
                  disabled={!userCanEdit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-name">Student Name</Label>
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
                <Label htmlFor="year-group">Year Group</Label>
                <Select
                  value={individualStudentForm.yearGroup}
                  onValueChange={(value) => setIndividualStudentForm({ ...individualStudentForm, yearGroup: value })}
                  disabled={!userCanEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year group" />
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
                <Label htmlFor="parent-name">Parent Name</Label>
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
                Cancel
              </Button>
              <Button onClick={handleAddIndividualStudent} disabled={!userCanEdit}>
                Add Student
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