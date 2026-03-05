import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { Checkbox } from "./ui/checkbox"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog"
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Textarea } from "./ui/textarea"
import { SearchInput } from "./ui/advanced-filter"
import { PaginationBar } from "@/components/ui/pagination-bar"
import { useAcademicYears } from "@/contexts/AcademicYearContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAuth } from "@/contexts/AuthContext"
import { canPerformActions } from "@/utils/rolePermissions"
import { normalizeAcademicYear, formatAcademicYear, downloadAsXlsx } from "@/utils/xlsxUtils"
import { ColumnPresets } from "@/utils/tableAlignment"
import { useSchoolSettings } from "@/hooks/useSchoolSettings"
import { usePersistedState } from "@/hooks/usePersistedState"
import { ArrowUpDown, Calendar as CalendarIcon, CheckCircle, Clock, Eye, FileText, Filter, X, Download, RefreshCw, Mail, Pencil } from "lucide-react"
import { logActivity } from "@/lib/activityLog"
import { formatCurrency, numberToWords, getAcademicYear, generateNextInvoiceNumber } from "@/lib/invoiceUtils"
import SchoolLogo from "@/assets/Logo.png"

const CREATED_INVOICES_STORAGE_KEY = "createdInvoices"

type InvoiceStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "sent"
  | "paid"
  | "overdue"
  | "cancelled"

type ApprovalStatus = "wait" | "approved" | "rejected"

interface Invoice {
  id: string
  invoiceNumber: string
  studentName: string
  studentId: string
  studentGrade: string
  parentName: string
  parentEmail: string
  totalAmount?: number
  discountAmount?: number
  finalAmount: number
  items: {
    id: string
    description: string
    amount: number
    discountedAmount: number
    discountPercent?: number
  }[]
  status: InvoiceStatus
  approvalStatus?: ApprovalStatus
  issueDate?: Date | null
  dueDate: Date
  paidDate?: Date | null
  emailSentAt?: Date | null
  academicYear?: string
  term?: string
  approvedBy?: string
  approvedAt?: Date
  rejectedReason?: string
  rejectedAt?: Date
  rejectedBy?: string
  category?: string
}

const grades = [
  "Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5",
  "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"
]

const loadCreatedInvoicesFromStorage = (): Invoice[] => {
  try {
    const stored = localStorage.getItem(CREATED_INVOICES_STORAGE_KEY)
    if (stored) {
      const savedInvoices = JSON.parse(stored)
      return savedInvoices.map((inv: any) => {
        const parseStoredDate = (val: any): Date | null => {
          if (!val) return null
          // Handle Excel serial numbers (e.g. "46071" → 2026-02-17)
          const num = Number(val)
          if (!isNaN(num) && num > 40000 && num < 100000 && String(val).trim() === String(Math.floor(num))) {
            return new Date((num - 25569) * 86400 * 1000)
          }
          // Parse YYYY-MM-DD (with optional time) as LOCAL time to match InvoiceManagement
          const isoMatch = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/)
          if (isoMatch) {
            return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]))
          }
          const d = new Date(val)
          return isNaN(d.getTime()) ? null : d
        }

        const issueDate = parseStoredDate(inv.issueDate)
        const dueDate = parseStoredDate(inv.dueDate) || (issueDate ? new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))

        const approvalStatus: ApprovalStatus = inv.approvalStatus
          ?? (inv.status === "approved"
            ? "approved"
            : inv.status === "rejected"
              ? "rejected"
              : "wait")

        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          studentName: inv.studentName || inv.recipientName || "Unknown",
          studentId: inv.studentId,
          studentGrade: inv.studentGrade || "-",
          parentName: inv.parentName || inv.recipientName || "Parent",
          parentEmail: inv.parentEmail || "",
          totalAmount: inv.totalAmount ?? inv.subtotal ?? inv.finalAmount ?? 0,
          discountAmount: inv.discountAmount ?? inv.totalDiscount ?? 0,
          finalAmount: (() => {
            const stored = inv.finalAmount ?? inv.netAmount ?? inv.subtotal ?? 0
            if (stored > 0) return stored
            // Fallback: sum from items (same as InvoiceManagement.getDisplayAmount)
            return (inv.items || []).reduce((sum: number, item: any) =>
              sum + (item.discountedAmount ?? item.amount ?? 0), 0)
          })(),
          items: (inv.items || []).map((item: any, idx: number) => ({
            id: String(idx + 1),
            description: item.name || item.description,
            amount: item.amount ?? 0,
            discountedAmount: item.discountedAmount ?? item.amount ?? 0,
          })),
          status: (inv.status === "pending" ? "draft" : inv.status) as InvoiceStatus,
          approvalStatus,
          issueDate,
          dueDate,
          paidDate: parseStoredDate(inv.paidDate),
          emailSentAt: parseStoredDate(inv.emailSentAt),
          academicYear: inv.academicYear || "",
          term: inv.term || "",
          approvedBy: inv.approvedBy,
          approvedAt: inv.approvedAt ? new Date(inv.approvedAt) : undefined,
          rejectedReason: inv.rejectedReason,
          category: inv.category || "tuition",
        }
      })
    }
  } catch (error) {
    console.error("Failed to load created invoices:", error)
  }
  return []
}

const generateInvoiceNumber = (academicYear: string | undefined) => {
  return generateNextInvoiceNumber(academicYear)
}

const displayInvoiceNumber = (invoiceNumber: string | undefined, approvalStatus?: ApprovalStatus) => {
  if (!invoiceNumber || invoiceNumber.includes("DRAFT-") || invoiceNumber.includes("Draft-")) {
    return ""
  }
  if (approvalStatus === "wait" || approvalStatus === "rejected") {
    return ""
  }
  return invoiceNumber
}

const getEmailStatus = (invoice: Invoice): "wait" | "sent" | "cancelled" => {
  if (invoice.status === "cancelled") return "cancelled"
  if (invoice.status === "paid") {
    if (!invoice.emailSentAt) return "cancelled"
    return "sent"
  }
  if (invoice.status === "sent") return "sent"
  return "wait"
}

