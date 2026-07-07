import { useState, useEffect, useMemo } from "react"
import { Receipt, Search, X, DollarSign, FileText, CheckCircle } from "lucide-react"
import { cn } from "@/components/ui/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { PaginationBar } from "@/components/ui/pagination-bar"
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

const RECEIPT_SOURCES = [
  { key: "receiptRecords_tuition", category: "tuition", label: "Tuition"        },
  { key: "receiptRecords_eca",     category: "eca",     label: "ECA"            },
  { key: "receiptRecords_trip",    category: "trip",    label: "Trip & Activity" },
  { key: "receiptRecords_event",   category: "exam",    label: "Exam"           },
  { key: "receiptRecords_summer",  category: "bus",     label: "School Bus"     },
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
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", cls)}>
      {label}
    </span>
  )
}

function loadReceipts() {
  return RECEIPT_SOURCES.flatMap((src) => {
    try {
      const raw = JSON.parse(localStorage.getItem(src.key) || "[]")
      return (raw as any[]).map((r) => ({ ...r, _category: src.category, _label: src.label }))
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
  const [pageSize, setPageSize] = useState(20)

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

  // Stats computed from all (unfiltered) receipts
  const stats = useMemo(() => {
    const totalAmount = mapped.reduce((sum, r) => sum + (r.amount ?? 0), 0)
    const byType = RECEIPT_SOURCES.reduce<Record<string, number>>((acc, src) => {
      acc[src.category] = mapped.filter(r => r._category === src.category).length
      return acc
    }, {})
    return { total: mapped.length, totalAmount, byType }
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const resetPage = (setter: (v: string) => void) => (val: string) => {
    setter(val)
    setPage(1)
  }

  const handleRowClick = (r: { _category: string }) => {
    onNavigateToSubPage(CATEGORY_NAV[r._category] || "tuition-receipts")
  }

  const hasActiveFilter = search || typeFilter !== "all" || ayFilter !== "all"

  return (
    <div className="flex flex-col gap-5">

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4 flex items-start gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 shrink-0">
              <Receipt className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Receipts</p>
              <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4 flex items-start gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 shrink-0">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tuition</p>
              <p className="text-2xl font-bold">{(stats.byType["tuition"] ?? 0).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4 flex items-start gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-green-50 shrink-0">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Other Types</p>
              <p className="text-2xl font-bold">
                {(stats.total - (stats.byType["tuition"] ?? 0)).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4 flex items-start gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 shrink-0">
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Received</p>
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
                placeholder="Search receipt no. or student..."
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
                {RECEIPT_SOURCES.map((src) => (
                  <SelectItem key={src.category} value={src.category}>{src.label}</SelectItem>
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
              {filtered.length.toLocaleString()} receipt{filtered.length !== 1 ? "s" : ""}
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
              <TableHead className="text-left font-semibold text-foreground/80">Receipt No.</TableHead>
              <TableHead className="text-left font-semibold text-foreground/80">Invoice No.</TableHead>
              <TableHead className="text-left font-semibold text-foreground/80">Student</TableHead>
              <TableHead className="text-left font-semibold text-foreground/80">Year Group</TableHead>
              <TableHead className="text-left font-semibold text-foreground/80">Academic Year</TableHead>
              <TableHead className="text-left font-semibold text-foreground/80">Term</TableHead>
              <TableHead className="text-right font-semibold text-foreground/80">Amount (฿)</TableHead>
              <TableHead className="text-left font-semibold text-foreground/80 pr-4">Issue Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-52 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <div className="rounded-full bg-muted p-4">
                      {hasActiveFilter
                        ? <Search className="w-6 h-6 opacity-50" />
                        : <Receipt className="w-6 h-6 opacity-50" />
                      }
                    </div>
                    <div>
                      <p className="font-medium text-foreground/60">
                        {hasActiveFilter ? "No results found" : "No receipts yet"}
                      </p>
                      {hasActiveFilter && (
                        <p className="text-sm mt-0.5">Try adjusting your search or filters</p>
                      )}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((r, idx) => (
                <TableRow
                  key={`${r.receiptNumber}-${idx}`}
                  className="cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => handleRowClick(r)}
                >
                  <TableCell className="pl-4">
                    <TypeBadge category={r._category} label={r._label} />
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{r.receiptNumber || "-"}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{r.invoiceNumber || "-"}</TableCell>
                  <TableCell className="font-medium">{r.studentName || "-"}</TableCell>
                  <TableCell className="text-sm">{r.yearGroup || "-"}</TableCell>
                  <TableCell className="text-sm">{r.academicYear || "-"}</TableCell>
                  <TableCell className="text-sm">{r.term || "-"}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">
                    {formatAmount(r.amount)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground pr-4">{formatDate(r.issueDate)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      <PaginationBar
        currentPage={currentPage}
        pageSize={pageSize}
        totalCount={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
      />
    </div>
  )
}
