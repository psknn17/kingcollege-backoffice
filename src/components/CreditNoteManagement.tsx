import { useState, useEffect, useMemo, useRef } from "react"
import * as XLSX from "xlsx"
import { usePersistedState } from "@/hooks/usePersistedState"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { Separator } from "./ui/separator"
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Textarea } from "./ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Search, Filter, Eye, Plus, Download, Mail, CalendarIcon, DollarSign, FileText, AlertCircle, CheckCircle, Clock, RefreshCw, CreditCard, ArrowUpDown, ChevronLeft, ChevronRight, ChevronDown, Receipt, Printer, Upload, Save, FilePen, FileCheck } from "lucide-react"
import { cn } from "./ui/utils"
import { format } from "date-fns"
import { toast } from "@/components/ui/sonner"
import { useStudents } from "@/contexts/StudentContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAuth } from "@/contexts/AuthContext"
import { canPerformActions } from "@/utils/rolePermissions"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConfirmDialog } from "@/hooks/useConfirmDialog"
import { ColumnPresets } from "@/utils/tableAlignment"
import { PaginationBar } from "./ui/pagination-bar"
import { logActivity } from "@/lib/activityLog"

interface CreditNote {
  id: string
  creditNoteNumber: string
  noteType: "CN" | "OP" // CN = Credit Note, OP = Overpayment
  invoiceNumber: string
  studentName: string
  studentId: string
  studentGrade: string
  parentName: string
  familyCode: string
  originalAmount: number
  creditAmount: number
  amountIncludingVat: number
  remainingAmount: number
  reason: string
  description: string
  type: "refund" | "adjustment" | "cancellation" | "discount" | "overpayment"
  status: "draft" | "issued" | "applied" | "cancelled"
  issueDate: Date
  dueDate?: Date
  postingDate?: Date
  appliedDate?: Date
  issuedBy: string
  approvedBy?: string
  notes: string
  paid: boolean
  cancelled: boolean
  corrective: boolean
}

// localStorage keys
const CREDIT_NOTES_STORAGE_KEY = "creditNotes"
const CREATED_INVOICES_STORAGE_KEY = "createdInvoices"

// Mock credit notes for demo — references real invoices from Invoice Management
// Reads `createdInvoices` localStorage so each CN points to an actual invoice/student
const getMockCreditNotes = (): CreditNote[] => {
  // Try to read real invoices from Invoice Management
  let invoices: any[] = []
  try {
    const stored = localStorage.getItem(CREATED_INVOICES_STORAGE_KEY)
    if (stored) invoices = JSON.parse(stored)
  } catch {
    invoices = []
  }

  // Filter to invoices with full student info (skip externals — they don't get credit notes)
  const eligible = invoices.filter((inv: any) =>
    inv.invoiceNumber &&
    inv.studentId &&
    inv.studentName &&
    inv.category !== "external" &&
    (inv.netAmount || inv.finalAmount || 0) > 0
  )

  // Templates: status, type, percent of net amount used as credit, reason, noteType
  const templates: Array<{
    status: CreditNote["status"]
    noteType: CreditNote["noteType"]
    type: CreditNote["type"]
    pct: number
    reason: string
    daysAgo: number
    paid: boolean
    cancelled: boolean
    hasRemaining: boolean
    appliedOffsetDays?: number
  }> = [
    { status: "issued",    noteType: "CN", type: "adjustment",   pct: 0.10, reason: "Overcharged tuition fee for Term 2",   daysAgo: 24, paid: false, cancelled: false, hasRemaining: false },
    { status: "applied",   noteType: "CN", type: "cancellation", pct: 1.00, reason: "Student withdrawn - full refund",      daysAgo: 47, paid: true,  cancelled: false, hasRemaining: false, appliedOffsetDays: 5 },
    { status: "issued",    noteType: "OP", type: "overpayment",  pct: 0.05, reason: "Overpayment on Term 1 tuition",        daysAgo: 38, paid: false, cancelled: false, hasRemaining: true },
    { status: "applied",   noteType: "CN", type: "discount",     pct: 0.05, reason: "Sibling discount applied retroactively", daysAgo: 29, paid: true,  cancelled: false, hasRemaining: false, appliedOffsetDays: 2 },
    { status: "draft",     noteType: "CN", type: "refund",       pct: 0.10, reason: "ECA course cancelled by school",       daysAgo: 7,  paid: false, cancelled: false, hasRemaining: true },
    { status: "issued",    noteType: "OP", type: "overpayment",  pct: 0.09, reason: "Double payment received",              daysAgo: 14, paid: false, cancelled: false, hasRemaining: true },
    { status: "cancelled", noteType: "CN", type: "cancellation", pct: 1.00, reason: "Invoice issued in error",              daysAgo: 84, paid: false, cancelled: true,  hasRemaining: false },
    { status: "applied",   noteType: "CN", type: "discount",     pct: 0.10, reason: "Scholarship awarded mid-term",         daysAgo: 19, paid: true,  cancelled: false, hasRemaining: false, appliedOffsetDays: 2 },
  ]

  // Fallback static data when no invoices have been seeded yet
  // IDs/codes match seedData format (KC2025xxxx, SM2025xxxx, 2025-xxxxx invoices)
  // Fallback: read student list from localStorage to match seed names
  let fallback: Array<Pick<CreditNote, "studentName" | "studentId" | "studentGrade" | "parentName" | "familyCode"> & { invoiceNumber: string; netAmount: number }> = []
  try {
    const storedStudents = localStorage.getItem("students")
    if (storedStudents) {
      const allStudents = JSON.parse(storedStudents)
      fallback = allStudents.slice(0, 8).map((s: any, i: number) => ({
        invoiceNumber: `2025-${String((i + 1) * 3).padStart(5, "0")}`,
        studentName: `${s.firstName} ${s.lastName}`,
        studentId: s.studentId,
        studentGrade: s.gradeLevel || "",
        parentName: `${s.firstName} ${s.lastName}`,
        familyCode: s.familyCode || `SM2025${String(i + 1).padStart(4, "0")}`,
        netAmount: [130000, 145000, 115000, 125000, 150000, 135000, 155000, 135000][i],
      }))
    }
  } catch { /* ignore */ }
  if (fallback.length === 0) {
    // Hard-coded last resort (matches seedData FN/LN at seq 1-8)
    fallback = [
      { invoiceNumber: "2025-00003", studentName: "Charlotte Johnson",  studentId: "KC20250001", studentGrade: "Year 4",   parentName: "James Johnson",    familyCode: "SM20250001", netAmount: 130000 },
      { invoiceNumber: "2025-00006", studentName: "Sophia Williams",    studentId: "KC20250002", studentGrade: "Year 7",   parentName: "Charlotte Williams",familyCode: "SM20250002", netAmount: 145000 },
      { invoiceNumber: "2025-00009", studentName: "Emma Brown",         studentId: "KC20250003", studentGrade: "Reception",parentName: "William Brown",     familyCode: "SM20250003", netAmount: 115000 },
      { invoiceNumber: "2025-00012", studentName: "Mia Jones",          studentId: "KC20250004", studentGrade: "Year 2",   parentName: "Benjamin Jones",    familyCode: "SM20250004", netAmount: 125000 },
      { invoiceNumber: "2025-00015", studentName: "Amelia Garcia",      studentId: "KC20250005", studentGrade: "Year 9",   parentName: "Lucas Garcia",      familyCode: "SM20250005", netAmount: 150000 },
      { invoiceNumber: "2025-00018", studentName: "Harper Miller",      studentId: "KC20250006", studentGrade: "Year 5",   parentName: "Henry Miller",      familyCode: "SM20250006", netAmount: 135000 },
      { invoiceNumber: "2025-00021", studentName: "Evelyn Davis",       studentId: "KC20250007", studentGrade: "Year 11",  parentName: "Alexander Davis",   familyCode: "SM20250007", netAmount: 155000 },
      { invoiceNumber: "2025-00024", studentName: "Abigail Wilson",     studentId: "KC20250008", studentGrade: "Year 6",   parentName: "Sebastian Wilson",  familyCode: "SM20250008", netAmount: 135000 },
    ]
  }

  // Pick the source list — prefer real invoices, else fallback
  const sources = eligible.length >= templates.length
    ? eligible.slice(0, templates.length).map((inv: any) => ({
        invoiceNumber: inv.invoiceNumber,
        studentName: inv.studentName,
        studentId: inv.studentId,
        studentGrade: inv.studentGrade || "",
        parentName: inv.parentName || "",
        familyCode: inv.familyCode || "",
        netAmount: inv.netAmount || inv.finalAmount || 0,
      }))
    : fallback

  let cnSeq = 1
  let opSeq = 1
  return templates.map((tpl, idx) => {
    const src = sources[idx % sources.length]
    const creditAmount = Math.round(src.netAmount * tpl.pct)
    const issueDate = new Date(Date.now() - tpl.daysAgo * 86400000)
    const postingDate = new Date(issueDate)
    const dueDate = new Date(issueDate.getTime() + 30 * 86400000)
    const appliedDate = tpl.appliedOffsetDays
      ? new Date(issueDate.getTime() + tpl.appliedOffsetDays * 86400000)
      : undefined

    const seq = tpl.noteType === "OP" ? opSeq++ : cnSeq++
    const creditNoteNumber = `${tpl.noteType}-2026-${String(seq).padStart(6, "0")}`

    return {
      id: `cn-mock-${idx + 1}`,
      creditNoteNumber,
      noteType: tpl.noteType,
      invoiceNumber: src.invoiceNumber,
      studentName: src.studentName,
      studentId: src.studentId,
      studentGrade: src.studentGrade,
      parentName: src.parentName,
      familyCode: src.familyCode,
      originalAmount: src.netAmount,
      creditAmount,
      amountIncludingVat: creditAmount,
      remainingAmount: tpl.hasRemaining ? creditAmount : 0,
      reason: tpl.reason,
      description: tpl.reason,
      type: tpl.type,
      status: tpl.status,
      issueDate,
      postingDate,
      dueDate,
      appliedDate,
      issuedBy: "Finance Team",
      approvedBy: tpl.status !== "draft" ? "Admin" : undefined,
      notes: tpl.status === "applied" ? `Applied to ${src.invoiceNumber}` : "",
      paid: tpl.paid,
      cancelled: tpl.cancelled,
      corrective: false,
    }
  })
}

