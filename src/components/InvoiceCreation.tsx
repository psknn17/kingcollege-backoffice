import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { useDiscountOptions } from "@/contexts/DiscountOptionsContext"
import { useStudents } from "@/contexts/StudentContext"
import { useAcademicYears } from "@/contexts/AcademicYearContext"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Separator } from "./ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Calendar as CalendarComponent } from "./ui/calendar"
import { Search, Plus, CheckCircle, Trash2, X, Upload, Users, User, FileSpreadsheet, FileText, Bookmark, GraduationCap, Zap, MapPin, Calendar, Clock, Eye, Mail, Package, Save } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner@2.0.3"
import { SCHOOL_INFO, BANK_DETAILS, BILL_PAYMENT, INVOICE_NOTES, numberToWords, formatCurrency, getAcademicYear } from "@/lib/invoiceUtils"
import SchoolLogo from "@/assets/Logo.png"

interface PreCreatedItem {
  id: string
  name: string
  description: string
  amount: number
  category: string
  isActive: boolean
  applicableGrades: string[]
}

interface ItemTemplate {
  id: string
  name: string
  description: string
  items: string[] // Item IDs
  applicableGrades: string[]
  isActive: boolean
}

const grades = ["Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]

const rooms = {
  "Nursery": ["Nursery A", "Nursery B"],
  "Reception": ["Reception A", "Reception B", "Reception C"],
  "Year 1": ["1A", "1B", "1C", "1D"],
  "Year 2": ["2A", "2B", "2C", "2D"],
  "Year 3": ["3A", "3B", "3C", "3D"],
  "Year 4": ["4A", "4B", "4C"],
  "Year 5": ["5A", "5B", "5C"],
  "Year 6": ["6A", "6B", "6C"],
  "Year 7": ["7A", "7B", "7C", "7D"],
  "Year 8": ["8A", "8B", "8C", "8D"],
  "Year 9": ["9A", "9B", "9C"],
  "Year 10": ["10A", "10B", "10C"],
  "Year 11": ["11A", "11B"],
  "Year 12": ["12A", "12B"],
  "Year 13": ["13A", "13B"]
}

// Student Groups storage key (same as DiscountManagement)
const STUDENT_GROUPS_STORAGE_KEY = "studentGroups"

// Helper function to get student group discounts
const getStudentGroupDiscounts = (studentId: string): { name: string, discountType: string, discountPercentage: number, fixedAmount: number }[] => {
  try {
    const stored = localStorage.getItem(STUDENT_GROUPS_STORAGE_KEY)
    if (!stored) return []

    const groups = JSON.parse(stored)
    const studentGroups: { name: string, discountType: string, discountPercentage: number, fixedAmount: number }[] = []

    groups.forEach((group: any) => {
      if (group.students && group.students.some((s: any) => s.id === studentId)) {
        studentGroups.push({
          name: group.name,
          discountType: group.discountType || "percentage",
          discountPercentage: group.discountPercentage || 0,
          fixedAmount: group.fixedAmount || 0
        })
      }
    })

    return studentGroups
  } catch {
    return []
  }
}

// Helper function to convert term format
const convertTermFormat = (term: string): string => {
  if (term === "term1") return "1"
  if (term === "term2") return "2"
  if (term === "term3") return "3"
  return term
}

// Default sibling discounts (fallback if no settings found)
const defaultSiblingDiscounts = [
  { childOrder: "first", percentage: 0, enabled: true },
  { childOrder: "second", percentage: 0, enabled: true },
  { childOrder: "third", percentage: 5, enabled: true },
  { childOrder: "fourth", percentage: 10, enabled: true },
  { childOrder: "fifth", percentage: 20, enabled: true },
]

// Helper function to get sibling discount percentage from Discount Options
const getSiblingDiscountFromOptions = (childOrder: number, academicYear: string, term: string): number => {
  try {
    const convertedTerm = convertTermFormat(term)
    // Read from "discountOptions" key with nested object (same as DiscountOptionsContext)
    const stored = localStorage.getItem("discountOptions")
    if (!stored) {
      // Use default - only children 3+ get discount
      const discountIndex = childOrder <= 0 ? -1 : childOrder - 1
      const discount = defaultSiblingDiscounts[Math.min(discountIndex, 4)]
      return discount?.enabled ? discount.percentage : 0
    }

    const allData = JSON.parse(stored)
    const storageKey = `${academicYear}_${convertedTerm}`
    const options = allData[storageKey]

    if (!options?.siblingDiscounts) {
      // Use default
      const discountIndex = childOrder <= 0 ? -1 : childOrder - 1
      const discount = defaultSiblingDiscounts[Math.min(discountIndex, 4)]
      return discount?.enabled ? discount.percentage : 0
    }

    // Map child order number to discount index (1->0, 2->1, 3->2, 4->3, 5+->4)
    let discountIndex: number
    if (childOrder <= 0) return 0
    if (childOrder === 1) discountIndex = 0
    else if (childOrder === 2) discountIndex = 1
    else if (childOrder === 3) discountIndex = 2
    else if (childOrder === 4) discountIndex = 3
    else discountIndex = 4 // 5th and beyond

    const discount = options.siblingDiscounts[discountIndex]
    if (discount && discount.enabled) {
      return discount.percentage
    }
    return 0
  } catch {
    return 0
  }
}

// Grade level mapping (same as StudentList)
const gradeLevelMap: { [key: string]: string } = {
  "nursery": "Nursery",
  "reception": "Reception",
  "year1": "Year 1",
  "year2": "Year 2",
  "year3": "Year 3",
  "year4": "Year 4",
  "year5": "Year 5",
  "year6": "Year 6",
  "year7": "Year 7",
  "year8": "Year 8",
  "year9": "Year 9",
  "year10": "Year 10",
  "year11": "Year 11",
  "year12": "Year 12",
  "year13": "Year 13",
}

// Convert gradeLevel ID to label (e.g., "year2" -> "Year 2")
const getGradeLabel = (gradeId: string): string => {
  return gradeLevelMap[gradeId] || gradeId
}

// localStorage keys (same as ItemManagement)
const ITEMS_STORAGE_KEY = "invoiceItems"
const TEMPLATES_STORAGE_KEY = "invoiceTemplates"
const CREATED_INVOICES_STORAGE_KEY = "createdInvoices"

// Interface for saved invoice
interface SavedInvoice {
  id: string
  invoiceNumber: string
  studentName: string
  studentId: string
  studentGrade: string
  studentRoom: string
  parentName: string
  parentEmail: string
  items: PreCreatedItem[]
  subtotal: number
  discounts: { name: string, amount: number, percentage?: number }[]
  totalDiscount: number
  netAmount: number
  dueDate: string
  issueDate: string
  status: "pending" | "sent" | "paid" | "partial" | "unpaid" | "overdue" | "cancelled"
  term: string
  paymentType: "termly"
  createdAt: string
}

// Load created invoices from localStorage
const loadCreatedInvoices = (): SavedInvoice[] => {
  try {
    const stored = localStorage.getItem(CREATED_INVOICES_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error("Failed to load created invoices:", error)
  }
  return []
}

// Save invoice to localStorage
const saveInvoiceToStorage = (invoice: SavedInvoice) => {
  try {
    const existing = loadCreatedInvoices()
    // Check if invoice already exists (by invoiceNumber)
    const existingIndex = existing.findIndex(inv => inv.invoiceNumber === invoice.invoiceNumber)
    if (existingIndex >= 0) {
      existing[existingIndex] = invoice
    } else {
      existing.push(invoice)
    }
    localStorage.setItem(CREATED_INVOICES_STORAGE_KEY, JSON.stringify(existing))
    // Dispatch custom event to notify Invoice Overview
    window.dispatchEvent(new CustomEvent('invoicesUpdated'))
  } catch (error) {
    console.error("Failed to save invoice:", error)
  }
}

// Load items from localStorage (initialize with defaults if empty)
const loadItemsFromStorage = (): PreCreatedItem[] => {
  try {
    const stored = localStorage.getItem(ITEMS_STORAGE_KEY)
    if (stored) {
      const items = JSON.parse(stored)
      // Convert Item format to PreCreatedItem format (itemCode -> id if needed)
      return items.map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        amount: item.amount,
        category: item.category,
        isActive: item.isActive,
        applicableGrades: item.applicableGrades
      }))
    } else {
      // Initialize localStorage with default items if empty
      localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(defaultItems))
      return defaultItems
    }
  } catch (error) {
    console.error("Failed to load items from localStorage:", error)
    return defaultItems
  }
}