const getPaymentStatus = (invoice: Invoice): "unpaid" | "paid" | "overdue" => {
  if (invoice.status === "paid" || invoice.paidDate) return "paid"
  if (invoice.status === "overdue") return "overdue"
  const now = new Date()
  const due = invoice.dueDate instanceof Date ? invoice.dueDate : new Date(invoice.dueDate)
  const approval: ApprovalStatus = invoice.approvalStatus ?? (invoice.status === "approved" ? "approved" : invoice.status === "rejected" ? "rejected" : "wait")
  if (due < now && (invoice.status as string) !== "paid" && approval !== "wait") return "overdue"
  return "unpaid"
}

export function ApprovalQueue() {
  const { t } = useLanguage()
  const { academicYears = [] } = useAcademicYears()
  const { user } = useAuth()
  const schoolSettings = useSchoolSettings()
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const loaded = loadCreatedInvoicesFromStorage()
    return loaded
  })
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>(() => {
    const loaded = loadCreatedInvoicesFromStorage()
    return loaded
  })
  const [searchTerm, setSearchTerm] = usePersistedState("approval-queue:search", "")
  const [academicYearFilter, setAcademicYearFilter] = useState("all")
  const [termFilter, setTermFilter] = useState("all")
  const [invoiceStatusFilter, setInvoiceStatusFilter] = usePersistedState("approval-queue:statusFilter", "all")
  const [gradeFilter, setGradeFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState<Date | null>(null)
  const [dateTo, setDateTo] = useState<Date | null>(null)
  const [dueDateFrom, setDueDateFrom] = useState<Date | null>(null)
  const [dueDateTo, setDueDateTo] = useState<Date | null>(null)
  const [emailStatusFilter, setEmailStatusFilter] = useState("all")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all")
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set())
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false)
  const [sortKey, setSortKey] = usePersistedState<"invoiceNumber" | "studentName" | "academicYear" | "term" | "studentGrade" | "finalAmount" | "approvalStatus" | "issueDate" | "dueDate" | null>("approval-queue:sortColumn", "invoiceNumber")
  const [sortDirection, setSortDirection] = usePersistedState<"asc" | "desc">("approval-queue:sortDirection", "desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [isEditingDueDate, setIsEditingDueDate] = useState(false)
  const [editDueDateValue, setEditDueDateValue] = useState<Date | undefined>(undefined)
  const [isBulkDueDateOpen, setIsBulkDueDateOpen] = useState(false)
  const [bulkDueDateValue, setBulkDueDateValue] = useState<Date | undefined>(undefined)

  // Load approver's allowed invoice categories from UserManagement persisted users
  const approverAllowedCategories = useMemo(() => {
    if (user?.role !== "approver") return null
    try {
      const stored = localStorage.getItem("users")
      if (!stored) return null
      const managedUsers = JSON.parse(stored)
      const match = managedUsers.find((u: any) => u.email === user?.email || u.username === user?.name)
      const types: string[] = match?.approverInvoiceTypes || []
      return types.length > 0 ? types : null // null = no restriction
    } catch { return null }
  }, [user?.role, user?.email, user?.name])

  const availableTerms = academicYearFilter !== "all"
    ? (academicYears.find(y => y.id === academicYearFilter)?.terms || [])
    : [...new Map(academicYears.flatMap(y => y.terms).map(term => [term.name, term])).values()]

  const getApprovalStatus = (invoice: Invoice): ApprovalStatus => (
    invoice.approvalStatus
    ?? (invoice.status === "approved"
      ? "approved"
      : invoice.status === "rejected"
        ? "rejected"
        : "wait")
  )

  const reloadInvoices = () => {
    const loaded = loadCreatedInvoicesFromStorage()
    setInvoices(loaded)
    // Apply current filters
    applyFilters(loaded)
  }

  useEffect(() => {
    const handleInvoicesUpdated = () => reloadInvoices()
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") reloadInvoices()
    }

    window.addEventListener("invoicesUpdated", handleInvoicesUpdated)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.removeEventListener("invoicesUpdated", handleInvoicesUpdated)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  const applyFilters = (source = invoices) => {
    // Safety check: ensure source is an array
    if (!Array.isArray(source)) {
      console.error("applyFilters: source is not an array", source)
      setFilteredInvoices([])
      return
    }

    let filtered = source

    if (searchTerm) {
      const needle = searchTerm.toLowerCase()
      filtered = filtered.filter(inv =>
        inv.invoiceNumber.toLowerCase().includes(needle) ||
        inv.studentName.toLowerCase().includes(needle) ||
        inv.studentId.toLowerCase().includes(needle) ||
        inv.parentName.toLowerCase().includes(needle)
      )
    }

    if (academicYearFilter !== "all") {
      const selectedYear = academicYears.find(y => y.id === academicYearFilter)
      if (selectedYear) {
        filtered = filtered.filter(inv => normalizeAcademicYear(inv.academicYear) === normalizeAcademicYear(selectedYear.name))
      }
    }

    if (termFilter !== "all") {
      filtered = filtered.filter(inv => inv.term === termFilter)
    }

    if (invoiceStatusFilter !== "all") {
      filtered = filtered.filter(inv => {
        const approvalStatus = getApprovalStatus(inv)
        if (invoiceStatusFilter === "wait") return approvalStatus === "wait"
        if (invoiceStatusFilter === "approved") return approvalStatus === "approved"
        if (invoiceStatusFilter === "rejected") return approvalStatus === "rejected"
        return true
      })
    }

    if (gradeFilter !== "all") {
      filtered = filtered.filter(inv => inv.studentGrade === gradeFilter)
    }

    if (dateFrom) {
      filtered = filtered.filter(inv => inv.issueDate && inv.issueDate >= dateFrom)
    }

    if (dateTo) {
      filtered = filtered.filter(inv => inv.issueDate && inv.issueDate <= dateTo)
    }

    if (dueDateFrom) {
      filtered = filtered.filter(inv => inv.dueDate && inv.dueDate >= dueDateFrom)
    }

    if (dueDateTo) {
      filtered = filtered.filter(inv => inv.dueDate && inv.dueDate <= dueDateTo)
    }

    if (emailStatusFilter !== "all") {
      filtered = filtered.filter(inv => getEmailStatus(inv) === emailStatusFilter)
    }

    if (paymentStatusFilter !== "all") {
      filtered = filtered.filter(inv => getPaymentStatus(inv) === paymentStatusFilter)
    }

    // Approver category restriction
    if (approverAllowedCategories) {
      filtered = filtered.filter(inv => approverAllowedCategories.includes(inv.category || "tuition"))
    }

    setFilteredInvoices(filtered)
    setSelectedInvoiceIds(new Set())
  }

  const clearFilters = () => {
    setSearchTerm("")
    setAcademicYearFilter("all")
    setTermFilter("all")
    setInvoiceStatusFilter("all")
    setGradeFilter("all")
    setDateFrom(null)
    setDateTo(null)
    setDueDateFrom(null)
    setDueDateTo(null)
    setEmailStatusFilter("all")
    setPaymentStatusFilter("all")
    setFilteredInvoices(invoices)
    setSelectedInvoiceIds(new Set())
  }

  const handleSort = (key: NonNullable<typeof sortKey>) => {
    if (sortKey === key) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const sortedInvoices = useMemo(() => {
    const sorted = [...filteredInvoices]

    // If no sortKey is set, reverse to show newest first
    if (!sortKey) return sorted.reverse()

    sorted.sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1
      switch (sortKey) {
        case "invoiceNumber":
          return (a.invoiceNumber || "").localeCompare(b.invoiceNumber || "") * direction
        case "studentName":
          return (a.studentName || "").localeCompare(b.studentName || "") * direction
        case "academicYear":
          return (a.academicYear || "").localeCompare(b.academicYear || "") * direction
        case "term":
          return (a.term || "").localeCompare(b.term || "") * direction
        case "studentGrade":
          return (a.studentGrade || "").localeCompare(b.studentGrade || "") * direction
        case "finalAmount":
          return ((a.finalAmount || 0) - (b.finalAmount || 0)) * direction
        case "issueDate":
          return ((a.issueDate?.getTime() || 0) - (b.issueDate?.getTime() || 0)) * direction
        case "dueDate":
          return ((a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0)) * direction
        default:
          return 0
      }
    })
    return sorted
  }, [filteredInvoices, sortKey, sortDirection])

  const pagedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedInvoices.slice(start, start + pageSize)
  }, [sortedInvoices, currentPage, pageSize])

  const renderSortHeader = (label: string, key: NonNullable<typeof sortKey>) => (
    <button
      type="button"
      onClick={() => handleSort(key)}
      className="flex items-center gap-1 font-medium text-left"
    >
      <span>{label}</span>
      <ArrowUpDown
        className={`h-3 w-3 ${sortKey === key ? "text-foreground" : "text-muted-foreground"}`}
      />
    </button>
  )

  const isSelectable = (invoice: Invoice) =>
    !["approved", "rejected"].includes(getApprovalStatus(invoice)) && invoice.status !== "cancelled"

  const selectableInvoices = useMemo(
    () => filteredInvoices.filter(isSelectable),
    [filteredInvoices]
  )

  const toggleInvoiceSelection = (invoiceId: string) => {
    const newSelected = new Set(selectedInvoiceIds)
    if (newSelected.has(invoiceId)) {
      newSelected.delete(invoiceId)
    } else {
      newSelected.add(invoiceId)
    }
    setSelectedInvoiceIds(newSelected)
  }

  const selectAllVisible = (checked: boolean) => {
    if (!checked) {
      const newSelected = new Set(selectedInvoiceIds)
      selectableInvoices.forEach(invoice => newSelected.delete(invoice.id))
      setSelectedInvoiceIds(newSelected)
      return
    }

    const newSelected = new Set(selectedInvoiceIds)
    selectableInvoices.forEach(invoice => newSelected.add(invoice.id))
    setSelectedInvoiceIds(newSelected)
  }

  const matchesStoredInvoice = (stored: any, target: Invoice, overrideNumber?: string) => {
    // 1. Priority 1: Match by unique ID
    if (target.id && stored.id) {
      return stored.id === target.id
    }

    // 2. Priority 2: Match by Invoice Number
    const numberToMatch = overrideNumber ?? target.invoiceNumber
    if (numberToMatch && stored.invoiceNumber && !numberToMatch.includes("DRAFT-")) {
      return stored.invoiceNumber === numberToMatch
    }

    // 3. Final Fallback: Match by student and date (for legacy data or drafts without unique IDs)
    const studentMatch = target.studentId && stored.studentId === target.studentId
    const targetDate = target.issueDate ? new Date(target.issueDate).toDateString() : null
    const storedDate = stored.issueDate ? new Date(stored.issueDate).toDateString() : null

    return !!(studentMatch && targetDate === storedDate)
  }

  const updateLocalStorage = (target: Invoice, patch: Record<string, unknown>, overrideNumber?: string) => {
    try {
      const stored = localStorage.getItem(CREATED_INVOICES_STORAGE_KEY)
      if (!stored) return
      const savedInvoices = JSON.parse(stored)
      const updatedSavedInvoices = savedInvoices.map((inv: any) =>
        matchesStoredInvoice(inv, target, overrideNumber) ? { ...inv, ...patch } : inv
      )
      localStorage.setItem(CREATED_INVOICES_STORAGE_KEY, JSON.stringify(updatedSavedInvoices))
      window.dispatchEvent(new CustomEvent("invoicesUpdated"))
    } catch (error) {
      console.error("Failed to update invoice in localStorage:", error)
    }
  }

  const approveInvoice = (invoice: Invoice) => {
    const needsNewInvoiceNumber = !invoice.invoiceNumber || invoice.invoiceNumber.includes("DRAFT-") || invoice.invoiceNumber.includes("Draft-") || invoice.invoiceNumber.startsWith("IMP-")
    const finalInvoiceNumber = needsNewInvoiceNumber
      ? generateInvoiceNumber(invoice.academicYear)
      : invoice.invoiceNumber

    const approvalDate = new Date()
    const emailSentAt = approvalDate.toISOString()

    const updatedInvoices: Invoice[] = invoices.map(inv =>
      inv.id === invoice.id
        ? ({
          ...inv,
          invoiceNumber: finalInvoiceNumber,
          approvalStatus: "approved" as ApprovalStatus,
          approvedBy: "Admin",
          approvedAt: approvalDate,
          issueDate: inv.issueDate || approvalDate,
          status: "sent" as const,
          emailSentAt: approvalDate,
        } as Invoice)
        : inv
    )
    setInvoices(updatedInvoices)
    applyFilters(updatedInvoices)

    updateLocalStorage(
      invoice,
      {
        invoiceNumber: finalInvoiceNumber,
        approvalStatus: "approved",
        approvedBy: "Admin",
        approvedAt: approvalDate.toISOString(),
        issueDate: (invoice.issueDate || approvalDate).toISOString().split('T')[0],
        status: "sent",
        emailSentAt,
      },
      invoice.invoiceNumber
    )

    toast.success(`Invoice ${finalInvoiceNumber} has been approved and sent via email`)
    logActivity({
      action: `Approved and sent invoice ${finalInvoiceNumber}`,
      module: "Approval Queue",
      detail: "Approval Status: wait → approved, Email: sent immediately"
    })
    window.dispatchEvent(new CustomEvent("invoicesUpdated"))
  }

  const openInvoiceDetail = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setIsModalOpen(true)
  }

  const closeInvoiceModal = () => {
    setSelectedInvoice(null)
    setIsModalOpen(false)
  }

  const downloadSingleInvoicePDF = async (invoice: Invoice) => {
    setIsDownloadingPDF(true)
    try {
      toast.success(`Downloading invoice ${invoice.invoiceNumber}...`)
      // Implement PDF download logic here
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      toast.error("Failed to download PDF")
    } finally {
      setIsDownloadingPDF(false)
    }
  }


  const approveSelectedInvoices = () => {
    if (selectedInvoiceIds.size === 0) {
      toast.error("Please select invoices to approve")
      return
    }

    const approvalMap = new Map<string, string>()
    const approvalPatches: { target: Invoice; patch: Record<string, unknown>; overrideNumber?: string }[] = []
    const now = new Date()
    const updatedInvoices = invoices.map(inv => {
      if (!selectedInvoiceIds.has(inv.id) || !isSelectable(inv)) return inv

      const needsNewInvoiceNumber = !inv.invoiceNumber || inv.invoiceNumber.includes("DRAFT-") || inv.invoiceNumber.includes("Draft-") || inv.invoiceNumber.startsWith("IMP-")
      const finalInvoiceNumber = needsNewInvoiceNumber
        ? generateInvoiceNumber(inv.academicYear)
        : inv.invoiceNumber

      approvalMap.set(inv.id, finalInvoiceNumber)
      approvalPatches.push({
        target: inv,
        patch: {
          invoiceNumber: finalInvoiceNumber,
          approvalStatus: "approved" as ApprovalStatus,
          approvedBy: "Admin",
          approvedAt: now.toISOString(),
          issueDate: (inv.issueDate || now).toISOString().split('T')[0],
        },
        overrideNumber: inv.invoiceNumber
      })

      return {
        ...inv,
        invoiceNumber: finalInvoiceNumber,
        approvalStatus: "approved" as ApprovalStatus,
        approvedBy: "Admin",
        approvedAt: now,
        issueDate: inv.issueDate || now,
        status: "sent" as const,
        emailSentAt: now,
      } as Invoice
    })

    setInvoices(updatedInvoices as Invoice[])
    applyFilters(updatedInvoices as Invoice[])

    try {
      const stored = localStorage.getItem(CREATED_INVOICES_STORAGE_KEY)
      if (stored) {
        const savedInvoices = JSON.parse(stored)
        const updatedSavedInvoices = savedInvoices.map((inv: any) => {
          const match = approvalPatches.find(entry => matchesStoredInvoice(inv, entry.target, entry.overrideNumber))
          if (!match) return inv
          return { ...inv, ...match.patch }
        })
        localStorage.setItem(CREATED_INVOICES_STORAGE_KEY, JSON.stringify(updatedSavedInvoices))
        window.dispatchEvent(new CustomEvent("invoicesUpdated"))
      }
    } catch (error) {
      console.error("Failed to update invoices in localStorage:", error)
    }

    setSelectedInvoiceIds(new Set())
    toast.success(`Approved ${approvalMap.size} invoices`)
    logActivity({
      action: `Approved ${approvalMap.size} invoices`,
      module: "Approval Queue",
      detail: `Invoices: ${[...approvalMap.values()].join(", ")}`
    })
    window.dispatchEvent(new CustomEvent("invoicesUpdated"))
  }

  const openApproveDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setIsApproveDialogOpen(true)
  }

  const confirmApprove = () => {
    if (!selectedInvoice) return
    approveInvoice(selectedInvoice)
    setIsApproveDialogOpen(false)
    setSelectedInvoice(null)
  }

  const openRejectDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setRejectReason("")
    setIsRejectDialogOpen(true)
  }

  const confirmReject = () => {
    if (!selectedInvoice) return
    if (!rejectReason.trim()) {
      toast.error("Please provide a rejection reason")
      return
    }

    const rejectedAt = new Date()

    const rejectedInvoices: Invoice[] = invoices.map(inv =>
      inv.id === selectedInvoice.id
        ? ({
          ...inv,
          approvalStatus: "rejected" as ApprovalStatus,
          rejectedReason: rejectReason.trim(),
          rejectedAt: rejectedAt,
          rejectedBy: "Admin",
        } as Invoice)
        : inv
    )
    setInvoices(rejectedInvoices)
    applyFilters(rejectedInvoices)

    updateLocalStorage(
      selectedInvoice,
      {
        approvalStatus: "rejected" as ApprovalStatus,
        rejectedReason: rejectReason.trim(),
        rejectedAt: rejectedAt.toISOString(),
        rejectedBy: "Admin",
      },
      selectedInvoice.invoiceNumber
    )

    toast.success(`Invoice ${selectedInvoice.invoiceNumber} has been rejected`)
    logActivity({
      action: `Rejected invoice ${selectedInvoice.invoiceNumber}`,
      module: "Approval Queue",
      detail: `Approval Status: wait → rejected; Reason: ${rejectReason.trim()}`
    })
    setIsRejectDialogOpen(false)
    setSelectedInvoice(null)
    setRejectReason("")
    window.dispatchEvent(new CustomEvent("invoicesUpdated"))
  }

  const totalInvoices = filteredInvoices.length
  const waitCount = filteredInvoices.filter(inv => getApprovalStatus(inv) === "wait").length
  const approvedCount = filteredInvoices.filter(inv => getApprovalStatus(inv) === "approved").length
  const rejectedCount = filteredInvoices.filter(inv => getApprovalStatus(inv) === "rejected").length

  const handleExportExcel = () => {
    const headers = [
      "Invoice No.",
      "Student Name",
      "Student ID",
      "Grade",
      "Parent Name",
      "Academic Year",
      "Term",
      "Amount (THB)",
      "Discount (THB)",
      "Final Amount (THB)",
      "Approval Status",
      "Approved By",
      "Approved At",
      "Rejected Reason",
      "Issue Date",
      "Due Date",
    ]
    const rows = sortedInvoices.map(inv => [
      displayInvoiceNumber(inv.invoiceNumber, getApprovalStatus(inv)),
      inv.studentName,
      inv.studentId,
      inv.studentGrade,
      inv.parentName,
      formatAcademicYear(inv.academicYear),
      inv.term,
      inv.totalAmount ?? "",
      inv.discountAmount ?? "",
      inv.finalAmount,
      getApprovalStatus(inv),
      inv.approvedBy ?? "",
      inv.approvedAt ? format(inv.approvedAt, "dd/MM/yyyy HH:mm") : "",
      inv.rejectedReason ?? "",
      inv.issueDate ? format(inv.issueDate, "dd/MM/yyyy") : "",
      inv.dueDate ? format(inv.dueDate, "dd/MM/yyyy") : "",
    ])
    downloadAsXlsx(headers, rows, `approval_queue_${format(new Date(), "yyyyMMdd_HHmmss")}`)
    toast.success(`Exported ${sortedInvoices.length} invoices to Excel`)
  }

  // Check if user can approve invoices (not viewer role)
  const canApproveInvoices = canPerformActions(user?.role) && (user?.role === "super_admin" || user?.role === "admin_accountant" || user?.role === "approver")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t("approvalQueue.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("approvalQueue.subtitle")}
          </p>
        </div>
        <Button variant="outline" onClick={handleExportExcel} className="gap-2">
          <Download className="w-4 h-4" />
          {t("approvalQueue.exportExcel")}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("approvalQueue.totalInvoices")}</p>
                <p className="text-2xl font-bold">{totalInvoices}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("approvalQueue.wait")}</p>
                <p className="text-2xl font-bold">{waitCount}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("approvalQueue.approved")}</p>
                <p className="text-2xl font-bold">{approvedCount}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("approvalQueue.rejected")}</p>
                <p className="text-2xl font-bold">{rejectedCount}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <X className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="w-4 h-4" />
              {t("invoice.searchFilter")}
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={() => applyFilters()} className="h-9">{t("common.apply")}</Button>
              <Button variant="outline" onClick={clearFilters} className="h-9">{t("common.clear")}</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("common.search")}</label>
              <SearchInput
                placeholder={t("invoice.searchPlaceholder")}
                value={searchTerm}
                onChange={setSearchTerm}
                className="h-9"
              />
            </div>

            {/* Academic Year */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("invoice.academicYear")}</label>
              <Select value={academicYearFilter} onValueChange={(value) => {
                setAcademicYearFilter(value)
                setTermFilter("all")
              }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("invoice.allYears")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("invoice.allYears")}</SelectItem>
                  {academicYears.map(year => (
                    <SelectItem key={year.id} value={year.id}>{formatAcademicYear(year.name)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Term */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("invoice.term")}</label>
              <Select value={termFilter} onValueChange={setTermFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("invoice.allTerms")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("invoice.allTerms")}</SelectItem>
                  {availableTerms.map(term => (
                    <SelectItem key={term.name} value={term.name}>{term.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Year Group */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("student.yearGroup")}</label>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("invoice.allYearGroups")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("invoice.allYearGroups")}</SelectItem>
                  {grades.map(grade => (
                    <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Approval Status */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("approvalQueue.approvalStatus")}</label>
              <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("invoice.allStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("invoice.allStatus")}</SelectItem>
                  <SelectItem value="wait">
                    <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{t("approvalQueue.wait")}</Badge>
                  </SelectItem>
                  <SelectItem value="approved">
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{t("approvalQueue.approve")}</Badge>
                  </SelectItem>
                  <SelectItem value="rejected">
                    <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{t("approvalQueue.reject")}</Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Issue Date */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("approvalQueue.issueDate")}</label>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start h-9 font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "dd/MM/yy") : t("date.from")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom || undefined}
                      onSelect={(day) => setDateFrom(day || null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">→</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start h-9 font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "dd/MM/yy") : t("date.to")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo || undefined}
                      onSelect={(day) => setDateTo(day || null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Email Status */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("approvalQueue.emailStatus")}</label>
              <Select value={emailStatusFilter} onValueChange={setEmailStatusFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("approvalQueue.allEmailStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("approvalQueue.allEmailStatus")}</SelectItem>
                  <SelectItem value="wait">{t("approvalQueue.wait")}</SelectItem>
                  <SelectItem value="sent">{t("approvalQueue.sent")}</SelectItem>
                  <SelectItem value="cancelled">{t("approvalQueue.cancelled")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Invoice Status (Payment) */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("approvalQueue.invoiceStatus")}</label>
              <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("approvalQueue.allInvoiceStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("approvalQueue.allInvoiceStatus")}</SelectItem>
                  <SelectItem value="unpaid">{t("approvalQueue.unpaid")}</SelectItem>
                  <SelectItem value="paid">{t("approvalQueue.paid")}</SelectItem>
                  <SelectItem value="overdue">{t("approvalQueue.overdue")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Due Date Range */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("approvalQueue.dueDate")}</label>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start h-9 font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDateFrom ? format(dueDateFrom, "dd/MM/yy") : t("date.from")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDateFrom || undefined}
                      onSelect={(day) => setDueDateFrom(day || null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">→</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start h-9 font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDateTo ? format(dueDateTo, "dd/MM/yy") : t("date.to")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDateTo || undefined}
                      onSelect={(day) => setDueDateTo(day || null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {canApproveInvoices && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {t("approvalQueue.selectedCount").replace("{count}", String(selectedInvoiceIds.size))}
          </div>
          <div className="flex gap-2">
            <Popover open={isBulkDueDateOpen} onOpenChange={setIsBulkDueDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={selectedInvoiceIds.size === 0}
                  className="gap-1.5"
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {t("approvalQueue.setDueDate")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-3 border-b">
                  <p className="text-sm font-medium">{t("approvalQueue.setDueDateFor").replace("{count}", String(selectedInvoiceIds.size))}</p>
                </div>
                <Calendar
                  mode="single"
                  selected={bulkDueDateValue}
                  onSelect={setBulkDueDateValue}
                  initialFocus
                />
                <div className="p-3 border-t flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setIsBulkDueDateOpen(false); setBulkDueDateValue(undefined) }}>
                    {t("approvalQueue.cancel")}
                  </Button>
                  <Button
                    size="sm"
                    disabled={!bulkDueDateValue}
                    onClick={() => {
                      if (!bulkDueDateValue) return
                      const day = bulkDueDateValue
                      const updated = invoices.map(inv =>
                        selectedInvoiceIds.has(inv.id) ? { ...inv, dueDate: day } : inv
                      )
                      setInvoices(updated)
                      invoices.forEach(inv => {
                        if (selectedInvoiceIds.has(inv.id)) {
                          updateLocalStorage(inv, { dueDate: day.toISOString() })
                        }
                      })
                      toast.success(`Due date updated for ${selectedInvoiceIds.size} invoice${selectedInvoiceIds.size !== 1 ? "s" : ""}`)
                      setIsBulkDueDateOpen(false)
                      setBulkDueDateValue(undefined)
                    }}
                  >
                    {t("approvalQueue.apply")}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button size="sm" onClick={approveSelectedInvoices} disabled={selectedInvoiceIds.size === 0}>
              {t("approvalQueue.approveSelected")}
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {/* Checkbox - center aligned */}
                <TableHead align="center" className="w-12">
                  <Checkbox
                    checked={selectableInvoices.length > 0 && selectableInvoices.every(inv => selectedInvoiceIds.has(inv.id))}
                    onCheckedChange={selectAllVisible}
                  />
                </TableHead>
                {/* Invoice No - left aligned */}
                <TableHead align="left">{renderSortHeader(t("approvalQueue.invoiceNo"), "invoiceNumber")}</TableHead>
                {/* Student - left aligned */}
                <TableHead align="left">{renderSortHeader(t("approvalQueue.student"), "studentName")}</TableHead>
                {/* Academic Year - left aligned */}
                <TableHead align="left">{renderSortHeader(t("invoice.academicYear"), "academicYear")}</TableHead>
                {/* Term - left aligned */}
                <TableHead align="left">{renderSortHeader(t("invoice.term"), "term")}</TableHead>
                {/* Year Group - center aligned */}
                <TableHead align="center">{renderSortHeader(t("student.yearGroup"), "studentGrade")}</TableHead>
                {/* Amount - right aligned */}
                <TableHead align="right">{renderSortHeader(t("approvalQueue.amount"), "finalAmount")}</TableHead>
                {/* Approval Status - center */}
                <TableHead align="center">{renderSortHeader(t("approvalQueue.approvalStatus"), "approvalStatus")}</TableHead>
                {/* Email Status - center */}
                <TableHead align="center">{t("approvalQueue.emailStatus")}</TableHead>
                {/* Invoice Status - center */}
                <TableHead align="center">{t("approvalQueue.invoiceStatus")}</TableHead>
                {/* Issue Date - left aligned */}
                <TableHead align="left">{renderSortHeader(t("approvalQueue.issueDate"), "issueDate")}</TableHead>
                {/* Due Date - left aligned */}
                <TableHead align="left">{renderSortHeader(t("approvalQueue.dueDate"), "dueDate")}</TableHead>
                {/* Actions - center aligned */}
                <TableHead align="center">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedInvoices.map(invoice => (
                <TableRow key={invoice.id}>
                  {/* Checkbox - center aligned */}
                  <TableCell align="center">
                    <Checkbox
                      checked={selectedInvoiceIds.has(invoice.id)}
                      disabled={!isSelectable(invoice)}
                      onCheckedChange={() => toggleInvoiceSelection(invoice.id)}
                    />
                  </TableCell>
                  {/* Invoice No - left aligned */}
                  <TableCell align="left" className="font-mono text-sm">
                    {displayInvoiceNumber(invoice.invoiceNumber, getApprovalStatus(invoice))}
                  </TableCell>
                  {/* Student - left aligned */}
                  <TableCell align="left">
                    <div>
                      <div className="font-medium">{invoice.studentName}</div>
                      <div className="text-sm text-muted-foreground">{invoice.studentId}</div>
                    </div>
                  </TableCell>
                  {/* Academic Year - left aligned */}
                  <TableCell align="left">{formatAcademicYear(invoice.academicYear) || "-"}</TableCell>
                  {/* Term - left aligned */}
                  <TableCell align="left">{invoice.term || "-"}</TableCell>
                  {/* Year Group - center aligned */}
                  <TableCell align="center">
                    <Badge variant="secondary">{invoice.studentGrade || "-"}</Badge>
                  </TableCell>
                  {/* Amount - right aligned */}
                  <TableCell align="right" className="font-medium">
                    <div>฿{invoice.finalAmount.toLocaleString()}</div>
                    {(invoice.discountAmount ?? 0) > 0 && (
                      <div className="text-xs text-green-600">-฿{(invoice.discountAmount ?? 0).toLocaleString()}</div>
                    )}
                  </TableCell>
                  {/* Approval Status - center */}
                  <TableCell align="center">
                    {invoice.status === "cancelled" ? (
                      <Badge className="bg-red-100 text-red-800 border-red-300">{t("approvalQueue.cancelled")}</Badge>
                    ) : getApprovalStatus(invoice) === "approved" ? (
                      <Badge className="bg-green-100 text-green-800">{t("approvalQueue.approve")}</Badge>
                    ) : getApprovalStatus(invoice) === "rejected" ? (
                      <Badge className="bg-red-100 text-red-800">{t("approvalQueue.reject")}</Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800">{t("approvalQueue.wait")}</Badge>
                    )}
                  </TableCell>
                  {/* Email Status - center */}
                  <TableCell align="center">
                    {(() => {
                      const es = getEmailStatus(invoice)
                      if (es === "sent") return <Badge className="bg-blue-100 text-blue-800"><Mail className="w-3 h-3 mr-1" />{t("approvalQueue.sent")}</Badge>
                      if (es === "cancelled") return <span className="text-muted-foreground text-sm">—</span>
                      return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />{t("approvalQueue.wait")}</Badge>
                    })()}
                  </TableCell>
                  {/* Invoice Status - center */}
                  <TableCell align="center">
                    {(() => {
                      const ps = getPaymentStatus(invoice)
                      if (ps === "paid") return <Badge className="bg-green-100 text-green-800">{t("approvalQueue.paid")}</Badge>
                      if (ps === "overdue") return <Badge className="bg-red-100 text-red-800">{t("approvalQueue.overdue")}</Badge>
                      return <Badge className="bg-gray-100 text-gray-800">{t("approvalQueue.unpaid")}</Badge>
                    })()}
                  </TableCell>
                  {/* Issue Date - left aligned */}
                  <TableCell align="left">{invoice.issueDate ? format(invoice.issueDate, "dd MMM yyyy") : "-"}</TableCell>
                  {/* Due Date - left aligned */}
                  <TableCell align="left">{format(invoice.dueDate, "dd MMM yyyy")}</TableCell>
                  {/* Actions - center aligned */}
                  <TableCell align="center">
                    <div className="flex justify-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openInvoiceDetail(invoice)}
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {invoice.status !== "cancelled" && getApprovalStatus(invoice) === "wait" && canApproveInvoices && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => openApproveDialog(invoice)}
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => openRejectDialog(invoice)}
                            title="Reject"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredInvoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={13} className="text-center text-sm text-muted-foreground">
                    {t("approvalQueue.noInvoicesFound")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <PaginationBar
            currentPage={currentPage}
            pageSize={pageSize}
            totalCount={sortedInvoices.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
          />
        </CardContent>
      </Card>

      {/* Approve Confirmation Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="p-6 bg-white" style={{ width: "50vw", maxWidth: "600px", backgroundColor: "white", opacity: 1 }}>
          <DialogHeader>
            <DialogTitle>{t("approvalQueue.confirmApproval")}</DialogTitle>
            <DialogDescription>
              {t("approvalQueue.confirmApprovalDesc").replace("{number}", selectedInvoice?.invoiceNumber ?? "")}
            </DialogDescription>
          </DialogHeader>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
              {t("approvalQueue.cancel")}
            </Button>
            <Button style={{ backgroundColor: "#16a34a", color: "white" }} onClick={confirmApprove}>
              {t("approvalQueue.confirm")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="p-6 bg-white" style={{ width: "50vw", maxWidth: "600px", backgroundColor: "white", opacity: 1 }}>
          <DialogHeader>
            <DialogTitle>{t("approvalQueue.rejectInvoice")}</DialogTitle>
            <DialogDescription>
              {t("approvalQueue.rejectReasonDesc")}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder={t("approvalQueue.rejectionReasonPlaceholder")}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              {t("approvalQueue.cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmReject}>
              {t("approvalQueue.reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-7xl w-[95vw] max-h-[90vh] p-0 flex flex-col">
          {selectedInvoice && (
            <div className="flex flex-col h-full">
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-white">
                {/* School Header */}
                <div className="text-center pt-6 pb-4 border-b">
                  <img
                    src={schoolSettings.logoUrl || SchoolLogo}
                    alt={schoolSettings.schoolName}
                    style={{ height: '120px', margin: '0 auto 12px auto', display: 'block' }}
                  />
                  <h2 className="text-sm font-semibold tracking-wide text-gray-800">{schoolSettings.schoolName.toUpperCase()}</h2>
                  <p className="text-xs text-gray-500 mt-1">{schoolSettings.address}</p>
                  <p className="text-xs text-gray-500">{schoolSettings.phone}, {schoolSettings.email}, {schoolSettings.website}</p>
                </div>

                {/* Invoice Title */}
                <div className="text-center py-4">
                  <h1 className="text-2xl font-bold tracking-wider">INVOICE</h1>
                  <Badge variant="outline" className="mt-2">
                    <Eye className="w-3 h-3 mr-1" />
                    {t("approvalQueue.viewOnly")}
                  </Badge>
                </div>

                {/* Student & Invoice Info */}
                <div className="px-8 py-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-300">
                    {/* Left - Student Info */}
                    <div className="p-6 pr-8">
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{t("approvalQueue.studentInformation")}</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">{t("invoice.studentId")}</span>
                          <span className="text-sm font-medium text-gray-800">{selectedInvoice.studentId}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">{t("invoice.studentName")}</span>
                          <span className="text-sm font-medium text-gray-800">{selectedInvoice.studentName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">{t("student.yearGroup")}</span>
                          <span className="text-sm font-medium text-gray-800">{selectedInvoice.studentGrade}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">{t("approvalQueue.contactName")}</span>
                          <span className="text-sm font-medium text-gray-800">{selectedInvoice.parentName}</span>
                        </div>
                      </div>
                    </div>
                    {/* Right - Invoice Info */}
                    <div className="p-6 pl-8">
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{t("approvalQueue.invoiceDetails")}</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">{t("approvalQueue.invoiceNo")}</span>
                          <span className="text-sm font-medium text-gray-800">
                            {selectedInvoice.approvalStatus === 'approved'
                              ? selectedInvoice.invoiceNumber
                              : t("approvalQueue.pendingApproval")}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">{t("approvalQueue.invoiceDate")}</span>
                          <span className="text-sm font-medium text-gray-800">
                            {selectedInvoice.issueDate ? format(selectedInvoice.issueDate, "dd MMM yyyy") : t("approvalQueue.pendingApproval")}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">{t("approvalQueue.dueDate")}</span>
                          <div className="flex items-center gap-1">
                            {isEditingDueDate ? (
                              <Popover open={isEditingDueDate} onOpenChange={(open) => { if (!open) setIsEditingDueDate(false) }}>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs text-red-600 font-medium">
                                    {editDueDateValue ? format(editDueDateValue, "dd MMM yyyy") : t("approvalQueue.pickDate")}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                  <Calendar
                                    mode="single"
                                    selected={editDueDateValue}
                                    onSelect={(day) => {
                                      if (!day) return
                                      setEditDueDateValue(day)
                                      // Save
                                      const updated = invoices.map(inv =>
                                        inv.id === selectedInvoice.id ? { ...inv, dueDate: day } : inv
                                      )
                                      setInvoices(updated)
                                      setSelectedInvoice(prev => prev ? { ...prev, dueDate: day } : prev)
                                      updateLocalStorage(selectedInvoice, { dueDate: day.toISOString() })
                                      setIsEditingDueDate(false)
                                      toast.success("Due date updated")
                                    }}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            ) : (
                              <>
                                <span className="text-sm font-medium text-red-600">
                                  {selectedInvoice.dueDate ? format(selectedInvoice.dueDate, "dd MMM yyyy") : "-"}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">{t("approvalQueue.schoolYear")}</span>
                          <span className="text-sm font-medium text-gray-800">
                            {selectedInvoice.issueDate ? getAcademicYear(selectedInvoice.issueDate) : "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rejection Information */}
                  {selectedInvoice.approvalStatus === "rejected" && (
                    <div className="my-6 bg-orange-50 border border-orange-200 rounded-md p-4">
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 mt-0.5">
                          <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-orange-800 mb-1">{t("approvalQueue.invoiceRejected")}</p>
                          <p className="text-sm text-orange-700">
                            <span className="font-medium">{t("approvalQueue.reason")}:</span> {selectedInvoice.rejectedReason || t("approvalQueue.noReasonRecorded")}
                          </p>
                          <p className="text-xs text-orange-600 mt-1">
                            {selectedInvoice.rejectedBy && <>{t("approvalQueue.rejectedBy").replace("{name}", selectedInvoice.rejectedBy)}</>}
                            {selectedInvoice.rejectedAt && (
                              <>
                                {selectedInvoice.rejectedBy && <> {t("approvalQueue.rejectedOn")} </>}
                                {new Date(selectedInvoice.rejectedAt).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })} at {new Date(selectedInvoice.rejectedAt).toLocaleTimeString('en-GB', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: false
                                })}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Invoice Items Table */}
                <div className="px-8 pb-6">
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="py-3 px-4 text-left font-semibold w-12">No.</th>
                          <th className="py-3 px-4 text-left font-semibold">Description</th>
                          <th className="py-3 px-4 text-right font-semibold w-28">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.items.map((item, index) => (
                          <tr key={item.id} className="border-b last:border-b-0">
                            <td className="py-3 px-4 align-top text-gray-600">{index + 1}</td>
                            <td className="py-3 px-4 align-top" style={{ wordBreak: 'break-word' }}>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span>{item.description}</span>
                              </div>
                              {item.discountPercent !== undefined && item.discountPercent > 0 && (
                                <span className="text-gray-400 text-xs">(-{item.discountPercent}%)</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-medium whitespace-nowrap align-top">
                              {formatCurrency(item.discountedAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {/* Total */}
                    <div className="border-t bg-gray-50 p-4">
                      <div className="text-xs text-gray-500 mb-2">{numberToWords(selectedInvoice.finalAmount)}</div>
                      <div className="flex justify-between items-center font-bold text-base">
                        <span>{t("approvalQueue.total")}</span>
                        <span>{formatCurrency(selectedInvoice.finalAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="px-8 pb-6">
                  <p className="text-sm">
                    <span className="font-medium text-gray-700">{t("approvalQueue.paymentMethodsLabel")} </span>
                    <span className="text-gray-500">{t("approvalQueue.paymentMethodsList")}</span>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end px-8 py-4 border-t bg-gray-50 shrink-0">
                <div className="flex gap-3">
                  <Button variant="outline" onClick={closeInvoiceModal}>
                    {t("approvalQueue.close")}
                  </Button>
                  <Button
                    onClick={() => selectedInvoice && downloadSingleInvoicePDF(selectedInvoice)}
                    disabled={isDownloadingPDF}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isDownloadingPDF ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        {t("approvalQueue.generatingPdf")}
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        {t("approvalQueue.downloadPdf")}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
