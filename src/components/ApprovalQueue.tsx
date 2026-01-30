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
import { useAcademicYears } from "@/contexts/AcademicYearContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { ArrowUpDown, Calendar as CalendarIcon, CheckCircle, Clock, Eye, FileText, Filter, X } from "lucide-react"
import { ViewModal } from "./ViewModal"
import { logActivity } from "@/lib/activityLog"

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
  finalAmount: number
  items: {
    id: string
    description: string
    amount: number
    discountedAmount: number
  }[]
  status: InvoiceStatus
  approvalStatus?: ApprovalStatus
  issueDate: Date
  dueDate: Date
  academicYear?: string
  term?: string
  approvedBy?: string
  approvedAt?: Date
  rejectedReason?: string
}

const grades = [
  "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5",
  "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"
]

const loadCreatedInvoicesFromStorage = (): Invoice[] => {
  try {
    const stored = localStorage.getItem(CREATED_INVOICES_STORAGE_KEY)
    if (stored) {
      const savedInvoices = JSON.parse(stored)
      console.log('[ApprovalQueue] Loading invoices from storage:', savedInvoices.length, 'invoices')
      return savedInvoices.map((inv: any) => {
        let issueDate = new Date()
        if (inv.issueDate) {
          if (inv.issueDate.includes?.("-")) {
            const [year, month, day] = inv.issueDate.split("-").map(Number)
            issueDate = new Date(year, month - 1, day)
          } else {
            issueDate = new Date(inv.issueDate)
          }
        }

        let dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        if (inv.dueDate) {
          if (inv.dueDate.includes?.("-")) {
            const [year, month, day] = inv.dueDate.split("-").map(Number)
            dueDate = new Date(year, month - 1, day)
          } else {
            dueDate = new Date(inv.dueDate)
          }
        }

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
          finalAmount: inv.netAmount ?? inv.subtotal ?? 0,
          items: (inv.items || []).map((item: any, idx: number) => ({
            id: String(idx + 1),
            description: item.name || item.description,
            amount: item.amount,
            discountedAmount: item.amount,
          })),
          status: (inv.status === "pending" ? "draft" : inv.status) as InvoiceStatus,
          approvalStatus,
          issueDate: isNaN(issueDate.getTime()) ? new Date() : issueDate,
          dueDate: isNaN(dueDate.getTime()) ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : dueDate,
          academicYear: inv.academicYear || "",
          term: inv.term || "",
          approvedBy: inv.approvedBy,
          approvedAt: inv.approvedAt ? new Date(inv.approvedAt) : undefined,
          rejectedReason: inv.rejectedReason,
        }
      })
    }
  } catch (error) {
    console.error("Failed to load created invoices:", error)
  }
  return []
}

const generateInvoiceNumber = (studentId: string) => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const idSuffix = studentId.slice(-4)
  return `INV-${year}${month}-${idSuffix}`
}

const displayInvoiceNumber = (invoiceNumber: string | undefined) => {
  if (!invoiceNumber || invoiceNumber.startsWith("DRAFT-")) {
    return ""
  }
  return invoiceNumber
}