// Load templates from localStorage (initialize with defaults if empty)
const loadTemplatesFromStorage = (): ItemTemplate[] => {
  try {
    const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    } else {
      // Initialize localStorage with default templates if empty
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(defaultTemplates))
      return defaultTemplates
    }
  } catch (error) {
    console.error("Failed to load templates from localStorage:", error)
    return defaultTemplates
  }
}

// Default items (fallback if no localStorage data)
const defaultItems: PreCreatedItem[] = [
  // Tuition items
  {
    id: "item-001",
    name: "Term 1 Tuition Fee",
    description: "First term tuition payment for academic year",
    amount: 150000,
    category: "Tuition",
    isActive: true,
    applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "item-002",
    name: "Term 2 Tuition Fee",
    description: "Second term tuition payment for academic year",
    amount: 150000,
    category: "Tuition",
    isActive: true,
    applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "item-003",
    name: "Registration Fee",
    description: "Annual registration and administrative fee",
    amount: 25000,
    category: "Tuition",
    isActive: true,
    applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "item-004",
    name: "Uniform & Textbooks",
    description: "School uniform and required textbooks",
    amount: 15000,
    category: "Tuition",
    isActive: true,
    applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  // ECA items
  {
    id: "item-005",
    name: "Swimming Program",
    description: "Swimming lessons and pool maintenance fee",
    amount: 80000,
    category: "ECA",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "item-006",
    name: "Football Training",
    description: "Professional football coaching and equipment",
    amount: 60000,
    category: "ECA",
    isActive: true,
    applicableGrades: ["Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "item-007",
    name: "Music Lessons",
    description: "Individual and group music instruction",
    amount: 35000,
    category: "ECA",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10"]
  },
  {
    id: "item-008",
    name: "Art & Craft Program",
    description: "Art supplies and creative activities",
    amount: 42000,
    category: "ECA",
    isActive: true,
    applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7"]
  },
  {
    id: "item-009",
    name: "Computer Programming",
    description: "Introduction to coding and programming",
    amount: 45000,
    category: "ECA",
    isActive: true,
    applicableGrades: ["Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  // Trip & Other Activity items
  {
    id: "item-010",
    name: "Bangkok City Tour",
    description: "Educational city tour and cultural experience",
    amount: 80000,
    category: "Trip & Other Activity",
    isActive: true,
    applicableGrades: ["Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10"]
  },
  {
    id: "item-011",
    name: "Science Museum Trip",
    description: "Interactive science learning experience",
    amount: 45000,
    category: "Trip & Other Activity",
    isActive: true,
    applicableGrades: ["Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8"]
  },
  {
    id: "item-012",
    name: "Annual Sports Day",
    description: "School sports competition and activities",
    amount: 15000,
    category: "Trip & Other Activity",
    isActive: true,
    applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "item-013",
    name: "International School Fair",
    description: "Educational fair participation and materials",
    amount: 35000,
    category: "Trip & Other Activity",
    isActive: true,
    applicableGrades: ["Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "item-014",
    name: "Graduation Ceremony",
    description: "Graduation ceremony and celebration costs",
    amount: 50000,
    category: "Trip & Other Activity",
    isActive: true,
    applicableGrades: ["Year 6", "Year 12"]
  }
]

// Default templates (fallback if no localStorage data)
const defaultTemplates: ItemTemplate[] = [
  {
    id: "template-001",
    name: "Year 1 Complete Package",
    description: "Full academic year package for Year 1 students",
    items: ["item-001", "item-002", "item-003", "item-004"],
    applicableGrades: ["Year 1"],
    isActive: true
  },
  {
    id: "template-002", 
    name: "Year 1 Basic Tuition",
    description: "Essential tuition fees only for Year 1",
    items: ["item-001", "item-002", "item-003"],
    applicableGrades: ["Year 1"],
    isActive: true
  },
  {
    id: "template-003",
    name: "Year 10 Full Package",
    description: "Complete package with tuition and activities",
    items: ["item-001", "item-002", "item-003", "item-005", "item-009"],
    applicableGrades: ["Year 10"],
    isActive: true
  },
  {
    id: "template-004",
    name: "Primary ECA Bundle",
    description: "Popular ECA activities for primary students",
    items: ["item-005", "item-007", "item-008"],
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"],
    isActive: true
  },
  {
    id: "template-005",
    name: "Secondary Activities",
    description: "ECA and trip package for secondary students",
    items: ["item-005", "item-006", "item-009", "item-010"],
    applicableGrades: ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"],
    isActive: true
  }
]

const formatCurrency = (amount: number): string => {
  return `₿${amount.toLocaleString()}`
}

const itemCategories = [
  { 
    id: "Tuition", 
    label: "Tuition", 
    icon: GraduationCap,
    description: "Academic fees and school essentials"
  },
  { 
    id: "ECA", 
    label: "ECA", 
    icon: Zap,
    description: "Extra-curricular activities"
  },
  { 
    id: "Trip & Other Activity", 
    label: "Trip & Other Activity", 
    icon: MapPin,
    description: "Field trips and special events"
  }
]

interface InvoiceCreationProps {
  defaultCategory?: string
  invoiceType?: string
  onNavigateToEmailSending?: (data: any) => void
}

// Interface for invoice student with discounts
interface InvoiceStudent {
  id: string
  name: string
  grade: string
  room: string
  parentName: string
  email: string
  // Original student data
  originalStudent?: any
  // Discount information
  discounts: {
    siblingDiscount: number
    studentGroupDiscounts: { name: string, type: string, percentage: number, fixedAmount: number }[]
    staffChild: boolean
    scholarship: boolean
    earlyBird: boolean
  }
}

export function InvoiceCreation({ defaultCategory, invoiceType, onNavigateToEmailSending }: InvoiceCreationProps) {
  // Discount Options context
  const { getRegistrationFees, getLatePaymentSettings, getSiblingDiscountPercentage } = useDiscountOptions()

  // Student context
  const { students } = useStudents()
  const { academicYears } = useAcademicYears()

  // Get current academic year and term (default to first ones)
  const academicYear = academicYears[0]?.id || "2025-2026"
  const term = "term1" // Default term

  // Convert StudentContext students to invoice format
  const availableStudents = useMemo(() => {
    return students.map(student => {
      // Get sibling discount - must be Year 3+ to receive discount
      const childOrder = student.childOrder || 1

      // Parse grade level to check minimum requirement (Year 3+)
      let studentGradeLevel = 0
      const gradeLevelLower = student.gradeLevel?.toLowerCase() || ""
      if (gradeLevelLower === "nursery" || gradeLevelLower === "reception") {
        studentGradeLevel = 0
      } else {
        const gradeLevelMatch = student.gradeLevel?.match(/(\d+)/)
        studentGradeLevel = gradeLevelMatch ? parseInt(gradeLevelMatch[1]) : 0
      }

      // Only get sibling discount if Year 3 or higher
      const siblingDiscount = (studentGradeLevel >= 3)
        ? getSiblingDiscountFromOptions(childOrder, student.academicYear || academicYear, student.enrollmentTerm || term)
        : 0

      // Get student group discounts
      const groupDiscounts = getStudentGroupDiscounts(student.studentId)

      // Check for special discounts based on notes
      const notes = student.notes?.toLowerCase() || ""
      const staffChild = notes.includes('staff')
      const scholarship = notes.includes('scholarship')
      const earlyBird = notes.includes('early bird')

      // Convert gradeLevel ID to label format (e.g., "year2" -> "Year 2")
      const gradeLabel = getGradeLabel(student.gradeLevel)

      // Get room/section from student if available, or leave empty for "All Rooms"
      const studentRoom = student.section || student.room || ""

      return {
        id: student.studentId,
        name: `${student.firstName} ${student.lastName}`,
        grade: gradeLabel, // Convert to label format to match Create Invoice dropdown
        room: studentRoom, // Use actual room/section, empty means "All Rooms"
        parentName: student.parents?.[0]?.name || "Parent",
        email: student.parents?.[0]?.email || "parent@email.com",
        originalStudent: student,
        discounts: {
          siblingDiscount,
          studentGroupDiscounts: groupDiscounts.map(g => ({
            name: g.name,
            type: g.discountType,
            percentage: g.discountPercentage,
            fixedAmount: g.fixedAmount
          })),
          staffChild,
          scholarship,
          earlyBird
        }
      } as InvoiceStudent
    })
  }, [students, academicYear, term])

  // Load all items from localStorage for template calculations
  const allStoredItems = useMemo(() => {
    return loadItemsFromStorage()
  }, [])

  // Create invoice state
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("")
  const [selectedTerm, setSelectedTerm] = useState("")
  const [selectedGrade, setSelectedGrade] = useState("")
  const [selectedRoom, setSelectedRoom] = useState("")

  // Get available terms based on selected academic year
  const availableTerms = selectedAcademicYear
    ? (academicYears.find(y => y.id === selectedAcademicYear)?.terms || [])
    : []
  
  // Payment deadline
  const [paymentDeadline, setPaymentDeadline] = useState<Date | undefined>(undefined)
  
  // Preview and confirmation states
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false)
  const [previewStudentIndex, setPreviewStudentIndex] = useState(0)
  
  // Student selection state
  const [studentSelectionType, setStudentSelectionType] = useState<"individual" | "csv" | "all">("individual")
  const [searchStudentTerm, setSearchStudentTerm] = useState("")
  const [isStudentSearchFocused, setIsStudentSearchFocused] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<InvoiceStudent[]>([])
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvStudents, setCsvStudents] = useState<any[]>([])
  
  // Item selection state
  const [availableItems, setAvailableItems] = useState<PreCreatedItem[]>([])
  const [selectedItems, setSelectedItems] = useState<PreCreatedItem[]>([])
  const [availableTemplates, setAvailableTemplates] = useState<ItemTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [selectedCategory, setSelectedCategory] = useState<string>(defaultCategory || "Tuition")

  // Add item from list state
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false)
  const [addItemSearchTerm, setAddItemSearchTerm] = useState("")
  const [addItemCategory, setAddItemCategory] = useState("all")

  // Load items when grade or category changes
  useEffect(() => {
    if (selectedGrade) {
      const allItems = loadItemsFromStorage()
      const filteredItems = allItems.filter(item =>
        item.isActive &&
        item.applicableGrades.includes(selectedGrade) &&
        item.category === selectedCategory
      )
      setAvailableItems(filteredItems)

      const allTemplates = loadTemplatesFromStorage()
      const filteredTemplates = allTemplates.filter(template =>
        template.isActive && template.applicableGrades.includes(selectedGrade)
      )
      setAvailableTemplates(filteredTemplates)
    }
  }, [selectedGrade, selectedCategory])

  const handleGradeChange = (grade: string) => {
    setSelectedGrade(grade)
    setSelectedRoom("")
    setSelectedStudents([])
    setCsvStudents([])
    setCsvFile(null)
    setSelectedItems([])
    setSelectedTemplate("")
    setSelectedCategory(defaultCategory || "Tuition")
    setPaymentDeadline("")
    setIsPreviewMode(false)

    // Load items from localStorage
    const allItems = loadItemsFromStorage()

    // Filter available items for this grade and category
    const gradeItems = allItems.filter(item =>
      item.isActive &&
      item.applicableGrades.includes(grade) &&
      item.category === (defaultCategory || "Tuition")
    )
    setAvailableItems(gradeItems)

    // Load templates from localStorage
    const allTemplates = loadTemplatesFromStorage()

    // Filter available templates for this grade
    const gradeTemplates = allTemplates.filter(template =>
      template.isActive && template.applicableGrades.includes(grade)
    )
    setAvailableTemplates(gradeTemplates)
  }

  const handleRoomChange = (room: string) => {
    setSelectedRoom(room === "all" ? "" : room)
    // Filter students by room
    setSelectedStudents([])
  }

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)

    // Load items from localStorage
    const allItems = loadItemsFromStorage()

    // Filter available items for selected grade and new category
    const categoryItems = allItems.filter(item =>
      item.isActive &&
      item.applicableGrades.includes(selectedGrade) &&
      item.category === category
    )
    setAvailableItems(categoryItems)
  }

  const filteredStudents = availableStudents.filter(student =>
    (student.id.toLowerCase().includes(searchStudentTerm.toLowerCase()) ||
     student.name.toLowerCase().includes(searchStudentTerm.toLowerCase())) &&
    student.grade === selectedGrade &&
    (selectedRoom === "" || student.room === selectedRoom) &&
    !selectedStudents.find(s => s.id === student.id)
  )

  // Calculate discounts for a student
  const calculateStudentDiscounts = (student: InvoiceStudent, subtotal: number) => {
    const discountItems: { name: string, amount: number, percentage?: number }[] = []
    let totalDiscountAmount = 0

    // Sibling Discount
    if (student.discounts.siblingDiscount > 0) {
      const amount = Math.round(subtotal * student.discounts.siblingDiscount / 100)
      discountItems.push({
        name: `Sibling Discount`,
        amount,
        percentage: student.discounts.siblingDiscount
      })
      totalDiscountAmount += amount
    }

    // Student Group Discounts
    student.discounts.studentGroupDiscounts.forEach(group => {
      if (group.type === "percentage" && group.percentage > 0) {
        const amount = Math.round(subtotal * group.percentage / 100)
        discountItems.push({
          name: group.name,
          amount,
          percentage: group.percentage
        })
        totalDiscountAmount += amount
      } else if (group.type === "fixed" && group.fixedAmount > 0) {
        discountItems.push({
          name: group.name,
          amount: group.fixedAmount
        })
        totalDiscountAmount += group.fixedAmount
      }
    })

    // Staff Child (50%)
    if (student.discounts.staffChild) {
      const amount = Math.round(subtotal * 50 / 100)
      discountItems.push({
        name: "Staff Child Discount",
        amount,
        percentage: 50
      })
      totalDiscountAmount += amount
    }

    // Scholarship (example: 100%)
    if (student.discounts.scholarship) {
      const amount = subtotal
      discountItems.push({
        name: "Scholarship",
        amount,
        percentage: 100
      })
      totalDiscountAmount += amount
    }

    // Early Bird (5%)
    if (student.discounts.earlyBird) {
      const amount = Math.round(subtotal * 5 / 100)
      discountItems.push({
        name: "Early Bird Discount",
        amount,
        percentage: 5
      })
      totalDiscountAmount += amount
    }

    return {
      discountItems,
      totalDiscountAmount,
      netAmount: Math.max(0, subtotal - totalDiscountAmount)
    }
  }

  // Check if student has any discounts
  const hasDiscounts = (student: InvoiceStudent) => {
    return student.discounts.siblingDiscount > 0 ||
      student.discounts.studentGroupDiscounts.length > 0 ||
      student.discounts.staffChild ||
      student.discounts.scholarship ||
      student.discounts.earlyBird
  }

  const handleIndividualStudentSelect = (student: any) => {
    setSelectedStudents([...selectedStudents, student])
    setSearchStudentTerm("")
  }

  const handleRemoveStudent = (studentId: string) => {
    setSelectedStudents(selectedStudents.filter(s => s.id !== studentId))
  }

  const handleSelectAllStudents = () => {
    const gradeStudents = availableStudents.filter(s =>
      s.grade === selectedGrade &&
      (selectedRoom === "" || s.room === selectedRoom)
    )
    setSelectedStudents(gradeStudents)
  }

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setCsvFile(file)
      // Simulate CSV parsing
      const mockCsvData = [
        { id: "ST001301", name: "CSV Student 1", grade: selectedGrade, room: selectedRoom || "Unknown", parentName: "Parent 1", email: "parent1@email.com" },
        { id: "ST001302", name: "CSV Student 2", grade: selectedGrade, room: selectedRoom || "Unknown", parentName: "Parent 2", email: "parent2@email.com" },
        { id: "ST001303", name: "CSV Student 3", grade: selectedGrade, room: selectedRoom || "Unknown", parentName: "Parent 3", email: "parent3@email.com" },
      ]
      setCsvStudents(mockCsvData)
      setSelectedStudents(mockCsvData)
      toast.success(`Loaded ${mockCsvData.length} students from CSV`)
    }
  }

  const handleItemSelect = (item: PreCreatedItem) => {
    if (!selectedItems.find(i => i.id === item.id)) {
      setSelectedItems([...selectedItems, item])
    }
  }

  const handleItemRemove = (itemId: string) => {
    setSelectedItems(selectedItems.filter(i => i.id !== itemId))
  }

  // Get all items for Add Item dialog (filtered by search and category)
  const getItemsForDialog = () => {
    const allItems = loadItemsFromStorage()
    return allItems.filter(item => {
      const matchesSearch = addItemSearchTerm === "" ||
        item.name.toLowerCase().includes(addItemSearchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(addItemSearchTerm.toLowerCase())
      const matchesCategory = addItemCategory === "all" || item.category === addItemCategory
      const notAlreadySelected = !selectedItems.find(s => s.id === item.id)
      return item.isActive && matchesSearch && matchesCategory && notAlreadySelected
    })
  }

  // Add item from list
  const handleAddItemFromList = (item: PreCreatedItem) => {
    setSelectedItems([...selectedItems, item])
    toast.success(`Added: ${item.name}`)
  }

  const handleTemplateSelect = (templateId: string) => {
    if (templateId === "none") {
      setSelectedTemplate("")
      setSelectedItems([])
      return
    }

    // Load templates and items from localStorage
    const allTemplates = loadTemplatesFromStorage()
    const allItems = loadItemsFromStorage()

    const template = allTemplates.find(t => t.id === templateId)
    if (template) {
      setSelectedTemplate(templateId)
      // Auto-fill items from template, but keep existing selected items that are not in the template
      const templateItems = template.items
        .map(itemId => allItems.find(item => item.id === itemId))
        .filter(item => item !== undefined) as PreCreatedItem[]

      // Merge template items with existing selected items (avoid duplicates)
      const existingItems = selectedItems.filter(item =>
        !template.items.includes(item.id)
      )
      const mergedItems = [...templateItems, ...existingItems]

      setSelectedItems(mergedItems)
      toast.success(`Applied template: ${template.name}. You can still add more items.`)
    }
  }

  const handlePreviewInvoice = () => {
    if (selectedStudents.length === 0 || selectedItems.length === 0) {
      toast.error("Please select students and items")
      return
    }

    if (!paymentDeadline) {
      toast.error("Please set payment deadline")
      return
    }

    setPreviewStudentIndex(0)
    setIsPreviewDialogOpen(true)
  }

  const handleConfirmFromPreview = () => {
    setIsPreviewDialogOpen(false)
    setIsPreviewMode(true)
    toast.success("Invoice preview confirmed")
  }

  const generateInvoiceNumber = (studentId: string) => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    return `INV-${year}${month}-${studentId.slice(-4)}`
  }

  const handleConfirmAndSendEmail = () => {
    setIsConfirmationOpen(true)
  }

  const handleFinalConfirmation = () => {
    const totalItems = selectedItems.reduce((sum, item) => sum + item.amount, 0)
    const now = new Date()

    // Save each student's invoice to localStorage
    selectedStudents.forEach((student) => {
      const invoiceStudent = student as InvoiceStudent
      const subtotal = getTotalAmount()
      const discountCalc = calculateStudentDiscounts(invoiceStudent, subtotal)
      const invoiceNumber = generateInvoiceNumber(student.id)

      const savedInvoice: SavedInvoice = {
        id: `inv-${student.id}-${Date.now()}`,
        invoiceNumber: invoiceNumber,
        studentName: student.name,
        studentId: student.id,
        studentGrade: selectedGrade,
        studentRoom: student.room,
        parentName: student.parentName,
        parentEmail: student.email,
        items: selectedItems,
        subtotal: subtotal,
        discounts: discountCalc.discountItems,
        totalDiscount: discountCalc.totalDiscountAmount,
        netAmount: discountCalc.netAmount,
        dueDate: paymentDeadline ? paymentDeadline.toISOString().split('T')[0] : "",
        issueDate: now.toISOString().split('T')[0],
        status: "sent",
        term: `${selectedAcademicYear} - ${selectedTerm}`,
        paymentType: "termly",
        createdAt: now.toISOString()
      }

      saveInvoiceToStorage(savedInvoice)
    })

    // Create invoice data for email sending
    const invoiceData = {
      invoiceNumber: `INV-${Date.now()}`,
      grade: selectedGrade,
      room: selectedRoom,
      students: selectedStudents,
      items: selectedItems,
      paymentDeadline: paymentDeadline ? paymentDeadline.toISOString().split('T')[0] : "",
      totalAmount: totalItems,
      totalInvoices: selectedStudents.length,
      grandTotal: totalItems * selectedStudents.length,
      createdAt: new Date().toISOString(),
      status: 'created'
    }

    toast.success(`Successfully created ${selectedStudents.length} invoices!`)

    // Navigate to email sending page with invoice data
    if (onNavigateToEmailSending) {
      onNavigateToEmailSending(invoiceData)
    }

    // Reset form
    setSelectedAcademicYear("")
    setSelectedTerm("")
    setSelectedGrade("")
    setSelectedRoom("")
    setSelectedStudents([])
    setCsvStudents([])
    setCsvFile(null)
    setSelectedItems([])
    setAvailableItems([])
    setAvailableTemplates([])
    setSelectedTemplate("")
    setPaymentDeadline("")
    setIsPreviewMode(false)
    setIsConfirmationOpen(false)
  }

  // Save as Draft - saves invoices without sending email
  const handleSaveAsDraft = () => {
    const now = new Date()

    // Save each student's invoice to localStorage with "pending" status
    selectedStudents.forEach((student) => {
      const invoiceStudent = student as InvoiceStudent
      const subtotal = getTotalAmount()
      const discountCalc = calculateStudentDiscounts(invoiceStudent, subtotal)
      const invoiceNumber = generateInvoiceNumber(student.id)

      const savedInvoice: SavedInvoice = {
        id: `inv-${student.id}-${Date.now()}`,
        invoiceNumber: invoiceNumber,
        studentName: student.name,
        studentId: student.id,
        studentGrade: selectedGrade,
        studentRoom: student.room,
        parentName: student.parentName,
        parentEmail: student.email,
        items: selectedItems,
        subtotal: subtotal,
        discounts: discountCalc.discountItems,
        totalDiscount: discountCalc.totalDiscountAmount,
        netAmount: discountCalc.netAmount,
        dueDate: paymentDeadline ? paymentDeadline.toISOString().split('T')[0] : "",
        issueDate: now.toISOString().split('T')[0],
        status: "draft", // Draft status
        term: `${selectedAcademicYear} - ${selectedTerm}`,
        paymentType: "termly",
        createdAt: now.toISOString()
      }

      saveInvoiceToStorage(savedInvoice)
    })

    toast.success(`Saved ${selectedStudents.length} invoices as draft`)
    setIsPreviewDialogOpen(false)

    // Reset form
    setSelectedAcademicYear("")
    setSelectedTerm("")
    setSelectedGrade("")
    setSelectedRoom("")
    setSelectedStudents([])
    setCsvStudents([])
    setCsvFile(null)
    setSelectedItems([])
    setAvailableItems([])
    setAvailableTemplates([])
    setSelectedTemplate("")
    setPaymentDeadline("")
    setIsPreviewMode(false)
  }

  const getTotalAmount = () => {
    return selectedItems.reduce((sum, item) => sum + item.amount, 0)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Invoice</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Step 1: Select Academic Year */}
            <div className="space-y-3">
              <h3 className="font-medium">1. Select Academic Year</h3>
              <Select value={selectedAcademicYear} onValueChange={(value) => {
                setSelectedAcademicYear(value)
                setSelectedTerm("") // Reset term when year changes
                setSelectedGrade("") // Reset grade
                setSelectedRoom("")
                setSelectedStudents([])
                setSelectedItems([])
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose academic year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map(year => (
                    <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2: Select Term */}
            {selectedAcademicYear && (
              <div className="space-y-3">
                <h3 className="font-medium">2. Select Term</h3>
                <Select value={selectedTerm} onValueChange={(value) => {
                  setSelectedTerm(value)
                  setSelectedGrade("") // Reset grade when term changes
                  setSelectedRoom("")
                  setSelectedStudents([])
                  setSelectedItems([])
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose term" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTerms.map(term => (
                      <SelectItem key={term.id} value={term.name}>{term.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Step 3: Select Grade */}
            {selectedAcademicYear && selectedTerm && (
              <div className="space-y-3">
                <h3 className="font-medium">3. Select Grade</h3>
                <Select value={selectedGrade} onValueChange={handleGradeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose grade level" />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map(grade => (
                      <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Step 4: Select Room */}
            {selectedAcademicYear && selectedTerm && selectedGrade && (
              <div className="space-y-3">
                <h3 className="font-medium">4. Select Room (Optional)</h3>
                <Select value={selectedRoom === "" ? "all" : selectedRoom} onValueChange={handleRoomChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose room or leave blank for all rooms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Rooms</SelectItem>
                    {rooms[selectedGrade as keyof typeof rooms]?.map(room => (
                      <SelectItem key={room} value={room}>{room}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Step 5: Select Items */}
            {selectedAcademicYear && selectedTerm && selectedGrade && (
              <div className="space-y-4">
                <h3 className="font-medium">5. Select Items</h3>
                
                {/* Template Selection */}
                {availableTemplates.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bookmark className="w-4 h-4 text-primary" />
                        <label className="font-medium">Quick Start Templates</label>
                      </div>
                      {selectedTemplate && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleTemplateSelect("none")}
                        >
                          Clear Template
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {availableTemplates.map((template) => {
                        const isSelected = selectedTemplate === template.id
                        const totalAmount = template.items.reduce((sum, itemId) => {
                          const item = allStoredItems.find(i => i.id === itemId)
                          return sum + (item?.amount || 0)
                        }, 0)
                        
                        return (
                          <Card 
                            key={template.id} 
                            className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"}`}
                            onClick={() => handleTemplateSelect(isSelected ? "none" : template.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  <Bookmark className="w-4 h-4 text-primary" />
                                  <h4 className="font-medium">{template.name}</h4>
                                </div>
                                {isSelected && (
                                  <CheckCircle className="w-5 h-5 text-primary" />
                                )}
                              </div>
                              
                              <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                              
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium">Items: {template.items.length}</span>
                                  <span className="font-medium">{formatCurrency(totalAmount)}</span>
                                </div>
                                
                                <div className="flex flex-wrap gap-1">
                                  {template.applicableGrades.slice(0, 2).map(grade => (
                                    <Badge key={grade} variant="secondary" className="text-xs">
                                      {grade}
                                    </Badge>
                                  ))}
                                  {template.applicableGrades.length > 2 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{template.applicableGrades.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                    
                    {selectedTemplate && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm text-blue-700">
                              <span className="font-medium">Template applied:</span> {availableTemplates.find(t => t.id === selectedTemplate)?.name}
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              {availableTemplates.find(t => t.id === selectedTemplate)?.description}
                            </p>
                            <p className="text-xs text-blue-600 mt-2 font-medium">
                              💡 You can still select additional items below
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-blue-700">
                              {formatCurrency(
                                availableTemplates.find(t => t.id === selectedTemplate)?.items.reduce((sum, itemId) => {
                                  const item = allStoredItems.find(i => i.id === itemId)
                                  return sum + (item?.amount || 0)
                                }, 0) || 0
                              )}
                            </p>
                            <p className="text-xs text-blue-600">{availableTemplates.find(t => t.id === selectedTemplate)?.items.length} template items</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Category Navigation */}
                <div className="space-y-3">
                  <label className="font-medium">Item Categories</label>
                  <div className="grid grid-cols-3 gap-3">
                    {itemCategories.map((category) => (
                      <Card
                        key={category.id}
                        className={`cursor-pointer transition-all ${
                          selectedCategory === category.id
                            ? "ring-2 ring-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => handleCategoryChange(category.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex flex-col items-center text-center space-y-2">
                            <category.icon className={`w-6 h-6 ${
                              selectedCategory === category.id
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`} />
                            <div>
                              <h4 className="font-medium text-sm">
                                {category.label}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {category.description}
                              </p>
                            </div>
                            {selectedCategory === category.id && (
                              <CheckCircle className="w-4 h-4 text-primary" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Available Items */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-medium">Available {selectedCategory} Items for {selectedGrade}</label>
                    <span className="text-sm text-muted-foreground">{availableItems.length} items available</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {availableItems.map((item) => {
                      const isSelected = selectedItems.find(i => i.id === item.id)
                      const isFromTemplate = selectedTemplate && availableTemplates.find(t => t.id === selectedTemplate)?.items.includes(item.id)
                      return (
                        <Card 
                          key={item.id} 
                          className={`cursor-pointer transition-all ${isSelected ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"}`}
                          onClick={() => isSelected ? handleItemRemove(item.id) : handleItemSelect(item)}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium">{item.name}</h4>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${
                                      item.category === "Tuition" ? "border-blue-300 text-blue-700" :
                                      item.category === "ECA" ? "border-green-300 text-green-700" :
                                      "border-orange-300 text-orange-700"
                                    }`}
                                  >
                                    {item.category}
                                  </Badge>
                                  {isFromTemplate && (
                                    <Badge variant="default" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                                      From Template
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                                <div className="flex items-center gap-4">
                                  <p className="font-medium text-lg">₿{item.amount.toLocaleString()}</p>
                                  <Badge variant="secondary" className="text-xs">
                                    {item.applicableGrades.length} grades
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center">
                                {isSelected ? (
                                  <CheckCircle className="w-5 h-5 text-primary" />
                                ) : (
                                  <Plus className="w-5 h-5 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>

                {/* Add Item from List Button */}
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setIsAddItemDialogOpen(true)}
                    className="w-full max-w-md border-dashed border-2"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item from List
                  </Button>
                </div>

                {/* Selected Items Summary */}
                {selectedItems.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <label className="font-medium">Selected Items ({selectedItems.length})</label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Total: {formatCurrency(getTotalAmount())}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedItems([])}
                      >
                        Clear All Items
                      </Button>
                    </div>
                    
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedItems.map((item) => {
                            const isFromTemplate = selectedTemplate && availableTemplates.find(t => t.id === selectedTemplate)?.items.includes(item.id)
                            const isCustomItem = item.id.startsWith("custom-")
                            return (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="font-medium">{item.name}</p>
                                      {isFromTemplate && (
                                        <Badge variant="default" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                                          Template
                                        </Badge>
                                      )}
                                      {isCustomItem && (
                                        <Badge variant="default" className="text-xs bg-purple-100 text-purple-700 border-purple-300">
                                          Custom
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">{item.description}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant="outline"
                                    className={`${
                                      item.category === "Tuition" ? "border-blue-300 text-blue-700" :
                                      item.category === "ECA" ? "border-green-300 text-green-700" :
                                      "border-orange-300 text-orange-700"
                                    }`}
                                  >
                                    {item.category}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-medium">
                                  ₿{item.amount.toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleItemRemove(item.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {availableItems.length === 0 && (
                  <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                    <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No {selectedCategory.toLowerCase()} items available for {selectedGrade}</p>
                    <p className="text-sm text-muted-foreground">Try selecting a different category or contact admin to add items</p>
                  </div>
                )}
              </div>
            )}

            {/* Step 6: Set Payment Deadline */}
            {selectedItems.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium">6. Set Payment Deadline</h3>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="max-w-xs justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {paymentDeadline ? format(paymentDeadline, "dd/MM/yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={paymentDeadline}
                      onSelect={setPaymentDeadline}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {paymentDeadline && (
                  <p className="text-sm text-green-600">
                    Payment deadline set for {format(paymentDeadline, "dd/MM/yyyy")}
                  </p>
                )}
              </div>
            )}

            {/* Step 7: Select Students */}
            {selectedItems.length > 0 && paymentDeadline && (
              <div className="space-y-4">
                <h3 className="font-medium">7. Select Students</h3>
                
                {/* Selection Type */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className={`cursor-pointer transition-all ${studentSelectionType === "individual" ? "ring-2 ring-primary" : ""}`}>
                    <CardContent className="p-4" onClick={() => setStudentSelectionType("individual")}>
                      <div className="flex items-center justify-center mb-2">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                      <h4 className="font-medium text-center text-sm">Individual</h4>
                      <p className="text-xs text-muted-foreground text-center mt-1">
                        Select specific students
                      </p>
                    </CardContent>
                  </Card>

                  <Card className={`cursor-pointer transition-all ${studentSelectionType === "csv" ? "ring-2 ring-primary" : ""}`}>
                    <CardContent className="p-4" onClick={() => setStudentSelectionType("csv")}>
                      <div className="flex items-center justify-center mb-2">
                        <FileSpreadsheet className="w-6 h-6 text-green-600" />
                      </div>
                      <h4 className="font-medium text-center text-sm">CSV Upload</h4>
                      <p className="text-xs text-muted-foreground text-center mt-1">
                        Upload student list
                      </p>
                    </CardContent>
                  </Card>

                  <Card className={`cursor-pointer transition-all ${studentSelectionType === "all" ? "ring-2 ring-primary" : ""}`}>
                    <CardContent className="p-4" onClick={() => setStudentSelectionType("all")}>
                      <div className="flex items-center justify-center mb-2">
                        <Users className="w-6 h-6 text-purple-600" />
                      </div>
                      <h4 className="font-medium text-center text-sm">All Students</h4>
                      <p className="text-xs text-muted-foreground text-center mt-1">
                        Select entire {selectedRoom ? "room" : "grade"}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Individual Selection */}
                {studentSelectionType === "individual" && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Input
                        placeholder="Search by Student ID or name"
                        value={searchStudentTerm}
                        onChange={(e) => setSearchStudentTerm(e.target.value)}
                        onFocus={() => setIsStudentSearchFocused(true)}
                        onBlur={() => setTimeout(() => setIsStudentSearchFocused(false), 200)}
                        className=""
                      />
                    </div>

                    {(isStudentSearchFocused || searchStudentTerm) && (
                      <div className="border rounded-lg max-h-64 overflow-y-auto">
                        <div className="p-2 bg-muted/50 border-b sticky top-0">
                          <p className="text-xs text-muted-foreground">
                            {filteredStudents.length} students in {selectedGrade}{selectedRoom ? ` - ${selectedRoom}` : ''}
                          </p>
                        </div>
                        {filteredStudents.length > 0 ? (
                          filteredStudents.map((student) => {
                            const invoiceStudent = student as InvoiceStudent
                            const studentHasDiscounts = hasDiscounts(invoiceStudent)
                            return (
                              <div
                                key={student.id}
                                className={`p-3 hover:bg-muted cursor-pointer border-b last:border-b-0 ${studentHasDiscounts ? 'bg-green-50' : ''}`}
                                onClick={() => handleIndividualStudentSelect(student)}
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="font-medium">{student.name}</p>
                                    <p className="text-sm text-muted-foreground">{student.id}</p>
                                    {studentHasDiscounts && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {invoiceStudent.discounts.siblingDiscount > 0 && (
                                          <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                                            Sibling {invoiceStudent.discounts.siblingDiscount}%
                                          </Badge>
                                        )}
                                        {invoiceStudent.discounts.studentGroupDiscounts.map((g, i) => (
                                          <Badge key={i} variant="outline" className="text-xs bg-cyan-100 text-cyan-700 border-cyan-300">
                                            {g.name}
                                          </Badge>
                                        ))}
                                        {invoiceStudent.discounts.staffChild && (
                                          <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                                            Staff Child
                                          </Badge>
                                        )}
                                        {invoiceStudent.discounts.scholarship && (
                                          <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-300">
                                            Scholarship
                                          </Badge>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <Plus className="w-4 h-4 text-muted-foreground" />
                                </div>
                              </div>
                            )
                          })
                        ) : (
                          <div className="p-3 text-center text-muted-foreground">
                            No students found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* CSV Upload */}
                {studentSelectionType === "csv" && (
                  <div className="space-y-3">
                    <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">Upload CSV file with student information</p>
                      <Input
                        type="file"
                        accept=".csv"
                        onChange={handleCsvUpload}
                        className="max-w-xs mx-auto"
                      />
                    </div>
                    {csvFile && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-green-700">
                          <span className="font-medium">File uploaded:</span> {csvFile.name}
                        </p>
                        <p className="text-sm text-green-600">Loaded {csvStudents.length} students</p>
                      </div>
                    )}
                  </div>
                )}

                {/* All Students */}
                {studentSelectionType === "all" && (
                  <div className="space-y-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                      <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm text-blue-700 mb-2">
                        Select all students in {selectedGrade} {selectedRoom && `- ${selectedRoom}`}
                      </p>
                      <p className="text-sm text-blue-600 mb-3">
                        {availableStudents.filter(s =>
                          s.grade === selectedGrade &&
                          (selectedRoom === "" || s.room === selectedRoom)
                        ).length} students will be selected
                      </p>
                      <Button onClick={handleSelectAllStudents} size="sm">
                        Select All Students
                      </Button>
                    </div>
                  </div>
                )}

                {/* Selected Students Display */}
                {selectedStudents.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <label className="font-medium">Selected Students ({selectedStudents.length})</label>
                        {selectedStudents.some(s => hasDiscounts(s as InvoiceStudent)) && (
                          <span className="text-xs text-green-600 ml-2">
                            ({selectedStudents.filter(s => hasDiscounts(s as InvoiceStudent)).length} students with discounts)
                          </span>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedStudents([])}
                      >
                        Clear All
                      </Button>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {selectedStudents.map((student) => {
                        const invoiceStudent = student as InvoiceStudent
                        const studentHasDiscounts = hasDiscounts(invoiceStudent)
                        return (
                          <div key={student.id} className={`flex items-center justify-between p-2 rounded-lg text-sm ${studentHasDiscounts ? 'bg-green-50 border border-green-200' : 'bg-muted'}`}>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{student.name}</span>
                                <span className="text-muted-foreground">({student.id} - {student.room})</span>
                              </div>
                              {studentHasDiscounts && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {invoiceStudent.discounts.siblingDiscount > 0 && (
                                    <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                                      Sibling {invoiceStudent.discounts.siblingDiscount}%
                                    </Badge>
                                  )}
                                  {invoiceStudent.discounts.studentGroupDiscounts.map((g, i) => (
                                    <Badge key={i} variant="outline" className="text-xs bg-cyan-100 text-cyan-700 border-cyan-300">
                                      {g.name}
                                    </Badge>
                                  ))}
                                  {invoiceStudent.discounts.staffChild && (
                                    <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                                      Staff Child
                                    </Badge>
                                  )}
                                  {invoiceStudent.discounts.scholarship && (
                                    <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-300">
                                      Scholarship
                                    </Badge>
                                  )}
                                  {invoiceStudent.discounts.earlyBird && (
                                    <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300">
                                      Early Bird
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveStudent(student.id)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 8: Preview and Create Invoice */}
            {selectedStudents.length > 0 && selectedItems.length > 0 && paymentDeadline && (
              <div className="space-y-4">
                <h3 className="font-medium">8. {isPreviewMode ? "Confirm and Send" : "Preview Invoice"}</h3>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Invoice Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-blue-700">Academic Year: <span className="font-medium">{selectedAcademicYear}</span></p>
                      <p className="text-blue-700">Term: <span className="font-medium">{selectedTerm}</span></p>
                      <p className="text-blue-700">Grade: <span className="font-medium">{selectedGrade}</span></p>
                      {selectedRoom && (
                        <p className="text-blue-700">Room: <span className="font-medium">{selectedRoom}</span></p>
                      )}
                      <p className="text-blue-700">Students: <span className="font-medium">{selectedStudents.length}</span></p>
                    </div>
                    <div>
                      <p className="text-blue-700">Items per Invoice: <span className="font-medium">{selectedItems.length}</span></p>
                      <p className="text-blue-700">Amount per Student: <span className="font-medium">₿{getTotalAmount().toLocaleString()}</span></p>
                      <p className="text-blue-700">Total Amount: <span className="font-medium">₿{(getTotalAmount() * selectedStudents.length).toLocaleString()}</span></p>
                      <p className="text-blue-700">Payment Deadline: <span className="font-medium">{paymentDeadline ? format(paymentDeadline, "dd/MM/yyyy") : "-"}</span></p>
                      <p className="text-blue-700">Invoices to Create: <span className="font-medium">{selectedStudents.length}</span></p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  {!isPreviewMode ? (
                    <Button 
                      onClick={handlePreviewInvoice}
                      className="flex-1 flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Preview Invoice
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleConfirmAndSendEmail}
                      className="flex-1 flex items-center justify-center gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      Confirm & Send Email
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmationOpen} onOpenChange={setIsConfirmationOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Email Sending</DialogTitle>
            <DialogDescription>
              Are you sure you want to create and send {selectedStudents.length} invoices via email?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-3">
              <div className="text-sm space-y-1">
                <p><span className="font-medium">Students:</span> {selectedStudents.length}</p>
                <p><span className="font-medium">Amount per invoice:</span> ₿{getTotalAmount().toLocaleString()}</p>
                <p><span className="font-medium">Total amount:</span> ₿{(getTotalAmount() * selectedStudents.length).toLocaleString()}</p>
                <p><span className="font-medium">Payment deadline:</span> {paymentDeadline ? format(paymentDeadline, "dd/MM/yyyy") : "-"}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIsConfirmationOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleFinalConfirmation}
                className="flex-1"
              >
                Send Invoices
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="sm:max-w-2xl w-[95vw] p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Invoice Preview</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col max-h-[90vh]">
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {selectedStudents.length > 0 && selectedStudents[previewStudentIndex] ? (
                (() => {
                  const currentStudent = selectedStudents[previewStudentIndex] as InvoiceStudent
                  const subtotal = getTotalAmount()
                  const discountCalc = calculateStudentDiscounts(currentStudent, subtotal)
                  const invoiceNumber = generateInvoiceNumber(currentStudent.id)
                  const issueDate = new Date()
                  const dueDate = paymentDeadline || null

                  return (
                    <div className="bg-white border rounded-lg shadow-sm text-sm">
                      {/* School Header */}
                      <div className="text-center py-6 border-b">
                        <img
                          src={SchoolLogo}
                          alt="King's College International School Bangkok"
                          style={{ height: '120px', margin: '0 auto 12px auto', display: 'block' }}
                        />
                        <h1 className="text-sm font-semibold tracking-wide text-gray-800">KING'S COLLEGE INTERNATIONAL SCHOOL BANGKOK</h1>
                        <p className="text-xs text-gray-500 mt-1">
                          {SCHOOL_INFO.address}
                        </p>
                        <p className="text-xs text-gray-500">
                          {SCHOOL_INFO.phone}, {SCHOOL_INFO.email}, {SCHOOL_INFO.website}
                        </p>
                        <h2 className="text-2xl font-bold mt-4 tracking-wide">INVOICE</h2>
                      </div>

                      {/* Student & Invoice Info */}
                      <div className="p-6 border-b">
                        <div className="grid grid-cols-2 gap-8">
                          {/* Left Column - Student Info */}
                          <div className="space-y-2">
                            <div className="grid grid-cols-[100px_1fr] gap-1">
                              <span className="text-gray-500">Student Name:</span>
                              <span className="font-medium">{currentStudent.name}</span>
                            </div>
                            <div className="grid grid-cols-[100px_1fr] gap-1">
                              <span className="text-gray-500">Student ID:</span>
                              <span>{currentStudent.id}</span>
                            </div>
                            <div className="grid grid-cols-[100px_1fr] gap-1">
                              <span className="text-gray-500">Year Group:</span>
                              <span>{selectedGrade}</span>
                            </div>
                            <div className="grid grid-cols-[100px_1fr] gap-1">
                              <span className="text-gray-500">Academic Year:</span>
                              <span>{getAcademicYear(issueDate)}</span>
                            </div>
                            <div className="grid grid-cols-[100px_1fr] gap-1">
                              <span className="text-gray-500">Bill To:</span>
                              <span>{currentStudent.parentName}</span>
                            </div>
                          </div>

                          {/* Right Column - Invoice Info */}
                          <div className="space-y-2">
                            <div className="grid grid-cols-[100px_1fr] gap-1">
                              <span className="text-gray-500">Invoice No:</span>
                              <span className="font-medium">{invoiceNumber}</span>
                            </div>
                            <div className="grid grid-cols-[100px_1fr] gap-1">
                              <span className="text-gray-500">Invoice Date:</span>
                              <span>{issueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            </div>
                            <div className="grid grid-cols-[100px_1fr] gap-1">
                              <span className="text-gray-500">Due Date:</span>
                              <span className="text-red-600 font-medium">{dueDate ? dueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</span>
                            </div>
                            <div className="grid grid-cols-[100px_1fr] gap-1">
                              <span className="text-gray-500">Term:</span>
                              <span>Term 1</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Invoice Items Table */}
                      <div className="p-4 border-b">
                        <table className="w-full border-collapse table-fixed">
                          <thead>
                            <tr className="bg-gray-100 border-y">
                              <th className="py-2 px-2 text-left font-semibold" style={{ width: '40px' }}>No.</th>
                              <th className="py-2 px-2 text-left font-semibold">Description</th>
                              <th className="py-2 px-2 text-right font-semibold whitespace-nowrap" style={{ width: '120px' }}>Amount (THB)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedItems.map((item, index) => (
                              <tr key={item.id} className="border-b">
                                <td className="py-2 px-2 align-top">{index + 1}</td>
                                <td className="py-2 px-2" style={{ wordBreak: 'break-word' }}>
                                  <div className="font-medium">{item.name}</div>
                                  {item.description && <div className="text-gray-500 text-xs">{item.description}</div>}
                                </td>
                                <td className="py-2 px-2 text-right font-medium align-top">{formatCurrency(item.amount)}</td>
                              </tr>
                            ))}

                            {/* Subtotal Row */}
                            <tr className="border-b">
                              <td></td>
                              <td className="py-2 px-2 text-right font-medium">Subtotal</td>
                              <td className="py-2 px-2 text-right font-medium">{formatCurrency(subtotal)}</td>
                            </tr>

                            {/* Discount Rows */}
                            {discountCalc.discountItems.length > 0 ? (
                              discountCalc.discountItems.map((discount, idx) => (
                                <tr key={idx} className="border-b text-green-600">
                                  <td></td>
                                  <td className="py-2 px-2 text-right">
                                    {discount.name}{discount.percentage ? ` (${discount.percentage}%)` : ''}
                                  </td>
                                  <td className="py-2 px-2 text-right">-{formatCurrency(discount.amount)}</td>
                                </tr>
                              ))
                            ) : (
                              <tr className="border-b">
                                <td></td>
                                <td className="py-2 px-2 text-right">Discount</td>
                                <td className="py-2 px-2 text-right">0.00</td>
                              </tr>
                            )}

                          </tbody>
                        </table>

                        {/* Amount in Words + Total */}
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-xs text-gray-600 mb-2">{numberToWords(discountCalc.netAmount)}</div>
                          <div className="flex justify-between items-center font-bold">
                            <span>TOTAL</span>
                            <span>{formatCurrency(discountCalc.netAmount)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Notes Section */}
                      <div className="p-6 border-b text-xs">
                        <h3 className="font-semibold mb-2">Notes:</h3>
                        <ul className="list-disc list-inside space-y-1 text-gray-600">
                          <li>{INVOICE_NOTES.latePayment}</li>
                          <li>{INVOICE_NOTES.refundCondition}</li>
                        </ul>
                      </div>

                      {/* Payment Methods */}
                      <div className="p-6 text-xs">
                        <h3 className="font-semibold mb-3">Payment methods</h3>
                        <div className="space-y-4">
                          {/* Cheque */}
                          <div className="flex">
                            <span className="mr-2">-</span>
                            <div>
                              <span className="font-medium">Cheque:</span>
                              <span className="text-gray-600 ml-1">{INVOICE_NOTES.chequeInstruction}</span>
                            </div>
                          </div>

                          {/* Bank Transfer */}
                          <div className="flex">
                            <span className="mr-2">-</span>
                            <div className="flex-1">
                              <span className="font-medium">Bank Transfer:</span>
                              <span className="text-gray-600 ml-1">{INVOICE_NOTES.bankTransferInstruction}</span>
                              <table className="mt-3 ml-4">
                                <tbody className="text-xs">
                                  <tr>
                                    <td className="pr-8 py-0.5 text-gray-600">Account name</td>
                                    <td className="py-0.5">{BANK_DETAILS.accountName}</td>
                                  </tr>
                                  <tr>
                                    <td className="pr-8 py-0.5 text-gray-600">Account number</td>
                                    <td className="py-0.5 font-medium">{BANK_DETAILS.accountNumber}</td>
                                  </tr>
                                  <tr>
                                    <td className="pr-8 py-0.5 text-gray-600">Bank name</td>
                                    <td className="py-0.5">{BANK_DETAILS.bankName}</td>
                                  </tr>
                                  <tr>
                                    <td className="pr-8 py-0.5 text-gray-600">Branch</td>
                                    <td className="py-0.5">{BANK_DETAILS.branch}</td>
                                  </tr>
                                  <tr>
                                    <td className="pr-8 py-0.5 text-gray-600">Swift code</td>
                                    <td className="py-0.5">{BANK_DETAILS.swiftCode}</td>
                                  </tr>
                                  <tr>
                                    <td className="pr-8 py-0.5 text-gray-600">Bank address</td>
                                    <td className="py-0.5">{BANK_DETAILS.bankAddress}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Bill Payment */}
                          <div className="flex">
                            <span className="mr-2">-</span>
                            <div className="flex-1">
                              <span className="font-medium">Bill Payment via Mobile Banking, Internet Banking, ATM or Bank Counter:</span>
                              <span className="text-gray-600 ml-1">{INVOICE_NOTES.billPaymentInstruction}</span>
                              <div className="mt-3 ml-4 flex items-start gap-6">
                                <table>
                                  <tbody className="text-xs">
                                    <tr>
                                      <td className="pr-8 py-0.5 text-gray-600">Biller ID no.</td>
                                      <td className="py-0.5 font-medium">{BILL_PAYMENT.billerId}</td>
                                    </tr>
                                    <tr>
                                      <td className="pr-8 py-0.5 text-gray-600">Reference no. (Ref 1)</td>
                                      <td className="py-0.5">{currentStudent.id}</td>
                                    </tr>
                                    <tr>
                                      <td className="pr-8 py-0.5 text-gray-600">Reference no. (Ref 2)</td>
                                      <td className="py-0.5">{invoiceNumber}</td>
                                    </tr>
                                  </tbody>
                                </table>
                                <div className="w-20 h-20 bg-white p-1">
                                  <div className="grid grid-cols-7 gap-px w-full h-full">
                                    {/* QR Code pattern - 7x7 grid with position markers */}
                                    {[
                                      1,1,1,1,1,1,1,
                                      1,0,0,0,0,0,1,
                                      1,0,1,1,1,0,1,
                                      1,0,1,1,1,0,1,
                                      1,0,1,1,1,0,1,
                                      1,0,0,0,0,0,1,
                                      1,1,1,1,1,1,1,
                                    ].map((cell, i) => (
                                      <div key={i} className={`${cell ? 'bg-black' : 'bg-white'}`} />
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Credit Card */}
                          <div className="flex">
                            <span className="mr-2">-</span>
                            <div>
                              <span className="font-medium">Credit card:</span>
                              <span className="text-gray-600 ml-1">{INVOICE_NOTES.creditCardNote}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Signature Section */}
                      <div className="p-6 pt-8">
                        <div className="flex justify-between px-12">
                          <div className="text-center">
                            <div className="w-48 border-b border-gray-400 mb-1"></div>
                            <p className="text-xs text-gray-600">Prepared by</p>
                          </div>
                          <div className="text-center">
                            <div className="w-48 border-b border-gray-400 mb-1"></div>
                            <p className="text-xs text-gray-600">Authorised officer</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  No student data available for preview
                </div>
              )}
            </div>

            {/* Fixed Footer */}
            <div className="p-4 border-t bg-background">
              <div className="flex justify-between items-center gap-4">
                {/* Navigation for multiple students */}
                {selectedStudents.length > 1 ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewStudentIndex(Math.max(0, previewStudentIndex - 1))}
                      disabled={previewStudentIndex === 0}
                    >
                      Previous
                    </Button>
                    <span className="text-muted-foreground">
                      {previewStudentIndex + 1} / {selectedStudents.length}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewStudentIndex(Math.min(selectedStudents.length - 1, previewStudentIndex + 1))}
                      disabled={previewStudentIndex === selectedStudents.length - 1}
                    >
                      Next
                    </Button>
                  </div>
                ) : <div />}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPreviewDialogOpen(false)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSaveAsDraft}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Draft
                  </Button>
                  <Button size="sm" onClick={handleConfirmFromPreview}>
                    <Mail className="w-4 h-4 mr-1" />
                    Confirm & Send
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Item from List Dialog */}
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent className="max-w-lg flex flex-col" style={{ maxHeight: '85vh' }}>
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Add Item from List</DialogTitle>
            <DialogDescription>
              Select items to add to this invoice
            </DialogDescription>
          </DialogHeader>

          {/* Search and Filter - Fixed */}
          <div className="flex gap-2 flex-shrink-0 pb-3">
            <div className="flex-1 relative">
              <Input
                placeholder="Search..."
                value={addItemSearchTerm}
                onChange={(e) => setAddItemSearchTerm(e.target.value)}
                className=""
              />
            </div>
            <Select value={addItemCategory} onValueChange={setAddItemCategory}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Tuition">Tuition</SelectItem>
                <SelectItem value="ECA">ECA</SelectItem>
                <SelectItem value="Trip & Other Activity">Trip</SelectItem>
                <SelectItem value="School Bus">Bus</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Items List - Scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1">
            {getItemsForDialog().length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No items found</p>
              </div>
            ) : (
              getItemsForDialog().map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleAddItemFromList(item)}
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-sm truncate">{item.name}</span>
                      <Badge
                        variant="outline"
                        className={`text-xs flex-shrink-0 ${
                          item.category === "Tuition" ? "border-blue-300 text-blue-700" :
                          item.category === "ECA" ? "border-green-300 text-green-700" :
                          item.category === "School Bus" ? "border-yellow-300 text-yellow-700" :
                          "border-orange-300 text-orange-700"
                        }`}
                      >
                        {item.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-medium">฿{item.amount.toLocaleString()}</span>
                    <Plus className="w-4 h-4 text-primary" />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer - Fixed */}
          <div className="flex justify-between items-center pt-3 border-t flex-shrink-0">
            <span className="text-xs text-muted-foreground">
              {getItemsForDialog().length} items
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAddItemDialogOpen(false)
                setAddItemSearchTerm("")
                setAddItemCategory("all")
              }}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}