import { useState, useEffect, useMemo } from "react"
import { Search, X, CalendarCheck } from "lucide-react"
import { cn } from "@/components/ui/utils"
import { Badge } from "@/components/ui/badge"
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
import { useLanguage } from "@/contexts/LanguageContext"
import { useAcademicYears } from "@/contexts/AcademicYearContext"

interface PaidInvoicesPageProps {
  onNavigateToSubPage: (subPage: string, params?: any) => void
  onNavigateToView?: (type: "invoice" | "student" | "item" | "receipt" | "payment" | "course" | "template", data: any) => void
}

// PAGE_SIZE moved to state below

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

function TypeBadge({ category }: { category: string }) {
  const meta = TYPE_META[category] || { label: category, badge: "bg-gray-100 text-gray-700 border border-gray-300" }
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", meta.badge)}>
      {meta.label}
    </span>
  )
}

const INVOICE_KEYS = [
  "createdInvoices",
  "createdInvoices_eca",
  "createdInvoices_trip",
  "createdInvoices_exam",
  "createdInvoices_bus",
]

function loadApprovedInvoices() {
  try {
    const seen = new Set<string>()
    const all: any[] = []
    for (const key of INVOICE_KEYS) {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      for (const inv of JSON.parse(raw)) {
        if (!seen.has(inv.id)) {
          seen.add(inv.id)
          all.push(inv)
        }
      }
    }
    return all.filter(
      (inv) =>
        inv.studentId !== "EXTERNAL" &&
        inv.invoiceType !== "external" &&
        (inv.approvalStatus ?? "wait") === "approved"
    )
  } catch {
    return []
  }
}

function getPaymentStatus(inv: any): "paid" | "overdue" | "unpaid" {
  if (inv.status === "paid" || !!inv.paidDate) return "paid"
  if (inv.status === "overdue") return "overdue"
  const due = parseLocal(inv.dueDate)
  if (due && due < new Date()) return "overdue"
  return "unpaid"
}