export function ApprovalQueue() {
  const { t } = useLanguage()
  const { academicYears = [] } = useAcademicYears()
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const loaded = loadCreatedInvoicesFromStorage()
    console.log('[ApprovalQueue] Initial invoices:', loaded.length)
    return loaded
  })
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>(() => {
    const loaded = loadCreatedInvoicesFromStorage()
    console.log('[ApprovalQueue] Initial filteredInvoices:', loaded.length)
    return loaded
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [academicYearFilter, setAcademicYearFilter] = useState("all")
  const [termFilter, setTermFilter] = useState("all")
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("all")
  const [gradeFilter, setGradeFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState<Date | null>(null)
  const [dateTo, setDateTo] = useState<Date | null>(null)
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set())
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [viewModalData, setViewModalData] = useState<any>(null)
  const [sortKey, setSortKey] = useState<"invoiceNumber" | "studentName" | "academicYear" | "term" | "studentGrade" | "finalAmount" | "issueDate" | "dueDate" | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

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
        filtered = filtered.filter(inv => inv.academicYear === selectedYear.name)
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
      filtered = filtered.filter(inv => inv.issueDate >= dateFrom)
    }

    if (dateTo) {
      filtered = filtered.filter(inv => inv.issueDate <= dateTo)
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
    console.log('[ApprovalQueue] Rendering with:', {
      totalInvoices: invoices.length,
      filteredInvoices: filteredInvoices.length,
      academicYearFilter,
      invoiceStatusFilter
    })
    if (!sortKey) return filteredInvoices
    const sorted = [...filteredInvoices]
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
          return (a.issueDate.getTime() - b.issueDate.getTime()) * direction
        case "dueDate":
          return (a.dueDate.getTime() - b.dueDate.getTime()) * direction
        default:
          return 0
      }
    })
    return sorted
  }, [filteredInvoices, sortKey, sortDirection])

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
    const idMatch = target.id && stored.id === target.id
    const numberToMatch = overrideNumber ?? target.invoiceNumber
    const numberMatch = numberToMatch && stored.invoiceNumber === numberToMatch
    const studentMatch = target.studentId && stored.studentId === target.studentId
    const issueDateMatch = target.issueDate && stored.issueDate
      ? new Date(stored.issueDate).toDateString() === target.issueDate.toDateString()
      : false
    return idMatch || numberMatch || (studentMatch && issueDateMatch)
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
    const needsNewInvoiceNumber = !invoice.invoiceNumber || invoice.invoiceNumber.startsWith("DRAFT-")
    const finalInvoiceNumber = needsNewInvoiceNumber
      ? generateInvoiceNumber(invoice.studentId)
      : invoice.invoiceNumber

    const updatedInvoices = invoices.map(inv =>
      inv.id === invoice.id
        ? {
            ...inv,
            invoiceNumber: finalInvoiceNumber,
            approvalStatus: "approved",
            approvedBy: "Admin",
            approvedAt: new Date(),
          }
        : inv
    )
    setInvoices(updatedInvoices)

    updateLocalStorage(
      invoice,
      {
      invoiceNumber: finalInvoiceNumber,
      approvalStatus: "approved",
      approvedBy: "Admin",
      approvedAt: new Date().toISOString(),
      },
      invoice.invoiceNumber
    )

    toast.success(`Invoice ${finalInvoiceNumber} has been approved`)
    logActivity({
      action: `Approved invoice ${finalInvoiceNumber}`,
      module: "Approval Queue",
      detail: "Approval Status: wait → approved"
    })
    window.dispatchEvent(new CustomEvent("invoicesUpdated"))
  }

  const openViewModal = (invoice: Invoice) => {
    const modalData = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      studentName: invoice.studentName,
      studentId: invoice.studentId,
      grade: invoice.studentGrade,
      parentEmail: invoice.parentEmail,
      amount: invoice.finalAmount,
      total: invoice.finalAmount,
      status: invoice.status,
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      category: "Invoice",
      academicYear: invoice.academicYear || "",
      items: invoice.items.map(item => ({
        name: item.description,
        description: item.description,
        amount: item.discountedAmount,
        quantity: 1
      })),
      student: {
        name: invoice.studentName,
        id: invoice.studentId,
        grade: invoice.studentGrade,
        parentEmail: invoice.parentEmail,
        parentName: invoice.parentName
      }
    }

    setViewModalData(modalData)
    setIsViewModalOpen(true)
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

      const needsNewInvoiceNumber = !inv.invoiceNumber || inv.invoiceNumber.startsWith("DRAFT-")
      const finalInvoiceNumber = needsNewInvoiceNumber
        ? generateInvoiceNumber(inv.studentId)
        : inv.invoiceNumber

      approvalMap.set(inv.id, finalInvoiceNumber)
      approvalPatches.push({
        target: inv,
        patch: {
          invoiceNumber: finalInvoiceNumber,
          approvalStatus: "approved",
          approvedBy: "Admin",
          approvedAt: now.toISOString(),
        },
        overrideNumber: inv.invoiceNumber
      })

      return {
        ...inv,
        invoiceNumber: finalInvoiceNumber,
        approvalStatus: "approved",
        approvedBy: "Admin",
        approvedAt: now,
      }
    })

    setInvoices(updatedInvoices)
    applyFilters(updatedInvoices)

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

    const updatedInvoices = invoices.map(inv =>
      inv.id === selectedInvoice.id
        ? {
            ...inv,
            approvalStatus: "rejected",
            rejectedReason: rejectReason.trim(),
            rejectedAt: rejectedAt,
            rejectedBy: "Admin",
          }
        : inv
    )
    setInvoices(updatedInvoices)

    updateLocalStorage(
      selectedInvoice,
      {
        approvalStatus: "rejected",
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Approval Queue</h2>
        <p className="text-sm text-muted-foreground">
          Review and approve pending invoices.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Invoices</p>
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
                <p className="text-sm font-medium text-muted-foreground">Wait</p>
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
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
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
                <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold">{rejectedCount}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <X className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Selected {selectedInvoiceIds.size}
        </div>
        <Button size="sm" onClick={approveSelectedInvoices} disabled={selectedInvoiceIds.size === 0}>
          Approve Selected
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="w-4 h-4" />
              {t("invoice.searchFilter")}
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={applyFilters} className="h-9">{t("common.apply")}</Button>
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
                    <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>
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
                    <SelectItem key={term.id} value={term.name}>{term.name}</SelectItem>
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

            {/* Invoice Status */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Invoice Status</label>
              <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("invoice.allStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("invoice.allStatus")}</SelectItem>
                  <SelectItem value="wait">
                    <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Wait</Badge>
                  </SelectItem>
                  <SelectItem value="approved">
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approve</Badge>
                  </SelectItem>
                  <SelectItem value="rejected">
                    <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Reject</Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("payment.dateRange")}</label>
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
                      {dateTo ? format(dateTo, "dd/MM/yy") : t("date.to")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
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

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectableInvoices.length > 0 && selectableInvoices.every(inv => selectedInvoiceIds.has(inv.id))}
                    onCheckedChange={selectAllVisible}
                  />
                </TableHead>
                <TableHead>{renderSortHeader("Invoice No.", "invoiceNumber")}</TableHead>
                <TableHead>{renderSortHeader("Student", "studentName")}</TableHead>
                <TableHead>{renderSortHeader("Academic Year", "academicYear")}</TableHead>
                <TableHead>{renderSortHeader("Term", "term")}</TableHead>
                <TableHead>{renderSortHeader(t("student.yearGroup"), "studentGrade")}</TableHead>
                <TableHead>{renderSortHeader("Amount", "finalAmount")}</TableHead>
                <TableHead>{renderSortHeader("Issue Date", "issueDate")}</TableHead>
                <TableHead>{renderSortHeader("Due Date", "dueDate")}</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedInvoices.map(invoice => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedInvoiceIds.has(invoice.id)}
                      disabled={!isSelectable(invoice)}
                      onCheckedChange={() => toggleInvoiceSelection(invoice.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {displayInvoiceNumber(invoice.invoiceNumber)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{invoice.studentName}</div>
                      <div className="text-sm text-muted-foreground">{invoice.studentId}</div>
                    </div>
                  </TableCell>
                  <TableCell>{invoice.academicYear || "-"}</TableCell>
                  <TableCell>{invoice.term || "-"}</TableCell>
                  <TableCell>{invoice.studentGrade || "-"}</TableCell>
                  <TableCell className="font-medium">฿{invoice.finalAmount.toLocaleString()}</TableCell>
                  <TableCell>{format(invoice.issueDate, "MMM dd, yyyy")}</TableCell>
                  <TableCell>{format(invoice.dueDate, "MMM dd, yyyy")}</TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openViewModal(invoice)}
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {invoice.status === "cancelled" ? (
                        <Badge className="bg-red-100 text-red-800 border-red-300">Cancelled</Badge>
                      ) : getApprovalStatus(invoice) === "approved" ? (
                        <Badge className="bg-green-100 text-green-800">Approved</Badge>
                      ) : getApprovalStatus(invoice) === "rejected" ? (
                        <Badge className="bg-red-100 text-red-800">Rejected</Badge>
                      ) : (
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
                  <TableCell colSpan={10} className="text-center text-sm text-muted-foreground">
                    No invoices found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Approve Confirmation Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="p-6" style={{ width: "50vw", maxWidth: "600px" }}>
          <DialogHeader>
            <DialogTitle>Confirm Approval</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve invoice {selectedInvoice?.invoiceNumber}?
            </DialogDescription>
          </DialogHeader>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button style={{ backgroundColor: "#16a34a", color: "white" }} onClick={confirmApprove}>
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="p-6" style={{ width: "50vw", maxWidth: "600px" }}>
          <DialogHeader>
            <DialogTitle>Reject Invoice</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="Rejection reason..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmReject}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ViewModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        type="invoice"
        data={viewModalData}
        previewOnly
      />
    </div>
  )
}
