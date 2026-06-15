import { useState, useEffect, useMemo } from "react"
import { FileText, Search, X, ChevronLeft, ChevronRight, CheckCircle, Clock, XCircle, DollarSign } from "lucide-react"
import { cn } from "@/components/ui/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface CombinedInvoicePageProps {
  onNavigateToSubPage: (subPage: string, params?: any) => void
  onNavigateToView?: (type: "invoice" | "student" | "item" | "receipt" | "payment" | "course" | "template", data: any) => void
}

const PAGE_SIZE = 20

const TYPE_META: Record<string, { label: string; nav: string; badge: string }> = {
  tuition: {
    label: "Tuition",
    nav: "tuition-invoice-management",
    badge: "bg-blue-100 text-blue-700 border border-blue-300",
  },
  eca: {
    label: "ECA",
    nav: "eca-invoices",
    badge: "bg-purple-100 text-purple-700 border border-purple-300",
  },
  trip: {
    label: "Trip & Activity",
    nav: "trip-invoices",
    badge: "bg-orange-100 text-orange-700 border border-orange-300",
  },
  exam: {
    label: "Exam",
    nav: "exam-invoices",
    badge: "bg-green-100 text-green-700 border border-green-300",
  },
  bus: {
    label: "School Bus",
    nav: "bus-invoices",
    badge: "bg-gray-100 text-gray-700 border border-gray-300",
  },
}

const parseLocal = (val: any): Date | null => {
  if (!val) return null
  const m = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return new Date(+m[1], +m[2] - 1, +m[3])
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d
}

const formatAmount = (amount: number) =>
  new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2 }).format(amount)

const formatDate = (date: Date | null) => {
  if (!date) return "-"
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function ApprovalBadge({ status }: { status: string }) {
  if (status === "approved")
    return <Badge className="bg-green-100 text-green-800 border-green-200 font-medium">Approved</Badge>
  if (status === "rejected")
    return <Badge className="bg-red-100 text-red-800 border-red-200 font-medium">Rejected</Badge>
  return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 font-medium">Pending</Badge>
}

function PaymentBadge({ status }: { status: string }) {
  if (status === "paid")
    return <Badge className="bg-green-100 text-green-800 border-green-200 font-medium">Paid</Badge>
  if (status === "overdue")
    return <Badge className="bg-red-100 text-red-800 border-red-200 font-medium">Overdue</Badge>
  if (status === "cancelled")
    return <Badge className="bg-gray-100 text-gray-600 border-gray-200 font-medium">Cancelled</Badge>
  if (status === "sent")
    return <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-medium">Sent</Badge>
  return <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 font-medium">{status || "Draft"}</Badge>
}

function TypeBadge({ category }: { category: string }) {
  const meta = TYPE_META[category] || { label: category, badge: "bg-gray-100 text-gray-700 border border-gray-300" }
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", meta.badge)}>
      {meta.label}
    </span>
  )
}

function loadInvoices() {
  try {
    const raw = JSON.parse(localStorage.getItem("createdInvoices") || "[]")
    return (raw as any[]).filter(
      (inv) =>
        inv.category !== "external" &&
        inv.invoiceType !== "external" &&
        inv.studentId !== "EXTERNAL"
    )
  } catch {
    return []
  }
}

