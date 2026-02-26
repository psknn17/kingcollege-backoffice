import { useState, useEffect } from "react"
import * as XLSX from "xlsx"
import { downloadAsXlsx, normalizeAcademicYear, formatAcademicYear } from "@/utils/xlsxUtils"
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
import { CalendarIcon, Download, Filter, Eye, Mail, ArrowUpDown, Plus, FileDown, X, CheckSquare, Search, Upload, Printer } from "lucide-react"
import { PaymentChannel } from "./StatusFilter"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "./ui/pagination"
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
}

interface CreditNote {
  id: string
  creditNoteNumber: string
  invoiceNumber: string
  studentName: string
  studentId: string
  studentGrade: string
  amount: number
  remainingBalance?: number
  reason: string
  issueDate: Date
  academicYear: string
  term: string
  status: "issued" | "cancelled" | "pending" | "used" | "partial"
  familyCode?: string
  appliedToReceipt?: string
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
      // Format: "2025-2026 - Term 2 (January - March)" or just "2025-2026"
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
        invoiceAmount: r.invoices?.[0]?.invoiceAmount || r.totalAmount,
        amount: r.totalAmount,
        outstandingAmount: r.invoices?.[0]?.outstandingAmount || 0,
        paymentMethod: r.paymentMethod || "N/A",
        paymentChannel: "counter_bank" as const,
        transactionDate: new Date(r.receiptDate || r.createdAt),
        academicYear: academicYear,
        term: term,
        downloadCount: 0,
        collectorName: "System",
        familyCode: familyCode
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
    creditNoteNumber: "CN-2025-000001",
    invoiceNumber: "20250000001",
    studentName: studentData[0].name,
    studentId: studentData[0].id,
    studentGrade: studentData[0].grade,
    amount: 5000,
    reason: "Course cancellation",
    issueDate: new Date("2025-08-20"),
    academicYear: "2025-2026",
    term: "Term 1",
    status: "issued"
  },
  {
    id: "2",
    creditNoteNumber: "CN-2025-000002",
    invoiceNumber: "20250000001",
    studentName: studentData[1].name,
    studentId: studentData[1].id,
    studentGrade: studentData[1].grade,
    amount: 3000,
    reason: "Overpayment refund",
    issueDate: new Date("2025-08-19"),
    academicYear: "2025-2026",
    term: "Term 1",
    status: "issued"
  },
  {
    id: "3",
    creditNoteNumber: "CN-2025-000003",
    invoiceNumber: "20250000001",
    studentName: studentData[2].name,
    studentId: studentData[2].id,
    studentGrade: studentData[2].grade,
    amount: 10000,
    reason: "Activity cancellation",
    issueDate: new Date("2025-08-18"),
    academicYear: "2024-2025",
    term: "Term 2",
    status: "pending"
  }
]

// Add more mock credit notes
for (let i = 4; i <= 50; i++) {
  const student = studentData[i % studentData.length]
  const reasons = ["Course cancellation", "Overpayment refund", "Activity cancellation", "Billing error", "Withdrawal"]
  const academicYears = ["2024-2025", "2025-2026"]
  const terms = ["Term 1", "Term 2", "Term 3"]
  const statuses: ("issued" | "cancelled" | "pending")[] = ["issued", "cancelled", "pending"]

  mockCreditNotes.push({
    id: i.toString(),
    creditNoteNumber: `CN-2025-${String(i).padStart(6, '0')}`,
    invoiceNumber: `20250000001${String(1234 + i).padStart(6, '0')}`,
    studentName: student.name,
    studentId: student.id,
    studentGrade: student.grade,
    amount: Math.floor(Math.random() * 50000) + 1000,
    reason: reasons[Math.floor(Math.random() * reasons.length)],
    issueDate: new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
    academicYear: academicYears[Math.floor(Math.random() * academicYears.length)],
    term: terms[Math.floor(Math.random() * terms.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)]
  })
}

const CREDIT_NOTES_STORAGE_KEY = "creditNotesRecords"

