import { useState, useEffect, useRef } from "react"
import * as XLSX from "xlsx"
import { downloadAsXlsx, normalizeAcademicYear, formatAcademicYear } from "@/utils/xlsxUtils"
import { PAYMENT_SOURCES } from "@/constants/paymentConstants"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs"
import { CalendarIcon, Download, Filter, Eye, Mail, ArrowUpDown, Plus, FileDown, X, CheckSquare, Search, Upload, Printer, FileText, ChevronDown } from "lucide-react"
import { cn } from "./ui/utils"
import { PaginationBar } from "@/components/ui/pagination-bar"
import { Checkbox } from "./ui/checkbox"
import { format } from "date-fns"
import { toast } from "@/components/ui/sonner"
import { useAcademicYears } from "../contexts/AcademicYearContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { ReceiptManagementFlow } from "./ReceiptManagementFlow"
import { SCHOOL_INFO, numberToWords } from "@/lib/invoiceUtils"
import SchoolLogo from "@/assets/Logo.png"
import { useAuth } from "@/contexts/AuthContext"
import { canPerformActions } from "@/utils/rolePermissions"
import { usePersistedState } from "@/hooks/usePersistedState"
import { ColumnPresets } from "@/utils/tableAlignment"
import { EditTemplateDialog } from "./InvoiceReceiptTemplate"
import { migrateTemplates, saveTemplates, type EmailTemplate } from "@/utils/emailTemplateUtils"
import { logActivity } from "@/lib/activityLog"
import { useStudents } from "@/contexts/StudentContext"

// Student data matching StudentContext
const studentData = [
  { id: "KC2024001", name: "James Smith", grade: "Year 4" },
  { id: "KC2024002", name: "Emily Smith", grade: "Reception" },
  { id: "KC2024003", name: "Michael Johnson", grade: "Year 7" },
  { id: "KC2024004", name: "Sophia Williams", grade: "Year 9" },
  { id: "KC2024005", name: "Oliver Williams", grade: "Year 6" },
  { id: "KC2024006", name: "Charlotte Williams", grade: "Year 3" },
  { id: "KC2024007", name: "Lucas Brown", grade: "Year 1" },
  { id: "KC2024008", name: "Mia Brown", grade: "Year 2" },
  { id: "KC2024009", name: "Ethan Davis", grade: "Year 2" },
  { id: "KC2024010", name: "Ava Miller", grade: "Year 1" },
]

interface Receipt {
  id: string
  receiptNumber: string
  invoiceNumber: string
  studentName: string
  studentId: string
  studentGrade: string
  contactName: string
  address: string
  invoiceDate: Date
  invoiceAmount: number
  amount: number // received amount
  appliedCNAmount?: number
  appliedCNNumbers?: string[]
  outstandingAmount: number
  paymentMethod: string
  paymentChannel: "credit_card" | "wechat_pay" | "alipay" | "qr_payment" | "counter_bank"
  transactionDate: Date
  academicYear: string
  term: string
  downloadCount: number
  bankName?: string
  bankBranch?: string
  chequeNo?: string
  chequeDate?: Date
  collectorName?: string
  familyCode?: string
  status: "issued" | "cancelled"
}

interface CreditNote {
  id: string
  creditNoteNumber: string
  invoiceNumber: string
  studentName: string
  studentId: string
  studentGrade: string
  amount: number
  amountIncludingVat?: number
  remainingAmount?: number
  remainingBalance?: number
  description?: string
  reason: string
  issueDate: Date
  dueDate?: Date | null
  academicYear: string
  term: string
  status: "issued" | "cancelled" | "pending" | "used" | "partial"
  familyCode?: string
  paid?: boolean
  cancelled?: boolean
  corrective?: boolean
  appliedToInvoice?: string
  appliedToReceipt?: string
  appliedAt?: string
  appliedDate?: string
  appliedBy?: "staff" | "parent"
  usageHistory?: { invoiceId?: string; receiptNo?: string; appliedAmount: number; appliedAt: string; appliedBy?: "staff" | "parent" }[]
}

// Normalize legacy payment method names to current system values
const normalizePaymentMethod = (method: string): string => {
  if (!method || method === "-" || method === "N/A") return "N/A"
  const m = method.toLowerCase().trim()
  if (m.startsWith("edc")) return "EDC"
  if (m.includes("credit") && m.includes("card")) return "Credit Card"
  if (m.includes("bank") && m.includes("transfer")) return "Bank Transfer"
  if (m.includes("bank") && m.includes("counter")) return "Cashier's cheque"
  if (m.includes("wechat")) return "Thai QR"
  if (m.includes("promptpay")) return "Thai QR"
  if (m.includes("thai") && m.includes("qr")) return "Thai QR"
  if (m.includes("qr")) return "Thai QR"
  if (m.includes("cashier")) return "Cashier's cheque"
  if (m.includes("cash")) return "Cashier's cheque"
  if (m.includes("credit note")) return "Credit Note"
  const validSources = ["Cashier's cheque", "Bank Transfer", "Thai QR", "Credit Card", "EDC"]
  const found = validSources.find(s => s.toLowerCase() === m)
  return found || method
}

// Function to load receipts from localStorage based on category
const loadReceiptsFromStorage = (category?: string): Receipt[] => {
  try {
    let storageKey = "receiptRecords_tuition"

    if (category === "eca") {
      storageKey = "receiptRecords_eca"
    } else if (category === "trip") {
      storageKey = "receiptRecords_trip"
    } else if (category === "exam") {
      storageKey = "receiptRecords_event"
    } else if (category === "bus") {
      storageKey = "receiptRecords_summer"
    } else if (category === "external") {
      storageKey = "receiptRecords_external"
    }

    const stored = localStorage.getItem(storageKey)
    if (!stored) return []

    // Load invoices to get parent information
    const invoicesStored = localStorage.getItem("createdInvoices")
    const invoices = invoicesStored ? JSON.parse(invoicesStored) : []

    const records = JSON.parse(stored)
    return records.map((r: any) => {
      // Read direct fields first, then fallback to parsing schoolYear
      let academicYear = r.academicYear || ""
      let term = r.term || ""

      // Fallback: parse from schoolYear if direct fields are missing
      // Format: "2025-2026 - Term 2 (January - March)" or just "2025/2026"
      if ((!academicYear || !term) && r.schoolYear) {
        const parts = r.schoolYear.split(" - ")
        if (!academicYear) academicYear = parts[0] || ""
        if (!term) term = parts.slice(1).join(" - ") || ""
      }

      // Find matching invoice to get parent info
      const invoiceNumber = (r.invoices?.[0]?.invoiceNo || "").trim()
      const matchingInvoice = invoices.find((inv: any) => (inv.invoiceNumber || "").trim().toLowerCase() === invoiceNumber.toLowerCase())
      const parentName = matchingInvoice?.parentName || r.clientName || ""
      const studentName = matchingInvoice?.studentName || r.contactName || r.clientName
      const address = matchingInvoice?.address || ""
      const familyCode = matchingInvoice?.familyCode || matchingInvoice?.adultIdNo || r.familyCode || ""

      return {
        id: r.id,
        receiptNumber: r.receiptNo,
        invoiceNumber: invoiceNumber,
        studentName: studentName,
        studentId: matchingInvoice?.studentId || r.clientNo || "",
        studentGrade: r.yearGroup || "",
        contactName: parentName,
        address: address,
        invoiceDate: r.invoices?.[0]?.invoiceDate ? new Date(r.invoices[0].invoiceDate) : new Date(r.createdAt),
        invoiceAmount: r.invoices?.[0]?.invoiceAmount || r.amount || r.totalAmount,
        amount: r.netPayable !== undefined ? r.netPayable : (r.totalAmount !== undefined ? r.totalAmount : r.amount),
        appliedCNAmount: r.invoices?.[0]?.appliedCNAmount || 0,
        appliedCNNumbers: r.invoices?.[0]?.appliedCreditNotes || [],
        outstandingAmount: r.invoices?.[0]?.outstandingAmount || 0,
        paymentMethod: normalizePaymentMethod(r.paymentMethod || "N/A"),
        paymentChannel: "counter_bank" as const,
        transactionDate: new Date(r.receiptDate || r.createdAt),
        academicYear: academicYear,
        term: term,
        downloadCount: 0,
        collectorName: "System",
        familyCode: familyCode,
        status: (r.status as "issued" | "cancelled") || "issued"
      }
    })
  } catch (error) {
    console.error("Failed to load receipts from storage:", error)
    return []
  }
}

// Mock Credit Notes data
const mockCreditNotes: CreditNote[] = [
  {
    id: "1",
    creditNoteNumber: "CN-2026-000001",
    invoiceNumber: "20260000001",
    studentName: studentData[0].name,
    studentId: studentData[0].id,
    studentGrade: studentData[0].grade,
    familyCode: "006471",
    amount: 15000,
    amountIncludingVat: 16050,
    remainingAmount: 0,
    description: "Credit note for ECA cancellation",
    reason: "Credit note for ECA cancellation",
    issueDate: new Date("2026-03-15"),
    dueDate: new Date("2026-04-15"),
    academicYear: "2025/2026",
    term: "Term 2",
    status: "issued",
    paid: true,
    cancelled: false,
    corrective: false
  },
  {
    id: "2",
    creditNoteNumber: "CN-2026-000002",
    invoiceNumber: "20260000002",
    studentName: studentData[1].name,
    studentId: studentData[1].id,
    studentGrade: studentData[1].grade,
    familyCode: "006472",
    amount: 8500,
    amountIncludingVat: 9095,
    remainingAmount: 8500,
    description: "Tuition fee adjustment Term 2",
    reason: "Tuition fee adjustment Term 2",
    issueDate: new Date("2026-03-10"),
    dueDate: new Date("2026-04-10"),
    academicYear: "2025/2026",
    term: "Term 2",
    status: "pending",
    paid: false,
    cancelled: false,
    corrective: false
  },
  {
    id: "3",
    creditNoteNumber: "CN-2026-000003",
    invoiceNumber: "20260000003",
    studentName: studentData[2].name,
    studentId: studentData[2].id,
    studentGrade: studentData[2].grade,
    familyCode: "006473",
    amount: 25000,
    amountIncludingVat: 26750,
    remainingAmount: 0,
    description: "Withdrawal refund",
    reason: "Withdrawal refund",
    issueDate: new Date("2026-02-28"),
    dueDate: new Date("2026-03-28"),
    academicYear: "2025/2026",
    term: "Term 2",
    status: "cancelled",
    paid: false,
    cancelled: true,
    corrective: false
  }
]

// Add more mock credit notes
const cnDescriptions = [
  "Credit note for ECA cancellation",
  "Tuition fee adjustment",
  "Overpayment refund",
  "Withdrawal refund",
  "Activity fee correction",
  "Bus service cancellation",
  "Exam fee reversal",
  "Summer camp refund",
  "Administrative adjustment",
  "Transfer credit"
]
for (let i = 4; i <= 40; i++) {
  const student = studentData[i % studentData.length]
  const academicYears = ["2024/2025", "2025/2026"]
  const terms = ["Term 1", "Term 2", "Term 3"]
  const statuses: ("issued" | "cancelled" | "pending")[] = ["issued", "cancelled", "pending"]
  const amt = Math.floor(Math.random() * 50000) + 1000
  const desc = cnDescriptions[Math.floor(Math.random() * cnDescriptions.length)]
  const statusPick = statuses[Math.floor(Math.random() * statuses.length)]
  const isPaid = statusPick === "issued" && Math.random() > 0.4
  const isCancelled = statusPick === "cancelled"
  const isCorrective = !isPaid && !isCancelled && Math.random() > 0.7
  const postDate = new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
  const due = new Date(postDate)
  due.setDate(due.getDate() + 30)

  mockCreditNotes.push({
    id: i.toString(),
    creditNoteNumber: `CN-2026-${String(i).padStart(6, '0')}`,
    invoiceNumber: `2026${String(1000 + i).padStart(7, '0')}`,
    studentName: student.name,
    studentId: student.id,
    studentGrade: student.grade,
    familyCode: `00${6470 + (i % 30)}`,
    amount: amt,
    amountIncludingVat: Math.round(amt * 1.07),
    remainingAmount: isPaid ? 0 : amt,
    description: desc,
    reason: desc,
    issueDate: postDate,
    dueDate: due,
    academicYear: academicYears[Math.floor(Math.random() * academicYears.length)],
    term: terms[Math.floor(Math.random() * terms.length)],
    status: statusPick,
    paid: isPaid,
    cancelled: isCancelled,
    corrective: isCorrective
  })
}

const CREDIT_NOTES_STORAGE_KEY = "creditNotesRecords"
const CREDIT_NOTES_VERSION_KEY = "creditNotesVersion"
const CREDIT_NOTES_CURRENT_VERSION = "4"

