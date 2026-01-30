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
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Calendar as CalendarComponent } from "./ui/calendar"
import { Search, Plus, CheckCircle, Trash2, X, Upload, Users, User, FileSpreadsheet, FileText, Bookmark, GraduationCap, Zap, MapPin, Calendar, Clock, Eye, Mail, Package, Save, CreditCard, AlertCircle, Pencil, ArrowLeft, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { toast } from "@/components/ui/sonner"
import { SCHOOL_INFO, BANK_DETAILS, BILL_PAYMENT, INVOICE_NOTES, numberToWords, formatCurrency, getAcademicYear } from "@/lib/invoiceUtils"
import SchoolLogo from "@/assets/Logo.png"
import { logActivity } from "@/lib/activityLog"

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

const getGrades = (t: (key: string) => string) => [
  t('invoiceCreation.gradePreNursery'),
  t('invoiceCreation.gradeNursery'),
  t('invoiceCreation.gradeReception'),
  t('invoiceCreation.gradeYear1'),
  t('invoiceCreation.gradeYear2'),
  t('invoiceCreation.gradeYear3'),
  t('invoiceCreation.gradeYear4'),
  t('invoiceCreation.gradeYear5'),
  t('invoiceCreation.gradeYear6'),
  t('invoiceCreation.gradeYear7'),
  t('invoiceCreation.gradeYear8'),
  t('invoiceCreation.gradeYear9'),
  t('invoiceCreation.gradeYear10'),
  t('invoiceCreation.gradeYear11'),
  t('invoiceCreation.gradeYear12'),
  t('invoiceCreation.gradeYear13')
]

// Mapping from translated grade labels back to grade IDs (used for TuitionByYear lookup)
const getGradeIdMap = (t: (key: string) => string): { [label: string]: string } => ({
  [t('invoiceCreation.gradePreNursery')]: 'pre-nursery',
  [t('invoiceCreation.gradeNursery')]: 'nursery',
  [t('invoiceCreation.gradeReception')]: 'reception',
  [t('invoiceCreation.gradeYear1')]: 'year1',
  [t('invoiceCreation.gradeYear2')]: 'year2',
  [t('invoiceCreation.gradeYear3')]: 'year3',
  [t('invoiceCreation.gradeYear4')]: 'year4',
  [t('invoiceCreation.gradeYear5')]: 'year5',
  [t('invoiceCreation.gradeYear6')]: 'year6',
  [t('invoiceCreation.gradeYear7')]: 'year7',
  [t('invoiceCreation.gradeYear8')]: 'year8',
  [t('invoiceCreation.gradeYear9')]: 'year9',
  [t('invoiceCreation.gradeYear10')]: 'year10',
  [t('invoiceCreation.gradeYear11')]: 'year11',
  [t('invoiceCreation.gradeYear12')]: 'year12',
  [t('invoiceCreation.gradeYear13')]: 'year13',
})

const getRooms = (t: (key: string) => string) => ({
  [t('invoiceCreation.gradePreNursery')]: [t('invoiceCreation.roomPreNurseryA'), t('invoiceCreation.roomPreNurseryB')],
  [t('invoiceCreation.gradeNursery')]: [t('invoiceCreation.roomNurseryA'), t('invoiceCreation.roomNurseryB')],
  [t('invoiceCreation.gradeReception')]: [t('invoiceCreation.roomReceptionA'), t('invoiceCreation.roomReceptionB'), t('invoiceCreation.roomReceptionC')],
  [t('invoiceCreation.gradeYear1')]: [t('invoiceCreation.room1A'), t('invoiceCreation.room1B'), t('invoiceCreation.room1C'), t('invoiceCreation.room1D')],
  [t('invoiceCreation.gradeYear2')]: [t('invoiceCreation.room2A'), t('invoiceCreation.room2B'), t('invoiceCreation.room2C'), t('invoiceCreation.room2D')],
  [t('invoiceCreation.gradeYear3')]: [t('invoiceCreation.room3A'), t('invoiceCreation.room3B'), t('invoiceCreation.room3C'), t('invoiceCreation.room3D')],
  [t('invoiceCreation.gradeYear4')]: [t('invoiceCreation.room4A'), t('invoiceCreation.room4B'), t('invoiceCreation.room4C')],
  [t('invoiceCreation.gradeYear5')]: [t('invoiceCreation.room5A'), t('invoiceCreation.room5B'), t('invoiceCreation.room5C')],
  [t('invoiceCreation.gradeYear6')]: [t('invoiceCreation.room6A'), t('invoiceCreation.room6B'), t('invoiceCreation.room6C')],
  [t('invoiceCreation.gradeYear7')]: [t('invoiceCreation.room7A'), t('invoiceCreation.room7B'), t('invoiceCreation.room7C'), t('invoiceCreation.room7D')],
  [t('invoiceCreation.gradeYear8')]: [t('invoiceCreation.room8A'), t('invoiceCreation.room8B'), t('invoiceCreation.room8C'), t('invoiceCreation.room8D')],
  [t('invoiceCreation.gradeYear9')]: [t('invoiceCreation.room9A'), t('invoiceCreation.room9B'), t('invoiceCreation.room9C')],
  [t('invoiceCreation.gradeYear10')]: [t('invoiceCreation.room10A'), t('invoiceCreation.room10B'), t('invoiceCreation.room10C')],
  [t('invoiceCreation.gradeYear11')]: [t('invoiceCreation.room11A'), t('invoiceCreation.room11B')],
  [t('invoiceCreation.gradeYear12')]: [t('invoiceCreation.room12A'), t('invoiceCreation.room12B')],
  [t('invoiceCreation.gradeYear13')]: [t('invoiceCreation.room13A'), t('invoiceCreation.room13B')],
})

// Helper function to get student group discounts based on category
const getStudentGroupDiscounts = (studentId: string, category: string): { name: string, discountType: string, discountPercentage: number, fixedAmount: number }[] => {
  try {
    // No discounts for ECA, Trip, Exam, and External invoices
    if (category === "eca" || category === "trip" || category === "exam" || category === "external") {
      return []
    }

    // Get storage key based on category
    // For tuition, use "studentGroups" (legacy key from TuitionDiscountGroups)
    // For other categories, use "studentGroups_${category}"
    const storageKey = category === "tuition" ? "studentGroups" : `studentGroups_${category}`
    const stored = localStorage.getItem(storageKey)
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


// Grade level mapping (same as TuitionByYear)
const gradeLevelMap: { [key: string]: string } = {
  "pre-nursery": "Pre-Nursery",
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

// Get storage key for invoices based on invoice category (must match InvoiceManagement)
const getInvoicesStorageKey = (category: string): string => {
  // All invoices are stored in the same key, filtered by category field
  return "createdInvoices"
}

// Get storage key based on invoice category
const getItemsStorageKey = (category: string): string => {
  switch (category) {
    case "afterschool":
      return "afterschoolItems"
    case "event":
      return "eventItems"
    case "summer":
      return "summerItems"
    case "external":
      return "externalItems"
    case "eca":
      return "ecaItems"
    case "trip":
      return "tripItems"
    case "exam":
      return "examItems"
    case "bus":
      return "busItems"
    case "tuition":
    case "student":
      return "invoiceItems" // student/tuition items
    default:
      return "invoiceItems" // student/tuition items
  }
}

const getTemplatesStorageKey = (category: string): string => {
  switch (category) {
    case "afterschool":
      return "afterschoolTemplates"
    case "event":
      return "eventTemplates"
    case "summer":
      return "summerTemplates"
    case "external":
      return "externalTemplates"
    case "eca":
      return "ecaTemplates"
    case "trip":
      return "tripTemplates"
    case "exam":
      return "examTemplates"
    case "bus":
      return "busTemplates"
    case "tuition":
    case "student":
      return "invoiceTemplates" // student/tuition templates
    default:
      return "invoiceTemplates" // student/tuition templates
  }
}

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
  items: (PreCreatedItem & { lineNumber?: number, itemCode?: string })[]
  subtotal: number
  discounts: { name: string, amount: number, percentage?: number }[]
  totalDiscount: number
  netAmount: number
  dueDate: string
  issueDate: string
  status: "draft" | "pending_approval" | "approved" | "rejected" | "sent" | "paid" | "partial" | "unpaid" | "overdue" | "cancelled"
  approvalStatus?: "wait" | "approved" | "rejected"
  term: string
  paymentType: "termly"
  createdAt: string
  // External invoice fields
  invoiceType?: "student" | "external" | "afterschool" | "event" | "summer"
  recipientName?: string
  recipientAddress?: string
  eventName?: string
  notes?: string
  // Category for filtering by menu type
  category?: "tuition" | "eca" | "trip" | "exam" | "bus" | "external"
  // New student fields
  isNewStudent?: boolean
  registrationFees?: { name: string, amount: number }[]
  securityDepositWaiver?: number
  // Excel export fields
  familyCode?: string
  adultIdNo?: string // Parent's national ID or Family Code
  accountCode?: string // NominalCode
  documentType?: string // SI (Sales Invoice) or CI (Credit Invoice)
  academicYear?: string // Separated from term (e.g., "2025/2026")
  termName?: string // Separated from academic year (e.g., "Term 1")
}

// Load created invoices from localStorage
const loadCreatedInvoices = (invoiceType: string = "student"): SavedInvoice[] => {
  try {
    const storageKey = getInvoicesStorageKey(invoiceType)
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error("Failed to load created invoices:", error)
  }
  return []
}

// Save invoice to localStorage
const saveInvoiceToStorage = (invoice: SavedInvoice, invoiceType: string = "student") => {
  try {
    const storageKey = getInvoicesStorageKey(invoiceType)
    const existing = loadCreatedInvoices(invoiceType)
    // Check if invoice already exists (by invoiceNumber)
    const existingIndex = existing.findIndex(inv => inv.invoiceNumber === invoice.invoiceNumber)
    if (existingIndex >= 0) {
      existing[existingIndex] = invoice
    } else {
      existing.push(invoice)
    }
    localStorage.setItem(storageKey, JSON.stringify(existing))
    // Dispatch custom event to notify Invoice Overview
    window.dispatchEvent(new CustomEvent('invoicesUpdated'))

    // Auto-generate receipt if invoice status is "paid"
    if (invoice.status === "paid") {
      generateReceiptForPaidInvoice(invoice)
    }
  } catch (error) {
    console.error("Failed to save invoice:", error)
  }
}

// Auto-generate receipt for paid invoice
const generateReceiptForPaidInvoice = (invoice: SavedInvoice) => {
  try {
    // Determine receipt storage key and prefix based on category
    let receiptStorageKey = ""
    let receiptPrefix = ""

    const category = invoice.category
    if (category === "trip" || category === "eca") {
      receiptStorageKey = "receiptRecords_afterschool"
      receiptPrefix = "TRP"
    } else if (category === "exam") {
      receiptStorageKey = "receiptRecords_event"
      receiptPrefix = "EXM"
    } else if (category === "bus") {
      receiptStorageKey = "receiptRecords_summer"
      receiptPrefix = "BUS"
    } else {
      // For tuition and other categories
      receiptStorageKey = "receiptRecords_tuition"
      receiptPrefix = "TUI"
    }

    // Get existing receipts
    const storedReceipts = localStorage.getItem(receiptStorageKey)
    const receipts = storedReceipts ? JSON.parse(storedReceipts) : []

    // Check if receipt already exists for this invoice
    const existingReceipt = receipts.find((r: any) => r.id === `receipt-${invoice.id}`)
    if (existingReceipt) {
      console.log(`Receipt already exists for invoice ${invoice.invoiceNumber}`)
      return
    }

    // Generate receipt number
    const now = new Date()
    const yearMonth = format(now, "yyMM")
    const nextNumber = receipts.length + 1
    const receiptNo = `${receiptPrefix}-${yearMonth}-${String(nextNumber).padStart(4, "0")}`

    // Create receipt record
    const receiptRecord = {
      id: `receipt-${invoice.id}`,
      receiptNo: receiptNo,
      receiptDate: now.toISOString(),
      clientType: invoice.invoiceType === "external" ? "external" : "internal",
      clientNo: invoice.studentId,
      clientName: invoice.parentName || invoice.studentName,
      contactName: invoice.studentName,
      yearGroup: invoice.studentGrade,
      schoolYear: invoice.term || "",
      totalAmount: invoice.netAmount,
      paymentMethod: "N/A",
      status: "generated",
      createdAt: now.toISOString(),
      invoices: [
        {
          id: invoice.id,
          invoiceNo: invoice.invoiceNumber,
          invoiceDate: invoice.issueDate,
          invoiceAmount: invoice.netAmount,
          receivedAmount: invoice.netAmount,
          outstandingAmount: 0
        }
      ]
    }

    // Add receipt to storage
    receipts.push(receiptRecord)
    localStorage.setItem(receiptStorageKey, JSON.stringify(receipts))

    console.log(`Auto-generated receipt: ${receiptNo} for invoice ${invoice.invoiceNumber}`)
  } catch (error) {
    console.error("Failed to auto-generate receipt:", error)
  }
}

// Define allowed categories for each invoice type
const getAllowedCategories = (category: string): string[] | null => {
  switch (category) {
    case "student":
    case "tuition":
      return ["Tuition"] // Only Tuition items for student/tuition invoices
    case "eca":
      return ["ECA", "Music", "Arts", "Sports", "Academic", "Other"]
    case "trip":
    case "afterschool":
      return ["Trip & Other Activity", "Field Trip", "Camp", "Sports Event", "Cultural Event", "Workshop"]
    case "exam":
    case "event":
      return ["Exam", "International Exam", "English Proficiency", "Competition", "School Exam", "Certification"]
    case "bus":
    case "summer":
      return ["School Bus", "Annual Service", "Term Service", "Monthly Service", "Special Service"]
    default:
      return null // No filter for external and other types
  }
}

// Load items from localStorage (initialize with defaults if empty)
const loadItemsFromStorage = (invoiceCategory: string = "student"): PreCreatedItem[] => {
  const storageKey = getItemsStorageKey(invoiceCategory)
  const categoryDefaults = getDefaultItems(invoiceCategory)
  const allowedCategories = getAllowedCategories(invoiceCategory)

  try {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      const items = JSON.parse(stored)
      // Convert Item format to PreCreatedItem format (itemCode -> id if needed)
      let loadedItems = items.map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        amount: item.amount,
        category: item.category,
        isActive: item.isActive,
        applicableGrades: item.applicableGrades || []
      }))

      // Migration: Fix summer items with empty applicableGrades
      if (invoiceCategory === "summer") {
        const needsMigration = loadedItems.some((item: PreCreatedItem) =>
          item.applicableGrades.length === 0
        )
        if (needsMigration) {
          console.log("[Migration] Updating summer items with applicableGrades")
          const allGrades = ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
          loadedItems = loadedItems.map((item: PreCreatedItem) => ({
            ...item,
            applicableGrades: item.applicableGrades.length === 0 ? allGrades : item.applicableGrades
          }))
          localStorage.setItem(storageKey, JSON.stringify(loadedItems))
        }
      }

      // Filter by allowed categories if applicable
      if (allowedCategories) {
        loadedItems = loadedItems.filter((item: PreCreatedItem) =>
          allowedCategories.includes(item.category || "")
        )
      }

      return loadedItems
    } else {
      // Initialize localStorage with default items if empty
      localStorage.setItem(storageKey, JSON.stringify(categoryDefaults))
      return categoryDefaults
    }
  } catch (error) {
    console.error("Failed to load items from localStorage:", error)
    return categoryDefaults
  }
}

// Load templates from localStorage (initialize with defaults if empty)
const loadTemplatesFromStorage = (invoiceCategory: string = "student"): ItemTemplate[] => {
  const storageKey = getTemplatesStorageKey(invoiceCategory)
  const categoryDefaults = getDefaultTemplates(invoiceCategory)

  try {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      const loadedTemplates = JSON.parse(stored)

      // Migration: Fix summer templates with empty applicableGrades
      if (invoiceCategory === "summer") {
        const needsMigration = loadedTemplates.some((template: ItemTemplate) =>
          template.applicableGrades.length === 0
        )
        if (needsMigration) {
          console.log("[Migration] Updating summer templates with applicableGrades")
          const allGrades = ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
          const migratedTemplates = loadedTemplates.map((template: ItemTemplate) => ({
            ...template,
            applicableGrades: template.applicableGrades.length === 0 ? allGrades : template.applicableGrades
          }))
          localStorage.setItem(storageKey, JSON.stringify(migratedTemplates))
          return migratedTemplates
        }
      }

      return loadedTemplates
    } else {
      // Initialize localStorage with default templates if empty
      localStorage.setItem(storageKey, JSON.stringify(categoryDefaults))
      return categoryDefaults
    }
  } catch (error) {
    console.error("Failed to load templates from localStorage:", error)
    return categoryDefaults
  }
}

