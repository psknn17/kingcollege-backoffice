import { useState, useEffect, useMemo } from "react"
import { FileText } from "lucide-react"
import { cn } from "@/components/ui/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

function ApprovalStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "approved":
      return <Badge className="bg-green-100 text-green-800">Approve</Badge>
    case "rejected":
      return <Badge className="bg-red-100 text-red-800">Reject</Badge>
    case "wait":
    default:
      return <Badge className="bg-yellow-100 text-yellow-800">Wait</Badge>
  }
}

function PaymentStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "paid":
      return <Badge className="bg-green-100 text-green-800">Paid</Badge>
    case "overdue":
      return <Badge className="bg-red-100 text-red-800">Overdue</Badge>
    case "cancelled":
      return <Badge className="bg-gray-100 text-gray-700">Cancelled</Badge>
    case "sent":
      return <Badge className="bg-blue-100 text-blue-800">Sent</Badge>
    default:
      return <Badge className="bg-yellow-100 text-yellow-800">{status || "Draft"}</Badge>
  }
}

function TypeBadge({ category }: { category: string }) {
  const meta = TYPE_META[category] || {
    label: category,
    badge: "bg-gray-100 text-gray-700 border border-gray-300",
  }
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", meta.badge)}>
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
    invoices.forEach((inv) => {
      if (inv.academicYear) years.add(inv.academicYear)
    })
    return Array.from(years).sort((a, b) => b.localeCompare(a))
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

  const handleFilterChange = (setter: (v: string) => void) => (val: string) => {
    setter(val)
    setPage(1)
  }

  const handleRowClick = (inv: any) => {
    const category = inv.category || "tuition"
    const navTarget = TYPE_META[category]?.nav || "tuition-invoice-management"
    onNavigateToSubPage(navTarget)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Search invoice no. or student name..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-64"
        />
        <Select value={typeFilter} onValueChange={handleFilterChange(setTypeFilter)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(TYPE_META).map(([key, meta]) => (
              <SelectItem key={key} value={key}>{meta.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={ayFilter} onValueChange={handleFilterChange(setAyFilter)}>
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
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} invoice{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-left">Type</TableHead>
              <TableHead className="text-left">Invoice No.</TableHead>
              <TableHead className="text-left">Student</TableHead>
              <TableHead className="text-left">Year Group</TableHead>
              <TableHead className="text-left">Academic Year</TableHead>
              <TableHead className="text-left">Term</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-center">Approval Status</TableHead>
              <TableHead className="text-center">Payment Status</TableHead>
              <TableHead className="text-left">Issue Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FileText className="w-8 h-8 opacity-40" />
                    <span>No invoices found</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((inv) => {
                const approvalStatus = inv.approvalStatus || "wait"
                const issueDate = parseLocal(inv.issueDate)
                return (
                  <TableRow
                    key={inv.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(inv)}
                  >
                    <TableCell className="text-left">
                      <TypeBadge category={inv.category || "tuition"} />
                    </TableCell>
                    <TableCell className="text-left font-mono text-sm">
                      {approvalStatus === "approved" ? (inv.invoiceNumber || "-") : "-"}
                    </TableCell>
                    <TableCell className="text-left">{inv.studentName || "-"}</TableCell>
                    <TableCell className="text-left">{inv.studentGrade || "-"}</TableCell>
                    <TableCell className="text-left">{inv.academicYear || "-"}</TableCell>
                    <TableCell className="text-left">{inv.term || "-"}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatAmount(inv.finalAmount ?? inv.totalAmount ?? 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <ApprovalStatusBadge status={approvalStatus} />
                    </TableCell>
                    <TableCell className="text-center">
                      <PaymentStatusBadge status={inv.status || "draft"} />
                    </TableCell>
                    <TableCell className="text-left">
                      {approvalStatus === "approved" ? formatDate(issueDate) : "-"}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