const loadCreditNotesFromStorage = (): CreditNote[] => {
  try {
    const ver = localStorage.getItem(CREDIT_NOTES_VERSION_KEY)
    if (ver !== CREDIT_NOTES_CURRENT_VERSION) {
      localStorage.removeItem(CREDIT_NOTES_STORAGE_KEY)
      localStorage.setItem(CREDIT_NOTES_VERSION_KEY, CREDIT_NOTES_CURRENT_VERSION)
    }
    const stored = localStorage.getItem(CREDIT_NOTES_STORAGE_KEY)

    // Load invoices to get family code
    const invoicesStored = localStorage.getItem("createdInvoices")
    const invoices = invoicesStored ? JSON.parse(invoicesStored) : []

    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.map((cn: any) => {
        const matchingInvoice = invoices.find((inv: any) => inv.invoiceNumber === cn.invoiceNumber)
        return {
          ...cn,
          amount: cn.amount ?? cn.creditAmount ?? 0,
          amountIncludingVat: cn.amountIncludingVat ?? 0,
          remainingAmount: cn.remainingAmount ?? 0,
          issueDate: new Date(cn.issueDate),
          dueDate: cn.dueDate ? new Date(cn.dueDate) : null,
          familyCode: matchingInvoice?.familyCode || matchingInvoice?.adultIdNo || cn.familyCode || cn.parentName || "",
          paid: cn.paid ?? false,
          cancelled: cn.cancelled ?? false,
          corrective: cn.corrective ?? false,
          description: cn.description || cn.reason || ""
        }
      })
    }
  } catch { }
  // Build mock data using REAL invoice students so credit notes match invoices
  const invoicesStored = localStorage.getItem("createdInvoices")
  const invoices = invoicesStored ? JSON.parse(invoicesStored) : []
  const invoiceStudents = invoices.reduce((acc: Record<string, { studentId: string; studentName: string; familyCode: string; grade: string; academicYear: string; term: string }>, inv: any) => {
    if (inv.studentId && inv.studentName) {
      acc[inv.studentId] = { studentId: inv.studentId, studentName: inv.studentName, familyCode: inv.adultIdNo || inv.familyCode || "", grade: inv.yearGroup || inv.grade || inv.studentGrade || "", academicYear: inv.academicYear || "2025/2026", term: inv.term || "Term 1" }
    }
    return acc
  }, {})
  const invoiceStudentList = Object.values(invoiceStudents) as { studentId: string; studentName: string; familyCode: string; grade: string; academicYear: string; term: string }[]

  // If we have real invoice students, generate credit notes from them
  // Otherwise fall back to hardcoded studentData
  const sourceStudents = invoiceStudentList.length > 0 ? invoiceStudentList : studentData.map(s => ({ studentId: s.id, studentName: s.name, familyCode: "", grade: s.grade, academicYear: "2025/2026", term: "Term 1" }))

  const cnDescriptions = [
    "Credit note for ECA cancellation", "Tuition fee adjustment", "Overpayment refund",
    "Withdrawal refund", "Activity fee correction", "Bus service cancellation",
    "Exam fee reversal", "Summer camp refund", "Administrative adjustment", "Transfer credit"
  ]
  const statuses: ("issued" | "cancelled" | "pending")[] = ["issued", "cancelled", "pending"]
  const generatedCNs: CreditNote[] = sourceStudents.slice(0, 45).map((s, i) => {
    const amt = Math.floor(Math.random() * 50000) + 1000
    const desc = cnDescriptions[i % cnDescriptions.length]
    const statusPick = statuses[Math.floor(Math.random() * statuses.length)]
    const isPaid = statusPick === "issued" && Math.random() > 0.4
    const isCancelled = statusPick === "cancelled"
    const isCorrective = !isPaid && !isCancelled && Math.random() > 0.7
    const postDate = new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
    const due = new Date(postDate); due.setDate(due.getDate() + 30)
    return {
      id: `cn-mock-${i + 1}`,
      creditNoteNumber: `CN-${new Date().getFullYear()}-${String(i + 1).padStart(6, "0")}`,
      invoiceNumber: "",
      studentName: s.studentName,
      studentId: s.studentId,
      studentGrade: s.grade,
      familyCode: s.familyCode,
      amount: amt,
      amountIncludingVat: Math.round(amt * 1.07),
      remainingAmount: isPaid ? 0 : amt,
      description: desc,
      reason: desc,
      issueDate: postDate,
      dueDate: due,
      academicYear: s.academicYear,
      term: s.term,
      status: statusPick,
      paid: isPaid,
      cancelled: isCancelled,
      corrective: isCorrective
    }
  })

  // Save to localStorage so other components (InvoiceManagement) can read them
  try { localStorage.setItem(CREDIT_NOTES_STORAGE_KEY, JSON.stringify(generatedCNs)) } catch { }
  return generatedCNs
}

const saveCreditNotesToStorage = (notes: CreditNote[]) => {
  try {
    localStorage.setItem(CREDIT_NOTES_STORAGE_KEY, JSON.stringify(notes))
  } catch { }
}

interface ReceiptPageProps {
  onNavigateToSubPage?: (page: string, params?: any) => void
  category?: "tuition" | "eca" | "trip" | "exam" | "bus" | "external" // Filter receipts by category/menu type
  activeTab?: string // Allow overriding the default active tab
  viewMode?: "receipts" | "credit-notes" | "both" // Control if tabs are shown
}