export function CombinedInvoicePage({ onNavigateToSubPage }: CombinedInvoicePageProps) {
  const [invoices, setInvoices] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [ayFilter, setAyFilter] = useState("all")
  const [page, setPage] = useState(1)

  const fetchData = () => setInvoices(loadInvoices())

  useEffect(() => {
    fetchData()
    window.addEventListener("focus", fetchData)
    return () => window.removeEventListener("focus", fetchData)
  }, [])

  const academicYears = useMemo(() => {
    const years = new Set<string>()
    invoices.forEach((inv) => { if (inv.academicYear) years.add(inv.academicYear) })
    return Array.from(years).sort((a, b) => b.localeCompare(a))
  }, [invoices])

  // Stats computed from all (unfiltered) invoices
  const stats = useMemo(() => {
    const approved = invoices.filter(inv => (inv.approvalStatus ?? "wait") === "approved").length
    const pending = invoices.filter(inv => (inv.approvalStatus ?? "wait") === "wait").length
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.finalAmount ?? inv.totalAmount ?? 0), 0)
    return { total: invoices.length, approved, pending, totalAmount }
  }, [invoices])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return invoices
      .filter((inv) => {
        if (typeFilter !== "all" && inv.category !== typeFilter) return false
        if (ayFilter !== "all" && inv.academicYear !== ayFilter) return false
        if (q) {
          const invNo = (inv.invoiceNumber || "").toLowerCase()
          const name = (inv.studentName || "").toLowerCase()
          if (!invNo.includes(q) && !name.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => {
        const da = parseLocal(a.issueDate)
        const db = parseLocal(b.issueDate)
        if (!da && !db) return 0
        if (!da) return 1
        if (!db) return -1
        return db.getTime() - da.getTime()
      })
  }, [invoices, search, typeFilter, ayFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filtered.length)

  const resetPage = (setter: (v: string) => void) => (val: string) => {
    setter(val)
    setPage(1)
  }

  const handleRowClick = (inv: any) => {
    const nav = TYPE_META[inv.category || "tuition"]?.nav || "tuition-invoice-management"
    onNavigateToSubPage(nav)
  }

  const hasActiveFilter = search || typeFilter !== "all" || ayFilter !== "all"

  return (
    <div className="flex flex-col gap-5">

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4 flex items-start gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 shrink-0">
              <FileText className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Invoices</p>
              <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4 flex items-start gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-green-50 shrink-0">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold">{stats.approved.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4 flex items-start gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-yellow-50 shrink-0">
              <Clock className="w-4 h-4 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending Approval</p>
              <p className="text-2xl font-bold">{stats.pending.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4 flex items-start gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 shrink-0">
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">฿{Math.round(stats.totalAmount).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter bar */}
      <Card className="rounded-xl">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2 items-center">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoice no. or student..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-9 pr-9 w-64"
              />
              {search && (
                <button
                  onClick={() => { setSearch(""); setPage(1) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Type filter */}
            <Select value={typeFilter} onValueChange={resetPage(setTypeFilter)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(TYPE_META).map(([key, meta]) => (
                  <SelectItem key={key} value={key}>{meta.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Academic Year filter */}
            <Select value={ayFilter} onValueChange={resetPage(setAyFilter)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Academic Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Academic Years</SelectItem>
                {academicYears.map((ay) => (
                  <SelectItem key={ay} value={ay}>{ay}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear filters */}
            {hasActiveFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => { setSearch(""); setTypeFilter("all"); setAyFilter("all"); setPage(1) }}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
            )}

            <span className="ml-auto text-sm text-muted-foreground font-medium">
              {filtered.length.toLocaleString()} invoice{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="text-left font-semibold text-foreground/80 pl-4">Type</TableHead>
              <TableHead className="text-left font-semibold text-foreground/80">Invoice No.</TableHead>
              <TableHead className="text-left font-semibold text-foreground/80">Student</TableHead>
              <TableHead className="text-left font-semibold text-foreground/80">Year Group</TableHead>
              <TableHead className="text-left font-semibold text-foreground/80">Academic Year</TableHead>
              <TableHead className="text-left font-semibold text-foreground/80">Term</TableHead>
              <TableHead className="text-right font-semibold text-foreground/80">Amount (฿)</TableHead>
              <TableHead className="text-center font-semibold text-foreground/80">Approval</TableHead>
              <TableHead className="text-center font-semibold text-foreground/80">Payment</TableHead>
              <TableHead className="text-left font-semibold text-foreground/80 pr-4">Issue Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-52 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <div className="rounded-full bg-muted p-4">
                      {hasActiveFilter
                        ? <Search className="w-6 h-6 opacity-50" />
                        : <FileText className="w-6 h-6 opacity-50" />
                      }
                    </div>
                    <div>
                      <p className="font-medium text-foreground/60">
                        {hasActiveFilter ? "No results found" : "No invoices yet"}
                      </p>
                      {hasActiveFilter && (
                        <p className="text-sm mt-0.5">Try adjusting your search or filters</p>
                      )}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((inv) => {
                const approvalStatus = inv.approvalStatus ?? "wait"
                const issueDate = parseLocal(inv.issueDate)
                const isApproved = approvalStatus === "approved"
                return (
                  <TableRow
                    key={inv.id}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => handleRowClick(inv)}
                  >
                    <TableCell className="pl-4">
                      <TypeBadge category={inv.category || "tuition"} />
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {isApproved ? (inv.invoiceNumber || "-") : (
                        <span className="text-muted-foreground/50 italic text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{inv.studentName || "-"}</TableCell>
                    <TableCell className="text-sm">{inv.studentGrade || "-"}</TableCell>
                    <TableCell className="text-sm">{inv.academicYear || "-"}</TableCell>
                    <TableCell className="text-sm">{inv.term || "-"}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium">
                      {formatAmount(inv.finalAmount ?? inv.totalAmount ?? 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <ApprovalBadge status={approvalStatus} />
                    </TableCell>
                    <TableCell className="text-center">
                      <PaymentBadge status={inv.status || "draft"} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground pr-4">
                      {isApproved ? formatDate(issueDate) : (
                        <span className="text-muted-foreground/50 italic text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{rangeStart}–{rangeEnd}</span> of{" "}
            <span className="font-medium text-foreground">{filtered.length.toLocaleString()}</span> invoices
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-3 font-medium">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