// Get default items based on invoice category
const getDefaultItems = (invoiceCategory: string): PreCreatedItem[] => {
  switch (invoiceCategory) {
    case "external":
      return defaultExternalItems
    case "afterschool":
      return defaultAfterSchoolItems
    case "event":
      return defaultEventItems
    case "summer":
      return defaultSummerItems
    case "eca":
      return defaultECAItems
    case "trip":
      return defaultTripItems
    case "exam":
      return defaultExamItems
    case "bus":
      return defaultBusItems
    case "tuition":
    case "student":
    default:
      return defaultItems
  }
}

// Get default templates based on invoice category
const getDefaultTemplates = (invoiceCategory: string): ItemTemplate[] => {
  switch (invoiceCategory) {
    case "afterschool":
      return defaultAfterSchoolTemplates
    case "event":
      return defaultEventTemplates
    case "summer":
      return defaultSummerTemplates
    case "eca":
      return defaultECATemplates
    case "trip":
      return defaultTripTemplates
    case "exam":
      return defaultExamTemplates
    case "bus":
      return defaultBusTemplates
    case "tuition":
    case "student":
    default:
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
    applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  },
  {
    id: "item-002",
    name: "Term 2 Tuition Fee",
    description: "Second term tuition payment for academic year",
    amount: 150000,
    category: "Tuition",
    isActive: true,
    applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  },
  {
    id: "item-003",
    name: "Term 3 Tuition Fee",
    description: "Third term tuition payment for academic year",
    amount: 150000,
    category: "Tuition",
    isActive: true,
    applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  },
  {
    id: "item-004",
    name: "Uniform & Textbooks",
    description: "School uniform and required textbooks",
    amount: 15000,
    category: "Tuition",
    isActive: true,
    applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  },
  // ECA items
  {
    id: "item-005",
    name: "Swimming Program",
    description: "Swimming lessons and pool maintenance fee",
    amount: 80000,
    category: "ECA",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  },
  {
    id: "item-006",
    name: "Football Training",
    description: "Professional football coaching and equipment",
    amount: 60000,
    category: "ECA",
    isActive: true,
    applicableGrades: ["Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
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
    applicableGrades: ["Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
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
    applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  },
  {
    id: "item-013",
    name: "International School Fair",
    description: "Educational fair participation and materials",
    amount: 35000,
    category: "Trip & Other Activity",
    isActive: true,
    applicableGrades: ["Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  },
  {
    id: "item-014",
    name: "Graduation Ceremony",
    description: "Graduation ceremony and celebration costs",
    amount: 50000,
    category: "Trip & Other Activity",
    isActive: true,
    applicableGrades: ["Year 6", "Year 12", "Year 13"]
  }
]

// Default items for External Invoices
const defaultExternalItems: PreCreatedItem[] = [
  {
    id: "ext-item-001",
    name: "Conference Room Rental",
    description: "Full day conference room rental with AV equipment",
    amount: 15000,
    category: "Rental",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "ext-item-002",
    name: "Event Catering - Standard",
    description: "Standard catering package per person",
    amount: 350,
    category: "Catering",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "ext-item-003",
    name: "Event Catering - Premium",
    description: "Premium catering package per person",
    amount: 550,
    category: "Catering",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "ext-item-004",
    name: "Auditorium Rental - Half Day",
    description: "Auditorium rental for 4 hours with basic setup",
    amount: 25000,
    category: "Rental",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "ext-item-005",
    name: "Auditorium Rental - Full Day",
    description: "Auditorium rental for 8 hours with full setup",
    amount: 45000,
    category: "Rental",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "ext-item-006",
    name: "Sports Field Rental",
    description: "Sports field rental per hour",
    amount: 5000,
    category: "Rental",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "ext-item-007",
    name: "Swimming Pool Rental",
    description: "Swimming pool rental per hour",
    amount: 8000,
    category: "Rental",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "ext-item-008",
    name: "Parking Fee",
    description: "Event parking fee per vehicle",
    amount: 200,
    category: "Service",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "ext-item-009",
    name: "Technical Support",
    description: "On-site technical support per hour",
    amount: 1500,
    category: "Service",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "ext-item-010",
    name: "Event Coordination Fee",
    description: "Event coordination and management fee",
    amount: 10000,
    category: "Service",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "ext-item-011",
    name: "Holiday Camp - Full Program",
    description: "Complete holiday camp program including activities, meals, and materials",
    amount: 15000,
    category: "Event",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "ext-item-012",
    name: "Holiday Camp - Half Day",
    description: "Half day holiday camp program (morning or afternoon session)",
    amount: 8000,
    category: "Event",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "ext-item-013",
    name: "Training Course - Professional Development",
    description: "Professional development training course for educators and staff",
    amount: 12000,
    category: "Service",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "ext-item-014",
    name: "Training Workshop - Specialized Skills",
    description: "Specialized skills training workshop (per participant)",
    amount: 5000,
    category: "Service",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "ext-item-015",
    name: "Gap Year Exam - SAT",
    description: "SAT examination fee for gap year students",
    amount: 18000,
    category: "Event",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "ext-item-016",
    name: "Gap Year Exam - IELTS",
    description: "IELTS examination fee for gap year students",
    amount: 7500,
    category: "Event",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "ext-item-017",
    name: "Gap Year Exam - TOEFL",
    description: "TOEFL examination fee for gap year students",
    amount: 6500,
    category: "Event",
    isActive: true,
    applicableGrades: []
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
    applicableGrades: ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"],
    isActive: true
  }
]

// Default items for Trip & Activity (afterschool)
const defaultAfterSchoolItems: PreCreatedItem[] = [
  { id: "trip-item-001", name: "Bangkok City Tour", description: "Full day educational tour to historical sites in Bangkok", amount: 2500, category: "Field Trip", isActive: true, applicableGrades: [] },
  { id: "trip-item-002", name: "Science Museum Visit", description: "Interactive science learning experience at the museum", amount: 1800, category: "Field Trip", isActive: true, applicableGrades: [] },
  { id: "trip-item-003", name: "Beach Camp - 3 Days", description: "Three-day beach camping trip with outdoor activities", amount: 8500, category: "Camp", isActive: true, applicableGrades: [] },
  { id: "trip-item-004", name: "Mountain Adventure Camp", description: "Adventure camp with hiking and nature exploration", amount: 9500, category: "Camp", isActive: true, applicableGrades: [] },
  { id: "trip-item-005", name: "Swimming Competition", description: "Inter-school swimming competition registration", amount: 500, category: "Sports Event", isActive: true, applicableGrades: [] },
  { id: "trip-item-006", name: "Football Tournament", description: "Annual football tournament participation fee", amount: 800, category: "Sports Event", isActive: true, applicableGrades: [] },
  { id: "trip-item-007", name: "Annual Sports Day", description: "Sports day event participation and uniform", amount: 350, category: "Sports Event", isActive: true, applicableGrades: [] },
  { id: "trip-item-008", name: "Music Concert", description: "Annual music concert participation fee", amount: 1200, category: "Cultural Event", isActive: true, applicableGrades: [] },
  { id: "trip-item-009", name: "Art Exhibition", description: "Student art exhibition entry and materials", amount: 600, category: "Cultural Event", isActive: true, applicableGrades: [] },
  { id: "trip-item-010", name: "Drama Performance", description: "School drama show participation and costume", amount: 1500, category: "Cultural Event", isActive: true, applicableGrades: [] }
]

const defaultAfterSchoolTemplates: ItemTemplate[] = [
  { id: "trip-template-001", name: "Primary Field Trip Package", description: "Educational field trips for primary students", items: ["trip-item-001", "trip-item-002"], applicableGrades: [], isActive: true },
  { id: "trip-template-002", name: "Adventure Camp Package", description: "Outdoor camping and adventure activities", items: ["trip-item-003", "trip-item-004"], applicableGrades: [], isActive: true },
  { id: "trip-template-003", name: "Sports Event Bundle", description: "All sports events and competitions", items: ["trip-item-005", "trip-item-006", "trip-item-007"], applicableGrades: [], isActive: true }
]

// Default items for Exam (event)
const defaultEventItems: PreCreatedItem[] = [
  { id: "exam-item-001", name: "Cambridge IGCSE Registration", description: "Cambridge IGCSE examination registration fee", amount: 8500, category: "International Exam", isActive: true, applicableGrades: [] },
  { id: "exam-item-002", name: "Cambridge A-Level Registration", description: "Cambridge A-Level examination registration fee", amount: 9500, category: "International Exam", isActive: true, applicableGrades: [] },
  { id: "exam-item-003", name: "IELTS Preparation Test", description: "IELTS mock examination and preparation", amount: 3500, category: "English Proficiency", isActive: true, applicableGrades: [] },
  { id: "exam-item-004", name: "TOEFL Junior Test", description: "TOEFL Junior examination fee", amount: 2800, category: "English Proficiency", isActive: true, applicableGrades: [] },
  { id: "exam-item-005", name: "SAT Registration", description: "SAT examination registration fee", amount: 4500, category: "International Exam", isActive: true, applicableGrades: [] },
  { id: "exam-item-006", name: "Math Olympiad Entry", description: "Mathematics Olympiad competition entry fee", amount: 1200, category: "Competition", isActive: true, applicableGrades: [] },
  { id: "exam-item-007", name: "Science Olympiad Entry", description: "Science Olympiad competition entry fee", amount: 1200, category: "Competition", isActive: true, applicableGrades: [] },
  { id: "exam-item-008", name: "Spelling Bee Registration", description: "National Spelling Bee competition registration", amount: 800, category: "Competition", isActive: true, applicableGrades: [] },
  { id: "exam-item-009", name: "Mid-Term Exam Materials", description: "Mid-term examination answer sheets and materials", amount: 150, category: "School Exam", isActive: true, applicableGrades: [] },
  { id: "exam-item-010", name: "Final Exam Materials", description: "Final examination answer sheets and materials", amount: 150, category: "School Exam", isActive: true, applicableGrades: [] }
]

const defaultEventTemplates: ItemTemplate[] = [
  { id: "exam-template-001", name: "Cambridge Full Package", description: "IGCSE and A-Level examination bundle", items: ["exam-item-001", "exam-item-002"], applicableGrades: [], isActive: true },
  { id: "exam-template-002", name: "English Proficiency Bundle", description: "All English proficiency tests", items: ["exam-item-003", "exam-item-004"], applicableGrades: [], isActive: true },
  { id: "exam-template-003", name: "Academic Competition Package", description: "Math and Science Olympiad entries", items: ["exam-item-006", "exam-item-007", "exam-item-008"], applicableGrades: [], isActive: true }
]

// Default items for School Bus (summer)
const defaultSummerItems: PreCreatedItem[] = [
  { id: "bus-item-001", name: "Zone 1 - Round Trip (Annual)", description: "Annual school bus service for Zone 1, morning and afternoon", amount: 45000, category: "Annual Service", isActive: true, applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "bus-item-002", name: "Zone 1 - One Way Morning (Annual)", description: "Annual school bus service for Zone 1, morning only", amount: 28000, category: "Annual Service", isActive: true, applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "bus-item-003", name: "Zone 1 - One Way Afternoon (Annual)", description: "Annual school bus service for Zone 1, afternoon only", amount: 28000, category: "Annual Service", isActive: true, applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "bus-item-004", name: "Zone 2 - Round Trip (Annual)", description: "Annual school bus service for Zone 2, morning and afternoon", amount: 55000, category: "Annual Service", isActive: true, applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "bus-item-005", name: "Zone 2 - One Way Morning (Annual)", description: "Annual school bus service for Zone 2, morning only", amount: 35000, category: "Annual Service", isActive: true, applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "bus-item-006", name: "Zone 3 - Round Trip (Annual)", description: "Annual school bus service for Zone 3, morning and afternoon", amount: 65000, category: "Annual Service", isActive: true, applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "bus-item-007", name: "Monthly Bus Pass - Zone 1", description: "Monthly school bus service for Zone 1", amount: 4500, category: "Monthly Service", isActive: true, applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "bus-item-008", name: "Monthly Bus Pass - Zone 2", description: "Monthly school bus service for Zone 2", amount: 5500, category: "Monthly Service", isActive: true, applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "bus-item-009", name: "Term 1 Bus Service - Zone 1", description: "Term 1 school bus service for Zone 1", amount: 15000, category: "Term Service", isActive: true, applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "bus-item-010", name: "Special Trip Transportation", description: "Transportation for special school events and field trips", amount: 500, category: "Special Service", isActive: true, applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] }
]

const defaultSummerTemplates: ItemTemplate[] = [
  { id: "bus-template-001", name: "Zone 1 Complete Package", description: "All Zone 1 transportation options", items: ["bus-item-001", "bus-item-002", "bus-item-003"], applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"], isActive: true },
  { id: "bus-template-002", name: "Annual Service Bundle", description: "Annual round-trip services for all zones", items: ["bus-item-001", "bus-item-004", "bus-item-006"], applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"], isActive: true },
  { id: "bus-template-003", name: "Monthly Pass Package", description: "Monthly bus passes for Zone 1 and 2", items: ["bus-item-007", "bus-item-008"], applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"], isActive: true }
]

// Default items for ECA (Enrichment Care Activities)
const defaultECAItems: PreCreatedItem[] = [
  { id: "eca-item-001", name: "Piano Lessons (Beginner)", description: "Weekly piano lessons for beginners", amount: 4500, category: "Music", isActive: true, applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"] },
  { id: "eca-item-002", name: "Piano Lessons (Intermediate)", description: "Weekly piano lessons for intermediate level", amount: 5500, category: "Music", isActive: true, applicableGrades: ["Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9"] },
  { id: "eca-item-003", name: "Guitar Lessons", description: "Weekly guitar lessons for all levels", amount: 4000, category: "Music", isActive: true, applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "eca-item-004", name: "Violin Lessons", description: "Weekly violin lessons for all levels", amount: 5000, category: "Music", isActive: true, applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9"] },
  { id: "eca-item-005", name: "Choir Club", description: "Weekly choir practice and performances", amount: 2500, category: "Music", isActive: true, applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "eca-item-006", name: "Art & Painting", description: "Creative art and painting classes", amount: 3500, category: "Arts", isActive: true, applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9"] },
  { id: "eca-item-007", name: "Drama Club", description: "Acting and drama performance classes", amount: 3000, category: "Arts", isActive: true, applicableGrades: ["Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "eca-item-008", name: "Dance Classes", description: "Ballet, jazz, and contemporary dance", amount: 3500, category: "Arts", isActive: true, applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "eca-item-009", name: "Football Training", description: "Weekly football training and matches", amount: 2800, category: "Sports", isActive: true, applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "eca-item-010", name: "Basketball Club", description: "Basketball training and competitions", amount: 2800, category: "Sports", isActive: true, applicableGrades: ["Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "eca-item-011", name: "Swimming Lessons", description: "Professional swimming lessons and training", amount: 4000, category: "Sports", isActive: true, applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "eca-item-012", name: "Martial Arts", description: "Taekwondo and karate training", amount: 3200, category: "Sports", isActive: true, applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "eca-item-013", name: "Chess Club", description: "Strategic thinking and chess tournaments", amount: 2000, category: "Academic", isActive: true, applicableGrades: ["Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "eca-item-014", name: "Robotics Club", description: "STEM robotics and programming", amount: 4500, category: "Academic", isActive: true, applicableGrades: ["Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "eca-item-015", name: "Coding & Programming", description: "Computer programming and app development", amount: 4000, category: "Academic", isActive: true, applicableGrades: ["Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "eca-item-016", name: "Science Club", description: "Hands-on science experiments and projects", amount: 3000, category: "Academic", isActive: true, applicableGrades: ["Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9"] },
  { id: "eca-item-017", name: "Debate Club", description: "Public speaking and debate competitions", amount: 2500, category: "Academic", isActive: true, applicableGrades: ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "eca-item-018", name: "Mandarin Conversation", description: "Conversational Mandarin Chinese classes", amount: 3500, category: "Academic", isActive: true, applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "eca-item-019", name: "Cooking Club", description: "Culinary skills and healthy cooking", amount: 3000, category: "Other", isActive: true, applicableGrades: ["Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "eca-item-020", name: "Photography Club", description: "Digital photography and editing skills", amount: 3500, category: "Other", isActive: true, applicableGrades: ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] }
]

const defaultECATemplates: ItemTemplate[] = [
  { id: "eca-template-001", name: "Primary Music Bundle", description: "Popular music courses for primary students", items: ["eca-item-001", "eca-item-003", "eca-item-005"], applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"], isActive: true },
  { id: "eca-template-002", name: "Arts & Performance Package", description: "Creative arts and performance activities", items: ["eca-item-006", "eca-item-007", "eca-item-008"], applicableGrades: ["Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9"], isActive: true },
  { id: "eca-template-003", name: "Sports Athlete Bundle", description: "Comprehensive sports training package", items: ["eca-item-009", "eca-item-011", "eca-item-012"], applicableGrades: ["Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"], isActive: true },
  { id: "eca-template-004", name: "STEM Excellence Package", description: "Science, technology, and robotics programs", items: ["eca-item-013", "eca-item-014", "eca-item-015"], applicableGrades: ["Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"], isActive: true },
  { id: "eca-template-005", name: "Academic Enrichment Bundle", description: "Language, debate, and science activities", items: ["eca-item-016", "eca-item-017", "eca-item-018"], applicableGrades: ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"], isActive: true }
]

// Default items for Trip & Activities
const defaultTripItems: PreCreatedItem[] = [
  { id: "trip-item-001", name: "Field Trip - Science Museum", description: "Educational trip to the Science Museum", amount: 850, category: "Field Trip", isActive: true, applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"] },
  { id: "trip-item-002", name: "Field Trip - Art Gallery", description: "Art appreciation trip to National Gallery", amount: 750, category: "Field Trip", isActive: true, applicableGrades: ["Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9"] },
  { id: "trip-item-003", name: "Field Trip - Historical Site", description: "History learning trip to Ayutthaya", amount: 1200, category: "Field Trip", isActive: true, applicableGrades: ["Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "trip-item-004", name: "Camping Trip - 2 Days", description: "Overnight camping with outdoor activities", amount: 3500, category: "Camp", isActive: true, applicableGrades: ["Year 5", "Year 6", "Year 7", "Year 8", "Year 9"] },
  { id: "trip-item-005", name: "Camping Trip - 3 Days", description: "Extended camping with leadership training", amount: 5500, category: "Camp", isActive: true, applicableGrades: ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "trip-item-006", name: "Sports Day Event", description: "Annual sports day participation", amount: 500, category: "Sports Event", isActive: true, applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "trip-item-007", name: "Swimming Competition", description: "Inter-school swimming competition", amount: 800, category: "Sports Event", isActive: true, applicableGrades: ["Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "trip-item-008", name: "Cultural Festival", description: "Annual cultural festival participation", amount: 600, category: "Cultural Event", isActive: true, applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "trip-item-009", name: "Music Concert", description: "School music concert and performance", amount: 450, category: "Cultural Event", isActive: true, applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "trip-item-010", name: "STEM Workshop", description: "Science and technology workshop", amount: 950, category: "Workshop", isActive: true, applicableGrades: ["Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] }
]

const defaultTripTemplates: ItemTemplate[] = [
  { id: "trip-template-001", name: "Primary Trip Package", description: "Field trips for primary students", items: ["trip-item-001", "trip-item-006", "trip-item-008"], applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"], isActive: true },
  { id: "trip-template-002", name: "Secondary Trip Package", description: "Educational trips for secondary students", items: ["trip-item-002", "trip-item-003", "trip-item-005"], applicableGrades: ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"], isActive: true }
]

// Default items for Exam Registration
const defaultExamItems: PreCreatedItem[] = [
  { id: "exam-item-001", name: "Cambridge IGCSE Registration", description: "IGCSE examination registration fee", amount: 12500, category: "International Exam", isActive: true, applicableGrades: ["Year 10", "Year 11"] },
  { id: "exam-item-002", name: "Cambridge A-Level Registration", description: "A-Level examination registration fee", amount: 15000, category: "International Exam", isActive: true, applicableGrades: ["Year 12", "Year 13"] },
  { id: "exam-item-003", name: "SAT Registration", description: "SAT examination registration fee", amount: 8500, category: "International Exam", isActive: true, applicableGrades: ["Year 11", "Year 12", "Year 13"] },
  { id: "exam-item-004", name: "IELTS Registration", description: "IELTS examination registration fee", amount: 7500, category: "English Proficiency", isActive: true, applicableGrades: ["Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "exam-item-005", name: "TOEFL Registration", description: "TOEFL examination registration fee", amount: 6500, category: "English Proficiency", isActive: true, applicableGrades: ["Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "exam-item-006", name: "Cambridge English Certificate", description: "Cambridge English proficiency test", amount: 5500, category: "English Proficiency", isActive: true, applicableGrades: ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "exam-item-007", name: "Math Olympiad Registration", description: "International Math Olympiad registration", amount: 3500, category: "Competition", isActive: true, applicableGrades: ["Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "exam-item-008", name: "Science Olympiad Registration", description: "International Science Olympiad registration", amount: 3500, category: "Competition", isActive: true, applicableGrades: ["Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "exam-item-009", name: "Mid-term Exam Fee", description: "School mid-term examination fee", amount: 1500, category: "School Exam", isActive: true, applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "exam-item-010", name: "Final Exam Fee", description: "School final examination fee", amount: 2000, category: "School Exam", isActive: true, applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] }
]

const defaultExamTemplates: ItemTemplate[] = [
  { id: "exam-template-001", name: "IGCSE Full Package", description: "Complete IGCSE exam registration", items: ["exam-item-001", "exam-item-006"], applicableGrades: ["Year 10", "Year 11"], isActive: true },
  { id: "exam-template-002", name: "A-Level Full Package", description: "Complete A-Level exam registration", items: ["exam-item-002", "exam-item-003"], applicableGrades: ["Year 12", "Year 13"], isActive: true },
  { id: "exam-template-003", name: "English Proficiency Bundle", description: "English proficiency exams", items: ["exam-item-004", "exam-item-006"], applicableGrades: ["Year 9", "Year 10", "Year 11", "Year 12", "Year 13"], isActive: true }
]

// Default items for School Bus
const defaultBusItems: PreCreatedItem[] = [
  { id: "bus-item-001", name: "Annual Bus Service - Zone 1", description: "Full year bus service for Zone 1 (0-5 km)", amount: 45000, category: "Annual Service", isActive: true, applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "bus-item-002", name: "Annual Bus Service - Zone 2", description: "Full year bus service for Zone 2 (5-10 km)", amount: 55000, category: "Annual Service", isActive: true, applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "bus-item-003", name: "Annual Bus Service - Zone 3", description: "Full year bus service for Zone 3 (10-15 km)", amount: 65000, category: "Annual Service", isActive: true, applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "bus-item-004", name: "Term Bus Service - Zone 1", description: "One term bus service for Zone 1", amount: 16000, category: "Term Service", isActive: true, applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "bus-item-005", name: "Term Bus Service - Zone 2", description: "One term bus service for Zone 2", amount: 19000, category: "Term Service", isActive: true, applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "bus-item-006", name: "Term Bus Service - Zone 3", description: "One term bus service for Zone 3", amount: 22000, category: "Term Service", isActive: true, applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "bus-item-007", name: "Monthly Bus Pass - Zone 1", description: "Monthly bus pass for Zone 1", amount: 5500, category: "Monthly Service", isActive: true, applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "bus-item-008", name: "Monthly Bus Pass - Zone 2", description: "Monthly bus pass for Zone 2", amount: 6500, category: "Monthly Service", isActive: true, applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "bus-item-009", name: "Field Trip Transportation", description: "Transportation for field trips and events", amount: 350, category: "Special Service", isActive: true, applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] },
  { id: "bus-item-010", name: "Sports Event Transportation", description: "Transportation for sports events", amount: 450, category: "Special Service", isActive: true, applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"] }
]

const defaultBusTemplates: ItemTemplate[] = [
  { id: "bus-template-001", name: "Annual Service Bundle", description: "Full year bus service packages", items: ["bus-item-001", "bus-item-002"], applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"], isActive: true },
  { id: "bus-template-002", name: "Term Service Bundle", description: "Term-based bus service packages", items: ["bus-item-004", "bus-item-005"], applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"], isActive: true }
]

const formatCurrency = (amount: number): string => {
  return `₿${amount.toLocaleString()}`
}

// Item categories for each invoice type - getter function for translations
const getItemCategoriesWithTranslations = (t: (key: string) => string) => [
  {
    id: "Tuition",
    label: t('category.tuition'),
    icon: GraduationCap,
    description: t('category.tuitionDesc')
  },
  {
    id: "ECA",
    label: t('category.eca'),
    icon: Zap,
    description: t('category.ecaDesc')
  },
  {
    id: "Trip & Other Activity",
    label: t('category.tripActivity'),
    icon: MapPin,
    description: t('category.tripActivityDesc')
  }
]

// Keep legacy for backward compatibility with data storage
const itemCategories = [
  { id: "Tuition", label: "Tuition", icon: GraduationCap, description: "Academic fees and school essentials" },
  { id: "ECA", label: "ECA", icon: Zap, description: "Extra-curricular activities" },
  { id: "Trip & Other Activity", label: "Trip & Other Activity", icon: MapPin, description: "Field trips and special events" }
]

// Item categories for Trip & Activity (afterschool)
const afterSchoolItemCategories = [
  { id: "Field Trip", label: "Field Trip", icon: MapPin, description: "Educational trips and tours" },
  { id: "Camp", label: "Camp", icon: MapPin, description: "Camping and outdoor activities" },
  { id: "Sports Event", label: "Sports Event", icon: Zap, description: "Sports competitions and events" },
  { id: "Cultural Event", label: "Cultural Event", icon: FileText, description: "Arts, music, and cultural activities" },
  { id: "Workshop", label: "Workshop", icon: GraduationCap, description: "Workshops and training sessions" }
]

// Item categories for Exam (event)
const eventItemCategories = [
  { id: "International Exam", label: "International Exam", icon: GraduationCap, description: "Cambridge, SAT, and other international exams" },
  { id: "English Proficiency", label: "English Proficiency", icon: FileText, description: "IELTS, TOEFL, and English tests" },
  { id: "Competition", label: "Competition", icon: Zap, description: "Academic competitions and olympiads" },
  { id: "School Exam", label: "School Exam", icon: GraduationCap, description: "Internal school examinations" },
  { id: "Certification", label: "Certification", icon: FileText, description: "Professional certifications" }
]

// Item categories for School Bus (summer)
const summerItemCategories = [
  { id: "Annual Service", label: "Annual Service", icon: MapPin, description: "Full year bus service packages" },
  { id: "Term Service", label: "Term Service", icon: MapPin, description: "Term-based bus service" },
  { id: "Monthly Service", label: "Monthly Service", icon: MapPin, description: "Monthly bus passes" },
  { id: "Special Service", label: "Special Service", icon: Zap, description: "Special trips and events transportation" }
]

// Item categories for ECA
const ecaItemCategories = [
  { id: "Music", label: "Music", icon: Zap, description: "Music lessons and programs" },
  { id: "Arts", label: "Arts", icon: FileText, description: "Arts and creative activities" },
  { id: "Sports", label: "Sports", icon: MapPin, description: "Sports and physical activities" },
  { id: "Academic", label: "Academic", icon: GraduationCap, description: "Academic enrichment programs" },
  { id: "Other", label: "Other", icon: FileText, description: "Other ECA activities" }
]

// Item categories for Trip & Activities
const tripItemCategories = [
  { id: "Field Trip", label: "Field Trip", icon: MapPin, description: "Educational trips and tours" },
  { id: "Camp", label: "Camp", icon: MapPin, description: "Camping and outdoor activities" },
  { id: "Sports Event", label: "Sports Event", icon: Zap, description: "Sports competitions and events" },
  { id: "Cultural Event", label: "Cultural Event", icon: FileText, description: "Arts, music, and cultural activities" },
  { id: "Workshop", label: "Workshop", icon: GraduationCap, description: "Workshops and training sessions" }
]

// Item categories for Exam Registration
const examItemCategories = [
  { id: "International Exam", label: "International Exam", icon: GraduationCap, description: "Cambridge, SAT, and other international exams" },
  { id: "English Proficiency", label: "English Proficiency", icon: FileText, description: "IELTS, TOEFL, and English tests" },
  { id: "Competition", label: "Competition", icon: Zap, description: "Academic competitions and olympiads" },
  { id: "School Exam", label: "School Exam", icon: GraduationCap, description: "Internal school examinations" },
  { id: "Certification", label: "Certification", icon: FileText, description: "Professional certifications" }
]

// Item categories for School Bus
const busItemCategories = [
  { id: "Annual Service", label: "Annual Service", icon: MapPin, description: "Full year bus service packages" },
  { id: "Term Service", label: "Term Service", icon: MapPin, description: "Term-based bus service" },
  { id: "Monthly Service", label: "Monthly Service", icon: MapPin, description: "Monthly bus passes" },
  { id: "Special Service", label: "Special Service", icon: Zap, description: "Special trips and events transportation" }
]

// Get item categories based on invoice type
const getItemCategories = (invoiceType: string) => {
  switch (invoiceType) {
    case "afterschool":
      return afterSchoolItemCategories
    case "event":
      return eventItemCategories
    case "summer":
      return summerItemCategories
    case "eca":
      return ecaItemCategories
    case "trip":
      return tripItemCategories
    case "exam":
      return examItemCategories
    case "bus":
      return busItemCategories
    case "tuition":
    case "student":
    default:
      return itemCategories
  }
}

// Get page title based on invoice type
const getPageTitle = (invoiceType: string, t: (key: string) => string): string => {
  switch (invoiceType) {
    case "afterschool":
    case "trip":
      return t('invoiceCreation.createTripInvoice')
    case "event":
    case "exam":
      return t('invoiceCreation.createExamInvoice')
    case "summer":
    case "bus":
      return t('invoiceCreation.createBusInvoice')
    case "eca":
      return "Create ECA Invoice"
    case "tuition":
    case "student":
    default:
      return t('invoiceCreation.createStudentInvoice')
  }
}

// Get card title based on invoice type
const getCardTitle = (invoiceType: string, t: (key: string) => string): string => {
  switch (invoiceType) {
    case "afterschool":
    case "trip":
      return t('invoiceCreation.tripInvoiceDetails')
    case "event":
    case "exam":
      return t('invoiceCreation.examInvoiceDetails')
    case "summer":
    case "bus":
      return t('invoiceCreation.busInvoiceDetails')
    case "eca":
      return "ECA Invoice Details"
    case "tuition":
    case "student":
    default:
      return t('invoiceCreation.studentInvoiceDetails')
  }
}

// Get card icon based on invoice type
const getCardIcon = (invoiceType: string) => {
  switch (invoiceType) {
    case "afterschool":
    case "trip":
      return MapPin
    case "event":
    case "exam":
      return FileText
    case "summer":
    case "bus":
      return MapPin
    case "eca":
      return Zap
    case "tuition":
    case "student":
    default:
      return GraduationCap
  }
}

interface InvoiceCreationProps {
  defaultCategory?: string
  invoiceType?: string
  category?: "tuition" | "eca" | "trip" | "exam" | "bus" | "external" // Category for filtering invoices by menu type
  onNavigateToEmailSending?: (data: any) => void
  onNavigateBack?: () => void
  editInvoice?: any // Invoice data to edit
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

export function InvoiceCreation({ defaultCategory, invoiceType = "student", category = "tuition", onNavigateToEmailSending, onNavigateBack, editInvoice }: InvoiceCreationProps) {
  // Language context
  const { t } = useLanguage()

  // Get translated grades and rooms
  const grades = getGrades(t)
  const rooms = getRooms(t)
  const gradeIdMap = getGradeIdMap(t) // Map translated labels to grade IDs for TuitionByYear lookup

  // Check if this is edit mode
  const isEditMode = !!editInvoice

  // Check if this is a simplified category view (event only)
  // ECA, afterschool, and summer are NOT simplified - they follow the full flow like Tuition
  const isCategoryView = ["event"].includes(invoiceType)
  const isSimplifiedView = isCategoryView

  // Get the appropriate item categories for this invoice type
  const currentItemCategories = getItemCategories(invoiceType)
  const CardIcon = getCardIcon(invoiceType)

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
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]) // For Trip & Activity multi-select
  const [selectedRoom, setSelectedRoom] = useState("")

  // Convert StudentContext students to invoice format
  // Use selected values when available, fall back to defaults
  const effectiveAcademicYear = selectedAcademicYear || academicYear
  const effectiveTerm = selectedTerm || term

  const availableStudents = useMemo(() => {
    return students.map(student => {
      // Convert gradeLevel ID to label format (e.g., "year2" -> "Year 2")
      const gradeLabel = getGradeLabel(student.gradeLevel)

      // Get room/section from student if available, or leave empty for "All Rooms"
      const studentRoom = student.section || student.room || ""

      // For simplified views (Trip/Activity, Exam, School Bus), don't calculate discounts or fee waivers
      if (isSimplifiedView) {
        return {
          id: student.studentId,
          name: `${student.firstName} ${student.lastName}`,
          grade: gradeLabel,
          room: studentRoom,
          parentName: student.parents?.[0]?.name || "Parent",
          email: student.parents?.[0]?.email || "parent@email.com",
          originalStudent: student,
          isNewStudent: false,
          enrollmentTerm: student.enrollmentTerm || "",
          enrollmentYear: student.academicYear || "",
          discounts: {
            siblingDiscount: 0,
            studentGroupDiscounts: [],
            staffChild: false,
            scholarship: false,
            earlyBird: false
          },
          feeWaiver: undefined
        } as InvoiceStudent
      }

      // For regular tuition invoices, calculate all discounts
      // Get sibling discount - available from 1st child onwards (no Year 3+ requirement)
      const childOrder = student.childOrder || 1
      const siblingDiscount = getSiblingDiscountPercentage(childOrder, student.academicYear || effectiveAcademicYear, effectiveTerm)

      // Get student group discounts (only for tuition and bus categories)
      const groupDiscounts = getStudentGroupDiscounts(student.studentId, category)

      // Check for special discounts from localStorage records
      // Fallback to notes-based detection for backward compatibility
      const notes = student.notes?.toLowerCase() || ""
      const staffChild = isStaffChildStudent(student.studentId) || notes.includes('staff')
      const scholarship = hasScholarshipDiscount(student.studentId) || notes.includes('scholarship')
      const earlyBird = hasEarlyBirdDiscount(student.studentId) || notes.includes('early bird')

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
  }, [students, effectiveAcademicYear, effectiveTerm, isSimplifiedView, checkFeePrivilegeEligibility, getSiblingDiscountPercentage, getStudentGroupDiscounts, category])

  // Load all items from localStorage for template calculations
  const allStoredItems = useMemo(() => {
    return loadItemsFromStorage(invoiceType)
  }, [invoiceType])

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

  // Item selection state (moved before useEffect)
  const [availableItems, setAvailableItems] = useState<PreCreatedItem[]>([])
  const [selectedItems, setSelectedItems] = useState<PreCreatedItem[]>([])
  const [availableTemplates, setAvailableTemplates] = useState<ItemTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [selectedCategory, setSelectedCategory] = useState<string>(
    defaultCategory || (invoiceType === "eca" ? "ECA" : "Tuition")
  )

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

  // Load edit invoice data
  useEffect(() => {
    if (editInvoice && isEditMode) {
      console.log("Loading edit invoice data:", editInvoice)

      // Extract term and academic year from the term string (e.g., "2025-2026 - Term 1")
      const termMatch = editInvoice.term?.match(/([\d-]+)\s*-\s*(.+)/)
      if (termMatch) {
        setSelectedAcademicYear(termMatch[1].trim())
        setSelectedTerm(termMatch[2].trim())
      }

      // Set grade and room
      setSelectedGrade(editInvoice.studentGrade || '')
      setSelectedRoom(editInvoice.studentRoom || '')

      // Set payment deadline
      if (editInvoice.dueDate) {
        setPaymentDeadline(new Date(editInvoice.dueDate))
      }

      // Set selected items
      if (editInvoice.items && Array.isArray(editInvoice.items)) {
        setSelectedItems(editInvoice.items.map((item: any, index: number) => ({
          id: item.id || item.itemCode || `item-${Date.now()}-${index}`,
          name: item.name || '',
          description: item.description || '',
          amount: item.amount || 0,
          category: item.category || 'Tuition',
          applicableGrades: item.applicableGrades || [],
          isActive: true,
          itemCode: item.itemCode || item.id
        })))
      }

      // Set selected student
      if (editInvoice.studentId) {
        const student: InvoiceStudent = {
          id: editInvoice.studentId,
          name: editInvoice.studentName || '',
          grade: editInvoice.studentGrade || '',
          email: editInvoice.parentEmail || '',
          parentName: editInvoice.parentName || '',
          room: editInvoice.studentRoom || '',
          isNewStudent: editInvoice.isNewStudent || false,
          discounts: {
            siblingDiscount: 0,
            studentGroupDiscounts: [],
            staffChild: false,
            scholarship: false,
            earlyBird: false
          },
          feeWaiver: editInvoice.feeWaiver
        }
        setSelectedStudents([student])
      }
    }
  }, [editInvoice, isEditMode])

  // Add item from list state
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false)
  const [addItemSearchTerm, setAddItemSearchTerm] = useState("")
  const [addItemCategory, setAddItemCategory] = useState("all")

  // Edit item state
  const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PreCreatedItem | null>(null)
  const [editItemDescription, setEditItemDescription] = useState("")
  const [editItemAmount, setEditItemAmount] = useState<number>(0)

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

  // ==========================================
  // Menu-specific fields for simplified views
  // ==========================================

  // Trip & Activity fields
  const [tripName, setTripName] = useState("")
  const [tripDate, setTripDate] = useState<Date | undefined>(undefined)
  const [tripLocation, setTripLocation] = useState("")

  // Exam fields
  const [examName, setExamName] = useState("")
  const [examDate, setExamDate] = useState<Date | undefined>(undefined)
  const [examType, setExamType] = useState("")
  const [testCenter, setTestCenter] = useState("")

  // School Bus fields
  const [busRoute, setBusRoute] = useState("")
  const [busServiceType, setBusServiceType] = useState("")

  // Payer selection type for simplified views
  const [payerSelectionType, setPayerSelectionType] = useState<"fromSystem" | "manual">("fromSystem")

  // Manual payer info
  const [manualClientName, setManualClientName] = useState("")
  const [manualContactName, setManualContactName] = useState("")
  const [manualClientEmail, setManualClientEmail] = useState("")
  const [manualClientAddress, setManualClientAddress] = useState("")
  const [manualClientPhone, setManualClientPhone] = useState("")

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false)

  // Bus routes options
  const busRoutes = [
    "Zone 1 - Sukhumvit (Soi 1-30)",
    "Zone 2 - Sukhumvit (Soi 31-63)",
    "Zone 3 - Silom / Sathorn",
    "Zone 4 - Ratchadaphisek",
    "Zone 5 - Rama 9 / Petchaburi",
    "Zone 6 - Ladprao / Pahonyothin"
  ]

  // Bus service types
  const busServiceTypes = [
    { value: "term1", label: "Term 1 Service" },
    { value: "term2", label: "Term 2 Service" },
    { value: "term3", label: "Term 3 Service" },
    { value: "full_year", label: "Full Year Service" }
  ]

  // Load items when grade or category changes
  // Skip for summer and afterschool - they have their own item loading logic
  useEffect(() => {
    if (selectedGrade && invoiceType !== "summer" && invoiceType !== "afterschool") {
      const allItems = loadItemsFromStorage(invoiceType)
      const filteredItems = allItems.filter(item =>
        item.isActive &&
        item.applicableGrades.includes(selectedGrade) &&
        item.category === selectedCategory
      )
      setAvailableItems(filteredItems)

      const allTemplates = loadTemplatesFromStorage(invoiceType)
      const filteredTemplates = allTemplates.filter(template =>
        template.isActive && template.applicableGrades.includes(selectedGrade)
      )
      setAvailableTemplates(filteredTemplates)
    }
  }, [selectedGrade, selectedCategory, invoiceType])

  // Load all items for simplified views (no grade filtering needed)
  useEffect(() => {
    if (isSimplifiedView) {
      const allItems = loadItemsFromStorage(invoiceType)
      const filteredItems = allItems.filter(item => item.isActive)
      setAvailableItems(filteredItems)

      const allTemplates = loadTemplatesFromStorage(invoiceType)
      const filteredTemplates = allTemplates.filter(template => template.isActive)
      setAvailableTemplates(filteredTemplates)
    }
  }, [isSimplifiedView, invoiceType])

  // Load items when grades are selected for Trip & Activity (afterschool/trip/bus)
  useEffect(() => {
    if ((invoiceType === "afterschool" || invoiceType === "trip" || invoiceType === "bus") && selectedGrades.length > 0) {
      const allItems = loadItemsFromStorage(invoiceType)
      // Afterschool items don't filter by grade - load all active items
      const filteredItems = allItems.filter(item => item.isActive)
      setAvailableItems(filteredItems)

      const allTemplates = loadTemplatesFromStorage(invoiceType)
      const filteredTemplates = allTemplates.filter(template => template.isActive)
      setAvailableTemplates(filteredTemplates)
    }
  }, [selectedGrades, invoiceType])

  // Track if tuition fee has been loaded for current selection
  const [tuitionFeeLoaded, setTuitionFeeLoaded] = useState<string>("")

  // Auto-load tuition fee when Academic Year, Grade, and Term are all selected (for Tuition invoices)
  useEffect(() => {
    // Only for tuition category and student invoice type
    if (category !== "tuition" || (invoiceType !== "student" && invoiceType !== "tuition" && invoiceType)) {
      return
    }

    // Need all three: academic year, grade, and term
    if (!selectedAcademicYear || !selectedGrade || !selectedTerm) {
      return
    }

    // Skip if in edit mode (items are loaded from the invoice being edited)
    if (isEditMode) {
      return
    }

    // Create a unique key for this selection to track if already loaded
    const selectionKey = `${selectedAcademicYear}-${selectedGrade}-${selectedTerm}`

    // Skip if already loaded for this selection
    if (tuitionFeeLoaded === selectionKey) {
      return
    }

    try {
      // Load tuition data from localStorage
      const tuitionData = localStorage.getItem("tuitionByYearData")

      if (tuitionData) {
        const parsedData = JSON.parse(tuitionData)
        const yearData = parsedData[selectedAcademicYear]

        if (yearData && Array.isArray(yearData)) {
          // Use gradeIdMap to convert translated label to grade ID
          const gradeId = gradeIdMap[selectedGrade] || selectedGrade.toLowerCase().replace(/\s+/g, '')

          // Find the tuition fees for this grade by ID
          const gradeTuition = yearData.find((item: any) => item.id === gradeId)

          if (gradeTuition) {
            // Determine which term amount to use
            let termAmount = 0
            let termName = ""

            if (selectedTerm.includes("Term 1") || selectedTerm.includes("term1") || selectedTerm === "term1") {
              termAmount = gradeTuition.term1Amount || 0
              termName = "Term 1"
            } else if (selectedTerm.includes("Term 2") || selectedTerm.includes("term2") || selectedTerm === "term2") {
              termAmount = gradeTuition.term2Amount || 0
              termName = "Term 2"
            } else if (selectedTerm.includes("Term 3") || selectedTerm.includes("term3") || selectedTerm === "term3") {
              termAmount = gradeTuition.term3Amount || 0
              termName = "Term 3"
            }

            if (termAmount > 0) {
              const tuitionItem = {
                id: `tuition-${gradeId}-${selectedTerm}`,
                name: `${termName} Tuition Fee - ${selectedGrade}`,
                description: `${termName} tuition payment for ${selectedGrade}`,
                category: "Tuition",
                quantity: 1,
                amount: termAmount
              }

              // Only add if not already in selectedItems
              setSelectedItems(prev => {
                const alreadyHasTuition = prev.some(item => item.id.startsWith('tuition-'))
                if (alreadyHasTuition) {
                  // Replace existing tuition item
                  return prev.map(item => item.id.startsWith('tuition-') ? tuitionItem : item)
                } else {
                  // Add new tuition item at the beginning
                  return [tuitionItem, ...prev]
                }
              })
              setTuitionFeeLoaded(selectionKey)
            }
          }
        }
      }
    } catch (error) {
      console.error("[Tuition Fee Load] Error loading tuition fees:", error)
    }
  }, [selectedAcademicYear, selectedGrade, selectedTerm, category, invoiceType, isEditMode, gradeIdMap, tuitionFeeLoaded])

  const handleGradeChange = (grade: string) => {
    setSelectedGrade(grade)
    // For summer and afterschool, term is selected BEFORE grade, so don't reset it
    // For others (student, eca), grade is selected BEFORE term, so reset it
    if (invoiceType !== "summer" && invoiceType !== "afterschool") {
      setSelectedTerm("") // Reset term when grade changes
    }
    setSelectedRoom("")
    setSelectedStudents([])
    setCsvStudents([])
    setCsvFile(null)
    setSelectedTemplate("")
    // Set correct category based on invoice type
    setSelectedCategory(invoiceType === "eca" ? "ECA" : (defaultCategory || "Tuition"))
    setPaymentDeadline(undefined)
    setIsPreviewMode(false)
    setTuitionFeeLoaded("") // Reset tuition fee loaded flag
    setSelectedItems([]) // Clear selected items when grade changes

    // Load items from localStorage
    const allItems = loadItemsFromStorage(invoiceType)
    console.log(`[${invoiceType}] Loaded ${allItems.length} items from storage`)

    // Filter available items for this grade
    // For School Bus (summer), load all items (not grade-specific)
    // For ECA, include all items (Music, Arts, Sports, Academic, Other categories)
    // For other types, filter by specific category
    const gradeItems = invoiceType === "summer"
      ? allItems.filter(item => item.isActive)
      : invoiceType === "eca"
        ? allItems.filter(item =>
            item.isActive &&
            item.applicableGrades.includes(grade)
          )
        : allItems.filter(item =>
            item.isActive &&
            item.applicableGrades.includes(grade) &&
            item.category === (defaultCategory || "Tuition")
          )
    console.log(`[${invoiceType}] Filtered to ${gradeItems.length} items for grade ${grade}`)
    setAvailableItems(gradeItems)

    // Don't auto-select items yet - wait for term to be selected
    setSelectedItems([])

    // Load templates from localStorage
    const allTemplates = loadTemplatesFromStorage(invoiceType)

    // Filter available templates for this grade
    // For School Bus (summer), load all templates (not grade-specific)
    const gradeTemplates = invoiceType === "summer"
      ? allTemplates.filter(template => template.isActive)
      : allTemplates.filter(template =>
          template.isActive && template.applicableGrades.includes(grade)
        )
    setAvailableTemplates(gradeTemplates)
  }

  const handleTermChange = (term: string) => {
    setSelectedTerm(term)
    setSelectedRoom("")
    setSelectedStudents([])
    setCsvStudents([])
    setCsvFile(null)
    setPaymentDeadline(undefined)
    setIsPreviewMode(false)

    // Auto-select tuition fee from Tuition By Year data (for student/tuition invoices)
    // Now we have: selectedAcademicYear, selectedGrade, and term (just selected)
    if ((invoiceType === "student" || invoiceType === "tuition" || !invoiceType) && selectedAcademicYear && selectedGrade) {
      try {
        // Load tuition data from localStorage
        const tuitionData = localStorage.getItem("tuitionByYearData")
        if (tuitionData) {
          const parsedData = JSON.parse(tuitionData)
          const yearData = parsedData[selectedAcademicYear]

          if (yearData && Array.isArray(yearData) && selectedGrade) {
            // Use gradeIdMap to convert translated label to grade ID
            // This works correctly for both English and Thai languages
            const gradeId = gradeIdMap[selectedGrade] || selectedGrade.toLowerCase().replace(/\s+/g, '')

            // Find the tuition fees for this grade by ID
            const gradeTuition = yearData.find((item: any) => item.id === gradeId)

            if (gradeTuition) {
              // Determine which term amount to use
              let termAmount = 0
              let termName = ""

              if (term.includes("Term 1") || term === "term1") {
                termAmount = gradeTuition.term1Amount || 0
                termName = "Term 1"
              } else if (term.includes("Term 2") || term === "term2") {
                termAmount = gradeTuition.term2Amount || 0
                termName = "Term 2"
              } else if (term.includes("Term 3") || term === "term3") {
                termAmount = gradeTuition.term3Amount || 0
                termName = "Term 3"
              }

              if (termAmount > 0) {
                setSelectedItems([{
                  id: `tuition-${gradeId}-${term}`,
                  name: `${termName} Tuition Fee - ${selectedGrade}`,
                  description: `${termName} tuition payment for ${selectedGrade}`,
                  category: "Tuition",
                  quantity: 1,
                  amount: termAmount
                }])
              } else {
                setSelectedItems([])
              }
            } else {
              setSelectedItems([])
            }
          } else {
            setSelectedItems([])
          }
        } else {
          setSelectedItems([])
        }
      } catch (error) {
        console.error("Failed to load tuition fees:", error)
        setSelectedItems([])
      }
    } else {
      setSelectedItems([])
    }
  }

  const handleRoomChange = (room: string) => {
    setSelectedRoom(room === "all" ? "" : room)
    // Filter students by room
    setSelectedStudents([])
  }

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)

    // Load items from localStorage
    const allItems = loadItemsFromStorage(invoiceType)

    // Filter available items for selected grade and new category
    const categoryItems = allItems.filter(item =>
      item.isActive &&
      item.applicableGrades.includes(selectedGrade) &&
      item.category === category
    )
    setAvailableItems(categoryItems)
  }

  // Helper function to check if a student has 100% discount (for Tuition invoices only)
  const hasFullDiscount = (studentId: string): boolean => {
    // Only check for tuition category
    if (category !== "tuition") {
      return false
    }

    try {
      const stored = localStorage.getItem("studentGroups")
      if (!stored) return false

      const groups = JSON.parse(stored)
      let totalDiscount = 0

      groups.forEach((group: any) => {
        if (group.students && group.discountType === "percentage" && Number(group.discountPercentage) > 0) {
          const studentInGroup = group.students.find((s: any) => s.id === studentId)
          if (studentInGroup) {
            totalDiscount += Number(group.discountPercentage) || 0
          }
        }
      })

      return totalDiscount >= 100
    } catch (error) {
      console.error("Error checking full discount:", error)
      return false
    }
  }

  const filteredStudents = availableStudents.filter(student => {
    const searchLower = (searchStudentTerm || '').toLowerCase()
    const matchesSearch = (student.id || '').toLowerCase().includes(searchLower) ||
                         (student.name || '').toLowerCase().includes(searchLower)
    const notAlreadySelected = !selectedStudents.find(s => s.id === student.id)

    // For Tuition invoices only: exclude students with 100% discount from Discount Groups
    if (hasFullDiscount(student.id)) {
      return false // Exclude students with 100% or more discount
    }

    // For simplified views (event only), don't filter by grade/room
    if (isSimplifiedView) {
      return matchesSearch && notAlreadySelected
    }

    // For Trip & Activity (afterschool/trip) and School Bus (bus), filter by multiple selected grades
    if (invoiceType === "afterschool" || invoiceType === "trip" || invoiceType === "bus") {
      return matchesSearch &&
             selectedGrades.includes(student.grade) &&
             notAlreadySelected
    }

    // For Summer Activities (summer), filter by single grade (no room filter)
    if (invoiceType === "summer") {
      return matchesSearch &&
             student.grade === selectedGrade &&
             notAlreadySelected
    }

    // For regular student invoices (Tuition, ECA), filter by single grade and room
    return matchesSearch &&
           student.grade === selectedGrade &&
           (selectedRoom === "" || student.room === selectedRoom) &&
           notAlreadySelected
  })

  // Calculate discounts for a student
  const calculateStudentDiscounts = (student: InvoiceStudent, subtotal: number, invoiceTypeParam: string = "student") => {
    const discountItems: { name: string, amount: number, percentage?: number }[] = []
    let totalDiscountAmount = 0

    // No discounts for ECA, Trip & Activity (afterschool), Exam, and Bus
    if (invoiceTypeParam === "eca" || invoiceTypeParam === "afterschool" || invoiceTypeParam === "exam" || invoiceTypeParam === "trip" || invoiceTypeParam === "bus") {
      return {
        discountItems,
        totalDiscountAmount,
        netAmount: subtotal
      }
    }

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

    // Scholarship
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
      student.discounts.earlyBird
  }

  // Sync student list from system
  const handleSyncStudentList = () => {
    setIsSyncing(true)
    // Simulate sync delay
    setTimeout(() => {
      setIsSyncing(false)
      toast.success(t('invoiceCreation.studentListSynced'), {
        description: t('invoiceCreation.studentListSyncedDesc', { count: students.length })
      })
    }, 800)
  }

  const handleIndividualStudentSelect = (student: any) => {
    setSelectedStudents([...selectedStudents, student])
    setSearchStudentTerm("")
  }

  const handleRemoveStudent = (studentId: string) => {
    setSelectedStudents(selectedStudents.filter(s => s.id !== studentId))
  }

  const handleSelectAllStudents = () => {
    // For simplified views, select all available students
    if (isSimplifiedView) {
      setSelectedStudents(availableStudents)
    } else if (invoiceType === "afterschool" || invoiceType === "trip" || invoiceType === "bus") {
      // For Trip & Activity and School Bus, select all students from selected grades
      const gradeStudents = availableStudents.filter(s =>
        selectedGrades.includes(s.grade)
      )
      setSelectedStudents(gradeStudents)
    } else if (invoiceType === "summer") {
      // For Summer Activities, select all students from selected grade (no room filter)
      const gradeStudents = availableStudents.filter(s =>
        s.grade === selectedGrade
      )
      setSelectedStudents(gradeStudents)
    } else {
      // For regular invoices (Tuition, ECA), filter by grade and room
      const gradeStudents = availableStudents.filter(s =>
        s.grade === selectedGrade &&
        (selectedRoom === "" || s.room === selectedRoom)
      )
      setSelectedStudents(gradeStudents)
    }
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
      gradeLevel: (selectedGrade || '').toLowerCase().replace(/\s+/g, ''), // "Year 3" -> "year3"
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

  // Edit item handlers
  const handleEditItem = (item: PreCreatedItem) => {
    setEditingItem(item)
    setEditItemDescription(item.description)
    setEditItemAmount(item.amount)
    setIsEditItemDialogOpen(true)
  }

  const handleSaveEditItem = () => {
    if (!editingItem) return

    setSelectedItems(selectedItems.map(item =>
      item.id === editingItem.id
        ? { ...item, description: editItemDescription, amount: editItemAmount }
        : item
    ))
    setIsEditItemDialogOpen(false)
    setEditingItem(null)
    toast.success("Item updated successfully")
  }

  // Get all items for Add Item dialog (filtered by search and category)
  const getItemsForDialog = () => {
    const allItems = loadItemsFromStorage(invoiceType)
    return allItems.filter(item => {
      const searchLower = (addItemSearchTerm || '').toLowerCase()
      const matchesSearch = addItemSearchTerm === "" ||
        (item.name || '').toLowerCase().includes(searchLower) ||
        (item.description || '').toLowerCase().includes(searchLower)
      const matchesCategory = addItemCategory === "all" || item.category === addItemCategory
      const notAlreadySelected = !selectedItems.find(s => s.id === item.id)

      // Filter items based on allowed categories for this invoice type
      const allowedCategories = getAllowedCategories(invoiceType)
      const matchesInvoiceType = allowedCategories === null || allowedCategories.includes(item.category)

      return item.isActive && matchesSearch && matchesCategory && notAlreadySelected && matchesInvoiceType
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
    const allTemplates = loadTemplatesFromStorage(invoiceType)
    const allItems = loadItemsFromStorage(invoiceType)

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
    // Check if items are selected
    if (selectedItems.length === 0) {
      toast.error("Please select items")
      return
    }

    // Check payer selection based on view type
    if (isSimplifiedView && payerSelectionType === "manual") {
      // Manual entry - check required fields
      if (!manualClientName || !manualClientEmail) {
        toast.error("Please fill in client name and email")
        return
      }
    } else {
      // From system - check students selected
      if (selectedStudents.length === 0) {
        toast.error("Please select students")
        return
      }
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

  const displayInvoiceNumber = (invoiceNumber: string | undefined) => {
    if (!invoiceNumber || invoiceNumber.startsWith("DRAFT-")) {
      return ""
    }
    return invoiceNumber
  }

  // Get account code (Nominal Code) based on item name/category
  const getAccountCode = (item: PreCreatedItem): string => {
    const name = (item.name || '').toLowerCase()
    const category = (item.category || '').toLowerCase()

    // Security Deposit
    if (name.includes('security deposit') || name.includes('deposit')) {
      return '2220001'
    }

    // Tuition fees
    if (category.includes('tuition') || name.includes('tuition fee') || name.includes('term')) {
      return '2130001'
    }

    // School Bus
    if (category.includes('school bus') || category.includes('bus')) {
      return '2130002'
    }

    // ECA
    if (category.includes('eca') || category.includes('extra')) {
      return '2130003'
    }

    // Trip & Activities
    if (category.includes('trip') || category.includes('activity')) {
      return '2130004'
    }

    // Default
    return '2130001'
  }

  // Convert academic year to Excel format (2025-2026 -> 2025/2026)
  const formatAcademicYearForExcel = (year: string): string => {
    return (year || '').replace('-', '/')
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
      const discountCalc = calculateStudentDiscounts(invoiceStudent, subtotal, invoiceType)
      // Use DRAFT number - real invoice number will be generated when approved
      const invoiceNumber = `DRAFT-${Date.now()}-${student.id.slice(-4)}`

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
      const subtotalBeforeIdCharges = subtotal - discountCalc.totalDiscountAmount + registrationFeesTotal - securityDepositWaiverAmount
      const idCharges = Math.round(subtotalBeforeIdCharges * 0.03)

      // Add line numbers and itemCode to items
      const itemsWithLineNumbers = selectedItems.map((item, index) => ({
        ...item,
        lineNumber: index + 1,
        itemCode: item.itemCode || getAccountCode(item) // Use existing itemCode or generate from category
      }))

      // Get first item's account code for invoice-level accountCode
      const invoiceAccountCode = selectedItems.length > 0 ? getAccountCode(selectedItems[0]) : '2130001'

      const savedInvoice: SavedInvoice = {
        id: `inv-${student.id}-${Date.now()}`,
        invoiceNumber: invoiceNumber,
        studentName: student.name || '',
        studentId: student.id || '',
        studentGrade: student.grade || selectedGrade || '',
        studentRoom: student.room || '',
        parentName: student.parentName || '',
        parentEmail: student.email || '',
        items: itemsWithLineNumbers,
        subtotal: subtotal,
        discounts: discountCalc.discountItems,
        totalDiscount: discountCalc.totalDiscountAmount,
        netAmount: discountCalc.netAmount,
        dueDate: paymentDeadline ? format(paymentDeadline, 'yyyy-MM-dd') : "",
        issueDate: format(now, 'yyyy-MM-dd'),
        status: "sent",
        term: `${selectedAcademicYear} - ${selectedTerm}`,
        paymentType: "termly",
        createdAt: now.toISOString(),
        invoiceType: invoiceType, // Use the actual invoice type (student/afterschool/event/summer/eca)
        category: category, // Category for filtering by menu type
        // Event/Trip/Activity name for afterschool/event/summer/eca/exam invoices
        eventName: (invoiceType === "exam" ? examName : invoiceType === "eca" ? examName : tripName) || undefined,
        // New student data
        isNewStudent: invoiceStudent.isNewStudent,
        registrationFees: registrationFeesList.length > 0 ? registrationFeesList : undefined,
        securityDepositWaiver: securityDepositWaiverAmount > 0 ? securityDepositWaiverAmount : undefined,
        // ID Charges
        idCharges: idCharges,
        // Excel export fields
        familyCode: invoiceStudent.originalStudent?.familyCode || '',
        adultIdNo: invoiceStudent.originalStudent?.parents?.find(p => p.isPrimary)?.nationalId || invoiceStudent.originalStudent?.familyCode || '',
        accountCode: invoiceAccountCode,
        documentType: 'SI', // Sales Invoice
        academicYear: formatAcademicYearForExcel(selectedAcademicYear || effectiveAcademicYear),
        termName: selectedTerm || effectiveTerm
      }

      saveInvoiceToStorage(savedInvoice, invoiceType)
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
    setPaymentDeadline(undefined)
    setIsPreviewMode(false)
    setIsConfirmationOpen(false)
  }

  // Save as Draft - saves invoices without sending email
  const handleSaveAsDraft = () => {
    console.log("=== handleSaveAsDraft called ===")
    console.log("selectedStudents:", selectedStudents)
    console.log("selectedAcademicYear:", selectedAcademicYear)
    console.log("selectedTerm:", selectedTerm)
    console.log("selectedItems:", selectedItems)

    const now = new Date()
    const fees = getRegistrationFees(selectedAcademicYear, selectedTerm)

    try {
      console.log("Starting to save invoices...")

      // Save each student's invoice to localStorage with "pending" status
      selectedStudents.forEach((student) => {
        console.log("Processing student:", student.name)
      const invoiceStudent = student as InvoiceStudent
      const subtotal = getTotalAmount()
      const discountCalc = calculateStudentDiscounts(invoiceStudent, subtotal, invoiceType)
      // Use existing invoice number if editing, otherwise create draft number
      const invoiceNumber = isEditMode && editInvoice?.invoiceNumber
        ? editInvoice.invoiceNumber
        : `DRAFT-${Date.now()}-${student.id.slice(-4)}`

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
      const subtotalBeforeIdCharges = subtotal - discountCalc.totalDiscountAmount + registrationFeesTotal - securityDepositWaiverAmount
      const idCharges = Math.round(subtotalBeforeIdCharges * 0.03)

      // Add line numbers and itemCode to items
      const itemsWithLineNumbers = selectedItems.map((item, index) => ({
        ...item,
        lineNumber: index + 1,
        itemCode: item.itemCode || getAccountCode(item)
      }))

      // Get first item's account code for invoice-level accountCode
      const invoiceAccountCode = selectedItems.length > 0 ? getAccountCode(selectedItems[0]) : '2130001'

      const savedInvoice: SavedInvoice = {
        id: isEditMode && editInvoice?.id ? editInvoice.id : `inv-${student.id}-${Date.now()}`,
        invoiceNumber: invoiceNumber,
        studentName: student.name || '',
        studentId: student.id || '',
        studentGrade: student.grade || selectedGrade || '',
        studentRoom: student.room || '',
        parentName: student.parentName || '',
        parentEmail: student.email || '',
        items: itemsWithLineNumbers,
        subtotal: subtotal,
        discounts: discountCalc.discountItems,
        totalDiscount: discountCalc.totalDiscountAmount,
        netAmount: discountCalc.netAmount,
        dueDate: paymentDeadline ? format(paymentDeadline, 'yyyy-MM-dd') : "",
        issueDate: isEditMode && editInvoice?.issueDate ? editInvoice.issueDate : now.toISOString().split('T')[0],
        status: "pending_approval", // Pending approval status
        approvalStatus: editInvoice?.approvalStatus || "wait",
        term: `${selectedAcademicYear || ''} - ${selectedTerm || ''}`,
        paymentType: "termly",
        createdAt: now.toISOString(),
        invoiceType: invoiceType, // Use the actual invoice type (student/afterschool/event/summer/eca)
        category: category, // Category for filtering by menu type
        // Event/Trip/Activity name for afterschool/event/summer/eca/exam invoices
        eventName: (invoiceType === "exam" ? examName : invoiceType === "eca" ? examName : tripName) || undefined,
        // New student data
        isNewStudent: invoiceStudent.isNewStudent,
        registrationFees: registrationFeesList.length > 0 ? registrationFeesList : undefined,
        securityDepositWaiver: securityDepositWaiverAmount > 0 ? securityDepositWaiverAmount : undefined,
        // ID Charges
        idCharges: idCharges,
        // Excel export fields
        familyCode: invoiceStudent.originalStudent?.familyCode || '',
        adultIdNo: invoiceStudent.originalStudent?.parents?.find(p => p.isPrimary)?.nationalId || invoiceStudent.originalStudent?.familyCode || '',
        accountCode: invoiceAccountCode,
        documentType: 'SI', // Sales Invoice
        academicYear: formatAcademicYearForExcel(selectedAcademicYear || effectiveAcademicYear),
        termName: selectedTerm || effectiveTerm
      }

      console.log("Saving invoice to storage:", savedInvoice)
        saveInvoiceToStorage(savedInvoice, invoiceType)
        console.log("Invoice saved successfully for student:", student.name)
      })

      console.log("All invoices saved successfully")
      toast.success(isEditMode
        ? `Invoice ${editInvoice?.invoiceNumber} updated successfully`
        : `Submitted ${selectedStudents.length} invoice(s) for approval`)
      logActivity({
        action: isEditMode
          ? `Updated invoice ${editInvoice?.invoiceNumber || ""}`
          : "Created invoices",
        module: "Invoices",
        detail: isEditMode
          ? `Updated invoice ${editInvoice?.invoiceNumber || "-"}`
          : `Submitted ${selectedStudents.length} invoice(s) for approval`
      })
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
      setPaymentDeadline(undefined)
      setIsPreviewMode(false)

      console.log("=== Draft saved successfully ===")
    } catch (error) {
      console.error("=== Error saving draft ===")
      console.error("Error details:", error)
      console.error("Error message:", error instanceof Error ? error.message : String(error))
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")
      toast.error(`Failed to save draft: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const getTotalAmount = () => {
    return selectedItems.reduce((sum, item) => sum + item.amount, 0)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold">
          {isEditMode ? `Edit Invoice - ${displayInvoiceNumber(editInvoice?.invoiceNumber)}` : getPageTitle(invoiceType, t)}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CardIcon className="w-5 h-5" />
            {getCardTitle(invoiceType, t)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Step 1: Select Academic Year - Hide for simplified views */}
            {!isSimplifiedView && (
            <div className="space-y-3">
              <h3 className="font-medium">1. {t("invoiceCreate.selectAcademicYear")}</h3>
              <Select value={selectedAcademicYear} onValueChange={(value) => {
                setSelectedAcademicYear(value)
                setSelectedGrade("") // Reset grade when year changes
                setSelectedTerm("") // Reset term
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
            )}

            {/* Step 2: Select Term (for Trip & Activity, Summer, and School Bus) or Grade (for others) */}
            {!isSimplifiedView && selectedAcademicYear && (
              (invoiceType === "afterschool" || invoiceType === "summer" || invoiceType === "trip" || invoiceType === "bus") ? (
                // Step 2 for Trip & Activity, Summer, and School Bus: Select Term first
                <div className="space-y-3">
                  <h3 className="font-medium">2. {t("invoiceCreate.selectTerm")}</h3>
                  <Select value={selectedTerm} onValueChange={handleTermChange}>
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
              ) : (
                // Step 2 for others: Select Grade
                <div className="space-y-3">
                  <h3 className="font-medium">2. {t("invoiceCreate.selectGrade")}</h3>
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
              )
            )}

            {/* Step 3: Select Grade (for Trip & Activity/School Bus) or Term (for others) */}
            {!isSimplifiedView && selectedAcademicYear && (
              (invoiceType === "afterschool" || invoiceType === "trip" || invoiceType === "bus") ? (
                // Step 3 for Trip & Activity and School Bus: Multi-select Grades
                selectedTerm && (
                  <div className="space-y-3">
                    <h3 className="font-medium">
                      3. {t("invoiceCreate.selectGrade")} (Multiple selection allowed)
                    </h3>
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {grades.map(grade => (
                          <label
                            key={grade}
                            className={`flex items-center gap-2 p-3 rounded-md cursor-pointer transition-all ${
                              selectedGrades.includes(grade)
                                ? "bg-primary/10 border-2 border-primary"
                                : "bg-background border-2 border-muted hover:border-primary/50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedGrades.includes(grade)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedGrades([...selectedGrades, grade])
                                } else {
                                  setSelectedGrades(selectedGrades.filter(g => g !== grade))
                                }
                                // Reset downstream selections
                                setSelectedRoom("")
                                setSelectedStudents([])
                                setSelectedItems([])
                              }}
                              className="w-4 h-4"
                            />
                            <span className="text-sm font-medium">{grade}</span>
                          </label>
                        ))}
                      </div>
                      {selectedGrades.length > 0 && (
                        <p className="text-sm text-green-600 mt-3">
                          Selected {selectedGrades.length} year group(s): {selectedGrades.join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                )
              ) : invoiceType === "summer" ? (
                // Step 3 for School Bus: Single-select Grade
                selectedTerm && (
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
                )
              ) : (
                // Step 3 for others (Tuition, ECA): Select Term
                selectedGrade && (
                  <div className="space-y-3">
                    <h3 className="font-medium">3. {t("invoiceCreate.selectTerm")}</h3>
                    <Select value={selectedTerm} onValueChange={handleTermChange}>
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
                )
              )
            )}

            {/* Step 4: Select Room - Skip for Trip & Activity and School Bus */}
            {!isSimplifiedView && invoiceType !== "afterschool" && invoiceType !== "summer" && selectedAcademicYear && selectedGrade && selectedTerm && (
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

            {/* Step 1 for simplified views: Menu-specific information */}
            {isSimplifiedView && (
              <div className="space-y-5">
                <div className="flex items-center gap-3 pb-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
                    1
                  </div>
                  <h3 className="font-semibold text-base">
                    {invoiceType === "afterschool" && "Trip & Activity Information"}
                    {invoiceType === "exam" && "Exam Information"}
                    {invoiceType === "bus" && "School Bus Information"}
                    {invoiceType === "eca" && "ECA Information"}
                  </h3>
                </div>

                {/* Trip & Activity Fields */}
                {invoiceType === "afterschool" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Trip / Activity Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder={t('invoiceCreation.placeholderActivityName')}
                        value={tripName}
                        onChange={(e) => setTripName(e.target.value)}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        {t('invoiceCreation.date')} <span className="text-red-500">*</span>
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full h-10 justify-start font-normal">
                            <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                            {tripDate ? format(tripDate, "dd/MM/yyyy") : t('invoiceCreation.selectDate')}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={tripDate}
                            onSelect={setTripDate}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t('invoiceCreation.location')}</Label>
                      <Input
                        placeholder={t('invoiceCreation.placeholderLocation')}
                        value={tripLocation}
                        onChange={(e) => setTripLocation(e.target.value)}
                        className="h-10"
                      />
                    </div>
                  </div>
                )}

                {/* Exam Fields */}
                {invoiceType === "exam" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Exam Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder={t('invoiceCreation.placeholderExamName')}
                        value={examName}
                        onChange={(e) => setExamName(e.target.value)}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        {t('invoiceCreation.examDate')} <span className="text-red-500">*</span>
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full h-10 justify-start font-normal">
                            <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                            {examDate ? format(examDate, "dd/MM/yyyy") : t('invoiceCreation.selectDate')}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={examDate}
                            onSelect={setExamDate}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t('invoiceCreation.testCenter')}</Label>
                      <Input
                        placeholder={t('invoiceCreation.placeholderSchoolName')}
                        value={testCenter}
                        onChange={(e) => setTestCenter(e.target.value)}
                        className="h-10"
                      />
                    </div>
                  </div>
                )}

                {/* ECA Fields */}
                {invoiceType === "eca" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        ECA Activity Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder="Enter ECA activity name"
                        value={examName}
                        onChange={(e) => setExamName(e.target.value)}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Term <span className="text-red-500">*</span>
                      </Label>
                      <Select value={examType} onValueChange={setExamType}>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select term" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Term 1">Term 1</SelectItem>
                          <SelectItem value="Term 2">Term 2</SelectItem>
                          <SelectItem value="Term 3">Term 3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Academic Year <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder="e.g., 2024-2025"
                        value={tripLocation}
                        onChange={(e) => setTripLocation(e.target.value)}
                        className="h-10"
                      />
                    </div>
                  </div>
                )}

                {/* School Bus Fields */}
                {invoiceType === "bus" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Route / Zone <span className="text-red-500">*</span>
                      </Label>
                      <Select value={busRoute} onValueChange={setBusRoute}>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select route" />
                        </SelectTrigger>
                        <SelectContent>
                          {busRoutes.map(route => (
                            <SelectItem key={route} value={route}>{route}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Service Type <span className="text-red-500">*</span>
                      </Label>
                      <Select value={busServiceType} onValueChange={setBusServiceType}>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select service type" />
                        </SelectTrigger>
                        <SelectContent>
                          {busServiceTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4 (or Step 2 for simplified views): Select Items */}
            {(isSimplifiedView || (selectedAcademicYear && selectedTerm && ((invoiceType === "afterschool" || invoiceType === "trip" || invoiceType === "bus") ? selectedGrades.length > 0 : invoiceType === "summer" ? selectedGrade : selectedGrade))) && (
              <div className="space-y-4">
                <h3 className="font-medium">{isSimplifiedView ? "2" : ((invoiceType === "afterschool" || invoiceType === "summer" || invoiceType === "trip" || invoiceType === "bus") ? "4" : "5")}. {t("invoiceCreate.selectItems")}</h3>

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

                {/* Available Items */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-medium">
                      {isSimplifiedView
                        ? t('invoiceCreation.availableItems')
                        : t('invoiceCreation.availableItemsForGrade', { category: selectedCategory, grade: selectedGrade })}
                    </label>
                    <span className="text-sm text-muted-foreground">{t('invoiceCreation.itemsAvailableCount', { count: availableItems.length })}</span>
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
                            <TableHead>{t("table.item")}</TableHead>
                            <TableHead>{t("table.category")}</TableHead>
                            <TableHead>{t("table.amount")}</TableHead>
                            <TableHead>{t("table.actions")}</TableHead>
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
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditItem(item)}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleItemRemove(item.id)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
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
                    <p className="text-muted-foreground">
                      {isSimplifiedView
                        ? "No items available"
                        : invoiceType === "afterschool"
                          ? "No trip & activity items available"
                          : invoiceType === "summer"
                            ? "No school bus items available"
                            : invoiceType === "eca"
                              ? "No ECA items available"
                              : `No ${selectedCategory.toLowerCase()} items available for ${selectedGrade}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isSimplifiedView || invoiceType === "afterschool" || invoiceType === "summer" || invoiceType === "eca"
                        ? "Contact admin to add items"
                        : "Try selecting a different category or contact admin to add items"}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 5 (or Step 3 for simplified views): Set Payment Deadline */}
            {selectedItems.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium">{isSimplifiedView ? "3" : ((invoiceType === "afterschool" || invoiceType === "summer" || invoiceType === "trip" || invoiceType === "bus") ? "5" : "6")}. Set Payment Deadline</h3>
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

            {/* Step 6 (or Step 4 for simplified views): Select Students/Payer */}
            {selectedItems.length > 0 && paymentDeadline && (
              <div className="space-y-4">
                <h3 className="font-medium">{isSimplifiedView ? "4" : ((invoiceType === "afterschool" || invoiceType === "summer" || invoiceType === "trip" || invoiceType === "bus") ? "6" : "7")}. {isSimplifiedView ? "Select Payer" : "Select Students"}</h3>

                {/* Payer Selection Type for Simplified Views */}
                {isSimplifiedView && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <Card
                      className={`cursor-pointer transition-all ${payerSelectionType === "fromSystem" ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"}`}
                      onClick={() => {
                        setPayerSelectionType("fromSystem")
                        setStudentSelectionType("individual")
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${payerSelectionType === "fromSystem" ? "bg-primary/10" : "bg-muted"}`}>
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-sm">Select from System</h4>
                            <p className="text-xs text-muted-foreground">
                              Choose existing student in the system
                            </p>
                          </div>
                          {payerSelectionType === "fromSystem" && (
                            <CheckCircle className="w-5 h-5 text-primary ml-auto" />
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card
                      className={`cursor-pointer transition-all ${payerSelectionType === "manual" ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"}`}
                      onClick={() => {
                        setPayerSelectionType("manual")
                        setSelectedStudents([])
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${payerSelectionType === "manual" ? "bg-primary/10" : "bg-muted"}`}>
                            <Pencil className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-sm">Enter Manually</h4>
                            <p className="text-xs text-muted-foreground">
                              Fill in client information
                            </p>
                          </div>
                          {payerSelectionType === "manual" && (
                            <CheckCircle className="w-5 h-5 text-primary ml-auto" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Manual Entry Form for Simplified Views */}
                {isSimplifiedView && payerSelectionType === "manual" && (
                  <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-primary" />
                      <h4 className="font-medium text-sm">{t('invoiceCreation.clientInformation')}</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">{t('invoiceCreation.clientName')} <span className="text-red-500">*</span></Label>
                        <Input
                          placeholder={t('invoiceCreation.placeholderParentName')}
                          value={manualClientName}
                          onChange={(e) => setManualClientName(e.target.value)}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">{t('invoiceCreation.contactName')}</Label>
                        <Input
                          placeholder={t('invoiceCreation.placeholderContactPerson')}
                          value={manualContactName}
                          onChange={(e) => setManualClientName(e.target.value)}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">{t('common.email')} <span className="text-red-500">*</span></Label>
                        <Input
                          type="email"
                          placeholder={t('invoiceCreation.placeholderEmail')}
                          value={manualClientEmail}
                          onChange={(e) => setManualClientEmail(e.target.value)}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">{t('common.phone')}</Label>
                        <Input
                          placeholder={t('invoiceCreation.placeholderPhone')}
                          value={manualClientPhone}
                          onChange={(e) => setManualClientPhone(e.target.value)}
                          className="h-10"
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label className="text-sm">{t('common.address')}</Label>
                        <Input
                          placeholder={t('invoiceCreation.placeholderAddress')}
                          value={manualClientAddress}
                          onChange={(e) => setManualClientAddress(e.target.value)}
                          className="h-10"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Selection Type for Standard Views OR when "fromSystem" is selected in Simplified View */}
                {(!isSimplifiedView || payerSelectionType === "fromSystem") && (
                  <>
                    {/* Standard Selection Type Cards - Only show for non-simplified views */}
                    {!isSimplifiedView && (
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
                    )}

                {/* Individual Selection */}
                {studentSelectionType === "individual" && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          placeholder={t('invoiceCreation.placeholderSearchStudent')}
                          value={searchStudentTerm}
                          onChange={(e) => setSearchStudentTerm(e.target.value)}
                          onFocus={() => setIsStudentSearchFocused(true)}
                          onBlur={() => setTimeout(() => setIsStudentSearchFocused(false), 200)}
                        />
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleSyncStudentList}
                        disabled={isSyncing}
                        className="bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                        {t('invoiceCreation.syncStudentList')}
                      </Button>
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
                            {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}{!isSimplifiedView && selectedGrade ? ` in ${selectedGrade}${selectedRoom ? ` - ${selectedRoom}` : ''}` : ''}
                          </p>
                        </div>
                        {filteredStudents.length > 0 ? (
                          filteredStudents.map((student) => {
                            const invoiceStudent = student as InvoiceStudent
                            const studentHasDiscounts = !isSimplifiedView && hasDiscounts(invoiceStudent)
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
                        Select all students
                        {!isSimplifiedView && (invoiceType === "afterschool" || invoiceType === "trip" || invoiceType === "bus") && selectedGrades.length > 0 && ` in ${selectedGrades.join(", ")}`}
                        {!isSimplifiedView && invoiceType === "summer" && selectedGrade && ` in ${selectedGrade}`}
                        {!isSimplifiedView && invoiceType !== "afterschool" && invoiceType !== "trip" && invoiceType !== "bus" && invoiceType !== "summer" && selectedGrade && ` in ${selectedGrade}${selectedRoom ? ` - ${selectedRoom}` : ''}`}
                      </p>
                      <p className="text-sm text-blue-600 mb-3">
                        {isSimplifiedView
                          ? availableStudents.length
                          : (invoiceType === "afterschool" || invoiceType === "trip" || invoiceType === "bus")
                            ? availableStudents.filter(s => selectedGrades.includes(s.grade)).length
                            : invoiceType === "summer"
                              ? availableStudents.filter(s => s.grade === selectedGrade).length
                              : availableStudents.filter(s =>
                                  s.grade === selectedGrade &&
                                  (selectedRoom === "" || s.room === selectedRoom)
                                ).length
                        } students will be selected
                      </p>
                      <Button onClick={handleSelectAllStudents} size="sm">
                        Select All Students
                      </Button>
                    </div>
                  </div>
                )}
                  </>
                )}

                {/* Selected Students Display */}
                {selectedStudents.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <label className="font-medium">Selected Students ({selectedStudents.length})</label>
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
                      </div>
                      <p className="text-sm text-amber-700 mb-3">
                        The following fees will be automatically applied:
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
                          <span>Registration Fees Total:</span>
                          <span>฿{totalFees.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Late Payment Charges Info */}
                <p className="mt-4 text-xs text-gray-400">
                  Late payment charges of 1.5% per month or part thereof will be applied to payments made after the invoice due date.
                </p>
              </div>
            )}

            {/* Step 8 (or Step 5 for simplified views): Preview and Create Invoice */}
            {((selectedStudents.length > 0 || (isSimplifiedView && payerSelectionType === "manual" && manualClientName && manualClientEmail)) && selectedItems.length > 0 && paymentDeadline) && (
              <div className="space-y-4">
                <h3 className="font-medium">{isSimplifiedView ? "5" : "8"}. {isPreviewMode ? "Confirm" : "Preview Invoice"}</h3>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Invoice Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      {!isSimplifiedView && (
                        <>
                          <p className="text-blue-700">Academic Year: <span className="font-medium">{selectedAcademicYear}</span></p>
                          <p className="text-blue-700">Term: <span className="font-medium">{selectedTerm}</span></p>
                          <p className="text-blue-700">Grade: <span className="font-medium">{selectedGrade}</span></p>
                          {selectedRoom && (
                            <p className="text-blue-700">Room: <span className="font-medium">{selectedRoom}</span></p>
                          )}
                        </>
                      )}
                      {isSimplifiedView && payerSelectionType === "manual" ? (
                        <>
                          <p className="text-blue-700">Client: <span className="font-medium">{manualClientName}</span></p>
                          <p className="text-blue-700">Email: <span className="font-medium">{manualClientEmail}</span></p>
                          {manualClientPhone && (
                            <p className="text-blue-700">Phone: <span className="font-medium">{manualClientPhone}</span></p>
                          )}
                        </>
                      ) : (
                        <p className="text-blue-700">Students: <span className="font-medium">{selectedStudents.length}</span></p>
                      )}
                    </div>
                    <div>
                      <p className="text-blue-700">Items: <span className="font-medium">{selectedItems.length}</span></p>
                      <p className="text-blue-700">Amount: <span className="font-medium">฿{getTotalAmount().toLocaleString()}</span></p>
                      {selectedStudents.length > 1 && (
                        <p className="text-blue-700">Total Amount: <span className="font-medium">฿{(getTotalAmount() * selectedStudents.length).toLocaleString()}</span></p>
                      )}
                      <p className="text-blue-700">Payment Deadline: <span className="font-medium">{paymentDeadline ? format(paymentDeadline, "dd/MM/yyyy") : "-"}</span></p>
                      {selectedStudents.length > 0 && (
                        <p className="text-blue-700">Invoices to Create: <span className="font-medium">{selectedStudents.length}</span></p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 justify-end">
                  {!isPreviewMode ? (
                    <>
                      <Button
                        onClick={handlePreviewInvoice}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Preview
                      </Button>
                      {isEditMode ? (
                        <Button
                          onClick={handleSaveAsDraft}
                          size="sm"
                          className="flex items-center gap-1.5"
                        >
                          <Save className="w-3.5 h-3.5" />
                          Save
                        </Button>
                      ) : (
                        <Button
                          onClick={handleSaveAsDraft}
                          size="sm"
                          className="flex items-center gap-1.5"
                        >
                          <Save className="w-3.5 h-3.5" />
                          Draft
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => setIsPreviewMode(false)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1.5"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </Button>
                      <Button
                        onClick={handleSaveAsDraft}
                        size="sm"
                        className="flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {isEditMode ? "Save" : "Draft"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
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
              <h4 className="font-medium text-sm text-gray-700">{t('invoiceCreation.studentInformation')}</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>{t('common.firstName')} <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder={t('common.firstName')}
                    value={newStudentFirstName}
                    onChange={(e) => setNewStudentFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('common.lastName')} <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder={t('common.lastName')}
                    value={newStudentLastName}
                    onChange={(e) => setNewStudentLastName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('common.nickname')}</Label>
                  <Input
                    placeholder={t('common.nickname')}
                    value={newStudentNickname}
                    onChange={(e) => setNewStudentNickname(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>{t('common.gender')}</Label>
                  <Select value={newStudentGender} onValueChange={(v: "male" | "female" | "other") => setNewStudentGender(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t('common.male')}</SelectItem>
                      <SelectItem value="female">{t('common.female')}</SelectItem>
                      <SelectItem value="other">{t('common.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('common.dateOfBirth')}</Label>
                  <Input
                    type="date"
                    value={newStudentDob}
                    onChange={(e) => setNewStudentDob(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('common.grade')}</Label>
                  <Input value={selectedGrade} disabled className="bg-muted" />
                </div>
              </div>
            </div>

            {/* Family Selection */}
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-sm text-gray-700">{t('common.family')}</h4>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="familyType"
                    checked={newStudentFamilyType === "new"}
                    onChange={() => setNewStudentFamilyType("new")}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{t('invoiceCreation.createNewFamily')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="familyType"
                    checked={newStudentFamilyType === "existing"}
                    onChange={() => setNewStudentFamilyType("existing")}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{t('invoiceCreation.joinExistingFamily')}</span>
                </label>
              </div>

              {newStudentFamilyType === "existing" ? (
                <div className="space-y-2">
                  <Label>{t('invoiceCreation.selectFamily')}</Label>
                  <Select value={newStudentFamilyId} onValueChange={setNewStudentFamilyId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('invoiceCreation.selectFamily')} />
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
                  <Label>{t('invoiceCreation.childOrderInFamily')}</Label>
                  <Select value={String(newStudentChildOrder)} onValueChange={(v) => setNewStudentChildOrder(Number(v))}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{t('invoiceCreation.firstChild')}</SelectItem>
                      <SelectItem value="2">{t('invoiceCreation.secondChild')}</SelectItem>
                      <SelectItem value="3">{t('invoiceCreation.thirdChild')}</SelectItem>
                      <SelectItem value="4">{t('invoiceCreation.fourthChild')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Parent/Guardian Information - only show for new family */}
            {newStudentFamilyType === "new" && (
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-sm text-gray-700">{t('invoiceCreation.parentGuardianInfo')}</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t('invoiceCreation.parentGuardianName')}</Label>
                    <Input
                      placeholder={t('invoiceCreation.placeholderFullName')}
                      value={newStudentParentName}
                      onChange={(e) => setNewStudentParentName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('common.relationship')}</Label>
                    <Select value={newStudentParentRelation} onValueChange={(v: "father" | "mother" | "guardian" | "other") => setNewStudentParentRelation(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="father">{t('common.father')}</SelectItem>
                        <SelectItem value="mother">{t('common.mother')}</SelectItem>
                        <SelectItem value="guardian">{t('common.guardian')}</SelectItem>
                        <SelectItem value="other">{t('common.other')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t('common.email')} <span className="text-red-500">*</span></Label>
                    <Input
                      type="email"
                      placeholder={t('invoiceCreation.placeholderParentEmail')}
                      value={newStudentEmail}
                      onChange={(e) => setNewStudentEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('common.phone')}</Label>
                    <Input
                      placeholder={t('invoiceCreation.placeholderPhoneNumber')}
                      value={newStudentPhone}
                      onChange={(e) => setNewStudentPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('common.address')}</Label>
                  <Input
                    placeholder={t('invoiceCreation.placeholderHomeAddress')}
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
                Create Invoices
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-[850px] w-[95vw] max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Invoice Preview</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col">
            {/* Content */}
            <div className="flex-1 p-6">
              {/* Manual Entry Preview for Simplified Views */}
              {isSimplifiedView && payerSelectionType === "manual" && manualClientName ? (
                (() => {
                  const subtotal = getTotalAmount()
                  const idCharges = Math.round(subtotal * 0.03)
                  const finalTotal = subtotal + idCharges
                  const invoiceNumber = `DRAFT-${Date.now()}-MANUAL`
                  const issueDate = new Date()
                  const dueDate = paymentDeadline || null

                  return (
                    <div className="bg-white mx-auto" style={{ fontFamily: 'Arial, sans-serif', maxWidth: '794px', fontSize: '12px' }}>
                      {/* School Header */}
                      <div className="text-center py-4 border-b border-gray-300 mb-3">
                        <img
                          src={SchoolLogo}
                          alt="King's College International School Bangkok"
                          style={{ height: '140px', margin: '0 auto 8px auto', display: 'block' }}
                        />
                        <p className="text-xs text-gray-600">
                          {SCHOOL_INFO.address}
                        </p>
                        <p className="text-xs text-gray-600">
                          {SCHOOL_INFO.phone}, {SCHOOL_INFO.email}, {SCHOOL_INFO.website}
                        </p>
                        <h1 className="text-xl font-semibold mt-3 tracking-wide">INVOICE</h1>
                      </div>

                      {/* Client & Invoice Info - Two Column Layout */}
                      <div className="px-4 py-3">
                        <div className="border border-black p-4" style={{ fontSize: '11px' }}>
                          <div className="flex justify-between">
                            {/* Left Column - Client Info */}
                            <div style={{ width: '45%' }}>
                              <div className="flex py-1">
                                <span style={{ width: '110px' }}>Client name</span>
                                <span>{manualClientName}</span>
                              </div>
                              {manualContactName && (
                                <div className="flex py-1">
                                  <span style={{ width: '110px' }}>Contact name</span>
                                  <span>{manualContactName}</span>
                                </div>
                              )}
                              <div className="flex py-1">
                                <span style={{ width: '110px' }}>Email</span>
                                <span>{manualClientEmail}</span>
                              </div>
                              {manualClientPhone && (
                                <div className="flex py-1">
                                  <span style={{ width: '110px' }}>Phone</span>
                                  <span>{manualClientPhone}</span>
                                </div>
                              )}
                              {manualClientAddress && (
                                <div className="flex py-1">
                                  <span style={{ width: '110px' }}>Address</span>
                                  <span>{manualClientAddress}</span>
                                </div>
                              )}
                              {/* Menu-specific info */}
                              {invoiceType === "afterschool" && tripName && (
                                <div className="flex py-1">
                                  <span style={{ width: '110px' }}>Trip/Activity</span>
                                  <span>{tripName}</span>
                                </div>
                              )}
                              {invoiceType === "exam" && examName && (
                                <div className="flex py-1">
                                  <span style={{ width: '110px' }}>Exam</span>
                                  <span>{examName}</span>
                                </div>
                              )}
                              {invoiceType === "eca" && examName && (
                                <div className="flex py-1">
                                  <span style={{ width: '110px' }}>ECA Activity</span>
                                  <span>{examName}</span>
                                </div>
                              )}
                              {invoiceType === "bus" && busRoute && (
                                <div className="flex py-1">
                                  <span style={{ width: '110px' }}>Bus Route</span>
                                  <span>{busRoute}</span>
                                </div>
                              )}
                            </div>
                            {/* Right Column - Invoice Info */}
                            <div style={{ width: '45%' }}>
                              <div className="flex py-1">
                                <span style={{ width: '90px' }}>Invoice no.</span>
                                <span className="flex-1 text-right">Pending Approval</span>
                              </div>
                              <div className="flex py-1">
                                <span style={{ width: '90px' }}>Invoice date</span>
                                <span className="flex-1 text-right">{issueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                              </div>
                              <div className="flex py-1">
                                <span style={{ width: '90px' }}>Due date</span>
                                <span className="flex-1 text-right">{dueDate ? dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</span>
                              </div>
                              {invoiceType === "afterschool" && tripDate && (
                                <div className="flex py-1">
                                  <span style={{ width: '90px' }}>Trip date</span>
                                  <span className="flex-1 text-right">{tripDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                </div>
                              )}
                              {invoiceType === "exam" && examDate && (
                                <div className="flex py-1">
                                  <span style={{ width: '90px' }}>Exam date</span>
                                  <span className="flex-1 text-right">{examDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                </div>
                              )}
                              {invoiceType === "eca" && examType && (
                                <div className="flex py-1">
                                  <span style={{ width: '90px' }}>Term</span>
                                  <span className="flex-1 text-right">{examType}</span>
                                </div>
                              )}
                              {invoiceType === "eca" && tripLocation && (
                                <div className="flex py-1">
                                  <span style={{ width: '90px' }}>Academic Year</span>
                                  <span className="flex-1 text-right">{tripLocation}</span>
                                </div>
                              )}
                              {invoiceType === "bus" && busServiceType && (
                                <div className="flex py-1">
                                  <span style={{ width: '90px' }}>Service type</span>
                                  <span className="flex-1 text-right">{busServiceTypes.find(t => t.value === busServiceType)?.label || busServiceType}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Invoice Items Table */}
                      <div className="px-4 py-2">
                        <table className="w-full border border-black" style={{ borderCollapse: 'collapse', fontSize: '11px' }}>
                          <thead>
                            <tr className="border-b border-black bg-gray-50">
                              <th className="py-1.5 px-2 text-left font-semibold" style={{ width: '40px' }}>No.</th>
                              <th className="py-1.5 px-2 text-left font-semibold">Description</th>
                              <th className="py-1.5 px-2 text-right font-semibold" style={{ width: '100px' }}>Amount (THB)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedItems.map((item, index) => (
                              <tr key={item.id} className="border-b border-gray-200">
                                <td className="py-1.5 px-2 align-top">{index + 1}</td>
                                <td className="py-1.5 px-2" style={{ wordBreak: 'break-word' }}>
                                  <div>{item.name}</div>
                                  {item.description && (
                                    <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                                  )}
                                </td>
                                <td className="py-1.5 px-2 text-right align-top">{formatCurrency(item.amount)}</td>
                              </tr>
                            ))}
                            {/* ID Charges (3%) - Purple */}
                            {idCharges > 0 && (
                              <tr className="border-b border-gray-200 text-purple-600">
                                <td className="py-1.5 px-2 align-top">{selectedItems.length + 1}</td>
                                <td className="py-1.5 px-2">ID Charges (3%)</td>
                                <td className="py-1.5 px-2 text-right align-top">{formatCurrency(idCharges)}</td>
                              </tr>
                            )}
                            {/* Total Row */}
                            <tr className="border-t border-black bg-gray-100">
                              <td colSpan={2} className="py-2 px-2">
                                <div className="flex justify-between items-center">
                                  <span style={{ fontSize: '10px' }}>{numberToWords(finalTotal)}</span>
                                  <span className="font-bold ml-4">TOTAL</span>
                                </div>
                              </td>
                              <td className="py-2 px-2 text-right font-bold">{formatCurrency(finalTotal)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Notes Section */}
                      <div className="px-4 py-2">
                        <p className="text-gray-400 text-xs">
                          Late payment charges of 1.5% per month or part thereof will be applied to payments made after the invoice due date.
                        </p>
                      </div>

                      {/* Payment Methods */}
                      <div className="px-4 py-2" style={{ fontSize: '11px' }}>
                        <h3 className="font-bold mb-3">Payment methods</h3>
                        <div className="space-y-3">
                          {/* Bank Transfer */}
                          <div>
                            <span>- </span>
                            <span className="font-medium">Bank Transfer:</span>
                            <span> Please transfer to the account below and email proof of payment to finance@kingsbangkok.ac.th</span>
                            <table className="mt-3 ml-8">
                              <tbody>
                                <tr>
                                  <td style={{ width: '150px', paddingTop: '4px', paddingBottom: '4px' }}>Account name</td>
                                  <td style={{ paddingTop: '4px', paddingBottom: '4px' }}>{BANK_DETAILS.accountName}</td>
                                </tr>
                                <tr>
                                  <td style={{ width: '150px', paddingTop: '4px', paddingBottom: '4px' }}>Account number</td>
                                  <td style={{ paddingTop: '4px', paddingBottom: '4px' }}>{BANK_DETAILS.accountNumber}</td>
                                </tr>
                                <tr>
                                  <td style={{ width: '150px', paddingTop: '4px', paddingBottom: '4px' }}>Bank name</td>
                                  <td style={{ paddingTop: '4px', paddingBottom: '4px' }}>{BANK_DETAILS.bankName}</td>
                                </tr>
                                <tr>
                                  <td style={{ width: '150px', paddingTop: '4px', paddingBottom: '4px' }}>Branch</td>
                                  <td style={{ paddingTop: '4px', paddingBottom: '4px' }}>{BANK_DETAILS.branch}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* Signature Section */}
                      <div className="px-4 py-4">
                        <div className="flex justify-between px-6">
                          <div className="text-center">
                            <p className="italic mb-6" style={{ fontSize: '10px' }}>Thananchaya Chalorkpunrattara</p>
                            <div className="w-40 border-t border-black mb-1"></div>
                            <p style={{ fontSize: '10px' }}>Prepared by</p>
                          </div>
                          <div className="text-center">
                            <p className="italic mb-6" style={{ fontSize: '10px' }}>Porntip Jarusintrangkul</p>
                            <div className="w-40 border-t border-black mb-1"></div>
                            <p style={{ fontSize: '10px' }}>Authorised officer</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()
              ) : selectedStudents.length > 0 && selectedStudents[previewStudentIndex] ? (
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
                  const discountCalc = calculateStudentDiscounts(currentStudent, getTotalAmount(), invoiceType) // Discounts apply only to regular items
                  const invoiceNumber = `DRAFT-${Date.now()}-${currentStudent.id.slice(-4)}`
                  const issueDate = new Date()
                  const dueDate = paymentDeadline || null

                  // Security Deposit Fee Waiver (for new students who are eligible for fee waiver)
                  const securityDepositWaiver = currentStudent.isNewStudent &&
                    currentStudent.feeWaiver?.eligible &&
                    fees.securityDeposit > 0
                    ? fees.securityDeposit
                    : 0

                  // Calculate ID Charges (3%)
                  const subtotalBeforeIdCharges = Math.max(0, discountCalc.netAmount + registrationFeesTotal - securityDepositWaiver)
                  const idCharges = Math.round(subtotalBeforeIdCharges * 0.03)

                  // Calculate final total
                  const finalTotal = subtotalBeforeIdCharges + idCharges

                  return (
                    <div className="bg-white mx-auto" style={{ fontFamily: 'Arial, sans-serif', maxWidth: '794px', fontSize: '12px' }}>
                      {/* School Header */}
                      <div className="text-center py-4 border-b border-gray-300 mb-3">
                        <img
                          src={SchoolLogo}
                          alt="King's College International School Bangkok"
                          style={{ height: '140px', margin: '0 auto 8px auto', display: 'block' }}
                        />
                        <p className="text-xs text-gray-600">
                          {SCHOOL_INFO.address}
                        </p>
                        <p className="text-xs text-gray-600">
                          {SCHOOL_INFO.phone}, {SCHOOL_INFO.email}, {SCHOOL_INFO.website}
                        </p>
                        <h1 className="text-xl font-semibold mt-3 tracking-wide">INVOICE</h1>
                      </div>

                      {/* Student & Invoice Info - Two Column Layout */}
                      <div className="px-4 py-3">
                        <div className="border border-black p-4" style={{ fontSize: '11px' }}>
                          <div className="flex justify-between">
                            {/* Left Column - Student Info */}
                            <div style={{ width: '45%' }}>
                              <div className="flex py-1">
                                <span style={{ width: '110px' }}>Student ID no.</span>
                                <span>{currentStudent.id}</span>
                              </div>
                              <div className="flex py-1">
                                <span style={{ width: '110px' }}>Student name</span>
                                <span>{currentStudent.name}</span>
                              </div>
                              <div className="flex py-1">
                                <span style={{ width: '110px' }}>Year group</span>
                                <span>{currentStudent.grade || selectedGrade || '-'}</span>
                              </div>
                              <div className="flex py-1">
                                <span style={{ width: '110px' }}>Contact name</span>
                                <span>{currentStudent.parentName}</span>
                              </div>
                              <div className="flex py-1">
                                <span style={{ width: '110px' }}>Address</span>
                                <span>{currentStudent.originalStudent?.parents?.[0]?.address || '-'}</span>
                              </div>
                            </div>
                            {/* Right Column - Invoice Info */}
                            <div style={{ width: '45%' }}>
                              <div className="flex py-1">
                                <span style={{ width: '90px' }}>Invoice no.</span>
                                <span className="flex-1 text-right">Pending Approval</span>
                              </div>
                              <div className="flex py-1">
                                <span style={{ width: '90px' }}>Invoice date</span>
                                <span className="flex-1 text-right">{issueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                              </div>
                              <div className="flex py-1">
                                <span style={{ width: '90px' }}>Due date</span>
                                <span className="flex-1 text-right">{dueDate ? dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</span>
                              </div>
                              <div className="flex py-1">
                                <span style={{ width: '90px' }}>School year</span>
                                <span className="flex-1 text-right">{selectedAcademicYear || getAcademicYear(issueDate)}</span>
                              </div>
                              <div className="flex py-1">
                                <span style={{ width: '90px' }}>Term</span>
                                <span className="flex-1 text-right">{selectedTerm || '-'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Invoice Items Table */}
                      <div className="px-4 py-2">
                        <table className="w-full border border-black" style={{ borderCollapse: 'collapse', fontSize: '11px' }}>
                          <thead>
                            <tr className="border-b border-black bg-gray-50">
                              <th className="py-1.5 px-2 text-left font-semibold" style={{ width: '40px' }}>No.</th>
                              <th className="py-1.5 px-2 text-left font-semibold">Description</th>
                              <th className="py-1.5 px-2 text-right font-semibold" style={{ width: '100px' }}>Amount (THB)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Regular Items */}
                            {selectedItems.map((item, index) => (
                              <tr key={item.id} className="border-b border-gray-200">
                                <td className="py-1.5 px-2 align-top">{index + 1}</td>
                                <td className="py-1.5 px-2" style={{ wordBreak: 'break-word' }}>
                                  <div>{item.name}</div>
                                  {item.description && (
                                    <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                                  )}
                                </td>
                                <td className="py-1.5 px-2 text-right align-top">{formatCurrency(item.amount)}</td>
                              </tr>
                            ))}
                            {/* Registration Fee Items (New Students Only) - Orange */}
                            {registrationFeeItems.map((item, idx) => (
                              <tr key={item.id} className="border-b border-gray-200 text-orange-600">
                                <td className="py-1.5 px-2 align-top">{selectedItems.length + idx + 1}</td>
                                <td className="py-1.5 px-2" style={{ wordBreak: 'break-word' }}>
                                  {item.name}
                                </td>
                                <td className="py-1.5 px-2 text-right align-top">{formatCurrency(item.amount)}</td>
                              </tr>
                            ))}
                            {/* Security Deposit Waiver (for new students with fee waiver) - Purple - After Registration Fees */}
                            {securityDepositWaiver > 0 && (
                              <tr className="border-b border-gray-200 text-purple-700">
                                <td className="py-1.5 px-2 align-top">{selectedItems.length + registrationFeeItems.length + 1}</td>
                                <td className="py-1.5 px-2">Security Deposit Waiver</td>
                                <td className="py-1.5 px-2 text-right align-top">-{formatCurrency(securityDepositWaiver)}</td>
                              </tr>
                            )}
                            {/* Discount Items - Green (Sibling, Registration Fee Waiver, Group, Scholarship, Staff Child, Early Bird) */}
                            {discountCalc.discountItems.map((discount, idx) => (
                              <tr key={`discount-${idx}`} className="border-b border-gray-200 text-green-700">
                                <td className="py-1.5 px-2 align-top">{selectedItems.length + registrationFeeItems.length + (securityDepositWaiver > 0 ? 1 : 0) + idx + 1}</td>
                                <td className="py-1.5 px-2" style={{ wordBreak: 'break-word' }}>
                                  {discount.name} {discount.percentage ? `(${discount.percentage}%)` : ''}
                                </td>
                                <td className="py-1.5 px-2 text-right align-top">-{formatCurrency(discount.amount)}</td>
                              </tr>
                            ))}
                            {/* ID Charges (3%) - Purple */}
                            {idCharges > 0 && (
                              <tr className="border-b border-gray-200 text-purple-600">
                                <td className="py-1.5 px-2 align-top">{selectedItems.length + registrationFeeItems.length + (securityDepositWaiver > 0 ? 1 : 0) + discountCalc.discountItems.length + 1}</td>
                                <td className="py-1.5 px-2">ID Charges (3%)</td>
                                <td className="py-1.5 px-2 text-right align-top">{formatCurrency(idCharges)}</td>
                              </tr>
                            )}
                            {/* Total Row */}
                            <tr className="border-t border-black bg-gray-100">
                              <td colSpan={2} className="py-2 px-2">
                                <div className="flex justify-between items-center">
                                  <span style={{ fontSize: '10px' }}>{numberToWords(finalTotal)}</span>
                                  <span className="font-bold ml-4">TOTAL</span>
                                </div>
                              </td>
                              <td className="py-2 px-2 text-right font-bold">{formatCurrency(finalTotal)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Notes Section */}
                      <div className="px-4 py-2">
                        <p className="text-gray-400 text-xs">
                          Late payment charges of 1.5% per month or part thereof will be applied to payments made after the invoice due date.
                        </p>
                      </div>

                      {/* Payment Methods */}
                      <div className="px-4 py-2" style={{ fontSize: '11px' }}>
                        <h3 className="font-bold mb-3">Payment methods</h3>
                        <div className="space-y-3">
                          {/* Cheque */}
                          <div>
                            <span>- </span>
                            <span className="font-medium">Cheque:</span>
                            <span> Cheques must be made payable to King's College International School Bangkok and marked A/C Payee Only. Please deliver cheques to the Finance & Accounting Department.</span>
                          </div>

                          {/* Bank Transfer */}
                          <div>
                            <span>- </span>
                            <span className="font-medium">Bank Transfer:</span>
                            <span> Further bank details are provided below. Kindly email your child's name, ID number, and invoice number to finance@kingsbangkok.ac.th with proof of payment attached upon completion of the transfer process. Please ensure that your payment covers all bank charges.</span>
                            <table className="mt-3 ml-8">
                              <tbody>
                                <tr>
                                  <td style={{ width: '150px', paddingTop: '4px', paddingBottom: '4px' }}>Account name</td>
                                  <td style={{ paddingTop: '4px', paddingBottom: '4px' }}>{BANK_DETAILS.accountName}</td>
                                </tr>
                                <tr>
                                  <td style={{ width: '150px', paddingTop: '4px', paddingBottom: '4px' }}>Account number</td>
                                  <td style={{ paddingTop: '4px', paddingBottom: '4px' }}>{BANK_DETAILS.accountNumber}</td>
                                </tr>
                                <tr>
                                  <td style={{ width: '150px', paddingTop: '4px', paddingBottom: '4px' }}>Bank name</td>
                                  <td style={{ paddingTop: '4px', paddingBottom: '4px' }}>{BANK_DETAILS.bankName}</td>
                                </tr>
                                <tr>
                                  <td style={{ width: '150px', paddingTop: '4px', paddingBottom: '4px' }}>Branch</td>
                                  <td style={{ paddingTop: '4px', paddingBottom: '4px' }}>{BANK_DETAILS.branch}</td>
                                </tr>
                                <tr>
                                  <td style={{ width: '150px', paddingTop: '4px', paddingBottom: '4px' }}>Swift code</td>
                                  <td style={{ paddingTop: '4px', paddingBottom: '4px' }}>{BANK_DETAILS.swiftCode}</td>
                                </tr>
                                <tr>
                                  <td style={{ width: '150px', paddingTop: '4px', paddingBottom: '4px' }}>Bank address</td>
                                  <td style={{ paddingTop: '4px', paddingBottom: '4px' }}>{BANK_DETAILS.bankAddress}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Bill Payment */}
                          <div>
                            <span>- </span>
                            <span className="font-medium">Bill Payment via Mobile Banking, Internet Banking, ATM or Bank Counter:</span>
                            <span> Please use the QR code provided below to scan for payment. Kindly note that bank charges will apply to payments made via ATM or at the bank counter.</span>
                            <div className="mt-3 ml-8 flex items-start gap-8">
                              <table>
                                <tbody>
                                  <tr>
                                    <td style={{ width: '150px', paddingTop: '4px', paddingBottom: '4px' }}>Biller ID no.</td>
                                    <td style={{ paddingTop: '4px', paddingBottom: '4px' }}>{BILL_PAYMENT.billerId}</td>
                                  </tr>
                                  <tr>
                                    <td style={{ width: '150px', paddingTop: '4px', paddingBottom: '4px' }}>Reference no. (Ref 1)</td>
                                    <td style={{ paddingTop: '4px', paddingBottom: '4px' }}>{currentStudent.id}</td>
                                  </tr>
                                  <tr>
                                    <td style={{ width: '150px', paddingTop: '4px', paddingBottom: '4px' }}>Reference no. (Ref 2)</td>
                                    <td style={{ paddingTop: '4px', paddingBottom: '4px' }}>-</td>
                                  </tr>
                                </tbody>
                              </table>
                              {/* QR Code placeholder */}
                              <div className="border border-black" style={{ width: '70px', height: '70px' }}>
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                                  QR
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Credit Card */}
                          <div>
                            <span>- </span>
                            <span className="font-medium">Credit card:</span>
                            <span> The online payment link will be provided on the parent portal. Visa & Mastercard issued by local banks in Thailand are accepted. Kindly note that a 1.3% bank fee will be applied to individual online payment transaction.</span>
                          </div>
                        </div>
                      </div>

                      {/* Signature Section */}
                      <div className="px-4 py-4">
                        <div className="flex justify-between px-6">
                          <div className="text-center">
                            <p className="italic mb-6" style={{ fontSize: '10px' }}>Thananchaya Chalorkpunrattara</p>
                            <div className="w-40 border-t border-black mb-1"></div>
                            <p style={{ fontSize: '10px' }}>Prepared by</p>
                          </div>
                          <div className="text-center">
                            <p className="italic mb-6" style={{ fontSize: '10px' }}>Porntip Jarusintrangkul</p>
                            <div className="w-40 border-t border-black mb-1"></div>
                            <p style={{ fontSize: '10px' }}>Authorised officer</p>
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

            {/* Action Buttons */}
            <div className="flex items-center justify-between px-8 py-4 border-t bg-gray-50">
              {/* Navigation for multiple students */}
              {selectedStudents.length > 1 ? (
                <div className="flex items-center gap-2 text-sm">
                  <Button
                    variant="outline"
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
                    onClick={() => setPreviewStudentIndex(Math.min(selectedStudents.length - 1, previewStudentIndex + 1))}
                    disabled={previewStudentIndex === selectedStudents.length - 1}
                  >
                    Next
                  </Button>
                </div>
              ) : <div />}
              <div className="flex gap-3">
                <Button
                  onClick={() => setIsPreviewDialogOpen(false)}
                >
                  OK
                </Button>
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
                placeholder={t('common.search')}
                value={addItemSearchTerm}
                onChange={(e) => setAddItemSearchTerm(e.target.value)}
                className=""
              />
            </div>
            {/* Only show category filter for non-tuition invoice types */}
            {invoiceType !== "student" && invoiceType !== "tuition" && invoiceType && (
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
            )}
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

      {/* Edit Item Dialog */}
      <Dialog open={isEditItemDialogOpen} onOpenChange={setIsEditItemDialogOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>
              Edit the description and amount for this item
            </DialogDescription>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-4 py-4">
              {/* Item Name (Read-only) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('invoiceCreation.itemName')}</Label>
                <div className="p-3 bg-muted rounded-md">
                  <p className="font-medium">{editingItem.name}</p>
                  <Badge
                    variant="outline"
                    className={`mt-1 text-xs ${
                      editingItem.category === "Tuition" ? "border-blue-300 text-blue-700" :
                      editingItem.category === "ECA" ? "border-green-300 text-green-700" :
                      "border-orange-300 text-orange-700"
                    }`}
                  >
                    {editingItem.category}
                  </Badge>
                </div>
              </div>

              {/* Description (Editable) */}
              <div className="space-y-2">
                <Label htmlFor="edit-description">{t('common.description')}</Label>
                <Textarea
                  id="edit-description"
                  value={editItemDescription}
                  onChange={(e) => setEditItemDescription(e.target.value)}
                  placeholder={t('invoiceCreation.placeholderDescription')}
                  rows={3}
                />
              </div>

              {/* Amount (Editable) */}
              <div className="space-y-2">
                <Label htmlFor="edit-amount">{t('invoiceCreation.amountTHB')}</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  value={editItemAmount}
                  onChange={(e) => setEditItemAmount(Number(e.target.value))}
                  min={0}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditItemDialogOpen(false)
                setEditingItem(null)
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEditItem}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
