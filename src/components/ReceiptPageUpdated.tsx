import { useState, useEffect } from "react"
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
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
}

interface CreditNote {
  id: string
  creditNoteNumber: string
  invoiceNumber: string
  studentName: string
  studentId: string
  studentGrade: string
  amount: number
  reason: string
  issueDate: Date
  academicYear: string
  term: string
  status: "issued" | "cancelled" | "pending"
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
      // Parse schoolYear to separate academicYear and term
      // Format: "2025-2026 - Term 2 (January - March)" or just "2025-2026"
      let academicYear = ""
      let term = ""

      if (r.schoolYear) {
        const parts = r.schoolYear.split(" - ")
        academicYear = parts[0] || "" // "2025-2026"
        term = parts.slice(1).join(" - ") || "" // "Term 2 (January - March)"
      }

      // Find matching invoice to get parent info
      const invoiceNumber = r.invoices?.[0]?.invoiceNo || ""
      const matchingInvoice = invoices.find((inv: any) => inv.invoiceNumber === invoiceNumber)
      const parentName = matchingInvoice?.parentName || r.clientName || ""
      const studentName = matchingInvoice?.studentName || r.contactName || r.clientName
      const address = matchingInvoice?.address || ""

      return {
        id: r.id,
        receiptNumber: r.receiptNo,
        invoiceNumber: invoiceNumber,
        studentName: studentName,
        studentId: r.clientNo || "",
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
        collectorName: "System"
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
    invoiceNumber: "INV-2025-001234",
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
    invoiceNumber: "INV-2025-001235",
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
    invoiceNumber: "INV-2025-001236",
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
    invoiceNumber: `INV-2025-${String(1234 + i).padStart(6, '0')}`,
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

interface ReceiptPageProps {
  onNavigateToSubPage?: (page: string, params?: any) => void
  category?: "tuition" | "eca" | "trip" | "exam" | "bus" | "external" // Filter receipts by category/menu type
}

export function ReceiptPage({ onNavigateToSubPage, category }: ReceiptPageProps) {
  const { t } = useLanguage()
  const { academicYears = [] } = useAcademicYears()

  // Categories that should NOT show credit notes
  const hideCreditNotes = ['eca', 'trip', 'exam', 'bus', 'external'].includes(category || '')

  // Tab state
  const [activeTab, setActiveTab] = useState("receipts")

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
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>(mockCreditNotes)
  const [filteredCreditNotes, setFilteredCreditNotes] = useState<CreditNote[]>(mockCreditNotes)

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [academicYearFilter, setAcademicYearFilter] = useState("all")
  const [termFilter, setTermFilter] = useState("all")
  const [gradeFilter, setGradeFilter] = useState("all")
  const [paymentChannelFilter, setPaymentChannelFilter] = useState<PaymentChannel>("all")
  const [statusFilter, setStatusFilter] = useState("all") // For Credit Notes
  const [dateFrom, setDateFrom] = useState<Date | null>(null)
  const [dateTo, setDateTo] = useState<Date | null>(null)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  // View Dialog states
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewingReceipt, setViewingReceipt] = useState<Receipt | null>(null)
  const [viewingCreditNote, setViewingCreditNote] = useState<CreditNote | null>(null)

  // Create Receipt Dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  // Create Credit Note Dialog state
  const [isCreateCreditNoteOpen, setIsCreateCreditNoteOpen] = useState(false)
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
        filtered = filtered.filter(receipt => receipt.academicYear === selectedYear.name)
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

  const exportToExcel = () => {
    // In production, this would generate an Excel file with all receipt data
    toast.success("Exporting all receipts to Excel...")

    // Simulate Excel export
    const csvContent = [
      ['Receipt Number', 'Invoice Number', 'Student Name', 'Student ID', 'Grade', 'Amount', 'Payment Method', 'Date', 'Academic Year', 'Term'],
      ...filteredReceipts.map(r => [
        r.receiptNumber,
        r.invoiceNumber,
        r.studentName,
        r.studentId,
        r.studentGrade,
        r.amount,
        r.paymentMethod,
        format(r.transactionDate, 'yyyy-MM-dd'),
        r.academicYear,
        r.term
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `receipts-export-${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
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
        case "transactionDate": aVal = a.transactionDate.getTime(); bVal = b.transactionDate.getTime(); break
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
        filtered = filtered.filter(cn => cn.academicYear === selectedYear.name)
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
        case "issueDate": aVal = a.issueDate.getTime(); bVal = b.issueDate.getTime(); break
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
      pending: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-200" }
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
        <h3 className="text-lg font-medium">{category === "external" ? "Receipt" : "Receipt & Credit Notes"}</h3>
        <p className="text-sm text-muted-foreground">
          {category === "external" ? "View and manage payment receipts" : "View and manage payment receipts and credit notes"}
        </p>
      </div>

      {/* Tabs with Buttons in same row */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between gap-4 mb-6">
          {!hideCreditNotes && (
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="receipts">Receipts</TabsTrigger>
              <TabsTrigger value="credit-notes">Credit Notes</TabsTrigger>
            </TabsList>
          )}

          <div className="flex gap-2 shrink-0 ml-auto">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => {
                // Create hidden file input
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = '.csv,.xlsx,.xls'
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  if (file) {
                    toast.success(`Importing ${file.name}...`)
                    // Here you would handle the file upload
                  }
                }
                input.click()
              }}
            >
              <Upload className="w-4 h-4" />
              Import
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={exportToExcel}
            >
              <FileDown className="w-4 h-4" />
              Export All
            </Button>
            <Button
              className="flex items-center gap-2"
              onClick={() => {
                if (activeTab === "receipts") {
                  setIsCreateDialogOpen(true)
                } else {
                  // Reset form when opening
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
                }
              }}
            >
              <Plus className="w-4 h-4" />
              {activeTab === "receipts" ? "Create Receipt" : "Create Credit Note"}
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
                      {year.name}
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
                    <SelectItem key={term.id} value={term.name}>
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
                      onSelect={setDateFrom}
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
                      onSelect={setDateTo}
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
                  onClick={bulkDownloadPDF}
                  className="bg-white hover:bg-blue-100 border-blue-300"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
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
                <TableHead className="w-12">
                  <Checkbox
                    checked={currentPageReceipts.length > 0 && currentPageReceipts.every(receipt => selectedReceipts.has(receipt.id))}
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
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("receiptNumber")}>
                  <div className="flex items-center gap-1">
                    {t("receipt.receiptNumber")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("invoiceNumber")}>
                  <div className="flex items-center gap-1">
                    {t("receipt.invoice")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("studentName")}>
                  <div className="flex items-center gap-1">
                    {category === "external" ? "Client" : t("common.student")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {category !== "external" && (
                  <>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("studentGrade")}>
                      <div className="flex items-center gap-1">
                        {t("common.yearGroup")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("academicYear")}>
                      <div className="flex items-center gap-1">
                        {t("common.academicYear")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("term")}>
                      <div className="flex items-center gap-1">
                        {t("common.term")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                  </>
                )}
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("amount")}>
                  <div className="flex items-center gap-1">
                    {t("common.amount")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("paymentMethod")}>
                  <div className="flex items-center gap-1">
                    {t("common.paymentMethod")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("transactionDate")}>
                  <div className="flex items-center gap-1">
                    {t("common.date")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentPageReceipts.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedReceipts.has(receipt.id)}
                      onCheckedChange={() => toggleReceiptSelection(receipt.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {receipt.receiptNumber}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {receipt.invoiceNumber}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{receipt.studentName}</div>
                      <div className="text-sm text-muted-foreground">{receipt.studentId}</div>
                    </div>
                  </TableCell>
                  {category !== "external" && (
                    <>
                      <TableCell>
                        <Badge variant="secondary">{receipt.studentGrade}</Badge>
                      </TableCell>
                      <TableCell>{receipt.academicYear}</TableCell>
                      <TableCell>{receipt.term}</TableCell>
                    </>
                  )}
                  <TableCell>₿{receipt.amount.toLocaleString()}</TableCell>
                  <TableCell>{receipt.paymentMethod}</TableCell>
                  <TableCell>{format(receipt.transactionDate, "MMM dd, yyyy")}</TableCell>
                  <TableCell>
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
                        <span className="w-28">Student ID no.</span>
                        <span>{viewingReceipt.studentId}</span>
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
                        <span className="w-28 text-right">{viewingReceipt.academicYear}</span>
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
                      <th className="border-r border-black p-2 text-right">Invoice amount<br/>(THB)</th>
                      <th className="border-r border-black p-2 text-right">Received amount<br/>(THB)</th>
                      <th className="p-2 text-right">Outstanding amount<br/>(THB)</th>
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
        {!hideCreditNotes && <TabsContent value="credit-notes" className="space-y-6 mt-6">
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
                        <SelectItem key={term.id} value={term.name}>{term.name}</SelectItem>
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
                          <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>
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
                          onSelect={setDateFrom}
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
                        onSelect={setDateTo}
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
                      onClick={bulkDownloadCreditNotes}
                      className="bg-white hover:bg-blue-100 border-blue-300"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
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
                    <TableHead className="w-12">
                      <Checkbox
                        checked={currentPageCreditNotes.length > 0 && currentPageCreditNotes.every(cn => selectedCreditNotes.has(cn.id))}
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
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("creditNoteNumber")}>
                      <div className="flex items-center gap-1">
                        Credit Note No.
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("invoiceNumber")}>
                      <div className="flex items-center gap-1">
                        Invoice No.
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("studentName")}>
                      <div className="flex items-center gap-1">
                        Student
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("studentGrade")}>
                      <div className="flex items-center gap-1">
                        Year Group
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("amount")}>
                      <div className="flex items-center gap-1">
                        Amount
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("reason")}>
                      <div className="flex items-center gap-1">
                        Reason
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("issueDate")}>
                      <div className="flex items-center gap-1">
                        Issue Date
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("status")}>
                      <div className="flex items-center gap-1">
                        Status
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPageCreditNotes.map((creditNote) => (
                    <TableRow key={creditNote.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedCreditNotes.has(creditNote.id)}
                          onCheckedChange={() => toggleCreditNoteSelection(creditNote.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {creditNote.creditNoteNumber}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {creditNote.invoiceNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{creditNote.studentName}</div>
                          <div className="text-sm text-muted-foreground">{creditNote.studentId}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-100">
                          {creditNote.studentGrade}
                        </Badge>
                      </TableCell>
                      <TableCell>฿{creditNote.amount.toLocaleString()}</TableCell>
                      <TableCell className="max-w-xs truncate">{creditNote.reason}</TableCell>
                      <TableCell>{format(creditNote.issueDate, "MMM dd, yyyy")}</TableCell>
                      <TableCell>{getStatusBadge(creditNote.status)}</TableCell>
                      <TableCell>
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
                        <p className="text-sm text-muted-foreground mb-2">Student ID</p>
                        <p className="text-base font-semibold">{viewingCreditNote.studentId}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Year Group</p>
                        <p className="text-base font-semibold">{viewingCreditNote.studentGrade}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Academic Year</p>
                        <p className="text-base font-semibold">{viewingCreditNote.academicYear}</p>
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
        </TabsContent>}
      </Tabs>

      {/* Create Receipt Dialog - Use ReceiptManagementFlow with dialog only */}
      {isCreateDialogOpen && (
        <ReceiptManagementFlow
          menuType="tuition"
          autoOpenForm={true}
          hideMainContent={true}
          onFormClose={() => setIsCreateDialogOpen(false)}
        />
      )}

      {/* Create Credit Note Dialog - Hidden for ECA, Trip, Exam, Bus */}
      {!hideCreditNotes && <Dialog open={isCreateCreditNoteOpen} onOpenChange={setIsCreateCreditNoteOpen}>
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
                  onChange={(e) => setCreditNoteForm({...creditNoteForm, creditNoteNumber: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Invoice Number <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="INV-2025-001234"
                  value={creditNoteForm.invoiceNumber}
                  onChange={(e) => setCreditNoteForm({...creditNoteForm, invoiceNumber: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Student ID</Label>
                <Input
                  placeholder="KC2024001"
                  value={creditNoteForm.studentId}
                  onChange={(e) => setCreditNoteForm({...creditNoteForm, studentId: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Student Name <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Enter student name"
                  value={creditNoteForm.studentName}
                  onChange={(e) => setCreditNoteForm({...creditNoteForm, studentName: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Year Group</Label>
                <Select value={creditNoteForm.yearGroup} onValueChange={(value) => setCreditNoteForm({...creditNoteForm, yearGroup: value})}>
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
                <Select value={creditNoteForm.academicYear} onValueChange={(value) => setCreditNoteForm({...creditNoteForm, academicYear: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select academic year" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map(year => (
                      <SelectItem key={year.id} value={year.name}>{year.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Term</Label>
                <Select value={creditNoteForm.term} onValueChange={(value) => setCreditNoteForm({...creditNoteForm, term: value})}>
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
                  onChange={(e) => setCreditNoteForm({...creditNoteForm, amount: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reason <span className="text-red-500">*</span></Label>
              <Select value={creditNoteForm.reason} onValueChange={(value) => setCreditNoteForm({...creditNoteForm, reason: value})}>
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
                    onSelect={(date) => date && setCreditNoteForm({...creditNoteForm, issueDate: date})}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex justify-end gap-2 px-6 pb-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsCreateCreditNoteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCreditNote}>
              Create Credit Note
            </Button>
          </div>
        </DialogContent>
      </Dialog>}
    </div>
  )
}