// Load Credit Notes from localStorage
const CREDIT_NOTES_MOCK_VERSION = "v5"
const mergeOVQueue = (base: CreditNote[]): CreditNote[] => {
  try {
    const raw = localStorage.getItem("overpaymentCNQueue")
    if (!raw) return base
    const pending: any[] = JSON.parse(raw)
    if (!pending.length) return base
    const mapped = pending.map((cn: any) => ({
      ...cn,
      noteType: "OP" as const,
      issueDate: new Date(cn.issueDate),
    }))
    localStorage.removeItem("overpaymentCNQueue")
    const merged = [...mapped, ...base]
    localStorage.setItem(CREDIT_NOTES_STORAGE_KEY, JSON.stringify(merged))
    return merged
  } catch { return base }
}

const loadCreditNotesFromStorage = (): CreditNote[] => {
  try {
    const mockVersion = localStorage.getItem("creditNotes_mockVersion")
    // Reset old data to use new mock data
    if (mockVersion !== CREDIT_NOTES_MOCK_VERSION) {
      localStorage.removeItem(CREDIT_NOTES_STORAGE_KEY)
      localStorage.setItem("creditNotes_mockVersion", CREDIT_NOTES_MOCK_VERSION)
      const mock = getMockCreditNotes()
      localStorage.setItem(CREDIT_NOTES_STORAGE_KEY, JSON.stringify(mock))
      return mergeOVQueue(mock)
    }

    const stored = localStorage.getItem(CREDIT_NOTES_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      const loaded = parsed.map((cn: any) => ({
        ...cn,
        noteType: cn.noteType || (cn.creditNoteNumber?.startsWith("OP-") ? "OP" : "CN"),
        familyCode: cn.familyCode || "",
        amountIncludingVat: cn.amountIncludingVat || cn.creditAmount || 0,
        remainingAmount: cn.remainingAmount || 0,
        description: cn.description || cn.reason || "",
        paid: cn.paid || false,
        cancelled: cn.cancelled || false,
        corrective: cn.corrective || false,
        issueDate: new Date(cn.issueDate),
        dueDate: cn.dueDate ? new Date(cn.dueDate) : undefined,
        postingDate: cn.postingDate ? new Date(cn.postingDate) : undefined,
        appliedDate: cn.appliedDate ? new Date(cn.appliedDate) : undefined
      }))
      if (loaded.length > 0) return mergeOVQueue(loaded)
    }
  } catch (error) {
    console.error("Failed to load credit notes:", error)
  }
  return mergeOVQueue(getMockCreditNotes())
}

// Save Credit Notes to localStorage
const saveCreditNotesToStorage = (creditNotes: CreditNote[]) => {
  try {
    localStorage.setItem(CREDIT_NOTES_STORAGE_KEY, JSON.stringify(creditNotes))
  } catch (error) {
    console.error("Failed to save credit notes:", error)
  }
}