export function ReceiptPage({ onNavigateToSubPage, category, activeTab: propActiveTab, viewMode = "both" }: ReceiptPageProps) {
  const { t } = useLanguage()
  const { academicYears = [] } = useAcademicYears()
  const { user } = useAuth()
  const userCanEdit = canPerformActions(user?.role)
  const { students: allStudents } = useStudents()

  // Student ID search state for credit note form
  const [cnStudentSearch, setCnStudentSearch] = useState("")
  const [cnStudentDropdownOpen, setCnStudentDropdownOpen] = useState(false)

  // Categories that should NOT show credit notes
  const hideCreditNotes = ['eca', 'trip', 'exam', 'bus', 'external'].includes(category || '')

  // Tab state
  const [activeTab, setActiveTab] = useState(propActiveTab || (viewMode === "credit-notes" ? "credit-notes" : "receipts"))

  // Update active tab when viewMode changes
  useEffect(() => {
    if (viewMode === "credit-notes") {
      setActiveTab("credit-notes")
    } else if (viewMode === "receipts") {
      setActiveTab("receipts")
    }
  }, [viewMode])

  // Receipt states - load from localStorage
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [filteredReceipts, setFilteredReceipts] = useState<Receipt[]>([])

  // Load receipts from localStorage on mount
  useEffect(() => {
    const loadedReceipts = loadReceiptsFromStorage(category)
    setReceipts(loadedReceipts)
    setFilteredReceipts(loadedReceipts)
  }, [category])

  // Credit Note states
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>(() => loadCreditNotesFromStorage())
  const [filteredCreditNotes, setFilteredCreditNotes] = useState<CreditNote[]>(() => loadCreditNotesFromStorage())

  // Persist credit notes to localStorage whenever state changes
  useEffect(() => {
    if (creditNotes.length > 0) {
      const toStore = creditNotes.map(cn => ({
        ...cn,
        issueDate: cn.issueDate instanceof Date ? cn.issueDate.toISOString() : cn.issueDate,
      }))
      localStorage.setItem(CREDIT_NOTES_STORAGE_KEY, JSON.stringify(toStore))
      localStorage.setItem("creditNotes", JSON.stringify(toStore))
    }
  }, [creditNotes])

  // Reload credit notes when updated from another component (e.g. after applying CN in InvoiceManagement)
  useEffect(() => {
    const handleCreditNotesUpdated = () => {
      const reloaded = loadCreditNotesFromStorage()
      setCreditNotes(reloaded)
      setFilteredCreditNotes(reloaded)
    }
    window.addEventListener("creditNotesUpdated", handleCreditNotesUpdated)
    return () => window.removeEventListener("creditNotesUpdated", handleCreditNotesUpdated)
  }, [])

  // Filter states
  const [showFilters, setShowFilters] = useState(false)
  const [showCreditNoteFilters, setShowCreditNoteFilters] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [academicYearFilter, setAcademicYearFilter] = useState("all")
  const [termFilter, setTermFilter] = useState("all")
  const [gradeFilter, setGradeFilter] = useState("all")
  const [paymentChannelFilter, setPaymentChannelFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all") // For Credit Notes
  const [dateFrom, setDateFrom] = useState<Date | null>(null)
  const [dateTo, setDateTo] = useState<Date | null>(null)
  const [dueDateFrom, setDueDateFrom] = useState<Date | null>(null)
  const [dueDateTo, setDueDateTo] = useState<Date | null>(null)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = usePersistedState("receipt-page:pageSize", 10)
  const itemsPerPage = pageSize
  const [cnCurrentPage, setCnCurrentPage] = useState(1)
  const [cnPageSize, setCnPageSize] = usePersistedState("receipt-page:cn-pageSize", 10)

  // View Dialog states
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewingReceipt, setViewingReceipt] = useState<Receipt | null>(null)
  const [viewingCreditNote, setViewingCreditNote] = useState<CreditNote | null>(null)

  // Create Receipt Dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  // Create Credit Note Dialog state
  const [isCreateCreditNoteOpen, setIsCreateCreditNoteOpen] = useState(false)

  // Import states
  const [importPreview, setImportPreview] = useState<CreditNote[]>([])
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [importFileName, setImportFileName] = useState("")
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [templateToEdit, setTemplateToEdit] = useState<EmailTemplate | null>(null)
  const [creditNoteForm, setCreditNoteForm] = useState({
    creditNoteNumber: `CN-${new Date().getFullYear()}-${String(mockCreditNotes.length + 1).padStart(6, '0')}`,
    invoiceNumber: "",
    familyCode: "",
    studentId: "",
    studentName: "",
    yearGroup: "",
    academicYear: "",
    term: "",
    amount: 0,
    amountIncludingVat: 0,
    remainingAmount: 0,
    reason: "",
    otherReason: "",
    issueDate: new Date(),
    dueDate: null as Date | null,
    paid: false,
    cancelled: false,
    corrective: false,
  })

  // Selection states
  const [selectedReceipts, setSelectedReceipts] = useState<Set<string>>(new Set())
  const [selectedCreditNotes, setSelectedCreditNotes] = useState<Set<string>>(new Set())

  // Sorting states
  const [sortColumn, setSortColumn] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Grade options for filter
  const gradeOptions = ["Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]

  // Simple term options for filter
  const termOptions = [
    { id: "term1", name: "Term 1" },
    { id: "term2", name: "Term 2" },
    { id: "term3", name: "Term 3" }
  ]

  // Normalize payment method to match PAYMENT_SOURCES
  // Payment method options from system's accepted payment channels
  const paymentMethodOptions = PAYMENT_SOURCES

  // Reset filters and page when switching tabs
  useEffect(() => {
    setSearchTerm("")
    setAcademicYearFilter("all")
    setTermFilter("all")
    setGradeFilter("all")
    setPaymentChannelFilter("all")
    setStatusFilter("all")
    setDateFrom(null)
    setDateTo(null)
    setCurrentPage(1)
    setSelectedReceipts(new Set())
    setSelectedCreditNotes(new Set())

    if (activeTab === "receipts") {
      setFilteredReceipts(receipts)
    } else {
      setFilteredCreditNotes(creditNotes)
    }
  }, [activeTab, receipts, creditNotes])

  // Reactive filtering for receipts - runs whenever filter state changes
  useEffect(() => {
    if (activeTab !== "receipts") return

    let filtered = receipts

    if (searchTerm) {
      filtered = filtered.filter(receipt =>
        receipt.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receipt.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receipt.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receipt.studentId.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (academicYearFilter !== "all") {
      const selectedYear = academicYears.find(y => y.id === academicYearFilter)
      if (selectedYear) {
        filtered = filtered.filter(receipt => normalizeAcademicYear(receipt.academicYear) === normalizeAcademicYear(selectedYear.name))
      }
    }

    if (termFilter !== "all") {
      filtered = filtered.filter(receipt => receipt.term === termFilter)
    }

    if (gradeFilter !== "all") {
      filtered = filtered.filter(receipt => receipt.studentGrade === gradeFilter)
    }

    if (paymentChannelFilter !== "all") {
      filtered = filtered.filter(receipt => receipt.paymentMethod === paymentChannelFilter)
    }

    if (dateFrom) {
      filtered = filtered.filter(receipt => receipt.transactionDate >= dateFrom)
    }

    if (dateTo) {
      filtered = filtered.filter(receipt => receipt.transactionDate <= dateTo)
    }

    setFilteredReceipts(filtered)
    setCurrentPage(1)
  }, [searchTerm, academicYearFilter, termFilter, gradeFilter, paymentChannelFilter, dateFrom, dateTo, receipts, activeTab, academicYears])

  const clearFilters = () => {
    setSearchTerm("")
    setAcademicYearFilter("all")
    setTermFilter("all")
    setGradeFilter("all")
    setPaymentChannelFilter("all")
    setDateFrom(null)
    setDateTo(null)
    setFilteredReceipts(receipts)
    setCurrentPage(1)
  }

  const viewReceipt = (receiptId: string) => {
    const receipt = receipts.find(r => r.id === receiptId)
    if (receipt) {
      setViewingReceipt(receipt)
      setIsViewDialogOpen(true)
    }
  }

  const downloadReceipt = (receiptId: string) => {
    const receipt = receipts.find(r => r.id === receiptId)
    if (receipt) {
      // Simulate PDF download
      // In production, this would call an API to generate and download the PDF
      const link = document.createElement('a')
      link.href = '#' // Replace with actual PDF URL from API
      link.download = `${receipt.receiptNumber}.pdf`
      // link.click()

      toast.success(t("receipt.downloadingReceipt").replace("{number}", receipt.receiptNumber))
      logActivity({ action: "Download Receipt PDF", module: "Receipts", detail: `Receipt: ${receipt.receiptNumber}, Student: ${receipt.studentName} (${receipt.studentId}), Amount: ฿${receipt.amount.toLocaleString()}, Invoice: ${receipt.invoiceNumber}` })

      // Update download count
      const updatedReceipts = receipts.map(r =>
        r.id === receiptId ? { ...r, downloadCount: r.downloadCount + 1 } : r
      )
      setReceipts(updatedReceipts)
      setFilteredReceipts(updatedReceipts)
    }
  }

  const resendReceipt = (receiptId: string) => {
    const receipt = receipts.find(r => r.id === receiptId)
    if (receipt) {
      toast.success(t("receipt.emailSentTo").replace("{name}", receipt.studentName))
      logActivity({ 
        action: "Send Receipt Email", 
        module: "Receipts", 
        detail: `Receipt: ${receipt.receiptNumber}, Student: ${receipt.studentName} (${receipt.studentId}), Amount: ฿${receipt.amount.toLocaleString()}, Payment: ${receipt.paymentMethod}` 
      })

      // Update Email History
      try {
        const historyData = localStorage.getItem("emailReminderHistory")
        const history = historyData ? JSON.parse(historyData) : []
        const newEntry = {
          id: `receipt-resend-${Date.now()}`,
          sentDate: new Date().toISOString().split("T")[0],
          subject: `Receipt: ${receipt.receiptNumber}`,
          academicYear: receipt.academicYear || "-",
          term: receipt.term || "-",
          recipients: 1,
          status: "sent",
          message: `Receipt: ${receipt.receiptNumber}\nStudent: ${receipt.studentName}\nID: ${receipt.studentId}\nAmount: ฿${receipt.amount.toLocaleString()}`
        }
        history.unshift(newEntry)
        localStorage.setItem("emailReminderHistory", JSON.stringify(history))
        window.dispatchEvent(new CustomEvent("emailReminderHistoryUpdated"))
      } catch (err) {
        console.error("Failed to add to email history", err)
      }
    }
  }

  const bulkDownloadPDF = () => {
    if (selectedReceipts.size === 0) {
      toast.error(t("receipt.selectReceiptsToDownload"))
      return
    }

    const selectedReceiptsList = receipts.filter(r => selectedReceipts.has(r.id))

    // In production, this would call an API to generate a ZIP file with all PDFs
    toast.success(t("receipt.downloadingReceipts").replace("{count}", String(selectedReceipts.size)))
    logActivity({ action: "Bulk Download Receipt PDF", module: "Receipts", detail: `Downloaded ${selectedReceipts.size} receipts: ${selectedReceiptsList.map(r => r.receiptNumber).slice(0, 5).join(", ")}${selectedReceiptsList.length > 5 ? "..." : ""}` })

    // Update download counts
    const updatedReceipts = receipts.map(r =>
      selectedReceipts.has(r.id) ? { ...r, downloadCount: r.downloadCount + 1 } : r
    )
    setReceipts(updatedReceipts)
    setFilteredReceipts(updatedReceipts)
    setSelectedReceipts(new Set())
  }

  const bulkResendEmail = () => {
    if (selectedReceipts.size === 0) {
      toast.error(t("receipt.selectReceiptsToResend"))
      return
    }

    const selectedReceiptsList = receipts.filter(r => selectedReceipts.has(r.id))

    toast.success(t("receipt.sendingEmails").replace("{count}", String(selectedReceipts.size)))
    logActivity({ action: "Bulk Send Receipt Email", module: "Receipts", detail: `Sent emails for ${selectedReceipts.size} receipts` })

    // Update Email History
    try {
      const historyData = localStorage.getItem("emailReminderHistory")
      const history = historyData ? JSON.parse(historyData) : []
      const newEntry = {
        id: `receipt-bulk-resend-${Date.now()}`,
        sentDate: new Date().toISOString().split("T")[0],
        subject: `Bulk Resend: ${selectedReceipts.size} Receipts`,
        academicYear: selectedReceiptsList[0]?.academicYear || "-",
        term: selectedReceiptsList[0]?.term || "-",
        recipients: selectedReceipts.size,
        status: "sent",
        message: `Bulk Resented Receipt Emails\n\nReceipts:\n${selectedReceiptsList.map(r => `- ${r.receiptNumber} (${r.studentName})`).join("\n")}`
      }
      history.unshift(newEntry)
      localStorage.setItem("emailReminderHistory", JSON.stringify(history))
      window.dispatchEvent(new CustomEvent("emailReminderHistoryUpdated"))
    } catch (err) {
      console.error("Failed to add to email history", err)
    }

    setSelectedReceipts(new Set())
  }

  const downloadInterfaceFile = () => {
    const sorted = getSortedReceipts(filteredReceipts)
    if (sorted.length === 0) {
      toast.error(t("receipt.noReceiptsToExport"))
      return
    }

    const mapPaymentMethod = (method: string): string => {
      if (!method) return ""
      const m = method.toLowerCase()
      if (m.includes("bank transfer") || m === "bank") return "Bank"
      if (m.startsWith("edc") || m.includes("pos") || m.includes("qr") || m.includes("credit card")) return "POS (QR/CC)"
      if (m.includes("cheque") || m.includes("check")) return "Cheque"
      if (m.includes("cash")) return "Cash"
      return method
    }

    // Load bank accounts (offline + online) to get Receive Account no.
    const bankAccountsStored = localStorage.getItem("kingscollege_backoffice_bankAccounts")
    const offlineAccounts = bankAccountsStored ? JSON.parse(bankAccountsStored) : []
    const onlineAccountsStored = localStorage.getItem("onlineBankAccounts")
    const onlineAccounts = onlineAccountsStored ? JSON.parse(onlineAccountsStored) : []
    const bankAccounts = [...offlineAccounts, ...onlineAccounts]

    const getReceiveAccountNo = (paymentMethod: string): string => {
      if (!paymentMethod) return ""
      const m = paymentMethod.toLowerCase()
      let matchedAccount: any = null

      if (m.startsWith("edc")) {
        // "EDC - BankName (accountNumber)" — match by bank name and account number
        const edcMatch = paymentMethod.match(/EDC\s*-\s*(.+?)\s*\((.+?)\)/)
        if (edcMatch) {
          const [, bankName, accountNumber] = edcMatch
          matchedAccount = bankAccounts.find((acc: any) =>
            acc.paymentSource === "EDC" &&
            acc.bankName === bankName.trim() &&
            acc.accountNumber === accountNumber.trim() &&
            acc.isActive
          )
        }
        // Fallback: any active EDC account
        if (!matchedAccount) {
          matchedAccount = bankAccounts.find((acc: any) => acc.paymentSource === "EDC" && acc.isActive)
        }
      } else if (m.includes("bank transfer") || m.includes("bank")) {
        matchedAccount = bankAccounts.find((acc: any) => acc.paymentSource === "Bank Transfer" && acc.isActive)
      } else if (m.includes("cheque")) {
        matchedAccount = bankAccounts.find((acc: any) => acc.paymentSource === "Cashier's cheque" && acc.isActive)
      } else if (m.includes("thai qr") || m.includes("qr")) {
        matchedAccount = bankAccounts.find((acc: any) => acc.paymentSource === "Thai QR" && acc.isActive)
      } else if (m.includes("credit card")) {
        matchedAccount = bankAccounts.find((acc: any) => acc.paymentSource === "Credit Card" && acc.isActive)
      } else if (m.includes("cash")) {
        matchedAccount = bankAccounts.find((acc: any) => acc.paymentSource === "Cash" && acc.isActive)
      }

      return matchedAccount?.glAccount || matchedAccount?.accountNumber || ""
    }

    const wb = XLSX.utils.book_new()

    // Title row + header row + data rows
    const titleRow = ["Interface File - Sales Receipt for school fees"]
    const headerRow = [
      "Receipt no.", "Customer no.", "Type", "RV no. series",
      "Receive date", "Payment method", "Sell-to-customer No.",
      "Receive Account no.", "Year group", "School year", "Invoice no.", "Amount"
    ]

    const dataRows = sorted.map(r => [
      r.receiptNumber,
      r.familyCode || r.studentId, // Customer no. (Family Code)
      "CASHRCPT",
      "AR-RV",
      format(r.transactionDate, "yyyy-MM-dd") + " 00:00:00",
      r.paymentMethod || "",
      r.studentId, // Sell-to-customer No. (Student ID)
      getReceiveAccountNo(r.paymentMethod),
      (r.studentGrade || "").toUpperCase(),
      (r.academicYear || "").replace(/-/g, "/"),
      r.invoiceNumber,
      r.amount
    ])

    const ws = XLSX.utils.aoa_to_sheet([titleRow, [], headerRow, ...dataRows])

    // Column widths
    ws["!cols"] = [
      { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
      { wch: 12 }, { wch: 16 }, { wch: 20 },
      { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 12 }
    ]

    XLSX.utils.book_append_sheet(wb, ws, "Receipts")
    XLSX.writeFile(wb, `interface-receipts-${format(new Date(), "dd-MM-yyyy")}.xlsx`)
    toast.success(t("receipt.interfaceFileDownloaded"))
    logActivity({ action: "Download Interface File", module: "Receipts", detail: `Exported ${sorted.length} receipts to interface file, File: interface-receipts-${format(new Date(), "dd-MM-yyyy")}.xlsx` })
  }

  const exportToExcel = () => {
    const isCreditNoteMode = activeTab === "credit-notes" || viewMode === "credit-notes"
    if (isCreditNoteMode) {
      const headers = ['No.', 'Sell-to Customer No.', 'Customer Name', 'Year Group Code', 'Posting Date', 'Due Date', 'Amount', 'Amount Including VAT', 'Remaining Amount', 'Paid', 'Currency Code', 'Bill-to Customer No.', 'Cancelled', 'Corrective', 'Location Code', 'No. Printed', 'Description']
      const rows = filteredCreditNotes.map(cn => [
        cn.creditNoteNumber,
        cn.studentId,
        cn.studentName,
        cn.studentGrade,
        format(cn.issueDate, 'dd/MM/yyyy'),
        cn.dueDate ? format(cn.dueDate, 'dd/MM/yyyy') : "",
        cn.amount,
        cn.amountIncludingVat || cn.amount,
        cn.remainingAmount ?? 0,
        cn.paid ? "TRUE" : "FALSE",
        "",
        cn.familyCode || "",
        cn.cancelled ? "TRUE" : "FALSE",
        cn.corrective ? "TRUE" : "FALSE",
        "",
        "",
        cn.description || cn.reason
      ])
      downloadAsXlsx(headers, rows, `credit-notes-export-${format(new Date(), 'dd-MM-yyyy')}`)
      toast.success(t("receipt.creditNotesExported"))
      logActivity({ action: "Export Excel", module: "Credit Notes", detail: `Exported ${filteredCreditNotes.length} credit notes to Excel, File: credit-notes-export-${format(new Date(), 'dd-MM-yyyy')}.xlsx` })
    } else {
      const headers = ['Receipt Number', 'Invoice Number', 'Student Name', 'Student ID', 'Grade', 'Amount', 'Payment Method', 'Date', 'Academic Year', 'Term']
      const rows = filteredReceipts.map(r => [
        r.receiptNumber,
        r.invoiceNumber,
        r.studentName,
        r.studentId,
        r.studentGrade,
        r.amount,
        r.paymentMethod,
        format(r.transactionDate, 'dd/MM/yyyy'),
        formatAcademicYear(r.academicYear),
        r.term
      ])
      downloadAsXlsx(headers, rows, `receipts-export-${format(new Date(), 'dd-MM-yyyy')}`)
      toast.success(t("receipt.receiptsExported"))
      logActivity({ action: "Export Excel", module: "Receipts", detail: `Exported ${filteredReceipts.length} receipts to Excel, File: receipts-export-${format(new Date(), 'dd-MM-yyyy')}.xlsx` })
    }
  }

  const toggleReceiptSelection = (receiptId: string) => {
    const newSelected = new Set(selectedReceipts)
    if (newSelected.has(receiptId)) {
      newSelected.delete(receiptId)
    } else {
      newSelected.add(receiptId)
    }
    setSelectedReceipts(newSelected)
  }

  const selectAllCurrentPage = () => {
    const newSelected = new Set(selectedReceipts)
    currentPageReceipts.forEach(receipt => {
      newSelected.add(receipt.id)
    })
    setSelectedReceipts(newSelected)
  }

  const clearSelection = () => {
    setSelectedReceipts(new Set())
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const getSortedReceipts = (receiptsToSort: Receipt[]) => {
    if (!sortColumn) return receiptsToSort
    return [...receiptsToSort].sort((a, b) => {
      let aVal: any, bVal: any
      switch (sortColumn) {
        case "receiptNumber": aVal = a.receiptNumber; bVal = b.receiptNumber; break
        case "invoiceNumber": aVal = a.invoiceNumber; bVal = b.invoiceNumber; break
        case "studentName": aVal = a.studentName; bVal = b.studentName; break
        case "studentGrade": aVal = a.studentGrade; bVal = b.studentGrade; break
        case "academicYear": aVal = a.academicYear; bVal = b.academicYear; break
        case "term": aVal = a.term; bVal = b.term; break
        case "amount": aVal = a.amount; bVal = b.amount; break
        case "paymentMethod": aVal = a.paymentMethod; bVal = b.paymentMethod; break
        case "transactionDate": aVal = a.transactionDate?.getTime() || 0; bVal = b.transactionDate?.getTime() || 0; break
        default: return 0
      }
      if (typeof aVal === "string") {
        const comparison = aVal.localeCompare(bVal)
        return sortDirection === "asc" ? comparison : -comparison
      }
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal
    })
  }

  // Calculate pagination with sorting
  const sortedReceipts = getSortedReceipts(filteredReceipts)
  const totalPages = Math.ceil(sortedReceipts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentPageReceipts = sortedReceipts.slice(startIndex, endIndex)

  const summaryStats = {
    total: receipts.length,
    totalDownloads: receipts.reduce((sum, r) => sum + r.downloadCount, 0),
    totalAmount: receipts.reduce((sum, r) => sum + r.amount, 0)
  }

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  // ===== Credit Note Functions =====
  // Reactive filtering for credit notes - runs whenever filter state changes
  useEffect(() => {
    if (activeTab !== "creditNotes") return

    let filtered = creditNotes

    if (searchTerm) {
      filtered = filtered.filter(cn =>
        cn.creditNoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cn.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cn.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cn.description || cn.reason || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cn.familyCode || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (gradeFilter !== "all") {
      filtered = filtered.filter(cn => cn.studentGrade === gradeFilter)
    }

    if (statusFilter !== "all") {
      if (statusFilter === "paid") {
        filtered = filtered.filter(cn => cn.paid === true)
      } else if (statusFilter === "cancelled-flag") {
        filtered = filtered.filter(cn => cn.cancelled === true)
      } else {
        filtered = filtered.filter(cn => cn.status === statusFilter)
      }
    }

    if (dateFrom) {
      filtered = filtered.filter(cn => cn.issueDate >= dateFrom)
    }

    if (dateTo) {
      filtered = filtered.filter(cn => cn.issueDate <= dateTo)
    }

    if (dueDateFrom) {
      filtered = filtered.filter(cn => cn.dueDate && cn.dueDate >= dueDateFrom)
    }

    if (dueDateTo) {
      filtered = filtered.filter(cn => cn.dueDate && cn.dueDate <= dueDateTo)
    }

    setFilteredCreditNotes(filtered)
    setCnCurrentPage(1)
  }, [searchTerm, gradeFilter, statusFilter, dateFrom, dateTo, dueDateFrom, dueDateTo, creditNotes, activeTab])

  const clearCreditNoteFilters = () => {
    setSearchTerm("")
    setGradeFilter("all")
    setStatusFilter("all")
    setDateFrom(null)
    setDateTo(null)
    setDueDateFrom(null)
    setDueDateTo(null)
    setFilteredCreditNotes(creditNotes)
    setCnCurrentPage(1)
  }

  const viewCreditNote = (creditNoteId: string) => {
    const creditNote = creditNotes.find(cn => cn.id === creditNoteId)
    if (creditNote) {
      setViewingCreditNote(creditNote)
      setIsViewDialogOpen(true)
    }
  }

  const downloadCreditNote = (creditNoteId: string) => {
    const creditNote = creditNotes.find(cn => cn.id === creditNoteId)
    if (creditNote) {
      toast.success(t("receipt.downloadingCreditNote").replace("{number}", creditNote.creditNoteNumber))
      logActivity({ action: "Download Credit Note PDF", module: "Credit Notes", detail: `CN: ${creditNote.creditNoteNumber}, Student: ${creditNote.studentName} (${creditNote.studentId}), Amount: ฿${creditNote.amount.toLocaleString()}, Status: ${creditNote.status}` })
    }
  }

  const cancelCreditNote = (creditNoteId: string) => {
    const creditNote = creditNotes.find(cn => cn.id === creditNoteId)
    if (creditNote) {
      if (creditNote.status === "cancelled") {
        toast.error(t("receipt.creditNoteAlreadyCancelled"))
        return
      }
      const updatedCreditNotes = creditNotes.map(cn =>
        cn.id === creditNoteId ? { ...cn, status: "cancelled" as const } : cn
      )
      setCreditNotes(updatedCreditNotes)
      setFilteredCreditNotes(updatedCreditNotes)
      toast.success(t("receipt.creditNoteCancelled").replace("{number}", creditNote.creditNoteNumber))
      logActivity({ action: "Cancel Credit Note", module: "Credit Notes", detail: `CN: ${creditNote.creditNoteNumber}, Student: ${creditNote.studentName} (${creditNote.studentId}), Amount: ฿${creditNote.amount.toLocaleString()}, Status: ${creditNote.status} → cancelled` })
    }
  }

  const bulkDownloadCreditNotes = () => {
    if (selectedCreditNotes.size === 0) {
      toast.error(t("receipt.selectCreditNotesToDownload"))
      return
    }
    toast.success(t("receipt.downloadingCreditNotes").replace("{count}", String(selectedCreditNotes.size)))
    logActivity({ action: "Bulk Download Credit Note PDF", module: "Credit Notes", detail: `Downloaded ${selectedCreditNotes.size} credit notes: ${creditNotes.filter(cn => selectedCreditNotes.has(cn.id)).map(cn => cn.creditNoteNumber).slice(0, 5).join(", ")}${selectedCreditNotes.size > 5 ? "..." : ""}` })
    setSelectedCreditNotes(new Set())
  }

  const bulkCancelCreditNotes = () => {
    if (selectedCreditNotes.size === 0) {
      toast.error(t("receipt.selectCreditNotesToCancel"))
      return
    }
    const updatedCreditNotes = creditNotes.map(cn =>
      selectedCreditNotes.has(cn.id) && cn.status !== "cancelled"
        ? { ...cn, status: "cancelled" as const }
        : cn
    )
    setCreditNotes(updatedCreditNotes)
    setFilteredCreditNotes(updatedCreditNotes)
    toast.success(t("receipt.cancelledCreditNotes").replace("{count}", String(selectedCreditNotes.size)))
    logActivity({ action: "Bulk Cancel Credit Notes", module: "Credit Notes", detail: `Cancelled ${selectedCreditNotes.size} credit notes: ${creditNotes.filter(cn => selectedCreditNotes.has(cn.id)).map(cn => cn.creditNoteNumber).slice(0, 5).join(", ")}${selectedCreditNotes.size > 5 ? "..." : ""}` })
    setSelectedCreditNotes(new Set())
  }

  const toggleCreditNoteSelection = (creditNoteId: string) => {
    const newSelected = new Set(selectedCreditNotes)
    if (newSelected.has(creditNoteId)) {
      newSelected.delete(creditNoteId)
    } else {
      newSelected.add(creditNoteId)
    }
    setSelectedCreditNotes(newSelected)
  }

  const selectAllCreditNotesCurrentPage = () => {
    const newSelected = new Set(selectedCreditNotes)
    currentPageCreditNotes.forEach(cn => {
      newSelected.add(cn.id)
    })
    setSelectedCreditNotes(newSelected)
  }

  const clearCreditNoteSelection = () => {
    setSelectedCreditNotes(new Set())
  }

  const handleCreateCreditNote = () => {
    // Validation
    if (!creditNoteForm.creditNoteNumber) {
      toast.error(t("receipt.creditNoteNumberRequired"))
      return
    }
    if (!creditNoteForm.familyCode) {
      toast.error(t("receipt.familyCodeRequired") || "Family Code is required")
      return
    }
    if (!creditNoteForm.studentName) {
      toast.error(t("receipt.studentNameRequired"))
      return
    }
    if (!creditNoteForm.amount || creditNoteForm.amount <= 0) {
      toast.error(t("receipt.amountMustBePositive"))
      return
    }
    if (!creditNoteForm.reason) {
      toast.error(t("receipt.reasonRequired") || "Reason is required")
      return
    }
    if (creditNoteForm.reason === "Other" && !creditNoteForm.otherReason.trim()) {
      toast.error(t("receipt.otherReasonRequired") || "Please specify the reason")
      return
    }
    if (!creditNoteForm.issueDate) {
      toast.error(t("receipt.issueDateRequired") || "Issue Date is required")
      return
    }

    // Derive studentId from matching invoice if available
    const invoicesStored = localStorage.getItem("createdInvoices")
    const allInvoices = invoicesStored ? JSON.parse(invoicesStored) : []
    const matchingInvoice = allInvoices.find((inv: any) => inv.invoiceNumber === creditNoteForm.invoiceNumber)
    const derivedStudentId = creditNoteForm.studentId || matchingInvoice?.pupilId || matchingInvoice?.studentId || ""

    const newCreditNote: CreditNote = {
      id: `cn-${Date.now()}`,
      creditNoteNumber: creditNoteForm.creditNoteNumber,
      invoiceNumber: creditNoteForm.invoiceNumber,
      studentName: creditNoteForm.studentName,
      studentId: derivedStudentId,
      studentGrade: creditNoteForm.yearGroup,
      amount: creditNoteForm.amount,
      amountIncludingVat: creditNoteForm.amountIncludingVat || 0,
      remainingAmount: creditNoteForm.remainingAmount || 0,
      remainingBalance: creditNoteForm.remainingAmount || creditNoteForm.amount,
      description: creditNoteForm.reason,
      reason: creditNoteForm.reason,
      issueDate: creditNoteForm.issueDate,
      dueDate: creditNoteForm.dueDate || null,
      academicYear: creditNoteForm.academicYear,
      term: creditNoteForm.term,
      status: "issued",
      familyCode: creditNoteForm.familyCode,
      paid: creditNoteForm.paid || false,
      cancelled: creditNoteForm.cancelled || false,
      corrective: creditNoteForm.corrective || false
    }

    const updated = [newCreditNote, ...creditNotes]
    setCreditNotes(updated)
    setFilteredCreditNotes(updated)
    saveCreditNotesToStorage(updated)

    // Reset form with auto-generated credit note number
    setCreditNoteForm({
      creditNoteNumber: `CN-${new Date().getFullYear()}-${String(creditNotes.length + 2).padStart(6, '0')}`,
      invoiceNumber: "",
      familyCode: "",
      studentId: "",
      studentName: "",
      yearGroup: "",
      academicYear: "",
      term: "",
      amount: 0,
      reason: "",
      otherReason: "",
      issueDate: new Date()
    })
    setCnStudentSearch("")

    setIsCreateCreditNoteOpen(false)
    toast.success(t("receipt.creditNoteCreated"))
    logActivity({ action: "Create Credit Note", module: "Credit Notes", detail: `CN: ${creditNoteForm.creditNoteNumber}, Student: ${creditNoteForm.studentName}, Family: ${creditNoteForm.familyCode}, Amount: ฿${creditNoteForm.amount.toLocaleString()}, Reason: "${creditNoteForm.reason}", Invoice: ${creditNoteForm.invoiceNumber || "-"}, Year: ${formatAcademicYear(creditNoteForm.academicYear)}, Term: ${creditNoteForm.term}` })
  }

  // --- Import helpers ---
  const parseImportDate = (value: any): Date => {
    if (!value) return new Date()
    const num = Number(value)
    if (!isNaN(num) && num > 40000 && num < 100000) return new Date((num - 25569) * 86400 * 1000)
    const str = String(value).trim()
    if (!str) return new Date()
    const parts = str.split("/")
    if (parts.length === 3) {
      let [a, b, c] = parts.map(Number)
      if (c < 100) c = c + 2000
      if (a > 12) return new Date(c, b - 1, a)
      return new Date(c, a - 1, b)
    }
    return new Date(str)
  }

  const normalizeYearGroup = (val: string): string => {
    if (!val) return ""
    return val.replace(/^YEAR\s+/i, "Year ").replace(/^PRE[- ]?NURSERY$/i, "Pre-Nursery").replace(/^NURSERY$/i, "Nursery").replace(/^RECEPTION$/i, "Reception")
  }

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith(".xlsx") && !file.name.toLowerCase().endsWith(".xls")) {
      toast.error(t("receipt.selectExcelFile"))
      return
    }
    setImportFileName(file.name)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, { type: "binary", cellDates: false })
        const sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes("credit")) || workbook.SheetNames[0]
        const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false, defval: "" })

        const errors: string[] = []
        const preview: CreditNote[] = []

        rows.forEach((row, index) => {
          const no = row["No."]
          if (!no || String(no).toLowerCase().includes("student") || String(no).toLowerCase() === "no.") return

          const creditNoteNumber = String(no).trim()
          const studentId = String(row["Sell-to Customer No."] || "").trim()
          const studentName = String(row["Customer Name"] || "").trim()
          const yearGroup = normalizeYearGroup(String(row["Year Group Code"] || "").trim())
          const amount = parseFloat(String(row["Amount"] || "0").replace(/,/g, ""))
          const remainingAmt = parseFloat(String(row["Remaining Amount"] || "0").replace(/,/g, ""))
          const cancelled = row["Cancelled"]
          const description = String(row["Description"] || "").trim()
          const postingDate = row["Posting Date"]
          const familyCode = String(row["Bill-to Customer No."] || "").trim()

          if (!creditNoteNumber) { errors.push(`Row ${index + 2}: Missing Credit Note Number`); return }
          if (!studentId && !studentName) { errors.push(`Row ${index + 2}: Missing Student ID/Name`); return }
          if (isNaN(amount) || amount <= 0) { errors.push(`Row ${index + 2}: Invalid amount for ${creditNoteNumber}`); return }

          const status: CreditNote["status"] = (cancelled === "TRUE" || cancelled === true) ? "cancelled" : "issued"

          preview.push({
            id: `import-${Date.now()}-${index}`,
            creditNoteNumber,
            invoiceNumber: "",
            studentName,
            studentId,
            studentGrade: yearGroup,
            amount,
            remainingBalance: isNaN(remainingAmt) ? undefined : Math.abs(remainingAmt),
            reason: description || "Imported Credit Note",
            issueDate: parseImportDate(postingDate),
            academicYear: "",
            term: "",
            status,
            familyCode: familyCode || undefined,
          })
        })

        setImportPreview(preview)
        setImportErrors(errors)

        if (preview.length === 0 && errors.length === 0) {
          toast.warning(t("receipt.noValidRecordsFound"))
        } else if (errors.length > 0) {
          toast.error(t("receipt.importErrorsFound").replace("{count}", String(errors.length)))
        } else {
          toast.info(t("receipt.previewReady").replace("{count}", String(preview.length)))
        }
      } catch (err) {
        console.error("Import error:", err)
        toast.error(t("receipt.failedToReadExcel"))
      }
    }
    reader.readAsBinaryString(file)
    event.target.value = ""
  }

  const performImport = () => {
    if (importPreview.length === 0) return
    const existingNumbers = new Set(creditNotes.map(cn => cn.creditNoteNumber))
    const newNotes = importPreview.filter(cn => !existingNumbers.has(cn.creditNoteNumber))
    const duplicates = importPreview.length - newNotes.length
    const updated = [...newNotes, ...creditNotes]
    setCreditNotes(updated)
    setFilteredCreditNotes(updated)
    saveCreditNotesToStorage(updated)
    setIsImportDialogOpen(false)
    setImportPreview([])
    setImportErrors([])
    setImportFileName("")
    toast.success(duplicates > 0
      ? t("receipt.importedCreditNotesWithDuplicates").replace("{count}", String(newNotes.length)).replace("{duplicates}", String(duplicates))
      : t("receipt.importedCreditNotes").replace("{count}", String(newNotes.length)))
    logActivity({ action: "Import Credit Notes", module: "Credit Notes", detail: `Imported ${newNotes.length} credit notes from "${importFileName}"${duplicates > 0 ? `, ${duplicates} duplicates skipped` : ""}, CN numbers: ${newNotes.map(cn => cn.creditNoteNumber).slice(0, 5).join(", ")}${newNotes.length > 5 ? "..." : ""}` })
  }

  const downloadTemplate = () => {
    const headers = [
      "No.", "Sell-to Customer No.", "Customer Name", "Year Group Code",
      "Posting Date", "Due Date", "Amount", "Amount Including VAT",
      "Remaining Amount", "Paid", "Currency Code", "Bill-to Customer No.",
      "Cancelled", "Corrective", "Location Code", "No. Printed", "Description"
    ]
    const exampleRow = [
      "CN-2025-000001", "KC2024001", "James Smith", "YEAR 4",
      "20/08/2025", "20/08/2025", "5000", "5000",
      "0", "TRUE", "THB", "KC2024001",
      "FALSE", "TRUE", "", "1", "Course cancellation"
    ]
    downloadAsXlsx(headers, [exampleRow], "credit_note_import_template")
    toast.success(t("item.templateDownloaded"))
  }

  const getSortedCreditNotes = (creditNotesToSort: CreditNote[]) => {
    if (!sortColumn) return creditNotesToSort
    return [...creditNotesToSort].sort((a, b) => {
      let aVal: any, bVal: any
      switch (sortColumn) {
        case "creditNoteNumber": aVal = a.creditNoteNumber; bVal = b.creditNoteNumber; break
        case "invoiceNumber": aVal = a.invoiceNumber; bVal = b.invoiceNumber; break
        case "studentName": aVal = a.studentName; bVal = b.studentName; break
        case "studentGrade": aVal = a.studentGrade; bVal = b.studentGrade; break
        case "academicYear": aVal = a.academicYear; bVal = b.academicYear; break
        case "term": aVal = a.term; bVal = b.term; break
        case "amount": aVal = a.amount; bVal = b.amount; break
        case "reason": aVal = a.reason; bVal = b.reason; break
        case "issueDate": aVal = a.issueDate?.getTime() || 0; bVal = b.issueDate?.getTime() || 0; break
        case "status": aVal = a.status; bVal = b.status; break
        default: return 0
      }
      if (typeof aVal === "string") {
        const comparison = aVal.localeCompare(bVal)
        return sortDirection === "asc" ? comparison : -comparison
      }
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal
    })
  }

  // Calculate pagination for credit notes
  const sortedCreditNotes = getSortedCreditNotes(filteredCreditNotes)
  const totalCreditNotePages = Math.ceil(sortedCreditNotes.length / cnPageSize)
  const startCreditNoteIndex = (cnCurrentPage - 1) * cnPageSize
  const endCreditNoteIndex = startCreditNoteIndex + cnPageSize
  const currentPageCreditNotes = sortedCreditNotes.slice(startCreditNoteIndex, endCreditNoteIndex)

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { bg: string; text: string; border: string }> = {
      issued: { bg: "bg-green-100", text: "text-green-800", border: "border-green-200" },
      cancelled: { bg: "bg-red-100", text: "text-red-800", border: "border-red-200" },
      pending: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-200" },
      used: { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" },
      partial: { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200" }
    }
    const variant = variants[status] || variants.issued
    return (
      <Badge className={`${variant.bg} ${variant.text} ${variant.border} border hover:${variant.bg}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
        <div>
          <h2 className="text-xl font-semibold">
            {activeTab === "credit-notes" ? t("receipt.creditNotes") : t("receipt.receiptsTab")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {activeTab === "credit-notes" ? t("receipt.viewManageCreditNotes") : t("receipt.viewManageReceipts")}
          </p>
        </div>
        <div className="flex gap-2 shrink-0 items-center">
          {(activeTab === "credit-notes" || viewMode === "credit-notes") && (
            <Button
              variant="outline"
              className="flex items-center gap-2"
              disabled={!userCanEdit}
              onClick={() => setIsImportDialogOpen(true)}
            >
              <Upload className="w-4 h-4" />
              {t("common.import")}
            </Button>
          )}
          <Button
            variant="outline"
            className="flex items-center gap-2"
            disabled={!userCanEdit}
            onClick={exportToExcel}
          >
            <FileDown className="w-4 h-4" />
            {t("common.exportCsv")}
          </Button>
          {(activeTab !== "credit-notes" && viewMode !== "credit-notes") && (
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={downloadInterfaceFile}
            >
              <Download className="w-4 h-4" />
              {t("receipt.downloadInterfaceFile")}
            </Button>
          )}
          {activeTab !== "credit-notes" && viewMode !== "credit-notes" && (
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => {
                const allTpl = migrateTemplates()
                const rcptTpl = allTpl.filter(t => t.type === "receipt")
                setTemplateToEdit(rcptTpl.find(t => t.isDefault) || rcptTpl[0] || null)
                setIsTemplateDialogOpen(true)
              }}
            >
              <FileText className="w-4 h-4" />
              {t("receipt.receiptTemplate")}
            </Button>
          )}
          <Button
            className="flex items-center gap-2"
            disabled={!userCanEdit}
            onClick={() => {
              const isCreditNoteMode = activeTab === "credit-notes" || viewMode === "credit-notes"
              if (isCreditNoteMode) {
                setCreditNoteForm({
                  creditNoteNumber: `CN-${new Date().getFullYear()}-${String(creditNotes.length + 1).padStart(6, '0')}`,
                  invoiceNumber: "",
                  studentId: "",
                  studentName: "",
                  yearGroup: "",
                  academicYear: "",
                  term: "",
                  amount: 0,
                  reason: "",
                  issueDate: new Date()
                })
                setIsCreateCreditNoteOpen(true)
              } else {
                setIsCreateDialogOpen(true)
              }
            }}
          >
            <Plus className="w-4 h-4" />
            {(activeTab === "credit-notes" || viewMode === "credit-notes") ? t("receipt.createCreditNote") : t("receipt.createReceipt")}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {viewMode === "both" && !hideCreditNotes && (
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="receipts">{t("receipt.receiptsTab")}</TabsTrigger>
            <TabsTrigger value="credit-notes">{t("receipt.creditNotes")}</TabsTrigger>
          </TabsList>
        )}

        {/* Receipts Tab */}
        <TabsContent value="receipts" className="space-y-6 mt-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6 pb-4 space-y-4">
              {/* Search bar + Filters toggle - always visible */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t("receipt.searchPlaceholder")}
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

              {/* Collapsible filter dropdowns */}
              {showFilters && (<>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">{t("common.academicYear")}</label>
                      <Select value={academicYearFilter} onValueChange={(value) => {
                        setAcademicYearFilter(value)
                        setTermFilter("all")
                      }}>
                        <SelectTrigger className="h-9">
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue placeholder={t("common.allYears")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("common.allYears")}</SelectItem>
                          {academicYears.map((year) => (
                            <SelectItem key={year.id} value={year.id}>
                              {formatAcademicYear(year.name)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">{t("common.term")}</label>
                      <Select value={termFilter} onValueChange={setTermFilter}>
                        <SelectTrigger className="h-9">
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue placeholder={t("common.allTerms")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("common.allTerms")}</SelectItem>
                          {termOptions.map((term) => (
                            <SelectItem key={term.name} value={term.name}>
                              {term.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">{t("common.yearGroup")}</label>
                      <Select value={gradeFilter} onValueChange={setGradeFilter}>
                        <SelectTrigger className="h-9">
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue placeholder={t("common.allYearGroups")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("common.allYearGroups")}</SelectItem>
                          {gradeOptions.map((grade) => (
                            <SelectItem key={grade} value={grade}>
                              {grade}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">{t("common.paymentChannel")}</label>
                      <Select value={paymentChannelFilter} onValueChange={setPaymentChannelFilter}>
                        <SelectTrigger className="h-9">
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue placeholder={t("common.allChannels")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("common.allChannels")}</SelectItem>
                          {paymentMethodOptions.map(method => (
                            <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">{t("receipt.transactionDate")}</label>
                      <div className="flex items-center gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="flex-1 justify-start h-9 font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dateFrom ? format(dateFrom, "dd/MM/yy") : t("common.from")}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={dateFrom || undefined}
                              onSelect={(date) => setDateFrom(date ?? null)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <span className="text-muted-foreground">→</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="flex-1 justify-start h-9 font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dateTo ? format(dateTo, "dd/MM/yy") : t("common.to")}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={dateTo || undefined}
                              onSelect={(date) => setDateTo(date ?? null)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button variant="outline" onClick={clearFilters} className="h-9">{t("common.clear")}</Button>
                  </div>
              </>)}
            </CardContent>
          </Card>

          {/* Bulk Actions Bar - Shows when receipts are selected */}
          {selectedReceipts.size > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-900">
                      {t("receipt.receiptsSelected").replace("{count}", String(selectedReceipts.size))}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!userCanEdit}
                      onClick={bulkDownloadPDF}
                      className="bg-white hover:bg-blue-100 border-blue-300"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {t("receipt.downloadPDF")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!userCanEdit}
                      onClick={bulkResendEmail}
                      className="bg-white hover:bg-blue-100 border-blue-300"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      {t("receipt.resendEmail")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSelection}
                      className="hover:bg-blue-100"
                    >
                      <X className="w-4 h-4 mr-2" />
                      {t("common.clear")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Receipt Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    {/* Checkbox - center aligned */}
                    <TableHead align="center" className="w-12">
                      <Checkbox
                        checked={currentPageReceipts.length > 0 && currentPageReceipts.every(receipt => selectedReceipts.has(receipt.id))}
                        disabled={!userCanEdit}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            selectAllCurrentPage()
                          } else {
                            const newSelected = new Set(selectedReceipts)
                            currentPageReceipts.forEach(receipt => {
                              newSelected.delete(receipt.id)
                            })
                            setSelectedReceipts(newSelected)
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead align="center" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("receiptNumber")}>
                      <div className="flex items-center gap-1 justify-center">
                        {t("receipt.receiptNumber")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead align="center" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("invoiceNumber")}>
                      <div className="flex items-center gap-1 justify-center">
                        {t("receipt.invoice")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead align="center" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("studentName")}>
                      <div className="flex items-center gap-1 justify-center">
                        {category === "external" ? t("receipt.client") : t("common.student")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    {category !== "external" && (
                      <>
                        <TableHead align="center" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("studentGrade")}>
                          <div className="flex items-center gap-1 justify-center">
                            {t("common.yearGroup")}
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead align="center" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("academicYear")}>
                          <div className="flex items-center gap-1 justify-center">
                            {t("common.academicYear")}
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead align="center" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("term")}>
                          <div className="flex items-center gap-1 justify-center">
                            {t("common.term")}
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                      </>
                    )}
                    <TableHead align="center" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("amount")}>
                      <div className="flex items-center gap-1 justify-center">
                        {t("common.amount")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead align="center" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("paymentMethod")}>
                      <div className="flex items-center gap-1 justify-center">
                        {t("common.paymentMethod")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead align="center" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("transactionDate")}>
                      <div className="flex items-center gap-1 justify-center">
                        {t("common.date")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead align="center">{t("common.status")}</TableHead>
                    <TableHead align="center">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPageReceipts.map((receipt) => (
                    <TableRow key={receipt.id}>
                      {/* Checkbox - center aligned */}
                      <TableCell align="center">
                        <Checkbox
                          checked={selectedReceipts.has(receipt.id)}
                          disabled={!userCanEdit}
                          onCheckedChange={() => toggleReceiptSelection(receipt.id)}
                        />
                      </TableCell>
                      <TableCell align="center" className="font-mono text-sm">
                        {receipt.receiptNumber}
                      </TableCell>
                      <TableCell align="center" className="font-mono text-sm">
                        {receipt.invoiceNumber}
                      </TableCell>
                      <TableCell align="center">
                        <div>
                          <div className="font-medium">{receipt.studentName}</div>
                          <div className="text-sm text-muted-foreground">{receipt.familyCode || receipt.studentId}</div>
                        </div>
                      </TableCell>
                      {category !== "external" && (
                        <>
                          <TableCell align="center">
                            <Badge variant="secondary">{receipt.studentGrade}</Badge>
                          </TableCell>
                          <TableCell align="center">{formatAcademicYear(receipt.academicYear)}</TableCell>
                          <TableCell align="center">{(receipt.term?.match(/Term\s*\d+/i) || [])[0] || receipt.term}</TableCell>
                        </>
                      )}
                      <TableCell align="center">฿{receipt.amount.toLocaleString()}</TableCell>
                      <TableCell align="center">{receipt.paymentMethod}</TableCell>
                      <TableCell align="center">{format(receipt.transactionDate, "dd MMM yyyy")}</TableCell>
                      <TableCell align="center">
                        <Badge className="bg-green-100 text-green-800 border border-green-200 hover:bg-green-100">Issued</Badge>
                      </TableCell>
                      <TableCell align="center">
                        <TooltipProvider>
                          <div className="flex gap-1 justify-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => viewReceipt(receipt.id)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t("receipt.viewReceipt")}</p>
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => downloadReceipt(receipt.id)}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t("receipt.downloadPDF")}</p>
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={!userCanEdit}
                                  onClick={() => resendReceipt(receipt.id)}
                                >
                                  <Mail className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t("receipt.resendEmail")}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PaginationBar
                currentPage={currentPage}
                pageSize={pageSize}
                totalCount={sortedReceipts.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
              />
            </CardContent>
          </Card>

          {/* View Receipt Dialog - Official Receipt Template */}
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="max-h-[95vh] overflow-y-auto p-0" style={{ width: "794px", maxWidth: "90vw" }}>
              <DialogHeader className="sr-only">
                <DialogTitle>Receipt Details</DialogTitle>
              </DialogHeader>
              {viewingReceipt && (
                <div className="bg-white">
                  {/* Receipt Document - A4 style */}
                  <div id="receipt-print-area" className="p-8" style={{ fontFamily: 'Times New Roman, serif', fontSize: '12px', lineHeight: '1.4' }}>
                    {/* School Header */}
                    <div className="text-center mb-4">
                      <img src={SchoolLogo} alt="King's College International School" className="mx-auto mb-2" style={{ height: '60px' }} />
                      <p className="text-xs tracking-wider">BANGKOK</p>
                      <p className="text-xs mt-1">{SCHOOL_INFO.address}</p>
                      <p className="text-xs">{SCHOOL_INFO.phone}, {SCHOOL_INFO.email}, {SCHOOL_INFO.website}</p>
                    </div>

                    {/* RECEIPT Title */}
                    <h1 className="text-center text-2xl font-bold my-6 tracking-wide">RECEIPT</h1>

                    {/* Student & Receipt Info Section */}
                    <div className="border border-black p-4 mb-4">
                      <div className="flex justify-between">
                        {/* Left Column - Student Info */}
                        <div className="space-y-1">
                          <div className="flex">
                            <span className="w-28">Family Code</span>
                            <span>{viewingReceipt.familyCode || viewingReceipt.studentId}</span>
                          </div>
                          <div className="flex">
                            <span className="w-28">Student name</span>
                            <span>{viewingReceipt.studentName}</span>
                          </div>
                          <div className="flex">
                            <span className="w-28">Contact name</span>
                            <span>{viewingReceipt.contactName}</span>
                          </div>
                          <div className="flex">
                            <span className="w-28">Address</span>
                            <span>{viewingReceipt.address}</span>
                          </div>
                        </div>
                        {/* Right Column - Receipt Info */}
                        <div className="space-y-1 text-right">
                          <div className="flex justify-end">
                            <span className="w-24 text-left">Receipt no.</span>
                            <span className="w-28 text-right">{viewingReceipt.receiptNumber}</span>
                          </div>
                          <div className="flex justify-end">
                            <span className="w-24 text-left">Receipt date</span>
                            <span className="w-28 text-right">{format(viewingReceipt.transactionDate, "dd MMMM yyyy")}</span>
                          </div>
                          <div className="flex justify-end">
                            <span className="w-24 text-left">Year group</span>
                            <span className="w-28 text-right">{viewingReceipt.studentGrade}</span>
                          </div>
                          <div className="flex justify-end">
                            <span className="w-24 text-left">School year</span>
                            <span className="w-28 text-right">{formatAcademicYear(viewingReceipt.academicYear)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Invoice Table */}
                    <table className="w-full border-collapse border border-black mb-4" style={{ fontSize: '11px' }}>
                      <thead>
                        <tr className="border-b border-black">
                          <th className="border-r border-black p-2 text-left w-10">No.</th>
                          <th className="border-r border-black p-2 text-left w-28">Invoice no.</th>
                          <th className="border-r border-black p-2 text-left w-32">Invoice date</th>
                          <th className="border-r border-black p-2 text-right">Invoice amount<br />(THB)</th>
                          <th className="border-r border-black p-2 text-right">Received amount<br />(THB)</th>
                          <th className="p-2 text-right">Outstanding amount<br />(THB)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-black">
                          <td className="border-r border-black p-2">1</td>
                          <td className="border-r border-black p-2">{viewingReceipt.invoiceNumber}</td>
                          <td className="border-r border-black p-2">{format(viewingReceipt.invoiceDate, "dd MMMM yyyy")}</td>
                          <td className="border-r border-black p-2 text-right">{viewingReceipt.invoiceAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="border-r border-black p-2 text-right">{viewingReceipt.invoiceAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="p-2 text-right">{(viewingReceipt.outstandingAmount || 0) > 0 ? viewingReceipt.outstandingAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                        </tr>
                        {viewingReceipt.appliedCNAmount && viewingReceipt.appliedCNAmount > 0 ? (
                          <tr className="border-b border-black text-red-600">
                            <td className="border-r border-black p-2">2</td>
                            <td className="border-r border-black p-2">{viewingReceipt.appliedCNNumbers && viewingReceipt.appliedCNNumbers.length > 0 ? viewingReceipt.appliedCNNumbers.join(', ') : 'Credit Note'}</td>
                            <td className="border-r border-black p-2 text-center">-</td>
                            <td className="border-r border-black p-2 text-right">-</td>
                            <td className="border-r border-black p-2 text-right">-{viewingReceipt.appliedCNAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="p-2 text-right">-</td>
                          </tr>
                        ) : null}
                        {/* Empty rows for spacing */}
                        <tr className="border-b border-black h-8">
                          <td className="border-r border-black p-2"></td>
                          <td className="border-r border-black p-2"></td>
                          <td className="border-r border-black p-2"></td>
                          <td className="border-r border-black p-2"></td>
                          <td className="border-r border-black p-2"></td>
                          <td className="p-2"></td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Total Row */}
                    <div className="border border-black p-2 mb-6 flex">
                      <div className="flex-1 uppercase text-xs">{numberToWords(viewingReceipt.amount)}</div>
                      <div className="w-20 text-center font-bold border-l border-r border-black px-2">TOTAL</div>
                      <div className="w-28 text-right font-bold">{viewingReceipt.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div className="w-28 text-right">{viewingReceipt.outstandingAmount > 0 ? viewingReceipt.outstandingAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</div>
                    </div>

                    {/* Payment Method Table */}
                    <table className="w-full border-collapse border border-black mb-6" style={{ fontSize: '11px' }}>
                      <thead>
                        <tr className="border-b border-black">
                          <th className="border-r border-black p-2 text-center">Payment method</th>
                          <th className="border-r border-black p-2 text-center">Bank name</th>
                          <th className="border-r border-black p-2 text-center">Bank branch</th>
                          <th className="border-r border-black p-2 text-center">Cheque no.</th>
                          <th className="p-2 text-center">Cheque date</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border-r border-black p-2 text-center">{viewingReceipt.paymentMethod}</td>
                          <td className="border-r border-black p-2 text-center">{viewingReceipt.bankName || '-'}</td>
                          <td className="border-r border-black p-2 text-center">{viewingReceipt.bankBranch || '-'}</td>
                          <td className="border-r border-black p-2 text-center">{viewingReceipt.chequeNo || '-'}</td>
                          <td className="p-2 text-center">{viewingReceipt.chequeDate ? format(viewingReceipt.chequeDate, "dd/MM/yyyy") : '-'}</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Signature Section */}
                    <div className="mt-8 mb-4">
                      <div className="border border-black">
                        <div className="flex">
                          <div className="flex-1 p-4 border-r border-black text-center">
                            <p className="mb-8">{viewingReceipt.collectorName || viewingReceipt.createdBy || ""}</p>
                            <div className="border-t border-black pt-2">
                              <p className="font-semibold">Collector</p>
                            </div>
                          </div>
                          <div className="flex-1 p-4 text-center">
                            <p className="mb-8 italic">{viewingReceipt.approvedBy || ""}</p>
                            <div className="border-t border-black pt-2">
                              <p className="font-semibold">Authorised signature</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Note */}
                    <p className="text-xs text-center italic mt-4">
                      In case of payment made by cheque, this receipt will not be valid until the cheque has been honoured by the bank.
                    </p>
                  </div>

                  {/* Action Buttons - Outside print area */}
                  <div className="flex gap-2 p-4 border-t bg-gray-50">
                    <Button
                      onClick={() => {
                        // Print functionality
                        const printContent = document.getElementById('receipt-print-area')
                        if (printContent) {
                          const printWindow = window.open('', '_blank')
                          if (printWindow) {
                            printWindow.document.write(`
                          <html>
                            <head>
                              <title>Receipt - ${viewingReceipt.receiptNumber}</title>
                              <style>
                                body { font-family: 'Times New Roman', serif; font-size: 12px; line-height: 1.4; margin: 20px; }
                                table { border-collapse: collapse; width: 100%; }
                                th, td { border: 1px solid black; padding: 8px; }
                                .text-center { text-align: center; }
                                .text-right { text-align: right; }
                                .text-left { text-align: left; }
                                .font-bold { font-weight: bold; }
                                .uppercase { text-transform: uppercase; }
                                @media print { body { margin: 0; } }
                              </style>
                            </head>
                            <body>${printContent.innerHTML}</body>
                          </html>
                        `)
                            printWindow.document.close()
                            printWindow.print()
                          }
                        }
                      }}
                      className="flex items-center gap-2"
                    >
                      <Printer className="w-4 h-4" />
                      {t("receipt.print")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        downloadReceipt(viewingReceipt.id)
                        setIsViewDialogOpen(false)
                      }}
                      className="flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      {t("receipt.downloadPDF")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        resendReceipt(viewingReceipt.id)
                        setIsViewDialogOpen(false)
                      }}
                      className="flex items-center gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      {t("receipt.resendEmail")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsViewDialogOpen(false)}
                    >
                      {t("common.close")}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Credit Notes Tab - Hidden for ECA, Trip, Exam, Bus */}
        {
          !hideCreditNotes && <TabsContent value="credit-notes" className="space-y-6 mt-6">
            {/* Filters for Credit Notes */}
            <Card>
              <CardContent className="pt-6 pb-4 space-y-4">
                {/* Search bar + Filters toggle - always visible */}
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={t("receipt.searchCreditNotePlaceholder")}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-9"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowCreditNoteFilters(!showCreditNoteFilters)} className="shrink-0">
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                    <ChevronDown className={cn("w-4 h-4 ml-2 transition-transform", showCreditNoteFilters && "rotate-180")} />
                  </Button>
                </div>

                {/* Collapsible filter dropdowns */}
                {showCreditNoteFilters && (<>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                      {/* Year Group — matches column 3 */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-muted-foreground">{t("common.yearGroup")}</label>
                        <Select value={gradeFilter} onValueChange={setGradeFilter}>
                          <SelectTrigger className="h-9">
                            <Filter className="w-4 h-4 mr-2" />
                            <SelectValue placeholder={t("common.allYearGroups")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t("common.allYearGroups")}</SelectItem>
                            {gradeOptions.map(grade => (
                              <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Posting Date — matches column 8 */}
                      <div className="space-y-1.5 min-w-0">
                        <label className="text-sm font-medium text-muted-foreground">Posting Date ({t("date.from")} → {t("date.to")})</label>
                        <div className="flex items-center gap-2 min-w-0">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="flex-1 min-w-0 justify-start h-9 font-normal">
                                <CalendarIcon className="mr-1 h-4 w-4 shrink-0" />
                                <span className="truncate">{dateFrom ? format(dateFrom, "dd/MM/yy") : t("common.from")}</span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar mode="single" selected={dateFrom || undefined} onSelect={(date) => setDateFrom(date ?? null)} initialFocus />
                            </PopoverContent>
                          </Popover>
                          <span className="text-muted-foreground shrink-0">→</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="flex-1 min-w-0 justify-start h-9 font-normal">
                                <CalendarIcon className="mr-1 h-4 w-4 shrink-0" />
                                <span className="truncate">{dateTo ? format(dateTo, "dd/MM/yy") : t("common.to")}</span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar mode="single" selected={dateTo || undefined} onSelect={(date) => setDateTo(date ?? null)} initialFocus />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      {/* Due Date — matches column 9 */}
                      <div className="space-y-1.5 min-w-0">
                        <label className="text-sm font-medium text-muted-foreground">Due Date ({t("date.from")} → {t("date.to")})</label>
                        <div className="flex items-center gap-2 min-w-0">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="flex-1 min-w-0 justify-start h-9 font-normal">
                                <CalendarIcon className="mr-1 h-4 w-4 shrink-0" />
                                <span className="truncate">{dueDateFrom ? format(dueDateFrom, "dd/MM/yy") : t("common.from")}</span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar mode="single" selected={dueDateFrom || undefined} onSelect={(date) => setDueDateFrom(date ?? null)} initialFocus />
                            </PopoverContent>
                          </Popover>
                          <span className="text-muted-foreground shrink-0">→</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="flex-1 min-w-0 justify-start h-9 font-normal">
                                <CalendarIcon className="mr-1 h-4 w-4 shrink-0" />
                                <span className="truncate">{dueDateTo ? format(dueDateTo, "dd/MM/yy") : t("common.to")}</span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar mode="single" selected={dueDateTo || undefined} onSelect={(date) => setDueDateTo(date ?? null)} initialFocus />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      {/* Status — matches column 10 */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-muted-foreground">{t("common.status")}</label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="h-9">
                            <Filter className="w-4 h-4 mr-2" />
                            <SelectValue placeholder={t("receipt.allStatus")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t("receipt.allStatus")}</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="cancelled-flag">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end mt-4">
                      <Button variant="outline" onClick={clearCreditNoteFilters} className="h-9">{t("common.clear")}</Button>
                    </div>
                </>)}
              </CardContent>
            </Card>

            {/* Bulk Actions Bar for Credit Notes */}
            {selectedCreditNotes.size > 0 && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-blue-900">
                        {t("receipt.creditNotesSelected").replace("{count}", String(selectedCreditNotes.size))}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!userCanEdit}
                        onClick={bulkDownloadCreditNotes}
                        className="bg-white hover:bg-blue-100 border-blue-300"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {t("receipt.downloadPDF")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!userCanEdit}
                        onClick={bulkCancelCreditNotes}
                        className="bg-white hover:bg-blue-100 border-blue-300"
                      >
                        <X className="w-4 h-4 mr-2" />
                        {t("receipt.cancelSelected")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearCreditNoteSelection}
                        className="hover:bg-blue-100"
                      >
                        <X className="w-4 h-4 mr-2" />
                        {t("common.clear")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}


            {/* Credit Notes Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {/* Checkbox - center aligned */}
                      <TableHead align="center" className="w-12">
                        <Checkbox
                          checked={currentPageCreditNotes.length > 0 && currentPageCreditNotes.every(cn => selectedCreditNotes.has(cn.id))}
                          disabled={!userCanEdit}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              selectAllCreditNotesCurrentPage()
                            } else {
                              const newSelected = new Set(selectedCreditNotes)
                              currentPageCreditNotes.forEach(cn => {
                                newSelected.delete(cn.id)
                              })
                              setSelectedCreditNotes(newSelected)
                            }
                          }}
                        />
                      </TableHead>
                      {/* Credit Note # */}
                      <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("creditNoteNumber")}>
                        <div className="flex items-center gap-1">{t("receipt.creditNoteNo")}<ArrowUpDown className="h-4 w-4" /></div>
                      </TableHead>
                      {/* Student */}
                      <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("studentName")}>
                        <div className="flex items-center gap-1">{t("common.student")}<ArrowUpDown className="h-4 w-4" /></div>
                      </TableHead>
                      {/* Grade */}
                      <TableHead align="center" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("studentGrade")}>
                        <div className="flex items-center gap-1 justify-center">{t("common.yearGroup")}<ArrowUpDown className="h-4 w-4" /></div>
                      </TableHead>
                      {/* Amount */}
                      <TableHead align="right" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("amount")}>
                        <div className="flex items-center gap-1 justify-end">{t("common.amount")}<ArrowUpDown className="h-4 w-4" /></div>
                      </TableHead>
                      {/* Amount Inc VAT */}
                      <TableHead align="right">
                        <div className="flex items-center gap-1 justify-end">Amount Inc VAT</div>
                      </TableHead>
                      {/* Remaining Amount */}
                      <TableHead align="right">
                        <div className="flex items-center gap-1 justify-end">Remaining</div>
                      </TableHead>
                      {/* Description */}
                      <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("reason")}>
                        <div className="flex items-center gap-1">Description<ArrowUpDown className="h-4 w-4" /></div>
                      </TableHead>
                      {/* Posting Date */}
                      <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("issueDate")}>
                        <div className="flex items-center gap-1">Posting Date<ArrowUpDown className="h-4 w-4" /></div>
                      </TableHead>
                      {/* Due Date */}
                      <TableHead align="left">
                        <div className="flex items-center gap-1">Due Date</div>
                      </TableHead>
                      {/* Status */}
                      <TableHead align="center">{t("common.status")}</TableHead>
                      {/* Actions */}
                      <TableHead align="center">{t("common.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentPageCreditNotes.map((creditNote) => (
                      <TableRow key={creditNote.id}>
                        {/* Checkbox - center aligned */}
                        <TableCell align="center">
                          <Checkbox
                            checked={selectedCreditNotes.has(creditNote.id)}
                            disabled={!userCanEdit}
                            onCheckedChange={() => toggleCreditNoteSelection(creditNote.id)}
                          />
                        </TableCell>
                        {/* Credit Note # */}
                        <TableCell align="left" className="font-mono text-sm">{creditNote.creditNoteNumber}</TableCell>
                        {/* Student */}
                        <TableCell align="left">
                          <div>
                            <div className="font-medium">{creditNote.studentName}</div>
                            <div className="text-xs text-muted-foreground">{creditNote.studentId}{creditNote.familyCode ? ` · ${creditNote.familyCode}` : ""}</div>
                          </div>
                        </TableCell>
                        {/* Grade */}
                        <TableCell align="center">
                          <Badge className="bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-100">{creditNote.studentGrade}</Badge>
                        </TableCell>
                        {/* Amount */}
                        <TableCell align="right">฿{creditNote.amount.toLocaleString()}</TableCell>
                        {/* Amount Inc VAT */}
                        <TableCell align="right">{creditNote.amountIncludingVat ? `฿${creditNote.amountIncludingVat.toLocaleString()}` : "-"}</TableCell>
                        {/* Remaining Amount */}
                        <TableCell align="right">
                          {creditNote.remainingAmount !== undefined
                            ? <span className={creditNote.remainingAmount === 0 ? "text-gray-400" : creditNote.remainingAmount < creditNote.amount ? "text-amber-700 font-medium" : ""}>฿{creditNote.remainingAmount.toLocaleString()}</span>
                            : <span className="text-muted-foreground">-</span>
                          }
                        </TableCell>
                        {/* Description */}
                        <TableCell align="left" className="max-w-[180px] truncate">{creditNote.description || creditNote.reason}</TableCell>
                        {/* Posting Date */}
                        <TableCell align="left" className="whitespace-nowrap">{format(creditNote.issueDate, "dd/MM/yyyy")}</TableCell>
                        {/* Due Date */}
                        <TableCell align="left" className="whitespace-nowrap">{creditNote.dueDate ? format(creditNote.dueDate, "dd/MM/yyyy") : "-"}</TableCell>
                        {/* Flags */}
                        <TableCell align="center">
                          <div className="flex gap-1 justify-center">
                            {creditNote.paid && <Badge className="text-[10px] px-1.5 py-0" style={{ backgroundColor: "#059669", color: "#fff" }}>Paid</Badge>}
                            {creditNote.cancelled && <Badge className="text-[10px] px-1.5 py-0" style={{ backgroundColor: "#dc2626", color: "#fff" }}>Cancelled</Badge>}
                            {!creditNote.paid && !creditNote.cancelled && <span className="text-muted-foreground text-xs">-</span>}
                          </div>
                        </TableCell>
                        {/* Actions */}
                        <TableCell align="center">
                          <TooltipProvider>
                            <div className="flex gap-1 justify-center">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => viewCreditNote(creditNote.id)}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t("receipt.viewCreditNote")}</p>
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => downloadCreditNote(creditNote.id)}
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t("receipt.downloadPDF")}</p>
                                </TooltipContent>
                              </Tooltip>

                              {creditNote.status !== "cancelled" && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      disabled={!userCanEdit}
                                      onClick={() => cancelCreditNote(creditNote.id)}
                                    >
                                      <X className="w-4 h-4 text-red-500" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t("receipt.cancelCreditNote")}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <PaginationBar
                  currentPage={cnCurrentPage}
                  pageSize={cnPageSize}
                  totalCount={sortedCreditNotes.length}
                  onPageChange={setCnCurrentPage}
                  onPageSizeChange={(size) => { setCnPageSize(size); setCnCurrentPage(1) }}
                />
              </CardContent>
            </Card>

            {/* View Credit Note Dialog */}
            <Dialog open={isViewDialogOpen && viewingCreditNote !== null} onOpenChange={setIsViewDialogOpen}>
              <DialogContent className="max-h-[90vh] overflow-y-auto p-0" style={{ maxWidth: "520px" }}>
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                  <DialogTitle className="text-lg font-bold">{t("receipt.creditNoteDetails")}</DialogTitle>
                </DialogHeader>
                {viewingCreditNote && (
                  <div className="px-8 py-6 space-y-6">

                    {/* CN Number + Status row */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">{t("receipt.creditNoteNumber")}</p>
                        <p className="font-mono font-bold text-base">{viewingCreditNote.creditNoteNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground mb-1">{t("common.status")}</p>
                        {viewingCreditNote.paid && <Badge className="px-3 py-1" style={{ backgroundColor: "#059669", color: "#fff" }}>Paid</Badge>}
                        {viewingCreditNote.cancelled && <Badge className="px-3 py-1" style={{ backgroundColor: "#dc2626", color: "#fff" }}>Cancelled</Badge>}
                        {!viewingCreditNote.paid && !viewingCreditNote.cancelled && <Badge variant="outline">-</Badge>}
                      </div>
                    </div>

                    {/* Amount highlight */}
                    <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-0.5">Amount</p>
                        <p className="text-2xl font-bold">฿{viewingCreditNote.amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-0.5">Amount Inc VAT</p>
                        <p className="text-lg font-bold">{viewingCreditNote.amountIncludingVat ? `฿${viewingCreditNote.amountIncludingVat.toLocaleString()}` : "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-0.5">Remaining</p>
                        <p className={`text-lg font-bold ${viewingCreditNote.remainingAmount === 0 ? "text-gray-400" : "text-amber-600"}`}>
                          {viewingCreditNote.remainingAmount !== undefined ? `฿${viewingCreditNote.remainingAmount.toLocaleString()}` : "-"}
                        </p>
                      </div>
                    </div>

                    {/* Student + Issue info grid */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Student ID</p>
                        <p className="text-sm font-medium font-mono">{viewingCreditNote.studentId}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">{t("receipt.studentName")}</p>
                        <p className="text-sm font-medium">{viewingCreditNote.studentName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">{t("common.yearGroup")}</p>
                        <p className="text-sm font-medium">{viewingCreditNote.studentGrade || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Family Code</p>
                        <p className="text-sm font-medium">{viewingCreditNote.familyCode || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Posting Date</p>
                        <p className="text-sm font-medium">{format(viewingCreditNote.issueDate, "dd MMM yyyy")}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Due Date</p>
                        <p className="text-sm font-medium">{viewingCreditNote.dueDate ? format(viewingCreditNote.dueDate, "dd MMM yyyy") : "-"}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground mb-1">Description</p>
                        <p className="text-sm font-medium">{viewingCreditNote.description || viewingCreditNote.reason}</p>
                      </div>
                    </div>

                    {/* Usage History */}
                    {(() => {
                      const history = viewingCreditNote.usageHistory && viewingCreditNote.usageHistory.length > 0
                        ? viewingCreditNote.usageHistory
                        : (viewingCreditNote.appliedToInvoice || viewingCreditNote.appliedToReceipt)
                          ? [{
                              invoiceId: viewingCreditNote.appliedToInvoice,
                              receiptNo: viewingCreditNote.appliedToReceipt,
                              appliedAmount: 0,
                              appliedAt: viewingCreditNote.appliedAt || viewingCreditNote.appliedDate || "",
                              appliedBy: viewingCreditNote.appliedBy,
                            }]
                          : []
                      if (history.length === 0) return null
                      return (
                        <div className="border-t pt-4">
                          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                            Usage History ({history.length})
                          </p>
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {history.map((entry, idx) => (
                              <div key={idx} className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-3">
                                <div className="col-span-2 flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground font-medium">#{idx + 1}</span>
                                  {entry.appliedAmount > 0 && (
                                    <span className="text-sm font-semibold text-amber-700">−฿{entry.appliedAmount.toLocaleString()}</span>
                                  )}
                                </div>
                                {entry.invoiceId && (
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-1">Applied to Invoice</p>
                                    <p className="text-sm font-medium font-mono">{entry.invoiceId}</p>
                                  </div>
                                )}
                                {entry.receiptNo && (
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-1">Receipt No.</p>
                                    <p className="text-sm font-medium font-mono">{entry.receiptNo}</p>
                                  </div>
                                )}
                                {entry.appliedAt && (
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-1">Applied Date</p>
                                    <p className="text-sm font-medium">
                                      {(() => { try { return format(new Date(entry.appliedAt), "dd MMM yyyy HH:mm") } catch { return entry.appliedAt } })()}
                                    </p>
                                  </div>
                                )}
                                {entry.appliedBy && (
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-1">Applied By</p>
                                    <p className="text-sm font-medium capitalize">{entry.appliedBy}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })()}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 pb-6 border-t">
                      <Button
                        variant="outline"
                        onClick={() => setIsViewDialogOpen(false)}
                      >
                        {t("common.close")}
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>
        }
      </Tabs >

      {/* Create Receipt Dialog - Use ReceiptManagementFlow with dialog only */}
      {
        isCreateDialogOpen && (
          <ReceiptManagementFlow
            menuType="tuition"
            autoOpenForm={true}
            hideMainContent={true}
            onFormClose={() => setIsCreateDialogOpen(false)}
          />
        )
      }

      {/* Create Credit Note Dialog - Hidden for ECA, Trip, Exam, Bus */}
      {
        !hideCreditNotes && <Dialog open={isCreateCreditNoteOpen} onOpenChange={setIsCreateCreditNoteOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="px-6 pt-6">
              <DialogTitle>{t("receipt.createCreditNote")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 px-6 py-4">
              {/* Row 1: Credit Note Number | Student ID */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("receipt.creditNoteNumber")}</Label>
                  <Input
                    placeholder="CN-2025-000001"
                    value={creditNoteForm.creditNoteNumber}
                    onChange={(e) => setCreditNoteForm({ ...creditNoteForm, creditNoteNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2 relative">
                  <Label>Student ID</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search student ID..."
                      value={cnStudentSearch}
                      onChange={(e) => {
                        setCnStudentSearch(e.target.value)
                        setCnStudentDropdownOpen(true)
                      }}
                      onFocus={() => setCnStudentDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setCnStudentDropdownOpen(false), 200)}
                      className="pl-9"
                    />
                  </div>
                  {cnStudentDropdownOpen && cnStudentSearch.length >= 1 && (
                    <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {allStudents
                        .filter(s => {
                          const fullName = `${s.firstName} ${s.lastName}`.trim()
                          return (
                            s.studentId?.toLowerCase().includes(cnStudentSearch.toLowerCase()) ||
                            s.id?.toLowerCase().includes(cnStudentSearch.toLowerCase()) ||
                            fullName.toLowerCase().includes(cnStudentSearch.toLowerCase())
                          )
                        })
                        .slice(0, 8)
                        .map(student => {
                          const fullName = `${student.firstName} ${student.lastName}`.trim()
                          const sid = student.studentId || student.id
                          return (
                            <div
                              key={student.id}
                              className="flex items-center justify-between px-3 py-2 hover:bg-muted cursor-pointer"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                const familyCode = (student as any).familyCode || ""
                                const rawGrade = student.gradeLevel || ""
                                const formattedGrade = rawGrade
                                  .replace(/^(year)(\d+)$/i, (_, prefix, num) => `Year ${num}`)
                                  .replace(/^(pre-nursery|nursery|reception)$/i, (m) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase())
                                setCreditNoteForm(prev => ({
                                  ...prev,
                                  studentId: sid,
                                  studentName: fullName,
                                  yearGroup: formattedGrade,
                                  familyCode: familyCode || prev.familyCode,
                                }))
                                setCnStudentSearch(sid)
                                setCnStudentDropdownOpen(false)
                              }}
                            >
                              <div>
                                <div className="font-medium text-sm">{fullName}</div>
                                <div className="text-xs text-muted-foreground">{sid} · {student.gradeLevel.replace(/^(year)(\d+)$/i, (_, p: string, n: string) => `Year ${n}`).replace(/^(pre-nursery|nursery|reception)$/i, (m: string) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase())}</div>
                              </div>
                            </div>
                          )
                        })}
                      {allStudents.filter(s => {
                        const fullName = `${s.firstName} ${s.lastName}`.trim()
                        return (
                          s.studentId?.toLowerCase().includes(cnStudentSearch.toLowerCase()) ||
                          s.id?.toLowerCase().includes(cnStudentSearch.toLowerCase()) ||
                          fullName.toLowerCase().includes(cnStudentSearch.toLowerCase())
                        )
                      }).length === 0 && (
                        <div className="px-3 py-4 text-sm text-center text-muted-foreground">No students found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: Student Name | Year Group | Family Code */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t("receipt.studentName")}</Label>
                  <Input
                    value={creditNoteForm.studentName}
                    readOnly
                    className="bg-muted/50"
                    placeholder="Auto-filled"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("common.yearGroup")}</Label>
                  <Input
                    value={creditNoteForm.yearGroup}
                    readOnly
                    className="bg-muted/50"
                    placeholder="Auto-filled"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Family Code</Label>
                  <Input
                    placeholder="e.g. 006471"
                    value={creditNoteForm.familyCode}
                    onChange={(e) => setCreditNoteForm({ ...creditNoteForm, familyCode: e.target.value })}
                  />
                </div>
              </div>

              {/* Row 3: Amount | Amount Including VAT | Remaining Amount */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t("receipt.amountTHB")}</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={creditNoteForm.amount || ""}
                    onChange={(e) => setCreditNoteForm({ ...creditNoteForm, amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount Including VAT</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={creditNoteForm.amountIncludingVat || ""}
                    onChange={(e) => setCreditNoteForm({ ...creditNoteForm, amountIncludingVat: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Remaining Amount</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={creditNoteForm.remainingAmount || ""}
                    onChange={(e) => setCreditNoteForm({ ...creditNoteForm, remainingAmount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Row 4: Description (full width) */}
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="e.g. Credit note for ECA"
                  value={creditNoteForm.reason}
                  onChange={(e) => setCreditNoteForm({ ...creditNoteForm, reason: e.target.value })}
                />
              </div>

              {/* Row 5: Posting Date | Due Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Posting Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {creditNoteForm.issueDate ? format(creditNoteForm.issueDate, "dd/MM/yyyy") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={creditNoteForm.issueDate}
                        onSelect={(date) => date && setCreditNoteForm({ ...creditNoteForm, issueDate: date })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start", !creditNoteForm.dueDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {creditNoteForm.dueDate ? format(creditNoteForm.dueDate, "dd/MM/yyyy") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={creditNoteForm.dueDate || undefined}
                        onSelect={(date) => setCreditNoteForm({ ...creditNoteForm, dueDate: date || null })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Row 6: Status (mutually exclusive) */}
              <div className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={() => setCreditNoteForm(prev => ({ ...prev, paid: !prev.paid, cancelled: false }))}
                  className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
                  style={creditNoteForm.paid
                    ? { backgroundColor: "#059669", borderColor: "#059669", color: "#fff" }
                    : { backgroundColor: "#ecfdf5", borderColor: "#6ee7b7", color: "#047857" }
                  }
                >
                  Paid
                </button>
                <button
                  type="button"
                  onClick={() => setCreditNoteForm(prev => ({ ...prev, cancelled: !prev.cancelled, paid: false }))}
                  className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
                  style={creditNoteForm.cancelled
                    ? { backgroundColor: "#dc2626", borderColor: "#dc2626", color: "#fff" }
                    : { backgroundColor: "#fef2f2", borderColor: "#fca5a5", color: "#b91c1c" }
                  }
                >
                  Cancelled
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 pb-6 pt-4">
              <Button variant="outline" onClick={() => setIsCreateCreditNoteOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button disabled={!userCanEdit} onClick={handleCreateCreditNote}>
                {t("receipt.createCreditNote")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      }
      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
        setIsImportDialogOpen(open)
        if (!open) { setImportPreview([]); setImportErrors([]); setImportFileName("") }
      }}>
        <DialogContent className="max-w-4xl w-[90vw] flex flex-col max-h-[90vh] p-0">
          <div className="p-6 pb-0">
            <DialogHeader>
              <DialogTitle>{t("receipt.importCreditNotes")}</DialogTitle>
              <DialogDescription>
                {t("receipt.importCreditNotesDesc")}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Template Download */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div>
                <p className="font-medium">{t("student.excelTemplate")}</p>
                <p className="text-sm text-muted-foreground">{t("receipt.downloadTemplateDesc")}</p>
              </div>
              <Button variant="outline" onClick={downloadTemplate}>
                <FileDown className="w-4 h-4 mr-2" />
                {t("student.downloadTemplate")}
              </Button>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="creditNoteFile">{t("student.uploadFile")} <span className="text-destructive">*</span></Label>
              <Input
                id="creditNoteFile"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportFile}
                className="cursor-pointer"
                disabled={!userCanEdit}
              />
            </div>

            {/* Error Display */}
            {importErrors.length > 0 && (
              <div className="space-y-2">
                <Label className="text-red-600 font-medium flex items-center gap-2">
                  <X className="w-4 h-4" />
                  {t("receipt.importErrors")} ({importErrors.length})
                </Label>
                <div className="p-3 border border-red-200 bg-red-50 rounded-lg text-red-700 text-sm max-h-[150px] overflow-y-auto space-y-1">
                  {importErrors.map((err, i) => (
                    <p key={i} className="flex gap-2">
                      <span className="font-semibold shrink-0">•</span>
                      <span>{err}</span>
                    </p>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground italic">
                  {t("receipt.errorRowsWillBeSkipped")}
                </p>
              </div>
            )}

            {/* Empty State */}
            {importFileName && importPreview.length === 0 && importErrors.length === 0 && (
              <div className="p-8 text-center border-2 border-dashed rounded-lg bg-muted/20">
                <p className="text-muted-foreground font-medium">{t("receipt.noDataInFile")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("receipt.checkTemplateFormat")}</p>
              </div>
            )}

            {/* Preview Table */}
            {importPreview.length > 0 && (
              <div className="space-y-2">
                <Label>{t("receipt.previewRecords").replace("{count}", String(importPreview.length))}</Label>
                <div className="border rounded-lg overflow-x-auto">
                  <Table className="min-w-[700px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead align="left" className="w-32">{t("receipt.creditNoteNo")}</TableHead>
                        <TableHead align="left">{t("common.student")}</TableHead>
                        <TableHead align="left" className="w-24">{t("common.yearGroup")}</TableHead>
                        <TableHead align="right" className="w-28">{t("common.amount")}</TableHead>
                        <TableHead align="left" className="w-24">{t("common.date")}</TableHead>
                        <TableHead align="left">{t("receipt.reason")}</TableHead>
                        <TableHead align="center" className="w-20">{t("common.status")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importPreview.map((cn, i) => (
                        <TableRow key={i}>
                          <TableCell align="left" className="font-mono text-sm whitespace-nowrap">{cn.creditNoteNumber}</TableCell>
                          <TableCell align="left" className="max-w-[160px]">
                            <div className="font-medium text-sm truncate" title={cn.studentName}>{cn.studentName}</div>
                            <div className="text-xs text-muted-foreground">{cn.studentId}</div>
                          </TableCell>
                          <TableCell align="left"><Badge variant="outline" className="text-xs">{cn.studentGrade}</Badge></TableCell>
                          <TableCell align="right" className="font-medium whitespace-nowrap">฿{cn.amount.toLocaleString()}</TableCell>
                          <TableCell align="left" className="text-sm whitespace-nowrap">{format(cn.issueDate, "dd/MM/yyyy")}</TableCell>
                          <TableCell align="left" className="text-sm max-w-[160px]"><span className="block truncate" title={cn.reason}>{cn.reason}</span></TableCell>
                          <TableCell align="center">
                            <Badge className={cn.status === "issued" ? "bg-blue-100 text-blue-800" : cn.status === "cancelled" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}>
                              {cn.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 pt-4 border-t flex justify-end gap-2 shrink-0">
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={performImport}
              disabled={!userCanEdit || importPreview.length === 0}
            >
              <Upload className="w-4 h-4 mr-2" />
              {importPreview.length > 0 ? t("receipt.importRecords").replace("{count}", String(importPreview.length)) : t("common.import")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Email Template Dialog */}
      <EditTemplateDialog
        open={isTemplateDialogOpen}
        onClose={() => setIsTemplateDialogOpen(false)}
        template={templateToEdit}
        templateType="receipt"
        onSave={(form) => {
          const allTpl = migrateTemplates()
          const now = new Date().toISOString()
          const createdBy = user?.username || user?.name || "Staff"
          let updated: EmailTemplate[]
          if (templateToEdit) {
            updated = allTpl.map(t =>
              t.id === templateToEdit.id ? { ...t, ...form, updatedAt: now } : t
            )
          } else {
            const isFirst = allTpl.filter(t => t.type === "receipt").length === 0
            updated = [...allTpl, {
              id: `tpl-${Date.now()}`,
              ...form,
              type: "receipt" as const,
              language: "en" as const,
              isDefault: isFirst,
              status: "active" as const,
              createdAt: now,
              updatedAt: now,
              createdBy,
              version: 1,
            }]
          }
          saveTemplates(updated)
          setIsTemplateDialogOpen(false)
        }}
      />

    </div >
  )
}