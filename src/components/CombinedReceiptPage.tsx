import { useState, useEffect, useMemo } from "react"
import { Receipt } from "lucide-react"
import { cn } from "@/components/ui/utils"
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

interface CombinedReceiptPageProps {
  onNavigateToSubPage: (subPage: string, params?: any) => void
}

const PAGE_SIZE = 20

const RECEIPT_SOURCES = [
  { key: "receiptRecords_tuition", category: "tuition", label: "Tuition" },
  { key: "receiptRecords_eca",     category: "eca",     label: "ECA" },
  { key: "receiptRecords_trip",    category: "trip",    label: "Trip & Activity" },
  { key: "receiptRecords_event",   category: "exam",    label: "Exam" },
  { key: "receiptRecords_summer",  category: "bus",     label: "School Bus" },
] as const

const CATEGORY_NAV: Record<string, string> = {
  tuition: "tuition-receipts",
  eca:     "eca-receipts",
  trip:    "trip-receipts",
  exam:    "exam-receipts",
  bus:     "bus-receipts",
}

const TYPE_BADGE: Record<string, string> = {
  tuition: "bg-blue-100 text-blue-700 border border-blue-300",
  eca:     "bg-purple-100 text-purple-700 border border-purple-300",
  trip:    "bg-orange-100 text-orange-700 border border-orange-300",
  exam:    "bg-green-100 text-green-700 border border-green-300",
  bus:     "bg-gray-100 text-gray-700 border border-gray-300",
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

function TypeBadge({ category, label }: { category: string; label: string }) {
  const cls = TYPE_BADGE[category] || "bg-gray-100 text-gray-700 border border-gray-300"
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", cls)}>
      {label}
    </span>
  )
}

function loadReceipts() {
  return RECEIPT_SOURCES.flatMap((src) => {
    try {
      const raw = JSON.parse(localStorage.getItem(src.key) || "[]")
      return (raw as any[]).map((r) => ({
        ...r,
        _category: src.category,
        _label: src.label,
      }))
    } catch {
      return []
    }
  })
}

function mapReceipt(r: any) {
  const issueDate =
    parseLocal(r.createdAt) ||
    parseLocal(r.invoices?.[0]?.invoiceDate) ||
    null

  const amount =
    r.receivedAmount ??
    r.invoices?.[0]?.receivedAmount ??
    r.totalAmount ??
    r.amount ??
    0

  const academicYear =
    r.academicYear ||
    r.schoolYear?.split(" - ")?.[0] ||
    ""

  const term =
    r.term ||
    r.schoolYear?.split(" - ").slice(1).join(" - ") ||
    ""

  return {
    receiptNumber: r.receiptNo || "",
    invoiceNumber: r.invoices?.[0]?.invoiceNo || "",
    studentName: r.contactName || r.clientName || "",
    yearGroup: r.yearGroup || "",
    academicYear,
    term,
    amount,
    issueDate,
    _category: r._category as string,
    _label: r._label as string,
  }
}

export function CombinedReceiptPage({ onNavigateToSubPage }: CombinedReceiptPageProps) {
  const [receipts, setReceipts] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [ayFilter, setAyFilter] = useState("all")
  const [page, setPage] = useState(1)

  const fetchData = () => setReceipts(loadReceipts())

  useEffect(() => {
    fetchData()
    window.addEventListener("focus", fetchData)
    return () => window.removeEventListener("focus", fetchData)
  }, [])

  const mapped = useMemo(() => receipts.map(mapReceipt), [receipts])

  const academicYears = useMemo(() => {
    const years = new Set<string>()
    mapped.forEach((r) => { if (r.academicYear) years.add(r.academicYear) })
    return Array.from(years).sort((a, b) => b.localeCompare(a))
  }, [mapped])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return mapped
      .filter((r) => {
        if (typeFilter !== "all" && r._category !== typeFilter) return false
        if (ayFilter !== "all" && r.academicYear !== ayFilter) return false
        if (q) {
          const rNo = (r.receiptNumber || "").toLowerCase()
          const name = (r.studentName || "").toLowerCase()
          if (!rNo.includes(q) && !name.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => {
        const da = a.issueDate as Date | null
        const db = b.issueDate as Date | null
        if (!da && !db) return 0
        if (!da) return 1
        if (!db) return -1
        return db.getTime() - da.getTime()
      })
  }, [mapped, search, typeFilter, ayFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const handleFilterChange = (setter: (v: string) => void) => (val: string) => {
    setter(val)
    setPage(1)
  }

  const handleRowClick = (r: { _category: string }) => {
    const navTarget = CATEGORY_NAV[r._category] || "tuition-receipts"
    onNavigateToSubPage(navTarget)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Search receipt no. or student name..."
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
            {RECEIPT_SOURCES.map((src) => (
              <SelectItem key={src.category} value={src.category}>{src.label}</SelectItem>
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
          {filtered.length} receipt{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-left">Type</TableHead>
              <TableHead className="text-left">Receipt No.</TableHead>
              <TableHead className="text-left">Invoice No.</TableHead>
              <TableHead className="text-left">Student</TableHead>
              <TableHead className="text-left">Year Group</TableHead>
              <TableHead className="text-left">Academic Year</TableHead>
              <TableHead className="text-left">Term</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-left">Issue Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Receipt className="w-8 h-8 opacity-40" />
                    <span>No receipts found</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((r, idx) => (
                <TableRow
                  key={`${r.receiptNumber}-${idx}`}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(r)}
                >
                  <TableCell className="text-left">
                    <TypeBadge category={r._category} label={r._label} />
                  </TableCell>
                  <TableCell className="text-left font-mono text-sm">{r.receiptNumber || "-"}</TableCell>
                  <TableCell className="text-left font-mono text-sm">{r.invoiceNumber || "-"}</TableCell>
                  <TableCell className="text-left">{r.studentName || "-"}</TableCell>
                  <TableCell className="text-left">{r.yearGroup || "-"}</TableCell>
                  <TableCell className="text-left">{r.academicYear || "-"}</TableCell>
                  <TableCell className="text-left">{r.term || "-"}</TableCell>
                  <TableCell className="text-right font-mono">{formatAmount(r.amount)}</TableCell>
                  <TableCell className="text-left">{formatDate(r.issueDate)}</TableCell>
                </TableRow>
              ))
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