export function PaidInvoicesPage(_props: PaidInvoicesPageProps) {
  const { t } = useLanguage()
  const { academicYears: allAcademicYears } = useAcademicYears()
  const [invoices, setInvoices] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [ayFilter, setAyFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const fetchData = () => setInvoices(loadApprovedInvoices())

  useEffect(() => {
    fetchData()
    window.addEventListener("focus", fetchData)
    return () => window.removeEventListener("focus", fetchData)
  }, [])

  const academicYears = useMemo(
    () => allAcademicYears.map((y) => y.name).sort((a, b) => b.localeCompare(a)),
    [allAcademicYears]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return invoices
      .filter((inv) => {
        if (typeFilter !== "all" && inv.category !== typeFilter) return false
        if (ayFilter !== "all" && inv.academicYear !== ayFilter) return false
        if (statusFilter !== "all" && getPaymentStatus(inv) !== statusFilter) return false
        if (q) {
          const invNo = (inv.invoiceNumber || "").toLowerCase()
          const name = (inv.studentName || "").toLowerCase()
          const sid = (inv.studentId || "").toLowerCase()
          if (!invNo.includes(q) && !name.includes(q) && !sid.includes(q)) return false
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
  }, [invoices, search, typeFilter, ayFilter, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const resetPage = (setter: (v: string) => void) => (val: string) => {
    setter(val)
    setPage(1)
  }

  const hasActiveFilter = search || typeFilter !== "all" || ayFilter !== "all" || statusFilter !== "all"

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-3 md:p-6 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">{t("cashier.paidInvoicesTitle")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("cashier.paidInvoicesDesc")}</p>
        </div>
      </div>

      {/* Filter bar */}
      <Card className="rounded-xl">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("cashier.paidInvoicesSearchPlaceholder")}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-9 pr-9 h-9 w-72"
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

            <Select value={typeFilter} onValueChange={resetPage(setTypeFilter)}>
              <SelectTrigger className="h-9 w-44">
                <SelectValue placeholder={t("cashier.paidInvoicesAllTypes")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("cashier.paidInvoicesAllTypes")}</SelectItem>
                {Object.entries(TYPE_META).map(([key, meta]) => (
                  <SelectItem key={key} value={key}>{meta.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={ayFilter} onValueChange={resetPage(setAyFilter)}>
              <SelectTrigger className="h-9 w-44">
                <SelectValue placeholder={t("cashier.paidInvoicesAllAcademicYears")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("cashier.paidInvoicesAllAcademicYears")}</SelectItem>
                {academicYears.map((ay) => (
                  <SelectItem key={ay} value={ay}>{ay}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={resetPage(setStatusFilter)}>
              <SelectTrigger className="h-9 w-44">
                <SelectValue placeholder={t("cashier.paidInvoicesAllStatuses")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("cashier.paidInvoicesAllStatuses")}</SelectItem>
                <SelectItem value="paid">{t("cashier.paidStatusPaid")}</SelectItem>
                <SelectItem value="unpaid">{t("cashier.paidStatusUnpaid")}</SelectItem>
                <SelectItem value="overdue">{t("cashier.paidStatusOverdue")}</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilter && (
              <Button
                size="sm"
                className="h-9 px-3"
                style={{ backgroundColor: "#000", color: "#fff" }}
                onClick={() => { setSearch(""); setTypeFilter("all"); setAyFilter("all"); setStatusFilter("all"); setPage(1) }}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                {t("cashier.clearFilter")}
              </Button>
            )}

            <span className="ml-auto text-sm text-muted-foreground font-medium">
              {t("cashier.paidInvoicesCount", { count: filtered.length.toLocaleString() })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="rounded-xl overflow-hidden border-gray-100 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="text-left font-semibold text-foreground/80 pl-4 w-[100px]">{t("cashier.paidInvoicesColType")}</TableHead>
              <TableHead className="text-left font-semibold text-foreground/80 w-[130px]">{t("cashier.paidInvoicesColInvoiceNo")}</TableHead>
              <TableHead className="text-left font-semibold text-foreground/80 w-[200px]">{t("cashier.paidInvoicesColStudent")}</TableHead>
              <TableHead className="text-left font-semibold text-foreground/80 w-[110px]">{t("cashier.paidInvoicesColYearGroup")}</TableHead>
              <TableHead className="text-left font-semibold text-foreground/80 w-[120px]">{t("cashier.paidInvoicesColAcademicYear")}</TableHead>
              <TableHead className="text-left font-semibold text-foreground/80 w-[80px]">{t("cashier.paidInvoicesColTerm")}</TableHead>
              <TableHead className="text-right font-semibold text-foreground/80 w-[120px]">{t("cashier.paidInvoicesColAmount")}</TableHead>
              <TableHead className="text-left font-semibold text-foreground/80 w-[120px]">{t("cashier.paidInvoicesColIssueDate")}</TableHead>
              <TableHead className="text-left font-semibold text-foreground/80 pr-4 w-[160px]">{t("cashier.paidInvoicesColStatus")}</TableHead>
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
                        : <CalendarCheck className="w-6 h-6 opacity-50" />
                      }
                    </div>
                    <div>
                      <p className="font-medium text-foreground/60">
                        {hasActiveFilter ? t("cashier.paidInvoicesNoResults") : t("cashier.paidInvoicesNoData")}
                      </p>
                      {hasActiveFilter && (
                        <p className="text-sm mt-0.5">{t("cashier.paidInvoicesAdjustFilter")}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((inv) => {
                const issueDate = parseLocal(inv.issueDate)
                const paidDate = parseLocal(inv.paidDate)
                const payStatus = getPaymentStatus(inv)
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="pl-4">
                      <TypeBadge category={inv.category || "tuition"} />
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {inv.invoiceNumber || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{inv.studentName || "-"}</div>
                      {inv.studentId && <div className="text-sm text-muted-foreground">{inv.studentId}</div>}
                    </TableCell>
                    <TableCell className="text-sm capitalize">{inv.studentGrade || "-"}</TableCell>
                    <TableCell className="text-sm">{inv.academicYear || "-"}</TableCell>
                    <TableCell className="text-sm">{inv.term ? (inv.term.match(/Term\s*\d+/i)?.[0] ?? inv.term) : "-"}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium">
                      {formatAmount(inv.finalAmount ?? inv.totalAmount ?? 0)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(issueDate)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground pr-4">
                      {payStatus === "paid" && (
                        <span className="flex items-center gap-1.5">
                          <Badge className="bg-green-100 text-green-800 border-green-200 font-medium text-sm">{t("cashier.paidStatusPaid")}</Badge>
                          {formatDate(paidDate)}
                        </span>
                      )}
                      {payStatus === "overdue" && (
                        <Badge className="bg-red-100 text-red-800 border-red-200 font-medium text-sm">{t("cashier.paidStatusOverdue")}</Badge>
                      )}
                      {payStatus === "unpaid" && (
                        <Badge className="bg-gray-100 text-gray-700 border-gray-300 font-medium text-sm">{t("cashier.paidStatusUnpaid")}</Badge>
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
      <PaginationBar
        currentPage={currentPage}
        pageSize={pageSize}
        totalCount={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
        pageSizeOptions={[10, 50, 100, 500, 1000]}
      />
    </div>
  )
}
