import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { useDiscountOptions } from "@/contexts/DiscountOptionsContext"
import { useStudents } from "@/contexts/StudentContext"
import { useAcademicYears } from "@/contexts/AcademicYearContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Separator } from "./ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Calendar as CalendarComponent } from "./ui/calendar"
import { Search, Plus, CheckCircle, Trash2, X, Upload, Users, User, FileSpreadsheet, FileText, Bookmark, GraduationCap, Zap, MapPin, Calendar, Clock, Eye, Mail, Package, Save, Building, CreditCard, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
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

// Storage keys for discount types
const SCHOLARSHIP_RECORDS_KEY = "scholarshipRecords"
const STAFF_CHILD_RECORDS_KEY = "staffChildRecords"
const EARLY_BIRD_RECORDS_KEY = "earlyBirdRecords"

// Helper function to check if student has Scholarship discount
const hasScholarshipDiscount = (studentId: string): boolean => {
  try {
    const stored = localStorage.getItem(SCHOLARSHIP_RECORDS_KEY)
    if (!stored) return false
    const records = JSON.parse(stored)
    // Records can be array of { studentId, ... } or just array of student IDs
    return records.some((record: any) =>
      record.studentId === studentId || record === studentId
    )
  } catch {
    return false
  }
}

// Helper function to check if student is Staff Child
const isStaffChildStudent = (studentId: string): boolean => {
  try {
    const stored = localStorage.getItem(STAFF_CHILD_RECORDS_KEY)
    if (!stored) return false
    const records = JSON.parse(stored)
    // Records can be array of { studentId, ... } or just array of student IDs
    return records.some((record: any) =>
      record.studentId === studentId || record === studentId
    )
  } catch {
    return false
  }
}

// Helper function to check if student has Early Bird discount
const hasEarlyBirdDiscount = (studentId: string): boolean => {
  try {
    const stored = localStorage.getItem(EARLY_BIRD_RECORDS_KEY)
    if (!stored) return false
    const records = JSON.parse(stored)
    // Records can be array of { studentId, ... } or just array of student IDs
    return records.some((record: any) =>
      record.studentId === studentId || record === studentId
    )
  } catch {
    return false
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
  status: "draft" | "pending_approval" | "approved" | "rejected" | "sent" | "paid" | "partial" | "unpaid" | "overdue" | "cancelled"
  term: string
  paymentType: "termly"
  createdAt: string
  // External invoice fields
  invoiceType?: "student" | "external"
  recipientName?: string
  recipientAddress?: string
  eventName?: string
  notes?: string
  // New student fields
  isNewStudent?: boolean
  registrationFees?: { name: string, amount: number }[]
  idCharges?: number
  securityDepositWaiver?: number
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
  onNavigateBack?: () => void
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
  // New student flag (for Application & Registration Fees)
  isNewStudent: boolean
  enrollmentTerm?: string
  enrollmentYear?: string
  // Discount information
  discounts: {
    siblingDiscount: number
    studentGroupDiscounts: { name: string, type: string, percentage: number, fixedAmount: number }[]
    staffChild: boolean
    scholarship: boolean
    earlyBird: boolean
  }
  // Fee Waiver information
  feeWaiver?: {
    eligible: boolean
    creditPerTerm: number
    termsRemaining: number // 0-3, when 0 means completed
    reason: string
  }
}

export function InvoiceCreation({ defaultCategory, invoiceType, onNavigateToEmailSending, onNavigateBack }: InvoiceCreationProps) {
  // Language context
  const { t } = useLanguage()

  // Discount Options context
  const { getRegistrationFees, getLatePaymentSettings, getSiblingDiscountPercentage } = useDiscountOptions()

  // Student context
  const { students, addStudent, families, addFamily, checkFeePrivilegeEligibility } = useStudents()
  const { academicYears } = useAcademicYears()

  // Get current academic year and term (default to first ones)
  const academicYear = academicYears[0]?.id || "2025-2026"
  const term = "term1" // Default term

  // Create invoice state - declare early so they can be used in useMemo
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("")
  const [selectedTerm, setSelectedTerm] = useState("")
  const [selectedGrade, setSelectedGrade] = useState("")
  const [selectedRoom, setSelectedRoom] = useState("")

  // Convert StudentContext students to invoice format
  // Use selected values when available, fall back to defaults
  const effectiveAcademicYear = selectedAcademicYear || academicYear
  const effectiveTerm = selectedTerm || term

  const availableStudents = useMemo(() => {
    return students.map(student => {
      // Get sibling discount - available from 1st child onwards (no Year 3+ requirement)
      const childOrder = student.childOrder || 1
      const siblingDiscount = getSiblingDiscountPercentage(childOrder, student.academicYear || effectiveAcademicYear, effectiveTerm)

      // Get student group discounts
      const groupDiscounts = getStudentGroupDiscounts(student.studentId)

      // Check for special discounts from localStorage records
      // Fallback to notes-based detection for backward compatibility
      const notes = student.notes?.toLowerCase() || ""
      const staffChild = isStaffChildStudent(student.studentId) || notes.includes('staff')
      const scholarship = hasScholarshipDiscount(student.studentId) || notes.includes('scholarship')
      const earlyBird = hasEarlyBirdDiscount(student.studentId) || notes.includes('early bird')

      // Convert gradeLevel ID to label format (e.g., "year2" -> "Year 2")
      const gradeLabel = getGradeLabel(student.gradeLevel)

      // Get room/section from student if available, or leave empty for "All Rooms"
      const studentRoom = student.section || student.room || ""

      // Existing students in the system are NOT new students
      // Only students added via "Add New Student" button are considered new

      // Calculate Fee Waiver eligibility (same logic as Family Groups)
      // Pass current invoice term (not enrollment term) to check if eligible NOW
      const feeWaiverEligibility = checkFeePrivilegeEligibility(
        student,
        effectiveAcademicYear,  // Current academic year for invoice
        effectiveTerm           // Current term for invoice
      )

      // Default to 3 terms remaining for eligible students
      // In production, this should be tracked in database
      const termsRemaining = feeWaiverEligibility.eligible ? 3 : 0

      return {
        id: student.studentId,
        name: `${student.firstName} ${student.lastName}`,
        grade: gradeLabel, // Convert to label format to match Create Invoice dropdown
        room: studentRoom, // Use actual room/section, empty means "All Rooms"
        parentName: student.parents?.[0]?.name || "Parent",
        email: student.parents?.[0]?.email || "parent@email.com",
        originalStudent: student,
        isNewStudent: false, // Existing students are NOT new - no registration fees
        enrollmentTerm: student.enrollmentTerm || "",
        enrollmentYear: student.academicYear || "",
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
        },
        feeWaiver: feeWaiverEligibility.eligible && termsRemaining > 0 ? {
          eligible: true,
          creditPerTerm: feeWaiverEligibility.creditPerTerm || 75000,
          termsRemaining,
          reason: feeWaiverEligibility.reason
        } : undefined
      } as InvoiceStudent
    })
  }, [students, effectiveAcademicYear, effectiveTerm, checkFeePrivilegeEligibility, getSiblingDiscountPercentage, getStudentGroupDiscounts])

  // Load all items from localStorage for template calculations
  const allStoredItems = useMemo(() => {
    return loadItemsFromStorage()
  }, [])

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

  // Update selected students' feeWaiver and discounts when term/year changes
  useEffect(() => {
    if (selectedStudents.length > 0 && availableStudents.length > 0) {
      const updatedStudents = selectedStudents.map(selected => {
        // Find the updated version from availableStudents
        const updated = availableStudents.find(a => a.id === selected.id)
        if (updated) {
          // Update feeWaiver and discounts from the recalculated availableStudents
          return {
            ...selected,
            feeWaiver: updated.feeWaiver,
            discounts: { ...selected.discounts, siblingDiscount: updated.discounts.siblingDiscount }
          }
        }
        return selected
      })
      // Only update if there are actual changes
      const hasChanges = updatedStudents.some((s, i) =>
        s.feeWaiver?.eligible !== selectedStudents[i]?.feeWaiver?.eligible ||
        s.discounts.siblingDiscount !== selectedStudents[i]?.discounts.siblingDiscount
      )
      if (hasChanges) {
        setSelectedStudents(updatedStudents)
      }
    }
  }, [availableStudents]) // Runs when availableStudents recalculates (due to term/year change)

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

  // Invoice type tab state
  const [invoiceTab, setInvoiceTab] = useState<"student" | "external">("student")

  // External invoice state
  const [externalRecipientName, setExternalRecipientName] = useState("")
  const [externalRecipientEmail, setExternalRecipientEmail] = useState("")
  const [externalRecipientAddress, setExternalRecipientAddress] = useState("")
  const [externalEventName, setExternalEventName] = useState("")
  const [externalSelectedItems, setExternalSelectedItems] = useState<PreCreatedItem[]>([])
  const [externalPaymentDeadline, setExternalPaymentDeadline] = useState<Date | undefined>(undefined)
  const [externalNotes, setExternalNotes] = useState("")

  // Add New Student dialog state
  const [isAddNewStudentOpen, setIsAddNewStudentOpen] = useState(false)
  const [newStudentFirstName, setNewStudentFirstName] = useState("")
  const [newStudentLastName, setNewStudentLastName] = useState("")
  const [newStudentNickname, setNewStudentNickname] = useState("")
  const [newStudentGender, setNewStudentGender] = useState<"male" | "female" | "other">("other")
  const [newStudentDob, setNewStudentDob] = useState("")
  // Family selection
  const [newStudentFamilyType, setNewStudentFamilyType] = useState<"new" | "existing">("new")
  const [newStudentFamilyId, setNewStudentFamilyId] = useState("")
  const [newStudentChildOrder, setNewStudentChildOrder] = useState(1)
  // Parent info (for new family)
  const [newStudentParentName, setNewStudentParentName] = useState("")
  const [newStudentParentRelation, setNewStudentParentRelation] = useState<"father" | "mother" | "guardian" | "other">("guardian")
  const [newStudentEmail, setNewStudentEmail] = useState("")
  const [newStudentPhone, setNewStudentPhone] = useState("")
  const [newStudentAddress, setNewStudentAddress] = useState("")

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

    // Ensure discounts object exists
    const discounts = student.discounts || {
      siblingDiscount: 0,
      studentGroupDiscounts: [],
      staffChild: false,
      scholarship: false,
      earlyBird: false
    }

    // Sibling Discount
    if (discounts.siblingDiscount > 0) {
      const amount = Math.round(subtotal * discounts.siblingDiscount / 100)
      discountItems.push({
        name: `Sibling Discount`,
        amount,
        percentage: discounts.siblingDiscount
      })
      totalDiscountAmount += amount
    }

    // Registration Fee Waiver (after Sibling) - only show if eligible
    if (student.feeWaiver?.eligible && student.feeWaiver?.termsRemaining > 0) {
      const termNumber = 4 - student.feeWaiver.termsRemaining
      discountItems.push({
        name: `Registration Fee Waiver (฿${student.feeWaiver.creditPerTerm.toLocaleString()}/term ${termNumber}/3)`,
        amount: student.feeWaiver.creditPerTerm
      })
    }

    // Scholarship (after Registration Fee Waiver)
    if (discounts.scholarship) {
      const amount = subtotal
      discountItems.push({
        name: "Scholarship",
        amount,
        percentage: 100
      })
      totalDiscountAmount += amount
    }

    // Student Group Discounts
    discounts.studentGroupDiscounts.forEach(group => {
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
    if (discounts.staffChild) {
      const amount = Math.round(subtotal * 50 / 100)
      discountItems.push({
        name: "Staff Child Discount",
        amount,
        percentage: 50
      })
      totalDiscountAmount += amount
    }

    // Early Bird (5%)
    if (discounts.earlyBird) {
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
      student.discounts.earlyBird ||
      (student.feeWaiver?.eligible && student.feeWaiver?.termsRemaining > 0)
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

  // Handle adding a new student (not in system yet)
  const handleAddNewStudent = () => {
    if (!newStudentFirstName || !newStudentLastName) {
      toast.error("Please fill in required fields (First Name, Last Name)")
      return
    }

    // Email is required only for new family
    if (newStudentFamilyType === "new" && !newStudentEmail) {
      toast.error("Please fill in Email for new family")
      return
    }

    // For existing family, must select a family
    if (newStudentFamilyType === "existing" && !newStudentFamilyId) {
      toast.error("Please select an existing family")
      return
    }

    const newStudentId = `KC${selectedAcademicYear.split('-')[0]}${String(Date.now()).slice(-4)}`
    const now = new Date()

    let familyId = ""
    let childOrder = 1
    let parentInfo = {
      id: `P-${newStudentId}`,
      name: newStudentParentName || `${newStudentFirstName}'s Parent`,
      relationship: newStudentParentRelation,
      phone: newStudentPhone || "",
      email: newStudentEmail,
      isPrimary: true
    }

    if (newStudentFamilyType === "existing" && newStudentFamilyId) {
      // Use existing family
      familyId = newStudentFamilyId
      const existingFamily = families.find(f => f.id === newStudentFamilyId)
      if (existingFamily) {
        childOrder = existingFamily.studentIds.length + 1
        // Get parent info from existing family
        const familyStudents = students.filter(s => s.familyId === newStudentFamilyId)
        if (familyStudents.length > 0 && familyStudents[0].parents.length > 0) {
          parentInfo = { ...familyStudents[0].parents[0], id: `P-${newStudentId}` }
        }
      }
    } else {
      // Create new family
      familyId = `FAM-${newStudentId}`
      const newFamily = {
        id: familyId,
        familyCode: `F${String(Date.now()).slice(-6)}`,
        familyName: `${newStudentLastName} Family`,
        studentIds: [newStudentId],
        primaryContactId: parentInfo.id,
        address: newStudentAddress || "",
        email: newStudentEmail,
        phone: newStudentPhone || "",
        createdAt: now
      }
      addFamily(newFamily)
    }

    // Create Student object for StudentContext (to save to Student List)
    const studentForContext = {
      id: newStudentId,
      studentId: newStudentId,
      firstName: newStudentFirstName,
      lastName: newStudentLastName,
      nickname: newStudentNickname || "",
      dateOfBirth: newStudentDob ? new Date(newStudentDob) : null,
      gender: newStudentGender,
      gradeLevel: selectedGrade.toLowerCase().replace(/\s+/g, ''), // "Year 3" -> "year3"
      academicYear: selectedAcademicYear,
      enrollmentTerm: (selectedTerm || "term1") as "term1" | "term2" | "term3",
      status: "active" as const,
      familyId: familyId,
      childOrder: newStudentFamilyType === "existing" ? childOrder : newStudentChildOrder,
      parents: [parentInfo],
      enrollmentDate: now,
      notes: "New student - added via Invoice Creation",
      createdBy: "system",
      createdAt: now,
      updatedBy: "system",
      updatedAt: now
    }

    // Save to Student List
    addStudent(studentForContext)

    // Calculate sibling discount if joining existing family
    const siblingDiscount = newStudentFamilyType === "existing" && childOrder >= 2
      ? getSiblingDiscountPercentage(childOrder, selectedAcademicYear, selectedTerm)
      : 0

    // Create InvoiceStudent object for invoice creation
    const newStudent: InvoiceStudent = {
      id: newStudentId,
      name: `${newStudentFirstName} ${newStudentLastName}`,
      grade: selectedGrade,
      room: selectedRoom || "",
      parentName: parentInfo.name,
      email: parentInfo.email,
      originalStudent: studentForContext,
      isNewStudent: true, // Mark as new student for Application & Registration Fees
      enrollmentTerm: selectedTerm,
      enrollmentYear: selectedAcademicYear,
      discounts: {
        siblingDiscount: siblingDiscount,
        studentGroupDiscounts: [],
        staffChild: false,
        scholarship: false,
        earlyBird: false
      }
    }

    setSelectedStudents([...selectedStudents, newStudent])

    // Reset form
    setNewStudentFirstName("")
    setNewStudentLastName("")
    setNewStudentNickname("")
    setNewStudentGender("other")
    setNewStudentDob("")
    setNewStudentFamilyType("new")
    setNewStudentFamilyId("")
    setNewStudentChildOrder(1)
    setNewStudentParentName("")
    setNewStudentParentRelation("guardian")
    setNewStudentEmail("")
    setNewStudentPhone("")
    setNewStudentAddress("")
    setIsAddNewStudentOpen(false)

    toast.success(`Added new student: ${newStudent.name} (Saved to Student List)`)
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
    if (invoiceTab === "external") {
      setExternalSelectedItems([...externalSelectedItems, item])
    } else {
      setSelectedItems([...selectedItems, item])
    }
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
    const fees = getRegistrationFees(selectedAcademicYear, selectedTerm)

    // Save each student's invoice to localStorage
    selectedStudents.forEach((student) => {
      const invoiceStudent = student as InvoiceStudent
      const subtotal = getTotalAmount()
      const discountCalc = calculateStudentDiscounts(invoiceStudent, subtotal)
      const invoiceNumber = generateInvoiceNumber(student.id)

      // Calculate registration fees for new students
      const registrationFeesList: { name: string, amount: number }[] = []
      let registrationFeesTotal = 0
      if (invoiceStudent.isNewStudent) {
        if (fees.applicationFee > 0) {
          registrationFeesList.push({ name: 'Application Fee', amount: fees.applicationFee })
          registrationFeesTotal += fees.applicationFee
        }
        if (fees.registrationFee > 0) {
          registrationFeesList.push({ name: 'Registration Fee', amount: fees.registrationFee })
          registrationFeesTotal += fees.registrationFee
        }
        if (fees.securityDeposit > 0) {
          registrationFeesList.push({ name: `Security Deposit${fees.securityDepositRefundable ? ' (Refundable)' : ''}`, amount: fees.securityDeposit })
          registrationFeesTotal += fees.securityDeposit
        }
      }

      // Calculate Security Deposit Fee Waiver (for new students eligible for fee waiver)
      const securityDepositWaiverAmount = invoiceStudent.isNewStudent &&
        invoiceStudent.feeWaiver?.eligible &&
        fees.securityDeposit > 0
          ? fees.securityDeposit
          : 0

      // Calculate ID Charges (3%)
      const subtotalBeforeIdCharges = discountCalc.netAmount + registrationFeesTotal - securityDepositWaiverAmount
      const idCharges = Math.round(subtotalBeforeIdCharges * 0.03)

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
        createdAt: now.toISOString(),
        // New student data
        isNewStudent: invoiceStudent.isNewStudent,
        registrationFees: registrationFeesList.length > 0 ? registrationFeesList : undefined,
        idCharges: idCharges > 0 ? idCharges : undefined,
        securityDepositWaiver: securityDepositWaiverAmount > 0 ? securityDepositWaiverAmount : undefined
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
    const fees = getRegistrationFees(selectedAcademicYear, selectedTerm)

    // Save each student's invoice to localStorage with "pending" status
    selectedStudents.forEach((student) => {
      const invoiceStudent = student as InvoiceStudent
      const subtotal = getTotalAmount()
      const discountCalc = calculateStudentDiscounts(invoiceStudent, subtotal)
      const invoiceNumber = generateInvoiceNumber(student.id)

      // Calculate registration fees for new students
      const registrationFeesList: { name: string, amount: number }[] = []
      let registrationFeesTotal = 0
      if (invoiceStudent.isNewStudent) {
        if (fees.applicationFee > 0) {
          registrationFeesList.push({ name: 'Application Fee', amount: fees.applicationFee })
          registrationFeesTotal += fees.applicationFee
        }
        if (fees.registrationFee > 0) {
          registrationFeesList.push({ name: 'Registration Fee', amount: fees.registrationFee })
          registrationFeesTotal += fees.registrationFee
        }
        if (fees.securityDeposit > 0) {
          registrationFeesList.push({ name: `Security Deposit${fees.securityDepositRefundable ? ' (Refundable)' : ''}`, amount: fees.securityDeposit })
          registrationFeesTotal += fees.securityDeposit
        }
      }

      // Calculate Security Deposit Fee Waiver (for new students eligible for fee waiver)
      const securityDepositWaiverAmount = invoiceStudent.isNewStudent &&
        invoiceStudent.feeWaiver?.eligible &&
        fees.securityDeposit > 0
          ? fees.securityDeposit
          : 0

      // Calculate ID Charges (3%)
      const subtotalBeforeIdCharges = discountCalc.netAmount + registrationFeesTotal - securityDepositWaiverAmount
      const idCharges = Math.round(subtotalBeforeIdCharges * 0.03)

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
        status: "pending_approval", // Pending approval status
        term: `${selectedAcademicYear} - ${selectedTerm}`,
        paymentType: "termly",
        createdAt: now.toISOString(),
        // New student data
        isNewStudent: invoiceStudent.isNewStudent,
        registrationFees: registrationFeesList.length > 0 ? registrationFeesList : undefined,
        idCharges: idCharges > 0 ? idCharges : undefined,
        securityDepositWaiver: securityDepositWaiverAmount > 0 ? securityDepositWaiverAmount : undefined
      }

      saveInvoiceToStorage(savedInvoice)
    })

    toast.success(`Submitted ${selectedStudents.length} invoice(s) for approval`)
    setIsPreviewDialogOpen(false)

    // Navigate back to Invoice Management
    if (onNavigateBack) {
      onNavigateBack()
      return
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
  }

  const getTotalAmount = () => {
    return selectedItems.reduce((sum, item) => sum + item.amount, 0)
  }

  // Generate invoice number for external invoice
  const generateExternalInvoiceNumber = () => {
    const now = new Date()
    const year = now.getFullYear()
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `EXT-${year}-${random}`
  }

  // Get total amount for external invoice
  const getExternalTotalAmount = () => {
    return externalSelectedItems.reduce((sum, item) => sum + item.amount, 0)
  }

  // Reset external invoice form
  const resetExternalForm = () => {
    setExternalRecipientName("")
    setExternalRecipientEmail("")
    setExternalRecipientAddress("")
    setExternalEventName("")
    setExternalSelectedItems([])
    setExternalPaymentDeadline(undefined)
    setExternalNotes("")
  }

  // Save External Invoice as Draft
  const handleSaveExternalAsDraft = () => {
    if (!externalRecipientName || !externalRecipientEmail) {
      toast.error("Please fill in recipient name and email")
      return
    }

    const now = new Date()
    const subtotal = getExternalTotalAmount()

    const savedInvoice: SavedInvoice = {
      id: `ext-inv-${Date.now()}`,
      invoiceNumber: generateExternalInvoiceNumber(),
      studentName: externalRecipientName, // Use recipientName as studentName for compatibility
      studentId: "EXTERNAL",
      studentGrade: "-",
      studentRoom: "-",
      parentName: externalRecipientName,
      parentEmail: externalRecipientEmail,
      items: externalSelectedItems,
      subtotal: subtotal,
      discounts: [],
      totalDiscount: 0,
      netAmount: subtotal,
      dueDate: externalPaymentDeadline ? externalPaymentDeadline.toISOString().split('T')[0] : "",
      issueDate: now.toISOString().split('T')[0],
      status: "pending_approval",
      term: externalEventName || "External",
      paymentType: "termly",
      createdAt: now.toISOString(),
      // External specific fields
      invoiceType: "external",
      recipientName: externalRecipientName,
      recipientAddress: externalRecipientAddress,
      eventName: externalEventName,
      notes: externalNotes
    }

    saveInvoiceToStorage(savedInvoice)
    toast.success("External invoice submitted for approval")
    resetExternalForm()

    if (onNavigateBack) {
      onNavigateBack()
    }
  }

  // Create External Invoice (pending status)
  const handleCreateExternalInvoice = () => {
    if (!externalRecipientName || !externalRecipientEmail || externalSelectedItems.length === 0) {
      toast.error("Please fill in required fields and add at least one item")
      return
    }

    const now = new Date()
    const subtotal = getExternalTotalAmount()

    const savedInvoice: SavedInvoice = {
      id: `ext-inv-${Date.now()}`,
      invoiceNumber: generateExternalInvoiceNumber(),
      studentName: externalRecipientName,
      studentId: "EXTERNAL",
      studentGrade: "-",
      studentRoom: "-",
      parentName: externalRecipientName,
      parentEmail: externalRecipientEmail,
      items: externalSelectedItems,
      subtotal: subtotal,
      discounts: [],
      totalDiscount: 0,
      netAmount: subtotal,
      dueDate: externalPaymentDeadline ? externalPaymentDeadline.toISOString().split('T')[0] : "",
      issueDate: now.toISOString().split('T')[0],
      status: "pending",
      term: externalEventName || "External",
      paymentType: "termly",
      createdAt: now.toISOString(),
      invoiceType: "external",
      recipientName: externalRecipientName,
      recipientAddress: externalRecipientAddress,
      eventName: externalEventName,
      notes: externalNotes
    }

    saveInvoiceToStorage(savedInvoice)
    toast.success("External invoice created successfully")
    resetExternalForm()

    if (onNavigateBack) {
      onNavigateBack()
    }
  }

  // Create External Invoice and Send Email
  const handleCreateExternalAndSendEmail = () => {
    if (!externalRecipientName || !externalRecipientEmail || externalSelectedItems.length === 0) {
      toast.error("Please fill in required fields and add at least one item")
      return
    }

    const now = new Date()
    const subtotal = getExternalTotalAmount()

    const savedInvoice: SavedInvoice = {
      id: `ext-inv-${Date.now()}`,
      invoiceNumber: generateExternalInvoiceNumber(),
      studentName: externalRecipientName,
      studentId: "EXTERNAL",
      studentGrade: "-",
      studentRoom: "-",
      parentName: externalRecipientName,
      parentEmail: externalRecipientEmail,
      items: externalSelectedItems,
      subtotal: subtotal,
      discounts: [],
      totalDiscount: 0,
      netAmount: subtotal,
      dueDate: externalPaymentDeadline ? externalPaymentDeadline.toISOString().split('T')[0] : "",
      issueDate: now.toISOString().split('T')[0],
      status: "sent",
      term: externalEventName || "External",
      paymentType: "termly",
      createdAt: now.toISOString(),
      invoiceType: "external",
      recipientName: externalRecipientName,
      recipientAddress: externalRecipientAddress,
      eventName: externalEventName,
      notes: externalNotes
    }

    saveInvoiceToStorage(savedInvoice)
    toast.success("External invoice created and email sent")
    resetExternalForm()

    if (onNavigateBack) {
      onNavigateBack()
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("invoiceCreate.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={invoiceTab} onValueChange={(value) => setInvoiceTab(value as "student" | "external")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="student" className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                {t("invoice.studentInvoices")}
              </TabsTrigger>
              <TabsTrigger value="external" className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                {t("invoice.externalInvoices")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="student">
          <div className="space-y-6">
            {/* Step 1: Select Academic Year */}
            <div className="space-y-3">
              <h3 className="font-medium">1. {t("invoiceCreate.selectAcademicYear")}</h3>
              <Select value={selectedAcademicYear} onValueChange={(value) => {
                setSelectedAcademicYear(value)
                setSelectedTerm("") // Reset term when year changes
                setSelectedGrade("") // Reset grade
                setSelectedRoom("")
                setSelectedStudents([])
                setSelectedItems([])
              }}>
                <SelectTrigger>
                  <SelectValue placeholder={t("invoiceCreate.selectAcademicYear")} />
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
                <h3 className="font-medium">2. {t("invoiceCreate.selectTerm")}</h3>
                <Select value={selectedTerm} onValueChange={(value) => {
                  setSelectedTerm(value)
                  setSelectedGrade("") // Reset grade when term changes
                  setSelectedRoom("")
                  setSelectedStudents([])
                  setSelectedItems([])
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("invoiceCreate.selectTerm")} />
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
                <h3 className="font-medium">3. {t("invoiceCreate.selectGrade")}</h3>
                <Select value={selectedGrade} onValueChange={handleGradeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("invoice.chooseGradeLevel")} />
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
                <h3 className="font-medium">4. {t("invoiceCreate.selectRoom")} ({t("common.optional")})</h3>
                <Select value={selectedRoom === "" ? "all" : selectedRoom} onValueChange={handleRoomChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("invoiceCreate.selectRoom")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("invoiceCreate.allRooms")}</SelectItem>
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
                <h3 className="font-medium">5. {t("invoiceCreate.selectItems")}</h3>

                {/* Template Selection */}
                {availableTemplates.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bookmark className="w-4 h-4 text-primary" />
                        <label className="font-medium">{t("invoiceCreate.quickStartTemplates")}</label>
                      </div>
                      {selectedTemplate && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTemplateSelect("none")}
                        >
                          {t("invoiceCreate.clearTemplate")}
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
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          placeholder="Search by Student ID or name"
                          value={searchStudentTerm}
                          onChange={(e) => setSearchStudentTerm(e.target.value)}
                          onFocus={() => setIsStudentSearchFocused(true)}
                          onBlur={() => setTimeout(() => setIsStudentSearchFocused(false), 200)}
                        />
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setIsAddNewStudentOpen(true)}
                        className="bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        New Student
                      </Button>
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
                                        {invoiceStudent.discounts.earlyBird && (
                                          <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300">
                                            Early Bird
                                          </Badge>
                                        )}
                                        {invoiceStudent.feeWaiver?.eligible && invoiceStudent.feeWaiver?.termsRemaining > 0 && (
                                          <Badge variant="outline" className="text-xs bg-indigo-100 text-indigo-700 border-indigo-300">
                                            Fee Waiver ({invoiceStudent.feeWaiver.termsRemaining} terms)
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
                        {selectedStudents.some(s => (s as InvoiceStudent).isNewStudent) && (
                          <span className="text-xs text-amber-600 ml-2">
                            ({selectedStudents.filter(s => (s as InvoiceStudent).isNewStudent).length} new students)
                          </span>
                        )}
                        {selectedStudents.some(s => hasDiscounts(s as InvoiceStudent)) && (
                          <span className="text-xs text-green-600 ml-2">
                            ({selectedStudents.filter(s => hasDiscounts(s as InvoiceStudent)).length} with discounts)
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
                        const isNew = invoiceStudent.isNewStudent
                        return (
                          <div key={student.id} className={`flex items-center justify-between p-2 rounded-lg text-sm ${isNew ? 'bg-amber-50 border border-amber-200' : studentHasDiscounts ? 'bg-green-50 border border-green-200' : 'bg-muted'}`}>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{student.name}</span>
                                <span className="text-muted-foreground">({student.id} - {student.room})</span>
                                {isNew && (
                                  <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300">
                                    New Student
                                  </Badge>
                                )}
                              </div>
                              {(studentHasDiscounts || isNew) && (
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
                                  {invoiceStudent.feeWaiver?.eligible && invoiceStudent.feeWaiver?.termsRemaining > 0 && (
                                    <Badge variant="outline" className="text-xs bg-indigo-100 text-indigo-700 border-indigo-300">
                                      Fee Waiver ({invoiceStudent.feeWaiver.termsRemaining} terms left)
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

                {/* Application & Registration Fees for New Students - Auto included */}
                {(() => {
                  const newStudents = selectedStudents.filter(s => (s as InvoiceStudent).isNewStudent)
                  if (newStudents.length === 0) return null

                  // Get registration fees from context
                  const fees = getRegistrationFees(selectedAcademicYear, selectedTerm)
                  const totalFees = fees.applicationFee + fees.registrationFee + fees.securityDeposit

                  return (
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="w-5 h-5 text-amber-600" />
                        <h4 className="font-medium text-amber-900">Application & Registration Fees</h4>
                        <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                          {newStudents.length} New Student{newStudents.length > 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <p className="text-sm text-amber-700 mb-3">
                        The following fees will be automatically applied to new students:
                      </p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {newStudents.map(s => (
                          <Badge key={s.id} variant="secondary" className="bg-amber-100 text-amber-800">
                            {s.name}
                          </Badge>
                        ))}
                      </div>
                      <div className="space-y-2">
                        {fees.applicationFee > 0 && (
                          <div className="flex items-center gap-3 p-2 bg-white rounded border">
                            <CheckCircle className="w-4 h-4 text-amber-600" />
                            <div className="flex-1">
                              <span className="font-medium">Application Fee</span>
                              <span className="text-muted-foreground ml-2">฿{fees.applicationFee.toLocaleString()}</span>
                            </div>
                            {fees.applicationFeeRefundable && (
                              <Badge variant="outline" className="text-xs">Refundable</Badge>
                            )}
                          </div>
                        )}
                        {fees.registrationFee > 0 && (
                          <div className="flex items-center gap-3 p-2 bg-white rounded border">
                            <CheckCircle className="w-4 h-4 text-amber-600" />
                            <div className="flex-1">
                              <span className="font-medium">Registration Fee</span>
                              <span className="text-muted-foreground ml-2">฿{fees.registrationFee.toLocaleString()}</span>
                            </div>
                            {fees.registrationFeeRefundable && (
                              <Badge variant="outline" className="text-xs">Refundable</Badge>
                            )}
                          </div>
                        )}
                        {fees.securityDeposit > 0 && (
                          <div className="flex items-center gap-3 p-2 bg-white rounded border">
                            <CheckCircle className="w-4 h-4 text-amber-600" />
                            <div className="flex-1">
                              <span className="font-medium">Security Deposit</span>
                              <span className="text-muted-foreground ml-2">฿{fees.securityDeposit.toLocaleString()}</span>
                            </div>
                            {fees.securityDepositRefundable && (
                              <Badge variant="outline" className="text-xs">Refundable</Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t border-amber-200">
                        <div className="flex justify-between text-sm font-medium text-amber-900">
                          <span>Registration Fees Total (per new student):</span>
                          <span>฿{totalFees.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* ID Charges (placeholder) */}
                <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-5 h-5 text-gray-600" />
                    <h4 className="font-medium text-gray-700">ID Charges</h4>
                    <Badge variant="outline" className="text-xs text-gray-500">Coming Soon</Badge>
                  </div>
                  <p className="text-sm text-gray-500">
                    Student ID card charges will be added here in a future update.
                  </p>
                </div>

                {/* Late Payment Charges Info */}
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <h4 className="font-medium text-red-800">Late Payment Policy</h4>
                  </div>
                  <p className="text-sm text-red-700">
                    Late payment charges of <strong>1.5% per month</strong> or part thereof will be applied to payments made after the invoice due date.
                  </p>
                </div>
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
          </TabsContent>

            {/* External Invoice Tab */}
            <TabsContent value="external">
              <div className="space-y-6">
                {/* Recipient Information */}
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    1. Recipient Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Recipient Name / Organization *</Label>
                      <Input
                        placeholder="Enter recipient name or organization"
                        value={externalRecipientName}
                        onChange={(e) => setExternalRecipientName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        placeholder="Enter email address"
                        value={externalRecipientEmail}
                        onChange={(e) => setExternalRecipientEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Address (Optional)</Label>
                    <Textarea
                      placeholder="Enter address"
                      value={externalRecipientAddress}
                      onChange={(e) => setExternalRecipientAddress(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>

                {/* Event Selection */}
                <div className="space-y-3">
                  <h3 className="font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    2. Event (Optional)
                  </h3>
                  <Input
                    placeholder="Enter event name (e.g., Summer Camp 2025, Sports Day)"
                    value={externalEventName}
                    onChange={(e) => setExternalEventName(e.target.value)}
                  />
                </div>

                {/* Item Selection for External */}
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    3. Select Items
                  </h3>

                  {/* Add Item Button */}
                  <Button
                    variant="outline"
                    onClick={() => setIsAddItemDialogOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </Button>

                  {/* Selected Items List */}
                  {externalSelectedItems.length > 0 && (
                    <div className="border rounded-lg p-4 space-y-3">
                      <h4 className="font-medium text-sm">Selected Items</h4>
                      {externalSelectedItems.map((item, index) => (
                        <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-medium">฿{item.amount.toLocaleString()}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setExternalSelectedItems(prev => prev.filter((_, i) => i !== index))
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>Total</span>
                        <span>฿{externalSelectedItems.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Deadline */}
                <div className="space-y-3">
                  <h3 className="font-medium">4. Set Payment Deadline</h3>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="max-w-xs justify-start text-left font-normal"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {externalPaymentDeadline ? format(externalPaymentDeadline, "dd/MM/yyyy") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={externalPaymentDeadline}
                        onSelect={setExternalPaymentDeadline}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {externalPaymentDeadline && (
                    <p className="text-sm text-green-600">
                      Payment deadline set for {format(externalPaymentDeadline, "dd/MM/yyyy")}
                    </p>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-3">
                  <h3 className="font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    5. Notes (Optional)
                  </h3>
                  <Textarea
                    placeholder="Additional notes for this invoice"
                    value={externalNotes}
                    onChange={(e) => setExternalNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 justify-end">
                  <Button
                    variant="outline"
                    onClick={handleSaveExternalAsDraft}
                    className="w-44 flex items-center justify-center gap-2"
                    disabled={!externalRecipientName || !externalRecipientEmail}
                  >
                    <Bookmark className="w-4 h-4" />
                    Save Draft
                  </Button>
                  <Button
                    onClick={handleCreateExternalInvoice}
                    className="w-44 flex items-center justify-center gap-2"
                    disabled={!externalRecipientName || !externalRecipientEmail || externalSelectedItems.length === 0}
                  >
                    <Save className="w-4 h-4" />
                    Create Invoice
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCreateExternalAndSendEmail}
                    className="w-44 flex items-center justify-center gap-2"
                    disabled={!externalRecipientName || !externalRecipientEmail || externalSelectedItems.length === 0}
                  >
                    <Mail className="w-4 h-4" />
                    Create & Send Email
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add New Student Dialog */}
      <Dialog open={isAddNewStudentOpen} onOpenChange={setIsAddNewStudentOpen}>
        <DialogContent className="max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-amber-600" />
              Add New Student
            </DialogTitle>
            <DialogDescription>
              Add a new student who is not yet in the system. Application & Registration Fees will be automatically applied.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-700">
                <strong>Note:</strong> This student will be marked as a new enrollee. Application Fee, Registration Fee, and Security Deposit will be automatically added to their invoice.
              </p>
            </div>

            {/* Student Information */}
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-sm text-gray-700">Student Information</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>First Name <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="First name"
                    value={newStudentFirstName}
                    onChange={(e) => setNewStudentFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="Last name"
                    value={newStudentLastName}
                    onChange={(e) => setNewStudentLastName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nickname</Label>
                  <Input
                    placeholder="Nickname"
                    value={newStudentNickname}
                    onChange={(e) => setNewStudentNickname(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={newStudentGender} onValueChange={(v: "male" | "female" | "other") => setNewStudentGender(v)}>
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
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={newStudentDob}
                    onChange={(e) => setNewStudentDob(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Grade</Label>
                  <Input value={selectedGrade} disabled className="bg-muted" />
                </div>
              </div>
            </div>

            {/* Family Selection */}
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-sm text-gray-700">Family</h4>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="familyType"
                    checked={newStudentFamilyType === "new"}
                    onChange={() => setNewStudentFamilyType("new")}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Create New Family</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="familyType"
                    checked={newStudentFamilyType === "existing"}
                    onChange={() => setNewStudentFamilyType("existing")}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Join Existing Family (Sibling)</span>
                </label>
              </div>

              {newStudentFamilyType === "existing" ? (
                <div className="space-y-2">
                  <Label>Select Family</Label>
                  <Select value={newStudentFamilyId} onValueChange={setNewStudentFamilyId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a family..." />
                    </SelectTrigger>
                    <SelectContent>
                      {families.map(family => (
                        <SelectItem key={family.id} value={family.id}>
                          {family.familyName} ({family.studentIds.length} student{family.studentIds.length > 1 ? 's' : ''})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {newStudentFamilyId && (
                    <p className="text-xs text-green-600">
                      This student will be added as child #{families.find(f => f.id === newStudentFamilyId)?.studentIds.length + 1} and may receive sibling discount.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Child Order in Family</Label>
                  <Select value={String(newStudentChildOrder)} onValueChange={(v) => setNewStudentChildOrder(Number(v))}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1st Child</SelectItem>
                      <SelectItem value="2">2nd Child</SelectItem>
                      <SelectItem value="3">3rd Child</SelectItem>
                      <SelectItem value="4">4th Child</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Parent/Guardian Information - only show for new family */}
            {newStudentFamilyType === "new" && (
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-sm text-gray-700">Parent/Guardian Information</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Parent/Guardian Name</Label>
                    <Input
                      placeholder="Full name"
                      value={newStudentParentName}
                      onChange={(e) => setNewStudentParentName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Relationship</Label>
                    <Select value={newStudentParentRelation} onValueChange={(v: "father" | "mother" | "guardian" | "other") => setNewStudentParentRelation(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="father">Father</SelectItem>
                        <SelectItem value="mother">Mother</SelectItem>
                        <SelectItem value="guardian">Guardian</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Email <span className="text-red-500">*</span></Label>
                    <Input
                      type="email"
                      placeholder="parent@email.com"
                      value={newStudentEmail}
                      onChange={(e) => setNewStudentEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      placeholder="Phone number"
                      value={newStudentPhone}
                      onChange={(e) => setNewStudentPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    placeholder="Home address"
                    value={newStudentAddress}
                    onChange={(e) => setNewStudentAddress(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsAddNewStudentOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddNewStudent}
              className="flex-1"
              style={{ backgroundColor: '#d97706', color: 'white' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Student
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmationOpen} onOpenChange={setIsConfirmationOpen}>
        <DialogContent className="max-w-md p-6">
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
        <DialogContent className="sm:max-w-4xl w-[95vw] p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Invoice Preview</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col max-h-[90vh]">
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {selectedStudents.length > 0 && selectedStudents[previewStudentIndex] ? (
                (() => {
                  const currentStudent = selectedStudents[previewStudentIndex] as InvoiceStudent
                  const fees = getRegistrationFees(selectedAcademicYear, selectedTerm)

                  // Calculate registration fees for new students - automatically included
                  const registrationFeeItems: { id: string; name: string; description: string; amount: number; isRegistrationFee: boolean }[] = []
                  if (currentStudent.isNewStudent) {
                    if (fees.applicationFee > 0) {
                      registrationFeeItems.push({
                        id: 'app-fee',
                        name: 'Application Fee',
                        description: 'One-time application fee for new students',
                        amount: fees.applicationFee,
                        isRegistrationFee: true
                      })
                    }
                    if (fees.registrationFee > 0) {
                      registrationFeeItems.push({
                        id: 'reg-fee',
                        name: 'Registration Fee',
                        description: 'One-time registration fee for new students',
                        amount: fees.registrationFee,
                        isRegistrationFee: true
                      })
                    }
                    if (fees.securityDeposit > 0) {
                      registrationFeeItems.push({
                        id: 'sec-dep',
                        name: 'Security Deposit',
                        description: fees.securityDepositRefundable ? 'Refundable security deposit' : 'Security deposit',
                        amount: fees.securityDeposit,
                        isRegistrationFee: true
                      })
                    }
                  }

                  const registrationFeesTotal = registrationFeeItems.reduce((sum, item) => sum + item.amount, 0)
                  const subtotal = getTotalAmount() + registrationFeesTotal
                  const discountCalc = calculateStudentDiscounts(currentStudent, getTotalAmount()) // Discounts apply only to regular items
                  const invoiceNumber = generateInvoiceNumber(currentStudent.id)
                  const issueDate = new Date()
                  const dueDate = paymentDeadline || null

                  // Fee Waiver credit (only if eligible and terms remaining > 0)
                  const feeWaiverCredit = currentStudent.feeWaiver?.eligible && currentStudent.feeWaiver?.termsRemaining > 0
                    ? currentStudent.feeWaiver.creditPerTerm
                    : 0

                  // Security Deposit Fee Waiver (for new students who are eligible for fee waiver)
                  const securityDepositWaiver = currentStudent.isNewStudent &&
                    currentStudent.feeWaiver?.eligible &&
                    fees.securityDeposit > 0
                    ? fees.securityDeposit
                    : 0

                  // Calculate subtotal before ID Charges
                  const subtotalBeforeIdCharges = discountCalc.netAmount + registrationFeesTotal - feeWaiverCredit - securityDepositWaiver

                  // ID Charges (3% of subtotal)
                  const idCharges = Math.round(subtotalBeforeIdCharges * 0.03)

                  const finalTotal = Math.max(0, subtotalBeforeIdCharges + idCharges)

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
                        <div className="flex justify-center" style={{ gap: '120px' }}>
                          {/* Left Column - Student Info */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">Student Name: </span>
                              <span className="font-medium">{currentStudent.name}</span>
                              {currentStudent.isNewStudent && (
                                <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300">
                                  New Student
                                </Badge>
                              )}
                            </div>
                            <div>
                              <span className="text-gray-500">Student ID: </span>
                              <span>{currentStudent.id}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Year Group: </span>
                              <span>{selectedGrade}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Academic Year: </span>
                              <span>{getAcademicYear(issueDate)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Bill To: </span>
                              <span>{currentStudent.parentName}</span>
                            </div>
                          </div>

                          {/* Right Column - Invoice Info */}
                          <div className="space-y-2">
                            <div>
                              <span className="text-gray-500">Invoice No: </span>
                              <span className="font-medium">{invoiceNumber}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Invoice Date: </span>
                              <span>{issueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Due Date: </span>
                              <span className="text-red-600 font-medium">{dueDate ? dueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Term: </span>
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
                            {/* Regular Items */}
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

                            {/* Other Discounts (NOT Registration Fee Waiver - shown separately below) */}
                            {discountCalc.discountItems
                              .filter(d => !d.name.includes('Registration Fee Waiver'))
                              .map((discount, idx) => (
                              <tr key={idx} className="border-b text-green-600">
                                <td colSpan={2} className="py-2 px-2 text-left">
                                  {discount.name}{discount.percentage ? ` (${discount.percentage}%)` : ''}
                                </td>
                                <td className="py-2 px-2 text-right">-{formatCurrency(discount.amount)}</td>
                              </tr>
                            ))}

                            {/* For New Students: Fees and Waivers in specific order */}
                            {/* 1. Application Fee */}
                            {registrationFeeItems.find(item => item.id === 'app-fee') && (
                              <tr className="border-b text-orange-600">
                                <td colSpan={2} className="py-2 px-2 text-left">
                                  Application Fee
                                </td>
                                <td className="py-2 px-2 text-right">+{formatCurrency(registrationFeeItems.find(item => item.id === 'app-fee')!.amount)}</td>
                              </tr>
                            )}

                            {/* 2. Registration Fee */}
                            {registrationFeeItems.find(item => item.id === 'reg-fee') && (
                              <tr className="border-b text-orange-600">
                                <td colSpan={2} className="py-2 px-2 text-left">
                                  Registration Fee
                                </td>
                                <td className="py-2 px-2 text-right">+{formatCurrency(registrationFeeItems.find(item => item.id === 'reg-fee')!.amount)}</td>
                              </tr>
                            )}

                            {/* 3. Registration Fee Waiver (comes after Registration Fee) */}
                            {discountCalc.discountItems
                              .filter(d => d.name.includes('Registration Fee Waiver'))
                              .map((discount, idx) => (
                              <tr key={`reg-waiver-${idx}`} className="border-b text-green-600">
                                <td colSpan={2} className="py-2 px-2 text-left">
                                  {discount.name}
                                </td>
                                <td className="py-2 px-2 text-right">-{formatCurrency(discount.amount)}</td>
                              </tr>
                            ))}

                            {/* 4. Security Deposit */}
                            {registrationFeeItems.find(item => item.id === 'sec-dep') && (
                              <tr className="border-b text-orange-600">
                                <td colSpan={2} className="py-2 px-2 text-left">
                                  Security Deposit{fees.securityDepositRefundable && <span className="text-xs ml-1">(Refundable)</span>}
                                </td>
                                <td className="py-2 px-2 text-right">+{formatCurrency(registrationFeeItems.find(item => item.id === 'sec-dep')!.amount)}</td>
                              </tr>
                            )}

                            {/* 5. Security Deposit Fee Waiver (comes after Security Deposit) */}
                            {securityDepositWaiver > 0 && (
                              <tr className="border-b text-green-600">
                                <td colSpan={2} className="py-2 px-2 text-left">
                                  Security Deposit Fee Waiver
                                </td>
                                <td className="py-2 px-2 text-right">-{formatCurrency(securityDepositWaiver)}</td>
                              </tr>
                            )}

                            {/* 6. ID Charges (3% of subtotal) - always last */}
                            {idCharges > 0 && (
                              <tr className="border-b text-purple-600">
                                <td colSpan={2} className="py-2 px-2 text-left">
                                  ID Charges (3%)
                                </td>
                                <td className="py-2 px-2 text-right">+{formatCurrency(idCharges)}</td>
                              </tr>
                            )}

                          </tbody>
                        </table>

                        {/* Amount in Words + Total */}
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-xs text-gray-600 mb-2">{numberToWords(finalTotal)}</div>
                          <div className="flex justify-between items-center font-bold">
                            <span>TOTAL</span>
                            <span>{formatCurrency(finalTotal)}</span>
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
        <DialogContent className="max-w-md flex flex-col p-6" style={{ maxHeight: '65vh' }}>
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