const loadCreditNotesFromStorage = (): CreditNote[] => {
  try {
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
          issueDate: new Date(cn.issueDate),
          familyCode: matchingInvoice?.familyCode || matchingInvoice?.adultIdNo || cn.familyCode || ""
        }
      })
    }
  } catch { }
  // Build mock data with family code enrichment
  const invoicesStored = localStorage.getItem("createdInvoices")
  const invoices = invoicesStored ? JSON.parse(invoicesStored) : []
  // Enrich mock CNs with student data from actual invoices so IDs match real invoices
  const invoiceStudents = invoices.reduce((acc: Record<string, { studentId: string; studentName: string; familyCode: string }>, inv: any) => {
    if (inv.studentId && inv.studentName) {
      acc[inv.studentId] = { studentId: inv.studentId, studentName: inv.studentName, familyCode: inv.adultIdNo || inv.familyCode || "" }
    }
    return acc
  }, {})
  const invoiceStudentList = Object.values(invoiceStudents) as { studentId: string; studentName: string; familyCode: string }[]

  // Generate extra mock CNs for actual students in the system if there are real invoices
  const extraCNs: CreditNote[] = invoiceStudentList.slice(0, 5).map((s, i) => ({
    id: `mock-real-${i + 1}`,
    creditNoteNumber: `CN-${new Date().getFullYear()}-${String(900 + i + 1).padStart(6, "0")}`,
    invoiceNumber: "",
    studentName: s.studentName,
    studentId: s.studentId,
    studentGrade: "",
    amount: [5000, 10000, 15000, 3000, 8000][i % 5],
    reason: ["Overpayment refund", "Course cancellation", "Duplicate payment", "Activity cancellation", "Billing adjustment"][i % 5],
    issueDate: new Date(Date.now() - (i + 1) * 7 * 24 * 3600 * 1000),
    academicYear: "2025-2026",
    term: "Term 1",
    status: "issued" as const,
    familyCode: s.familyCode
  }))

  const mockData = [
    ...mockCreditNotes.map(cn => {
      const matchingInvoice = invoices.find((inv: any) => inv.invoiceNumber === cn.invoiceNumber)
      return { ...cn, familyCode: matchingInvoice?.familyCode || matchingInvoice?.adultIdNo || cn.familyCode || "" }
    }),
    ...extraCNs
  ]
  // Save to localStorage so other components (InvoiceManagement) can read them
  try { localStorage.setItem(CREDIT_NOTES_STORAGE_KEY, JSON.stringify(mockData)) } catch { }
  return mockData
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

  // Filter states
  const [searchTerm, setSearchTerm] = usePersistedState("receipt-page:search", "")
  const [academicYearFilter, setAcademicYearFilter] = usePersistedState("receipt-page:academicYear", "all")
  const [termFilter, setTermFilter] = useState("all")
  const [gradeFilter, setGradeFilter] = useState("all")
  const [paymentChannelFilter, setPaymentChannelFilter] = useState<PaymentChannel>("all")
  const [statusFilter, setStatusFilter] = useState("all") // For Credit Notes
  const [dateFrom, setDateFrom] = useState<Date | null>(null)
  const [dateTo, setDateTo] = useState<Date | null>(null)

  // Pagination states
  const [currentPage, setCurrentPage] = usePersistedState("receipt-page:page", 1)
  const [pageSize] = usePersistedState("receipt-page:pageSize", 15)
  const itemsPerPage = pageSize

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
  const [creditNoteForm, setCreditNoteForm] = useState({
    creditNoteNumber: `CN-${new Date().getFullYear()}-${String(mockCreditNotes.length + 1).padStart(6, '0')}`,
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

  const applyFilters = () => {
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
      filtered = filtered.filter(receipt => receipt.paymentChannel === paymentChannelFilter)
    }

    if (dateFrom) {
      filtered = filtered.filter(receipt => receipt.transactionDate >= dateFrom)
    }

    if (dateTo) {
      filtered = filtered.filter(receipt => receipt.transactionDate <= dateTo)
    }

    setFilteredReceipts(filtered)
    setCurrentPage(1) // Reset to first page when filtering
  }

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

      toast.success(`Downloading receipt ${receipt.receiptNumber}`)

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
      toast.success(`Email sent to parent of ${receipt.studentName}`)
    }
  }

  const bulkDownloadPDF = () => {
    if (selectedReceipts.size === 0) {
      toast.error("Please select receipts to download")
      return
    }

    const selectedReceiptsList = receipts.filter(r => selectedReceipts.has(r.id))

    // In production, this would call an API to generate a ZIP file with all PDFs
    toast.success(`Downloading ${selectedReceipts.size} receipt(s)...`)

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
      toast.error("Please select receipts to resend")
      return
    }

    toast.success(`Sending emails for ${selectedReceipts.size} receipt(s)...`)
    setSelectedReceipts(new Set())
  }

  const downloadInterfaceFile = () => {
    if (filteredReceipts.length === 0) {
      toast.error("No receipts to export")
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

    const mapPaymentOption = (method: string): string => {
      if (!method) return ""
      const m = method.toLowerCase()
      if (m.includes("transfer") || m.includes("bank")) return "Transfer"
      if (m.startsWith("edc") || m.includes("credit card")) return "Credit Card"
      if (m.includes("cheque") || m.includes("check")) return "Cheque"
      if (m.includes("cash")) return "Cash"
      return method
    }

    // Load bank accounts to get Receive Account no.
    const bankAccountsStored = localStorage.getItem("kingscollege_backoffice_bankAccounts")
    const bankAccounts = bankAccountsStored ? JSON.parse(bankAccountsStored) : []

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
      }

      return matchedAccount?.glAccount || matchedAccount?.accountNumber || ""
    }

    const wb = XLSX.utils.book_new()

    // Title row + header row + data rows
    const titleRow = ["Interface File - Sales Receipt for school fees"]
    const headerRow = [
      "Receipt no.", "Customer no.", "Type", "RV no. series",
      "Receive date", "Payment method", "Payment option", "Sell-to-customer No.",
      "Receive Account no.", "Year group", "School year", "Invoice no.", "Amount"
    ]

    const dataRows = filteredReceipts.map(r => [
      r.receiptNumber,
      r.familyCode || r.studentId, // Customer no. (Family Code)
      "CASHRCPT",
      "AR-RV",
      format(r.transactionDate, "dd/MM/yyyy"),
      mapPaymentMethod(r.paymentMethod),
      mapPaymentOption(r.paymentMethod),
      r.studentId, // Sell-to-customer No. (Student ID)
      getReceiveAccountNo(r.paymentMethod),
      r.studentGrade,
      (r.academicYear || "").replace(/-/g, "/"),
      r.invoiceNumber,
      r.amount
    ])

    const ws = XLSX.utils.aoa_to_sheet([titleRow, [], headerRow, ...dataRows])

    // Column widths
    ws["!cols"] = [
      { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
      { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 20 },
      { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 12 }
    ]

    XLSX.utils.book_append_sheet(wb, ws, "Receipts")
    XLSX.writeFile(wb, `interface-receipts-${format(new Date(), "dd-MM-yyyy")}.xlsx`)
    toast.success("Interface file downloaded successfully")
  }

  const exportToExcel = () => {
    const isCreditNoteMode = activeTab === "credit-notes" || viewMode === "credit-notes"
    if (isCreditNoteMode) {
      const headers = ['Credit Note No.', 'Invoice Number', 'Student Name', 'Student ID', 'Year Group', 'Amount (THB)', 'Reason', 'Issue Date', 'Academic Year', 'Term', 'Status']
      const rows = filteredCreditNotes.map(cn => [
        cn.creditNoteNumber,
        cn.invoiceNumber,
        cn.studentName,
        cn.studentId,
        cn.studentGrade,
        cn.amount,
        cn.reason,
        format(cn.issueDate, 'dd/MM/yyyy'),
        formatAcademicYear(cn.academicYear),
        cn.term,
        cn.status
      ])
      downloadAsXlsx(headers, rows, `credit-notes-export-${format(new Date(), 'dd-MM-yyyy')}`)
      toast.success("Credit notes exported to Excel successfully")
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
      toast.success("Receipts exported to Excel successfully")
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
  const applyCreditNoteFilters = () => {
    let filtered = creditNotes

    if (searchTerm) {
      filtered = filtered.filter(cn =>
        cn.creditNoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cn.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cn.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cn.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cn.reason.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (academicYearFilter !== "all") {
      const selectedYear = academicYears.find(y => y.id === academicYearFilter)
      if (selectedYear) {
        filtered = filtered.filter(cn => normalizeAcademicYear(cn.academicYear) === normalizeAcademicYear(selectedYear.name))
      }
    }

    if (termFilter !== "all") {
      filtered = filtered.filter(cn => cn.term === termFilter)
    }

    if (gradeFilter !== "all") {
      filtered = filtered.filter(cn => cn.studentGrade === gradeFilter)
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(cn => cn.status === statusFilter)
    }

    if (dateFrom) {
      filtered = filtered.filter(cn => cn.issueDate >= dateFrom)
    }

    if (dateTo) {
      filtered = filtered.filter(cn => cn.issueDate <= dateTo)
    }

    setFilteredCreditNotes(filtered)
    setCurrentPage(1)
  }

  const clearCreditNoteFilters = () => {
    setSearchTerm("")
    setAcademicYearFilter("all")
    setTermFilter("all")
    setGradeFilter("all")
    setStatusFilter("all")
    setDateFrom(null)
    setDateTo(null)
    setFilteredCreditNotes(creditNotes)
    setCurrentPage(1)
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
      toast.success(`Downloading credit note ${creditNote.creditNoteNumber}`)
    }
  }

  const cancelCreditNote = (creditNoteId: string) => {
    const creditNote = creditNotes.find(cn => cn.id === creditNoteId)
    if (creditNote) {
      if (creditNote.status === "cancelled") {
        toast.error("Credit note already cancelled")
        return
      }
      const updatedCreditNotes = creditNotes.map(cn =>
        cn.id === creditNoteId ? { ...cn, status: "cancelled" as const } : cn
      )
      setCreditNotes(updatedCreditNotes)
      setFilteredCreditNotes(updatedCreditNotes)
      toast.success(`Credit note ${creditNote.creditNoteNumber} cancelled`)
    }
  }

  const bulkDownloadCreditNotes = () => {
    if (selectedCreditNotes.size === 0) {
      toast.error("Please select credit notes to download")
      return
    }
    toast.success(`Downloading ${selectedCreditNotes.size} credit note(s)...`)
    setSelectedCreditNotes(new Set())
  }

  const bulkCancelCreditNotes = () => {
    if (selectedCreditNotes.size === 0) {
      toast.error("Please select credit notes to cancel")
      return
    }
    const updatedCreditNotes = creditNotes.map(cn =>
      selectedCreditNotes.has(cn.id) && cn.status !== "cancelled"
        ? { ...cn, status: "cancelled" as const }
        : cn
    )
    setCreditNotes(updatedCreditNotes)
    setFilteredCreditNotes(updatedCreditNotes)
    toast.success(`Cancelled ${selectedCreditNotes.size} credit note(s)`)
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
      toast.error("Credit Note Number is required")
      return
    }
    if (!creditNoteForm.invoiceNumber) {
      toast.error("Invoice Number is required")
      return
    }
    if (!creditNoteForm.studentName) {
      toast.error("Student Name is required")
      return
    }
    if (!creditNoteForm.amount || creditNoteForm.amount <= 0) {
      toast.error("Amount must be greater than 0")
      return
    }
    if (!creditNoteForm.reason) {
      toast.error("Reason is required")
      return
    }

    const newCreditNote: CreditNote = {
      id: (creditNotes.length + 1).toString(),
      creditNoteNumber: creditNoteForm.creditNoteNumber,
      invoiceNumber: creditNoteForm.invoiceNumber,
      studentName: creditNoteForm.studentName,
      studentId: creditNoteForm.studentId,
      studentGrade: creditNoteForm.yearGroup,
      amount: creditNoteForm.amount,
      reason: creditNoteForm.reason,
      issueDate: creditNoteForm.issueDate,
      academicYear: creditNoteForm.academicYear,
      term: creditNoteForm.term,
      status: "pending"
    }

    setCreditNotes([newCreditNote, ...creditNotes])
    setFilteredCreditNotes([newCreditNote, ...creditNotes])

    // Reset form with auto-generated credit note number
    setCreditNoteForm({
      creditNoteNumber: `CN-${new Date().getFullYear()}-${String(creditNotes.length + 2).padStart(6, '0')}`,
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

    setIsCreateCreditNoteOpen(false)
    toast.success("Credit note created successfully")
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
      toast.error("Please select an Excel file (.xlsx or .xls)")
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
          const cancelled = row["Cancelled"]
          const description = String(row["Description"] || "").trim()
          const postingDate = row["Posting Date"]

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
            reason: description || "Imported Credit Note",
            issueDate: parseImportDate(postingDate),
            academicYear: "",
            term: "",
            status,
          })
        })

        setImportPreview(preview)
        setImportErrors(errors)
      } catch (err) {
        console.error("Import error:", err)
        toast.error("Failed to read Excel file")
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
      ? `Imported ${newNotes.length} credit notes (${duplicates} duplicates skipped)`
      : `Successfully imported ${newNotes.length} credit notes`)
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
    toast.success("Template downloaded")
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
  const totalCreditNotePages = Math.ceil(sortedCreditNotes.length / itemsPerPage)
  const startCreditNoteIndex = (currentPage - 1) * itemsPerPage
  const endCreditNoteIndex = startCreditNoteIndex + itemsPerPage
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
      <div className="mb-4">
        <h3 className="text-lg font-medium">
          {activeTab === "credit-notes" ? "Credit Notes" : "Receipts"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {activeTab === "credit-notes" ? "View and manage credit notes" : "View and manage payment receipts"}
        </p>
      </div>

      {/* Tabs with Buttons in same row */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between gap-4 mb-6">
          {viewMode === "both" && !hideCreditNotes && (
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="receipts">Receipts</TabsTrigger>
              <TabsTrigger value="credit-notes">Credit Notes</TabsTrigger>
            </TabsList>
          )}

          <div className="flex gap-2 shrink-0 ml-auto items-center">
            {(activeTab === "credit-notes" || viewMode === "credit-notes") && (
              <Button
                variant="outline"
                className="flex items-center gap-2"
                disabled={!userCanEdit}
                onClick={() => setIsImportDialogOpen(true)}
              >
                <Upload className="w-4 h-4" />
                Import
              </Button>
            )}
            <Button
              variant="outline"
              className="flex items-center gap-2"
              disabled={!userCanEdit}
              onClick={exportToExcel}
            >
              <FileDown className="w-4 h-4" />
              Export All
            </Button>
            {(activeTab !== "credit-notes" && viewMode !== "credit-notes") && (
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={downloadInterfaceFile}
              >
                <Download className="w-4 h-4" />
                Download Interface File
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
              {(activeTab === "credit-notes" || viewMode === "credit-notes") ? "Create Credit Note" : "Create Receipt"}
            </Button>
          </div>
        </div>

        {/* Receipts Tab */}
        <TabsContent value="receipts" className="space-y-6 mt-6">
          {/* Filters */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Filter className="w-4 h-4" />
                  {t("common.searchAndFilter")}
                </CardTitle>
                <div className="flex gap-2">
                  <Button onClick={applyFilters} className="h-9">{t("common.apply")}</Button>
                  <Button variant="outline" onClick={clearFilters} className="h-9">{t("common.clear")}</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Row 1: Search, Academic Year, Term */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">{t("common.search")}</label>
                  <Input
                    placeholder={t("receipt.searchPlaceholder")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">{t("common.academicYear")}</label>
                  <Select value={academicYearFilter} onValueChange={(value) => {
                    setAcademicYearFilter(value)
                    setTermFilter("all")
                  }}>
                    <SelectTrigger className="h-9">
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
              </div>

              {/* Row 2: Year Group, Payment Channel, Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">{t("common.yearGroup")}</label>
                  <Select value={gradeFilter} onValueChange={setGradeFilter}>
                    <SelectTrigger className="h-9">
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
                  <Select value={paymentChannelFilter} onValueChange={(value) => setPaymentChannelFilter(value as PaymentChannel)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t("common.allChannels")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.allChannels")}</SelectItem>
                      <SelectItem value="credit_card">{t("common.creditCard")}</SelectItem>
                      <SelectItem value="wechat_pay">{t("common.wechatPay")}</SelectItem>
                      <SelectItem value="alipay">{t("common.alipay")}</SelectItem>
                      <SelectItem value="qr_payment">{t("common.qrPayment")}</SelectItem>
                      <SelectItem value="counter_bank">{t("common.counterBank")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">{t("common.dateRange")}</label>
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
                      {selectedReceipts.size} receipt(s) selected
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
                      Download PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!userCanEdit}
                      onClick={bulkResendEmail}
                      className="bg-white hover:bg-blue-100 border-blue-300"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Resend Email
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSelection}
                      className="hover:bg-blue-100"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Clear
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results Summary */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">
                {t("receipt.showing")} {startIndex + 1}-{Math.min(endIndex, filteredReceipts.length)} {t("receipt.of")} {filteredReceipts.length} {t("receipt.receipts")}
                {filteredReceipts.length !== receipts.length && (
                  <span> ({t("receipt.filteredFrom")} {receipts.length} {t("receipt.total")})</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t("common.page")} {currentPage} {t("common.of")} {totalPages}
              </span>
            </div>
          </div>

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
                    {/* Receipt # - left aligned (ID/code) */}
                    <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("receiptNumber")}>
                      <div className="flex items-center gap-1">
                        {t("receipt.receiptNumber")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    {/* Invoice # - left aligned (ID/code) */}
                    <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("invoiceNumber")}>
                      <div className="flex items-center gap-1">
                        {t("receipt.invoice")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    {/* Student/Client - left aligned (text/name) */}
                    <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("studentName")}>
                      <div className="flex items-center gap-1">
                        {category === "external" ? "Client" : t("common.student")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    {category !== "external" && (
                      <>
                        {/* Grade - center aligned (badge) */}
                        <TableHead align="center" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("studentGrade")}>
                          <div className="flex items-center gap-1 justify-center">
                            {t("common.yearGroup")}
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        {/* Academic Year - left aligned (text) */}
                        <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("academicYear")}>
                          <div className="flex items-center gap-1">
                            {t("common.academicYear")}
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        {/* Term - left aligned (text) */}
                        <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("term")}>
                          <div className="flex items-center gap-1">
                            {t("common.term")}
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                      </>
                    )}
                    {/* Amount - right aligned (currency) */}
                    <TableHead align="right" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("amount")}>
                      <div className="flex items-center gap-1 justify-end">
                        {t("common.amount")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    {/* Payment Method - left aligned (text) */}
                    <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("paymentMethod")}>
                      <div className="flex items-center gap-1">
                        {t("common.paymentMethod")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    {/* Date - left aligned (date) */}
                    <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("transactionDate")}>
                      <div className="flex items-center gap-1">
                        {t("common.date")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    {/* Actions - center aligned */}
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
                      {/* Receipt # - left aligned */}
                      <TableCell align="left" className="font-mono text-sm">
                        {receipt.receiptNumber}
                      </TableCell>
                      {/* Invoice # - left aligned */}
                      <TableCell align="left" className="font-mono text-sm">
                        {receipt.invoiceNumber}
                      </TableCell>
                      {/* Student/Client - left aligned */}
                      <TableCell align="left">
                        <div>
                          <div className="font-medium">{receipt.studentName}</div>
                          <div className="text-sm text-muted-foreground">{receipt.familyCode || receipt.studentId}</div>
                        </div>
                      </TableCell>
                      {category !== "external" && (
                        <>
                          {/* Grade - center aligned */}
                          <TableCell align="center">
                            <Badge variant="secondary">{receipt.studentGrade}</Badge>
                          </TableCell>
                          {/* Academic Year - left aligned */}
                          <TableCell align="left">{formatAcademicYear(receipt.academicYear)}</TableCell>
                          {/* Term - left aligned */}
                          <TableCell align="left">{receipt.term}</TableCell>
                        </>
                      )}
                      {/* Amount - right aligned */}
                      <TableCell align="right">฿{receipt.amount.toLocaleString()}</TableCell>
                      {/* Payment Method - left aligned */}
                      <TableCell align="left">{receipt.paymentMethod}</TableCell>
                      {/* Date - left aligned */}
                      <TableCell align="left">{format(receipt.transactionDate, "MMM dd, yyyy")}</TableCell>
                      {/* Actions - center aligned */}
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
                                <p>View Receipt</p>
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
                                <p>Download PDF</p>
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
                                <p>Resend Email</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => goToPage(currentPage - 1)}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>

                  {[...Array(Math.min(5, totalPages))].map((_, index) => {
                    const pageNumber = Math.max(1, currentPage - 2) + index
                    if (pageNumber > totalPages) return null

                    return (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          onClick={() => goToPage(pageNumber)}
                          isActive={currentPage === pageNumber}
                          className="cursor-pointer"
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  })}

                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => goToPage(currentPage + 1)}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}

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
                          <td className="border-r border-black p-2 text-right">{viewingReceipt.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="p-2 text-right">{viewingReceipt.outstandingAmount > 0 ? viewingReceipt.outstandingAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                        </tr>
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
                            <p className="mb-8">{viewingReceipt.collectorName || 'Thananchaya Chalorkpunrattana'}</p>
                            <div className="border-t border-black pt-2">
                              <p className="font-semibold">Collector</p>
                            </div>
                          </div>
                          <div className="flex-1 p-4 text-center">
                            <p className="mb-8 italic text-blue-800">Porntip Jarusintrangkul</p>
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
                      Print
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
                      Download PDF
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
                      Resend Email
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsViewDialogOpen(false)}
                    >
                      Close
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
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Filter className="w-4 h-4" />
                    Search & Filter
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button onClick={applyCreditNoteFilters} className="h-9">Apply</Button>
                    <Button variant="outline" onClick={clearCreditNoteFilters} className="h-9">Clear</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Row 1: Search, Status, Year Group */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by credit note, invoice, student, or reason..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="issued">Issued</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">Year Group</label>
                    <Select value={gradeFilter} onValueChange={setGradeFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All Year Groups" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Year Groups</SelectItem>
                        {gradeOptions.map(grade => (
                          <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 2: Term, Academic Year, Date From, Date To */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">Term</label>
                    <Select value={termFilter} onValueChange={setTermFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All Terms" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Terms</SelectItem>
                        {termOptions.map(term => (
                          <SelectItem key={term.name} value={term.name}>{term.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">Academic Year</label>
                    <Select value={academicYearFilter} onValueChange={setAcademicYearFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All Years" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Academic Years</SelectItem>
                        {academicYears && academicYears.length > 0 ? (
                          academicYears.map(year => (
                            <SelectItem key={year.id} value={year.id}>{formatAcademicYear(year.name)}</SelectItem>
                          ))
                        ) : null}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">Date Range</label>
                    <div className="flex items-center gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="flex-1 justify-start h-9 font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateFrom ? format(dateFrom, "dd/MM/yy") : "From"}
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
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground opacity-0">To</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start h-9 font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateTo ? format(dateTo, "dd/MM/yy") : "To"}
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
                        {selectedCreditNotes.size} credit note(s) selected
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
                        Download PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!userCanEdit}
                        onClick={bulkCancelCreditNotes}
                        className="bg-white hover:bg-blue-100 border-blue-300"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel Selected
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearCreditNoteSelection}
                        className="hover:bg-blue-100"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Clear
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results Summary */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  Showing {startCreditNoteIndex + 1}-{Math.min(endCreditNoteIndex, filteredCreditNotes.length)} of {filteredCreditNotes.length} credit notes
                  {filteredCreditNotes.length !== creditNotes.length && (
                    <span> (filtered from {creditNotes.length} total)</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalCreditNotePages}
                </span>
              </div>
            </div>

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
                      {/* Credit Note # - left aligned (ID/code) */}
                      <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("creditNoteNumber")}>
                        <div className="flex items-center gap-1">
                          Credit Note No.
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      {/* Student - left aligned (text/name) */}
                      <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("studentName")}>
                        <div className="flex items-center gap-1">
                          Student
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      {/* Grade - center aligned (badge) */}
                      <TableHead align="center" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("studentGrade")}>
                        <div className="flex items-center gap-1 justify-center">
                          Year Group
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      {/* Amount - right aligned (currency) */}
                      <TableHead align="right" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("amount")}>
                        <div className="flex items-center gap-1 justify-end">
                          Amount
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      {/* Remaining Balance - right aligned (currency) */}
                      <TableHead align="right">
                        <div className="flex items-center gap-1 justify-end">
                          Remaining Balance
                        </div>
                      </TableHead>
                      {/* Reason - left aligned (text) */}
                      <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("reason")}>
                        <div className="flex items-center gap-1">
                          Reason
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      {/* Issue Date - left aligned (date) */}
                      <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("issueDate")}>
                        <div className="flex items-center gap-1">
                          Issue Date
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      {/* Status - center aligned (badge) */}
                      <TableHead align="center" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("status")}>
                        <div className="flex items-center gap-1 justify-center">
                          Status
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      {/* Actions - center aligned */}
                      <TableHead align="center">Actions</TableHead>
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
                        {/* Credit Note # - left aligned */}
                        <TableCell align="left" className="font-mono text-sm">
                          {creditNote.creditNoteNumber}
                        </TableCell>
                        {/* Student - left aligned */}
                        <TableCell align="left">
                          <div>
                            <div className="font-medium">{creditNote.studentName}</div>
                            <div className="text-sm text-muted-foreground">{creditNote.familyCode || creditNote.studentId}</div>
                          </div>
                        </TableCell>
                        {/* Grade - center aligned */}
                        <TableCell align="center">
                          <Badge className="bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-100">
                            {creditNote.studentGrade}
                          </Badge>
                        </TableCell>
                        {/* Amount - right aligned */}
                        <TableCell align="right">฿{creditNote.amount.toLocaleString()}</TableCell>
                        {/* Remaining Balance - right aligned */}
                        <TableCell align="right">
                          {creditNote.status === "used"
                            ? <span className="text-gray-400">฿0</span>
                            : creditNote.remainingBalance !== undefined
                              ? <span className={creditNote.remainingBalance < creditNote.amount ? "text-amber-700 font-medium" : ""}>฿{creditNote.remainingBalance.toLocaleString()}</span>
                              : <span className="text-muted-foreground">฿{creditNote.amount.toLocaleString()}</span>
                          }
                        </TableCell>
                        {/* Reason - left aligned */}
                        <TableCell align="left" className="max-w-xs truncate">{creditNote.reason}</TableCell>
                        {/* Issue Date - left aligned */}
                        <TableCell align="left">{format(creditNote.issueDate, "MMM dd, yyyy")}</TableCell>
                        {/* Status - center aligned */}
                        <TableCell align="center">{getStatusBadge(creditNote.status)}</TableCell>
                        {/* Actions - center aligned */}
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
                                  <p>View Credit Note</p>
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
                                  <p>Download PDF</p>
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
                                    <p>Cancel Credit Note</p>
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
              </CardContent>
            </Card>

            {/* Pagination for Credit Notes */}
            {totalCreditNotePages > 1 && (
              <div className="flex items-center justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => goToPage(currentPage - 1)}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>

                    {[...Array(Math.min(5, totalCreditNotePages))].map((_, index) => {
                      const pageNumber = Math.max(1, currentPage - 2) + index
                      if (pageNumber > totalCreditNotePages) return null

                      return (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink
                            onClick={() => goToPage(pageNumber)}
                            isActive={currentPage === pageNumber}
                            className="cursor-pointer"
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    })}

                    {totalCreditNotePages > 5 && currentPage < totalCreditNotePages - 2 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => goToPage(currentPage + 1)}
                        className={currentPage === totalCreditNotePages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}

            {/* View Credit Note Dialog */}
            <Dialog open={isViewDialogOpen && viewingCreditNote !== null} onOpenChange={setIsViewDialogOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
                <DialogHeader className="px-6 pt-8 pb-6 border-b border-border/50">
                  <DialogTitle className="text-2xl font-bold">Credit Note Details</DialogTitle>
                </DialogHeader>
                {viewingCreditNote && (
                  <div className="px-6 py-6 space-y-10">
                    {/* Credit Note Header */}
                    <div className="bg-muted/30 rounded-lg p-5">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Credit Note Number</p>
                          <p className="font-mono font-bold text-lg">{viewingCreditNote.creditNoteNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Invoice Number</p>
                          <p className="font-mono font-bold text-lg">{viewingCreditNote.invoiceNumber}</p>
                        </div>
                      </div>
                    </div>

                    {/* Student Information */}
                    <div>
                      <h3 className="text-base font-semibold text-foreground mb-5">Student Information</h3>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-8">
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Student Name</p>
                          <p className="text-base font-semibold">{viewingCreditNote.studentName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Family Code</p>
                          <p className="text-base font-semibold">{viewingCreditNote.familyCode || viewingCreditNote.studentId}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Year Group</p>
                          <p className="text-base font-semibold">{viewingCreditNote.studentGrade}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Academic Year</p>
                          <p className="text-base font-semibold">{formatAcademicYear(viewingCreditNote.academicYear)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Credit Note Information */}
                    <div>
                      <h3 className="text-base font-semibold text-foreground mb-5">Credit Note Information</h3>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-8">
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Refund Amount</p>
                          <p className="text-4xl font-bold text-green-600">
                            ฿{viewingCreditNote.amount.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Status</p>
                          <div className="mt-1">
                            {getStatusBadge(viewingCreditNote.status)}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Issue Date</p>
                          <p className="text-base font-semibold">{format(viewingCreditNote.issueDate, "dd MMMM yyyy")}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Term</p>
                          <p className="text-base font-semibold">{viewingCreditNote.term}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm text-muted-foreground mb-2">Reason</p>
                          <p className="text-base font-semibold">{viewingCreditNote.reason}</p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-8 pb-2 border-t border-border/50">
                      <Button
                        onClick={() => {
                          downloadCreditNote(viewingCreditNote.id)
                          setIsViewDialogOpen(false)
                        }}
                        className="flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download PDF
                      </Button>
                      {viewingCreditNote.status === "pending" && (
                        <Button
                          variant="destructive"
                          onClick={() => {
                            cancelCreditNote(viewingCreditNote.id)
                            setIsViewDialogOpen(false)
                          }}
                          className="flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Cancel Credit Note
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        onClick={() => setIsViewDialogOpen(false)}
                      >
                        Close
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
          <DialogContent className="max-w-2xl">
            <DialogHeader className="px-6 pt-6">
              <DialogTitle>Create Credit Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 px-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Credit Note Number <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="CN-2025-000001"
                    value={creditNoteForm.creditNoteNumber}
                    onChange={(e) => setCreditNoteForm({ ...creditNoteForm, creditNoteNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Invoice Number <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="20250000001"
                    value={creditNoteForm.invoiceNumber}
                    onChange={(e) => setCreditNoteForm({ ...creditNoteForm, invoiceNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Family Code</Label>
                  <Input
                    placeholder="FAM001"
                    value={creditNoteForm.studentId}
                    onChange={(e) => setCreditNoteForm({ ...creditNoteForm, studentId: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Student Name <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="Enter student name"
                    value={creditNoteForm.studentName}
                    onChange={(e) => setCreditNoteForm({ ...creditNoteForm, studentName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Year Group</Label>
                  <Select value={creditNoteForm.yearGroup} onValueChange={(value) => setCreditNoteForm({ ...creditNoteForm, yearGroup: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year group" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"].map(grade => (
                        <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Academic Year</Label>
                  <Select value={creditNoteForm.academicYear} onValueChange={(value) => setCreditNoteForm({ ...creditNoteForm, academicYear: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select academic year" />
                    </SelectTrigger>
                    <SelectContent>
                      {academicYears.map(year => (
                        <SelectItem key={year.id} value={year.name}>{formatAcademicYear(year.name)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Term</Label>
                  <Select value={creditNoteForm.term} onValueChange={(value) => setCreditNoteForm({ ...creditNoteForm, term: value })}>
                    <SelectTrigger>
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
                  <Label>Amount (THB) <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={creditNoteForm.amount || ""}
                    onChange={(e) => setCreditNoteForm({ ...creditNoteForm, amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reason <span className="text-red-500">*</span></Label>
                <Select value={creditNoteForm.reason} onValueChange={(value) => setCreditNoteForm({ ...creditNoteForm, reason: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Course cancellation">Course cancellation</SelectItem>
                    <SelectItem value="Overpayment refund">Overpayment refund</SelectItem>
                    <SelectItem value="Activity cancellation">Activity cancellation</SelectItem>
                    <SelectItem value="Billing error">Billing error</SelectItem>
                    <SelectItem value="Withdrawal">Withdrawal</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Issue Date</Label>
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
            </div>

            <div className="flex justify-end gap-2 px-6 pb-6 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsCreateCreditNoteOpen(false)}>
                Cancel
              </Button>
              <Button disabled={!userCanEdit} onClick={handleCreateCreditNote}>
                Create Credit Note
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
              <DialogTitle>Import Credit Notes</DialogTitle>
              <DialogDescription>
                Upload an Excel file to import credit notes. Download the template for the correct format.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Template Download */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div>
                <p className="font-medium">Excel Template</p>
                <p className="text-sm text-muted-foreground">Download the template with correct column headers</p>
              </div>
              <Button variant="outline" onClick={downloadTemplate}>
                <FileDown className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="creditNoteFile">Upload File</Label>
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
              <div className="p-3 border border-red-200 bg-red-50 rounded-lg text-red-700 text-sm">
                {importErrors[0]}{importErrors.length > 1 ? ` (+${importErrors.length - 1} more)` : ""}
              </div>
            )}

            {/* Preview Table */}
            {importPreview.length > 0 && (
              <div className="space-y-2">
                <Label>Preview ({importPreview.length} records)</Label>
                <div className="border rounded-lg overflow-x-auto">
                  <Table className="min-w-[700px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead align="left" className="w-32">Credit Note No.</TableHead>
                        <TableHead align="left">Student</TableHead>
                        <TableHead align="left" className="w-24">Year Group</TableHead>
                        <TableHead align="right" className="w-28">Amount</TableHead>
                        <TableHead align="left" className="w-24">Date</TableHead>
                        <TableHead align="left">Reason</TableHead>
                        <TableHead align="center" className="w-20">Status</TableHead>
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
              Cancel
            </Button>
            <Button
              onClick={performImport}
              disabled={!userCanEdit || importPreview.length === 0 || importErrors.length > 0}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import {importPreview.length > 0 ? `${importPreview.length} Records` : ""}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div >
  )
}