// Load Invoices from localStorage
const loadInvoicesFromStorage = () => {
  try {
    const stored = localStorage.getItem(CREATED_INVOICES_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error("Failed to load invoices:", error)
  }
  return []
}

// Generate Credit Note Number with prefix (CN or OP)
const generateCreditNoteNumber = (existingNotes: CreditNote[], prefix: "CN" | "OP" = "CN"): string => {
  const year = new Date().getFullYear()
  const existingNumbers = existingNotes
    .filter(cn => cn.creditNoteNumber.startsWith(`${prefix}-${year}`))
    .map(cn => {
      const match = cn.creditNoteNumber.match(new RegExp(`${prefix}-\\d{4}-(\\d+)`))
      return match ? parseInt(match[1]) : 0
    })
  const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0
  const nextNumber = (maxNumber + 1).toString().padStart(6, '0')
  return `${prefix}-${year}-${nextNumber}`
}

export function CreditNoteManagement() {
  const { t } = useLanguage()
  const { students } = useStudents()
  const { user } = useAuth()
  const userCanEdit = canPerformActions(user?.role)

  // Load credit notes from localStorage
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>(() => loadCreditNotesFromStorage())
  const [filteredCreditNotes, setFilteredCreditNotes] = useState<CreditNote[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [noteTypeFilter, setNoteTypeFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState<Date | null>(null)
  const [dateTo, setDateTo] = useState<Date | null>(null)
  const [selectedCreditNote, setSelectedCreditNote] = useState<CreditNote | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreateReceiptModalOpen, setIsCreateReceiptModalOpen] = useState(false)
  const [activeTab, setActiveTab] = usePersistedState<"receipts" | "credit-notes">("credit-note:activeTab", "receipts")

  // Import states
  const [isImportUploadOpen, setIsImportUploadOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importPreview, setImportPreview] = useState<CreditNote[]>([])
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [importFileName, setImportFileName] = useState("")
  const importFileInputRef = useRef<HTMLInputElement>(null)

  // Load receipts from all receipt storage keys in localStorage
  const receipts = useMemo(() => {
    const receiptKeys = [
      "receiptRecords_tuition", "receiptRecords_eca", "receiptRecords_trip",
      "receiptRecords_exam", "receiptRecords_bus", "receiptRecords_external",
      "receiptRecords_summer"
    ]
    const all: any[] = []
    receiptKeys.forEach(key => {
      try {
        const stored = localStorage.getItem(key)
        if (stored) {
          const parsed = JSON.parse(stored)
          parsed.forEach((r: any) => {
            all.push({
              ...r,
              issueDate: r.issueDate ? new Date(r.issueDate) : new Date(),
              studentName: r.studentName || r.recipientName || "",
              studentId: r.studentId || "",
              paymentMethod: r.paymentMethod || "-",
              amount: r.amount || r.totalAmount || 0,
            })
          })
        }
      } catch { /* ignore */ }
    })
    return all.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
  }, [])

  // Sorting states
  const [sortColumn, setSortColumn] = useState("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Confirm dialog hooks
  const createDialog = useConfirmDialog()

  // Load invoices from localStorage
  const [invoices, setInvoices] = useState<any[]>([])

  // Load invoices on mount
  useEffect(() => {
    setInvoices(loadInvoicesFromStorage())
    setFilteredCreditNotes(creditNotes)
  }, [])

  useEffect(() => {
    const handleExternalUpdate = () => setCreditNotes(loadCreditNotesFromStorage())
    window.addEventListener("creditNotesUpdated", handleExternalUpdate)
    return () => window.removeEventListener("creditNotesUpdated", handleExternalUpdate)
  }, [])

  // Auto-save to localStorage whenever creditNotes changes
  useEffect(() => {
    saveCreditNotesToStorage(creditNotes)
    setFilteredCreditNotes(creditNotes)
  }, [creditNotes])

  // Manual save function
  const handleSaveChanges = () => {
    saveCreditNotesToStorage(creditNotes)
    toast.success(t("creditNote.savedSuccess"))
    logActivity({ action: "Save Credit Note", module: "Credit Notes", detail: `Saved ${creditNotes.length} credit note(s) to storage` })
  }

  // Create new credit note form state
  const [newCreditNote, setNewCreditNote] = useState({
    noteType: "CN" as "CN" | "OP",
    studentId: "",
    studentName: "",
    studentGrade: "",
    familyCode: "",
    postingDate: null as Date | null,
    dueDate: null as Date | null,
    amount: "",
    amountIncludingVat: "",
    remainingAmount: "",
    description: "",
    paid: false,
    cancelled: false,
    corrective: false,
  })

  // Get parent name from student context
  const getParentName = (studentId: string): string => {
    const student = students.find(s => s.studentId === studentId || s.id === studentId)
    if (student && student.parents && student.parents.length > 0) {
      const primaryParent = student.parents.find(p => p.isPrimary) || student.parents[0]
      return primaryParent.name
    }
    return ""
  }

  const applyFilters = () => {
    let filtered = creditNotes

    if (searchTerm) {
      filtered = filtered.filter(cn =>
        cn.creditNoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cn.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cn.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cn.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cn.parentName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cn.reason || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cn.description || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(cn => cn.status === statusFilter)
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter(cn => cn.type === typeFilter)
    }

    if (noteTypeFilter !== "all") {
      filtered = filtered.filter(cn => (cn.noteType || "CN") === noteTypeFilter)
    }

    if (dateFrom) {
      filtered = filtered.filter(cn => cn.issueDate >= dateFrom)
    }

    if (dateTo) {
      filtered = filtered.filter(cn => cn.issueDate <= dateTo)
    }

    setFilteredCreditNotes(filtered)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setTypeFilter("all")
    setNoteTypeFilter("all")
    setDateFrom(null)
    setDateTo(null)
    setFilteredCreditNotes(creditNotes)
  }

  // Real-time filtering: apply filters whenever filter state changes
  useEffect(() => {
    applyFilters()
  }, [searchTerm, statusFilter, typeFilter, noteTypeFilter, dateFrom, dateTo, creditNotes])

  const openCreditNoteDetail = (creditNote: CreditNote) => {
    setSelectedCreditNote(creditNote)
    setIsModalOpen(true)
  }

  const closeCreditNoteModal = () => {
    setIsModalOpen(false)
    setSelectedCreditNote(null)
  }

  const openCreateModal = () => {
    setIsCreateModalOpen(true)
    setNewCreditNote({
      noteType: "CN",
      studentId: "",
      studentName: "",
      studentGrade: "",
      familyCode: "",
      postingDate: null,
      dueDate: null,
      amount: "",
      amountIncludingVat: "",
      remainingAmount: "",
      description: "",
      paid: false,
      cancelled: false,
      corrective: false,
    })
  }

  const closeCreateModal = () => {
    setIsCreateModalOpen(false)
  }

  const performCreateCreditNote = () => {
    if (!newCreditNote.studentId || !newCreditNote.studentName || !newCreditNote.amount || !newCreditNote.description) {
      toast.error(t("creditNote.fillRequiredFields") || "Please fill in all required fields")
      return
    }

    const amount = parseFloat(newCreditNote.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error(t("creditNote.enterValidAmount"))
      return
    }

    const amountIncVat = newCreditNote.amountIncludingVat ? parseFloat(newCreditNote.amountIncludingVat) : amount
    const remainingAmt = newCreditNote.remainingAmount ? parseFloat(newCreditNote.remainingAmount) : 0

    const noteType = newCreditNote.noteType
    const parentName = getParentName(newCreditNote.studentId)
    const newNote: CreditNote = {
      id: Date.now().toString(),
      creditNoteNumber: generateCreditNoteNumber(creditNotes, noteType),
      noteType: noteType,
      invoiceNumber: "",
      studentName: newCreditNote.studentName,
      studentId: newCreditNote.studentId,
      studentGrade: newCreditNote.studentGrade,
      parentName: parentName,
      familyCode: newCreditNote.familyCode,
      originalAmount: amount,
      creditAmount: amount,
      amountIncludingVat: amountIncVat,
      remainingAmount: remainingAmt,
      reason: newCreditNote.description,
      description: newCreditNote.description,
      type: noteType === "OP" ? "overpayment" : "refund",
      status: "issued",
      issueDate: new Date(),
      postingDate: newCreditNote.postingDate || new Date(),
      dueDate: newCreditNote.dueDate || undefined,
      issuedBy: "Finance Team",
      notes: "",
      paid: newCreditNote.paid,
      cancelled: newCreditNote.cancelled,
      corrective: newCreditNote.corrective,
    }

    const updated = [newNote, ...creditNotes]
    setCreditNotes(updated)
    saveCreditNotesToStorage(updated)
    toast.success(t("creditNote.createdSuccess").replace("{number}", newNote.creditNoteNumber))
    logActivity({ action: "Create Credit Note", module: "Credit Notes", detail: `Created ${newNote.noteType} ${newNote.creditNoteNumber} for ${newNote.studentName} — amount: ${amount.toLocaleString()}` })
    closeCreateModal()
  }

  const handleCreateCreditNote = () => {
    createDialog.confirm(() => {
      performCreateCreditNote()
    })
  }

  const downloadCreditNote = (creditNoteId: string) => {
    const creditNote = creditNotes.find(cn => cn.id === creditNoteId)
    if (creditNote) {
      toast.success(t("creditNote.downloaded").replace("{number}", creditNote.creditNoteNumber))
      logActivity({ action: "Download Credit Note", module: "Credit Notes", detail: `Downloaded credit note ${creditNote.creditNoteNumber} for ${creditNote.studentName}` })
    }
  }

  const sendCreditNote = (creditNoteId: string) => {
    const creditNote = creditNotes.find(cn => cn.id === creditNoteId)
    if (creditNote) {
      toast.success(t("creditNote.sentTo").replace("{name}", creditNote.parentName))
      logActivity({ action: "Send Credit Note", module: "Credit Notes", detail: `Sent credit note ${creditNote.creditNoteNumber} to ${creditNote.parentName}` })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary"><FileText className="w-3 h-3 mr-1" />{t("creditNote.draft")}</Badge>
      case "issued":
        return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="w-3 h-3 mr-1" />{t("creditNote.issued")}</Badge>
      case "applied":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />{t("creditNote.applied")}</Badge>
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />{t("creditNote.cancelled")}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "refund":
        return <Badge className="bg-purple-100 text-purple-800">{t("creditNote.refund")}</Badge>
      case "adjustment":
        return <Badge className="bg-orange-100 text-orange-800">{t("creditNote.adjustment")}</Badge>
      case "cancellation":
        return <Badge className="bg-red-100 text-red-800">{t("creditNote.cancellation")}</Badge>
      case "discount":
        return <Badge className="bg-green-100 text-green-800">{t("creditNote.discount")}</Badge>
      case "overpayment":
        return <Badge className="bg-amber-100 text-amber-800">{t("creditNote.overpayment") || "Overpayment"}</Badge>
      default:
        return <Badge variant="secondary">{type}</Badge>
    }
  }

  // Sorting functions
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const getSortedCreditNotes = (creditNotes: CreditNote[]) => {
    if (!sortColumn) return creditNotes
    return [...creditNotes].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortColumn) {
        case "creditNoteNumber":
          aValue = a.creditNoteNumber
          bValue = b.creditNoteNumber
          break
        case "invoiceNumber":
          aValue = a.invoiceNumber
          bValue = b.invoiceNumber
          break
        case "studentName":
          aValue = a.studentName
          bValue = b.studentName
          break
        case "studentGrade":
          aValue = a.studentGrade
          bValue = b.studentGrade
          break
        case "creditAmount":
          aValue = a.creditAmount
          bValue = b.creditAmount
          break
        case "type":
          aValue = a.type
          bValue = b.type
          break
        case "status":
          aValue = a.status
          bValue = b.status
          break
        case "issueDate":
          aValue = a.issueDate?.getTime() || 0
          bValue = b.issueDate?.getTime() || 0
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
  }

  // Apply sorting to filtered credit notes
  const sortedCreditNotes = getSortedCreditNotes(filteredCreditNotes)

  // Pagination logic
  const totalPages = Math.ceil(sortedCreditNotes.length / pageSize)
  const paginatedCreditNotes = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return sortedCreditNotes.slice(startIndex, startIndex + pageSize)
  }, [sortedCreditNotes, currentPage, pageSize])

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setCurrentPage(1)
  }

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, typeFilter, noteTypeFilter, dateFrom, dateTo, sortColumn, sortDirection])

  // --- Import helpers ---
  const parseImportDate = (value: any): Date => {
    if (!value) return new Date()
    const num = Number(value)
    if (!isNaN(num) && num > 40000 && num < 100000) {
      return new Date((num - 25569) * 86400 * 1000)
    }
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

  const parseTypeFromDescription = (description: string): CreditNote["type"] => {
    const lower = (description || "").toLowerCase()
    if (lower.includes("refund")) return "refund"
    if (lower.includes("cancel")) return "cancellation"
    if (lower.includes("discount")) return "discount"
    return "adjustment"
  }

  const normalizeYearGroup = (yearGroup: string): string => {
    if (!yearGroup) return ""
    return yearGroup
      .replace(/^YEAR\s+/i, "Year ")
      .replace(/^PRE[- ]?NURSERY$/i, "Pre-Nursery")
      .replace(/^NURSERY$/i, "Nursery")
      .replace(/^RECEPTION$/i, "Reception")
  }

  const downloadCreditNoteTemplate = () => {
    const templateData = [
      {
        "No.": "CN2025-00001",
        "Sell-to Customer No.": "100789",
        "Customer Name": "John Smith",
        "Year Group Code": "YEAR 12",
        "Posting Date": "01/04/2025",
        "Due Date": "01/04/2025",
        "Amount": 3200,
        "Amount Including VAT": 3200,
        "Remaining Amount": -3200,
        "Paid": false,
        "Currency Code": "",
        "Bill-to Customer No.": "006471",
        "Cancelled": false,
        "Corrective": false,
        "Location Code": "",
        "No. Printed": "",
        "Description": "Credit note for ECA"
      }
    ]
    const ws = XLSX.utils.json_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Credit Notes")
    XLSX.writeFile(wb, "CreditNote_Template.xlsx")
    toast.success(t("creditNote.templateDownloaded") || "Template downloaded")
    logActivity({ action: "Download Template", module: "Credit Notes", detail: "Downloaded credit note import template" })
  }

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const ext = file.name.toLowerCase()
    if (!ext.endsWith(".xlsx") && !ext.endsWith(".xls")) {
      toast.error(t("creditNote.selectExcelFile"))
      return
    }

    setImportFileName(file.name)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: "binary", cellDates: false })

        const sheetName =
          workbook.SheetNames.find((name) => name.toLowerCase().includes("credit")) ||
          workbook.SheetNames[0]

        const worksheet = workbook.Sheets[sheetName]
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" })

        const errors: string[] = []
        const preview: CreditNote[] = []

        rows.forEach((row, index) => {
          const rowNum = index + 2
          const no = row["No."]

          // Skip annotation/empty rows
          if (!no || String(no).toLowerCase().includes("student") || String(no).toLowerCase() === "no.") return

          const creditNoteNumber = String(no).trim()
          const studentId = String(row["Sell-to Customer No."] || "").trim()
          const studentName = String(row["Customer Name"] || "").trim()
          const yearGroup = String(row["Year Group Code"] || "").trim()
          const postingDate = row["Posting Date"]
          const dueDateRaw = row["Due Date"]
          const amount = parseFloat(String(row["Amount"] || "0").replace(/,/g, ""))
          const amountIncVat = parseFloat(String(row["Amount Including VAT"] || "0").replace(/,/g, "")) || amount
          const remainingAmt = parseFloat(String(row["Remaining Amount"] || "0").replace(/,/g, ""))
          const cancelled = row["Cancelled"]
          const description = String(row["Description"] || "").trim()
          const familyCode = String(row["Bill-to Customer No."] || "").trim()

          if (!creditNoteNumber) {
            errors.push(`Row ${rowNum}: Missing Credit Note Number`)
            return
          }
          if (!studentId && !studentName) {
            errors.push(`Row ${rowNum}: Missing Student ID and Name`)
            return
          }
          if (isNaN(amount) || amount <= 0) {
            errors.push(`Row ${rowNum}: Invalid amount for ${creditNoteNumber}`)
            return
          }

          let status: CreditNote["status"] = "issued"
          if (cancelled === "TRUE" || cancelled === true) status = "cancelled"

          preview.push({
            id: `import-${Date.now()}-${index}`,
            creditNoteNumber,
            noteType: creditNoteNumber.startsWith("OP") ? "OP" : "CN",
            invoiceNumber: "",
            studentName,
            studentId,
            studentGrade: normalizeYearGroup(yearGroup),
            parentName: "",
            familyCode,
            originalAmount: amount,
            creditAmount: amount,
            amountIncludingVat: amountIncVat,
            remainingAmount: remainingAmt,
            reason: description || "Imported Credit Note",
            description: description || "Imported Credit Note",
            type: parseTypeFromDescription(description),
            status,
            issueDate: parseImportDate(postingDate),
            postingDate: parseImportDate(postingDate),
            dueDate: dueDateRaw ? parseImportDate(dueDateRaw) : undefined,
            issuedBy: user?.name || "Import",
            notes: `Imported from ${file.name}`,
            paid: false,
            cancelled: cancelled === "TRUE" || cancelled === true,
            corrective: false,
          })
        })

        setImportPreview(preview)
        setImportErrors(errors)
        setIsImportModalOpen(true)
      } catch (error) {
        console.error("Import error:", error)
        toast.error(t("creditNote.failedToRead"))
      }
    }
    reader.readAsBinaryString(file)
    event.target.value = ""
  }

  const performImport = () => {
    if (importPreview.length === 0) return
    const existingNumbers = new Set(creditNotes.map((cn) => cn.creditNoteNumber))
    const newNotes = importPreview.filter((cn) => !existingNumbers.has(cn.creditNoteNumber))
    const duplicates = importPreview.length - newNotes.length

    const updated = [...newNotes, ...creditNotes]
    setCreditNotes(updated)
    saveCreditNotesToStorage(updated)

    setIsImportModalOpen(false)
    setImportPreview([])
    setImportErrors([])

    if (duplicates > 0) {
      toast.success(t("creditNote.importedWithDups").replace("{count}", String(newNotes.length)).replace("{dups}", String(duplicates)))
      logActivity({ action: "Import Credit Notes", module: "Credit Notes", detail: `Imported ${newNotes.length} credit note(s), ${duplicates} duplicate(s) skipped` })
    } else {
      toast.success(t("creditNote.importedSuccess").replace("{count}", String(newNotes.length)))
      logActivity({ action: "Import Credit Notes", module: "Credit Notes", detail: `Imported ${newNotes.length} credit note(s)` })
    }
  }

  const summaryStats = {
    total: creditNotes.length,
    draft: creditNotes.filter(cn => cn.status === "draft").length,
    issued: creditNotes.filter(cn => cn.status === "issued").length,
    applied: creditNotes.filter(cn => cn.status === "applied").length,
    totalAmount: creditNotes.reduce((sum, cn) => sum + cn.creditAmount, 0)
  }

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>{t("creditNote.creditNotesTitle")}</CardTitle>
              <p className="text-sm text-muted-foreground">{t("creditNote.viewManageCreditNotes")}</p>
            </div>
          </CardHeader>
        </Card>

        {/* Tabs for Receipts and Credit Notes */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "receipts" | "credit-notes")}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <TabsList>
              <TabsTrigger value="receipts" className="flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                {t("creditNote.receiptsTab")}
              </TabsTrigger>
              <TabsTrigger value="credit-notes" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                {t("creditNote.creditNotesTab")}
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                className="flex items-center gap-2"
                disabled={!userCanEdit}
                onClick={() => setIsImportUploadOpen(true)}
              >
                <Upload className="w-4 h-4" />
                {t("creditNote.import")}
              </Button>
              {activeTab === "receipts" ? (
                <Button onClick={() => setIsCreateReceiptModalOpen(true)} className="flex items-center gap-2" disabled={!userCanEdit}>
                  <Plus className="w-4 h-4" />
                  {t("creditNote.createReceipt")}
                </Button>
              ) : (
                <Button onClick={openCreateModal} className="flex items-center gap-2" disabled={!userCanEdit}>
                  <Plus className="w-4 h-4" />
                  {t("creditNote.createCreditNote")}
                </Button>
              )}
            </div>
          </div>

          {/* Receipts Tab Content */}
          <TabsContent value="receipts" className="space-y-6 mt-0">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Filter className="w-4 h-4" />
                    {t("invoiceOverview.searchFilter")}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Input placeholder={t("creditNote.searchReceiptPlaceholder")} />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[180px]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder={t("paymentMethod.label")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("creditNote.allMethods")}</SelectItem>
                      <SelectItem value="bank_transfer">{t("paymentMethod.bankTransfer")}</SelectItem>
                      <SelectItem value="credit_card">{t("paymentMethod.creditCard")}</SelectItem>
                      <SelectItem value="cash">{t("paymentMethod.cash")}</SelectItem>
                      <SelectItem value="cheque">{t("creditNote.cheque")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Receipts Table */}
            <Card>
              <CardHeader>
                <CardTitle>{t("creditNote.receiptList")}</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {/* Receipts Table - Standard Alignment */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      {/* Receipt # - text/left */}
                      <TableHead align="left">{t("table.receiptNo")}</TableHead>
                      {/* Invoice # - text/left */}
                      <TableHead align="left">{t("table.invoiceNo")}</TableHead>
                      {/* Student - text/left */}
                      <TableHead align="left">{t("table.student")}</TableHead>
                      {/* Amount - currency/right */}
                      <TableHead align="right">{t("table.amount")}</TableHead>
                      {/* Payment Method - badge/center */}
                      <TableHead align="center">{t("table.paymentMethod")}</TableHead>
                      {/* Issue Date - date/left */}
                      <TableHead align="left">{t("table.issueDate")}</TableHead>
                      {/* Status - badge/center */}
                      <TableHead align="center">{t("table.status")}</TableHead>
                      {/* Actions - actions/center */}
                      <TableHead align="center">{t("table.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receipts.map((receipt) => (
                      <TableRow key={receipt.id}>
                        {/* Receipt # - text/left */}
                        <TableCell align="left" className="font-medium">{receipt.id}</TableCell>
                        {/* Invoice # - text/left */}
                        <TableCell align="left">{receipt.invoiceNumber}</TableCell>
                        {/* Student - text/left */}
                        <TableCell align="left">
                          <div>
                            <div className="font-medium">{receipt.studentName}</div>
                            <div className="text-xs text-muted-foreground">{receipt.studentId}</div>
                          </div>
                        </TableCell>
                        {/* Amount - currency/right */}
                        <TableCell align="right" className="font-medium">฿{receipt.amount.toLocaleString()}</TableCell>
                        {/* Payment Method - badge/center */}
                        <TableCell align="center">
                          <Badge variant="outline">{receipt.paymentMethod}</Badge>
                        </TableCell>
                        {/* Issue Date - date/left */}
                        <TableCell align="left">{format(receipt.issueDate, "dd/MM/yyyy")}</TableCell>
                        {/* Status - badge/center */}
                        <TableCell align="center">
                          <Badge className="bg-green-100 text-green-800">{t("creditNote.issued")}</Badge>
                        </TableCell>
                        {/* Actions - actions/center */}
                        <TableCell align="center">
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Printer className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Credit Notes Tab Content */}
          <TabsContent value="credit-notes" className="space-y-6 mt-0">

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="rounded-xl gap-0">
                <CardContent className="p-4 pb-4">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{t("creditNote.totalCreditNotes")}</p>
                  </div>
                  <p className="text-2xl font-bold">{summaryStats.total}</p>
                </CardContent>
              </Card>

              <Card className="rounded-xl gap-0">
                <CardContent className="p-4 pb-4">
                  <div className="flex items-center gap-1.5">
                    <FilePen className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{t("creditNote.draft")}</p>
                  </div>
                  <p className="text-2xl font-bold">{summaryStats.draft}</p>
                </CardContent>
              </Card>

              <Card className="rounded-xl gap-0">
                <CardContent className="p-4 pb-4">
                  <div className="flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{t("creditNote.issued")}</p>
                  </div>
                  <p className="text-2xl font-bold">{summaryStats.issued}</p>
                </CardContent>
              </Card>

              <Card className="rounded-xl gap-0">
                <CardContent className="p-4 pb-4">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{t("creditNote.applied")}</p>
                  </div>
                  <p className="text-2xl font-bold">{summaryStats.applied}</p>
                </CardContent>
              </Card>

              <Card className="rounded-xl gap-0">
                <CardContent className="p-4 pb-4">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{t("creditNote.totalCreditAmount")}</p>
                  </div>
                  <p className="text-2xl font-bold">₿{summaryStats.totalAmount.toLocaleString()}</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={t("creditNote.searchPlaceholder")}
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

                {showFilters && (
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-muted-foreground">{t("common.status")}</label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="h-9">
                            <Filter className="w-4 h-4 mr-2" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t("invoice.allStatus")}</SelectItem>
                            <SelectItem value="draft">{t("creditNote.draft")}</SelectItem>
                            <SelectItem value="issued">{t("creditNote.issued")}</SelectItem>
                            <SelectItem value="applied">{t("creditNote.applied")}</SelectItem>
                            <SelectItem value="cancelled">{t("common.cancelled")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-muted-foreground">{t("creditNote.noteTypeLabel") || "Note Type"}</label>
                        <Select value={noteTypeFilter} onValueChange={setNoteTypeFilter}>
                          <SelectTrigger className="h-9">
                            <Filter className="w-4 h-4 mr-2" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t("creditNote.allTypes")}</SelectItem>
                            <SelectItem value="CN">{t("creditNote.typeCN") || "CN - Credit Note"}</SelectItem>
                            <SelectItem value="OP">{t("creditNote.typeOP") || "OP - Overpayment"}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-muted-foreground">{t("invoice.issueDate")}</label>
                        <div className="flex items-center gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="flex-1 justify-start h-9 font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateFrom ? format(dateFrom, "dd/MM/yy") : t("creditNote.from")}
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
                                {dateTo ? format(dateTo, "dd/MM/yy") : t("creditNote.to")}
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
                    <div className="flex justify-end">
                      <Button variant="outline" onClick={clearFilters} className="h-9">{t("common.clear")}</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Results Summary */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
              <p className="text-sm text-muted-foreground">
                {t("creditNote.showingOf2").replace("{filtered}", String(filteredCreditNotes.length)).replace("{total}", String(creditNotes.length))}
              </p>
            </div>

            {/* Credit Notes Table - Standard Alignment */}
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {/* Credit Note # - text/left */}
                      <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("creditNoteNumber")}>
                        <div className="flex items-center gap-1">
                          {t("creditNote.creditNoteNumberHeader")}
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      {/* Type - badge/center */}
                      <TableHead align="center">{t("creditNote.noteTypeLabel") || "Type"}</TableHead>
                      {/* Date - date/left */}
                      <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("issueDate")}>
                        <div className="flex items-center gap-1">
                          {t("creditNote.dateHeader")}
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      {/* Student - text/left */}
                      <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("studentName")}>
                        <div className="flex items-center gap-1">
                          {t("creditNote.studentHeader")}
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      {/* Amount - currency/right */}
                      <TableHead align="right" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("creditAmount")}>
                        <div className="flex items-center gap-1 justify-end">
                          {t("creditNote.amountHeader")}
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      {/* Reason - text/left */}
                      <TableHead align="left">{t("creditNote.reasonHeader")}</TableHead>
                      {/* Status - badge/center */}
                      <TableHead align="center" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("status")}>
                        <div className="flex items-center gap-1 justify-center">
                          Status
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      {/* Actions - actions/center */}
                      <TableHead align="center">{t("table.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCreditNotes.map((creditNote) => (
                      <TableRow key={creditNote.id}>
                        {/* Credit Note # - text/left */}
                        <TableCell align="left" className="font-mono text-sm">
                          {creditNote.creditNoteNumber}
                        </TableCell>
                        {/* Type - badge/center */}
                        <TableCell align="center">
                          {(creditNote.noteType || "CN") === "OP" ? (
                            <Badge className="bg-amber-100 text-amber-800">OP</Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-800">CN</Badge>
                          )}
                        </TableCell>
                        {/* Date - date/left */}
                        <TableCell align="left">{format(creditNote.issueDate, "dd MMM yyyy")}</TableCell>
                        {/* Student - text/left */}
                        <TableCell align="left">
                          <div>
                            <div className="font-medium">{creditNote.studentName}</div>
                            <div className="text-sm text-muted-foreground">{creditNote.studentId}</div>
                          </div>
                        </TableCell>
                        {/* Amount - currency/right */}
                        <TableCell align="right">
                          <div className="font-medium text-red-600">
                            -₿{creditNote.creditAmount.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            of ₿{creditNote.originalAmount.toLocaleString()}
                          </div>
                        </TableCell>
                        {/* Reason - text/left */}
                        <TableCell align="left">{creditNote.reason}</TableCell>
                        {/* Status - badge/center */}
                        <TableCell align="center">{getStatusBadge(creditNote.status)}</TableCell>
                        {/* Actions - actions/center */}
                        <TableCell align="center">
                          <div className="flex gap-1 justify-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openCreditNoteDetail(creditNote)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => downloadCreditNote(creditNote.id)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => sendCreditNote(creditNote.id)}
                            >
                              <Mail className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <PaginationBar
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalCount={sortedCreditNotes.length}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Credit Note Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              {t("creditNote.creditNoteDetails")}
            </DialogTitle>
            <DialogDescription>
              {t("creditNote.creditNoteDetailsDesc")}
            </DialogDescription>
          </DialogHeader>

          {selectedCreditNote && (
            <div className="space-y-4">
              <div className="border rounded-xl bg-card p-5 space-y-4">

                {/* CN Number + Status */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("creditNote.creditNoteNumberLabel")}</p>
                    <p className="font-mono text-sm font-semibold">{selectedCreditNote.creditNoteNumber}</p>
                  </div>
                  <div className="flex gap-2">
                    {getStatusBadge(selectedCreditNote.status)}
                    {getTypeBadge(selectedCreditNote.type)}
                  </div>
                </div>

                <Separator />

                {/* Student Info */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{t("creditNote.studentInfoLabel")}</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">{t("creditNote.studentName")}</p>
                      <p className="text-sm font-medium">{selectedCreditNote.studentName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("creditNote.studentIdLabel2")}</p>
                      <p className="text-sm font-mono">{selectedCreditNote.studentId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("creditNote.yearGroupLabel")}</p>
                      <Badge variant="secondary" className="mt-0.5 text-xs">{selectedCreditNote.studentGrade}</Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("creditNote.parentGuardian")}</p>
                      <p className="text-sm font-medium">{selectedCreditNote.parentName}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Credit Info */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{t("creditNote.creditInfoLabel")}</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">{t("creditNote.relatedInvoice")}</p>
                      <p className="text-sm font-mono">{selectedCreditNote.invoiceNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("creditNote.originalAmount")}</p>
                      <p className="text-sm font-medium">฿{selectedCreditNote.originalAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("creditNote.creditAmount")}</p>
                      <p className="text-base font-bold text-green-600">฿{selectedCreditNote.creditAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("creditNote.issueDateLabel")}</p>
                      <p className="text-sm font-medium">{format(selectedCreditNote.issueDate, "dd MMM yyyy")}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">{t("creditNote.reason")}</p>
                      <p className="text-sm font-medium">{selectedCreditNote.reason}</p>
                    </div>
                  </div>
                </div>

                {(selectedCreditNote.issuedBy || selectedCreditNote.approvedBy) && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-2 gap-x-6">
                      <div>
                        <p className="text-xs text-muted-foreground">{t("creditNote.issuedBy")}</p>
                        <p className="text-sm font-medium">{selectedCreditNote.issuedBy}</p>
                      </div>
                      {selectedCreditNote.approvedBy && (
                        <div>
                          <p className="text-xs text-muted-foreground">{t("creditNote.approvedBy")}</p>
                          <p className="text-sm font-medium">{selectedCreditNote.approvedBy}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {selectedCreditNote.notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t("creditNote.notesLabel")}</p>
                      <p className="text-sm">{selectedCreditNote.notes}</p>
                    </div>
                  </>
                )}

              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  className="flex-1"
                  onClick={() => {
                    downloadCreditNote(selectedCreditNote.id)
                    closeCreditNoteModal()
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t("creditNote.download")}
                </Button>

                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    sendCreditNote(selectedCreditNote.id)
                    closeCreditNoteModal()
                  }}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {t("creditNote.sendToParentBtn")}
                </Button>

                <Button variant="ghost" onClick={closeCreditNoteModal}>
                  {t("creditNote.close")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Credit Note Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {t("creditNote.createNewCreditNote")}
            </DialogTitle>
            <DialogDescription>
              {t("creditNote.createNewDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Note Type - CN only (OP is auto-generated from overpayment) */}
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Badge>CN</Badge>
              <span className="text-sm font-medium">Credit Note</span>
              <span className="text-xs text-muted-foreground ml-auto">OP (Overpayment) จะถูกสร้างอัตโนมัติจากการชำระเกิน</span>
            </div>

            {/* Student ID & Customer Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Sell-to Customer No. (Student ID) <span className="text-destructive">*</span></label>
                <Input
                  placeholder="e.g. 100789"
                  value={newCreditNote.studentId}
                  onChange={(e) => setNewCreditNote({ ...newCreditNote, studentId: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Customer Name <span className="text-destructive">*</span></label>
                <Input
                  placeholder="e.g. ABC DEF"
                  value={newCreditNote.studentName}
                  onChange={(e) => setNewCreditNote({ ...newCreditNote, studentName: e.target.value })}
                />
              </div>
            </div>

            {/* Year Group & Family Code */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Year Group Code</label>
                <Input
                  placeholder="e.g. YEAR 12"
                  value={newCreditNote.studentGrade}
                  onChange={(e) => setNewCreditNote({ ...newCreditNote, studentGrade: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Bill-to Customer No. (Family Code)</label>
                <Input
                  placeholder="e.g. 006471"
                  value={newCreditNote.familyCode}
                  onChange={(e) => setNewCreditNote({ ...newCreditNote, familyCode: e.target.value })}
                />
              </div>
            </div>

            {/* Posting Date & Due Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Posting Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !newCreditNote.postingDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newCreditNote.postingDate ? format(newCreditNote.postingDate, "dd/MM/yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newCreditNote.postingDate || undefined}
                      onSelect={(date) => setNewCreditNote({ ...newCreditNote, postingDate: date || null })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Due Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !newCreditNote.dueDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newCreditNote.dueDate ? format(newCreditNote.dueDate, "dd/MM/yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newCreditNote.dueDate || undefined}
                      onSelect={(date) => setNewCreditNote({ ...newCreditNote, dueDate: date || null })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Amount & Amount Including VAT */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount <span className="text-destructive">*</span></label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newCreditNote.amount}
                  onChange={(e) => setNewCreditNote({ ...newCreditNote, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount Including VAT</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newCreditNote.amountIncludingVat}
                  onChange={(e) => setNewCreditNote({ ...newCreditNote, amountIncludingVat: e.target.value })}
                />
              </div>
            </div>

            {/* Remaining Amount */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Remaining Amount</label>
              <Input
                type="number"
                placeholder="0.00 (negative = credit balance)"
                value={newCreditNote.remainingAmount}
                onChange={(e) => setNewCreditNote({ ...newCreditNote, remainingAmount: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Negative value indicates remaining credit balance</p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Description <span className="text-destructive">*</span></label>
              <Input
                placeholder="e.g. Credit note for ECA"
                value={newCreditNote.description}
                onChange={(e) => setNewCreditNote({ ...newCreditNote, description: e.target.value })}
              />
            </div>

            {/* Checkboxes: Paid / Cancelled / Corrective */}
            <div className="flex gap-6 items-center pt-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={newCreditNote.paid}
                  onChange={(e) => setNewCreditNote({ ...newCreditNote, paid: e.target.checked })}
                  className="rounded border-gray-300"
                />
                Paid
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={newCreditNote.cancelled}
                  onChange={(e) => setNewCreditNote({ ...newCreditNote, cancelled: e.target.checked })}
                  className="rounded border-gray-300"
                />
                Cancelled
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={newCreditNote.corrective}
                  onChange={(e) => setNewCreditNote({ ...newCreditNote, corrective: e.target.checked })}
                  className="rounded border-gray-300"
                />
                Corrective
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleCreateCreditNote} className="flex-1">
                {t("creditNote.createCreditNote")}
              </Button>
              <Button variant="outline" onClick={closeCreateModal}>
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Receipt Modal */}
      <Dialog open={isCreateReceiptModalOpen} onOpenChange={setIsCreateReceiptModalOpen}>
        <DialogContent className="max-w-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              {t("creditNote.createReceiptTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("creditNote.generateReceiptDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Invoice Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("creditNote.selectPaidInvoice")}</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder={t("creditNote.selectAnInvoice")} />
                </SelectTrigger>
                <SelectContent>
                  {invoices
                    .filter((inv: any) => inv.status === "paid")
                    .map((inv: any) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} - {inv.studentName} (₿{inv.netAmount?.toLocaleString() || 0})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Receipt Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("creditNote.receiptDate")}</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(new Date(), "dd/MM/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={new Date()} />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t("paymentMethod.label")}</label>
                <Select defaultValue="bank_transfer">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">{t("paymentMethod.bankTransfer")}</SelectItem>
                    <SelectItem value="credit_card">{t("paymentMethod.creditCard")}</SelectItem>
                    <SelectItem value="cash">{t("paymentMethod.cash")}</SelectItem>
                    <SelectItem value="cheque">{t("creditNote.cheque")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("creditNote.notesOptional")}</label>
              <Textarea
                placeholder={t("creditNote.additionalReceiptNotes")}
                className="min-h-20"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => {
                  toast.success(t("creditNote.receiptCreated"))
                  logActivity({ action: "Create Receipt", module: "Credit Notes", detail: "Created a new receipt from credit note" })
                  setIsCreateReceiptModalOpen(false)
                }}
                className="flex-1"
              >
                <Receipt className="w-4 h-4 mr-2" />
                {t("creditNote.createReceipt")}
              </Button>
              <Button variant="outline" onClick={() => setIsCreateReceiptModalOpen(false)}>
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Upload Dialog */}
      <Dialog open={isImportUploadOpen} onOpenChange={setIsImportUploadOpen}>
        <DialogContent className="max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              {t("creditNote.import") || "Import Credit Notes"}
            </DialogTitle>
            <DialogDescription>
              {t("creditNote.importDesc") || "Upload an Excel file to import credit notes"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Excel Template */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div>
                <p className="font-medium">Excel Template</p>
                <p className="text-sm text-muted-foreground">Download the template with correct column headers</p>
              </div>
              <Button variant="outline" onClick={downloadCreditNoteTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>

            {/* Upload File */}
            <div className="space-y-2">
              <Label htmlFor="cn-import-file">Upload File <span className="text-destructive">*</span></Label>
              <Input
                id="cn-import-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  setIsImportUploadOpen(false)
                  handleImportFile(e)
                }}
                className="cursor-pointer"
                disabled={!userCanEdit}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Preview Dialog */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              {t("creditNote.importTitle")}
            </DialogTitle>
            <DialogDescription>
              {importFileName} · {importPreview.length} records found
              {importErrors.length > 0 && ` · ${importErrors.length} errors`}
            </DialogDescription>
          </DialogHeader>

          {/* Errors */}
          {importErrors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-1">
              <p className="text-sm font-medium text-red-700 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {t("creditNote.rowsWithErrors")}
              </p>
              {importErrors.map((err, i) => (
                <p key={i} className="text-xs text-red-600 ml-5">{err}</p>
              ))}
            </div>
          )}

          {/* Preview Table */}
          {importPreview.length > 0 ? (
            <div className="border rounded-lg overflow-auto max-h-[50vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead align="left">Credit Note No.</TableHead>
                    <TableHead align="left">Student</TableHead>
                    <TableHead align="left">Year Group</TableHead>
                    <TableHead align="left">Family Code</TableHead>
                    <TableHead align="right">Amount</TableHead>
                    <TableHead align="left">Posting Date</TableHead>
                    <TableHead align="left">Reason</TableHead>
                    <TableHead align="center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importPreview.map((cn, i) => (
                    <TableRow key={i}>
                      <TableCell align="left" className="font-mono text-sm">{cn.creditNoteNumber}</TableCell>
                      <TableCell align="left">
                        <div className="font-medium text-sm">{cn.studentName}</div>
                        <div className="text-xs text-muted-foreground">{cn.studentId}</div>
                      </TableCell>
                      <TableCell align="left">
                        <Badge variant="outline" className="text-xs">{cn.studentGrade}</Badge>
                      </TableCell>
                      <TableCell align="left" className="text-sm">{cn.parentName}</TableCell>
                      <TableCell align="right" className="font-medium">฿{cn.creditAmount.toLocaleString()}</TableCell>
                      <TableCell align="left" className="text-sm">{format(cn.issueDate, "dd/MM/yyyy")}</TableCell>
                      <TableCell align="left" className="text-sm max-w-[180px] truncate">{cn.reason}</TableCell>
                      <TableCell align="center">{getStatusBadge(cn.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t("creditNote.noValidRecords")}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              className="flex-1"
              disabled={importPreview.length === 0}
              onClick={performImport}
            >
              <Upload className="w-4 h-4 mr-2" />
              {t("creditNote.importRecords").replace("{count}", String(importPreview.length))}
            </Button>
            <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={createDialog.isOpen}
        onOpenChange={createDialog.setIsOpen}
        onConfirm={createDialog.handleConfirm}
        titleKey="confirmDialog.createTitle"
        descriptionKey="confirmDialog.createDescription"
        confirmTextKey="common.create"
      />
    </>
  )
}