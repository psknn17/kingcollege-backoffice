import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts"
import { BarChart3, FileDown, Loader2, DollarSign, TrendingUp, Landmark, Users, ArrowRightLeft, CheckCircle2, Filter } from "lucide-react"
import {
  getRevenueTermMatrix, getRevenueYearMatrix,
  getAvgTermMatrix, getAvgYearMatrix,
  getTransactionsByMethod, getTransactionsByYearGroupAndMethod,
  getTransactionStatus,
  getBankFees, getBankFeeTermMatrix, getBankFeeYearMatrix,
  getRevenueWaterfall, getFilterOptions,
  exportToExcel, type ExportPayload,
  type RevenueTermMatrixRow, type RevenueYearMatrixRow,
  type AvgTermMatrixRow, type AvgYearMatrixRow,
  type TransactionByMethod, type TransactionYearGroupMethodRow,
  type TransactionStatus, type BankFeeRow,
  type BankFeeTermMatrixRow, type BankFeeYearMatrixRow,
  type RevenueWaterfall
} from "@/services/analyticsService"
import { toast } from "sonner"
import { logActivity } from "@/lib/activityLog"

// ── COLORS ────────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  successful: "#22c55e", declined: "#ef4444"
}
const METHOD_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7", "#ec4899"]

// ── FEE TYPE OPTIONS ──────────────────────────────────────────────────────────
const FEE_TYPE_OPTIONS = [
  { value: "all",     label: "All Fee Types" },
  { value: "tuition", label: "Tuition" },
  { value: "eca",     label: "ECA" },
  { value: "sport",   label: "ECA-Sport" },
  { value: "trip",    label: "Trip" },
  { value: "exam",    label: "Exam" },
  { value: "bus",     label: "Bus" },
  { value: "others",  label: "Other" },
]

// ── HELPERS ───────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 0 })
const fmtB = (n: number) => `฿${fmt(n)}`
const fmtK = (n: number) => `฿${(n / 1000).toFixed(0)}k`
const fmtM = (n: number) => `฿${(n / 1000000).toFixed(1)}M`

// ── SUMMARY CARD ──────────────────────────────────────────────────────────────
function SummaryCard({ label, value, accent = "#6366f1", icon: Icon }: {
  label: string; value: string; accent?: string; icon?: React.ElementType
}) {
  return (
    <Card className="rounded-xl gap-0">
      <CardContent className="p-4 pb-4">
        <div className="flex items-center gap-2 mb-1">
          {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  )
}

// ── SECTION HEADER ────────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  )
}

// ── TABLE STYLES ──────────────────────────────────────────────────────────────
const thBase = "py-2 px-3 text-sm font-semibold text-muted-foreground"
const tdBase = "px-3 py-2 text-sm"

// ── PAGINATION ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 18

function TablePagination({ page, total, onChange }: {
  page: number; total: number; onChange: (p: number) => void
}) {
  const totalPages = Math.ceil(total / PAGE_SIZE)
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between px-3 pt-3 pb-1 border-t mt-1">
      <span className="text-sm text-muted-foreground">
        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)} disabled={page === 1}
          className="px-3 py-1 text-sm rounded border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
        >← Prev</button>
        <span className="text-sm px-3 py-1 rounded bg-primary text-primary-foreground font-medium">{page}/{totalPages}</span>
        <button
          onClick={() => onChange(page + 1)} disabled={page === totalPages}
          className="px-3 py-1 text-sm rounded border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
        >Next →</button>
      </div>
    </div>
  )
}

// ── DUAL TABLE LAYOUT (Tab 1, 2, 5) ──────────────────────────────────────────
function DualTableWrapper({ leftTitle, rightTitle, left, right }: {
  leftTitle: string; rightTitle: string; left: React.ReactNode; right: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <Card className="shadow-none border">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{leftTitle}</CardTitle></CardHeader>
        <CardContent className="pt-0 overflow-x-auto">{left}</CardContent>
      </Card>
      <Card className="shadow-none border">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{rightTitle}</CardTitle></CardHeader>
        <CardContent className="pt-0 overflow-x-auto">{right}</CardContent>
      </Card>
    </div>
  )
}

// ── MATRIX TABLE HELPERS ──────────────────────────────────────────────────────

function MatrixTable({
  rows, colKeys, getCell, totalRow, yearGroupLabel = "Year Group"
}: {
  rows: { yearGroup: string }[]
  colKeys: string[]
  getCell: (row: { yearGroup: string }, col: string) => number
  totalRow?: (col: string) => number
  yearGroupLabel?: string
}) {
  if (rows.length === 0) {
    return <p className="text-center text-muted-foreground py-6 text-sm">No data</p>
  }
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="bg-muted/60">
          <th className={`${thBase} text-left whitespace-nowrap`}>{yearGroupLabel}</th>
          {colKeys.map(k => (
            <th key={k} className={`${thBase} text-right whitespace-nowrap`}>{k}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="hover:bg-muted/30 border-b border-border/40">
            <td className={`${tdBase} font-medium whitespace-nowrap`}>{row.yearGroup}</td>
            {colKeys.map(k => {
              const v = getCell(row, k)
              return (
                <td key={k} className={`${tdBase} text-right`}>
                  {v === 0 ? <span className="text-muted-foreground/40">—</span> : fmtB(v)}
                </td>
              )
            })}
          </tr>
        ))}
        {totalRow && (
          <tr className="bg-slate-100 font-bold border-t-2 border-border">
            <td className={`${tdBase} font-bold`}>Total</td>
            {colKeys.map(k => {
              const v = totalRow(k)
              return <td key={k} className={`${tdBase} text-right`}>{fmtB(v)}</td>
            })}
          </tr>
        )}
      </tbody>
    </table>
  )
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState("revenue")
  const [filterYear, setFilterYear] = useState("all")
  const [filterTerm, setFilterTerm] = useState("all")
  const [filterCategory, setFilterCategory] = useState("all")
  const [yearOptions, setYearOptions] = useState<string[]>([])
  const [termOptions, setTermOptions] = useState<string[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const [avgToggle, setAvgToggle] = useState<"person" | "group">("person")
  const [wfPage, setWfPage] = useState(1)

  // Tab 1 state
  const [termMatrixRows, setTermMatrixRows] = useState<RevenueTermMatrixRow[]>([])
  const [termMatrixKeys, setTermMatrixKeys] = useState<string[]>([])
  const [yearMatrixRows, setYearMatrixRows] = useState<RevenueYearMatrixRow[]>([])
  const [yearMatrixKeys, setYearMatrixKeys] = useState<string[]>([])

  // Tab 2 state
  const [avgTermRows, setAvgTermRows] = useState<AvgTermMatrixRow[]>([])
  const [avgTermKeys, setAvgTermKeys] = useState<string[]>([])
  const [avgYearRows, setAvgYearRows] = useState<AvgYearMatrixRow[]>([])
  const [avgYearKeys, setAvgYearKeys] = useState<string[]>([])

  // Tab 3 state
  const [methodData, setMethodData] = useState<TransactionByMethod[]>([])
  const [txnMatrixRows, setTxnMatrixRows] = useState<TransactionYearGroupMethodRow[]>([])
  const [txnMethodKeys, setTxnMethodKeys] = useState<string[]>([])

  // Tab 4 state
  const [statusData, setStatusData] = useState<TransactionStatus[]>([])

  // Tab 5 state
  const [bankFeeData, setBankFeeData] = useState<BankFeeRow[]>([])
  const [feeTermRows, setFeeTermRows] = useState<BankFeeTermMatrixRow[]>([])
  const [feeTermKeys, setFeeTermKeys] = useState<string[]>([])
  const [feeYearRows, setFeeYearRows] = useState<BankFeeYearMatrixRow[]>([])
  const [feeYearKeys, setFeeYearKeys] = useState<string[]>([])

  // Tab 6 state
  const [waterfallData, setWaterfallData] = useState<RevenueWaterfall[]>([])

  const filter = useMemo(() => ({
    academicYear: filterYear,
    term: filterTerm,
    category: filterCategory
  }), [filterYear, filterTerm, filterCategory])

  useEffect(() => {
    getFilterOptions().then(opts => {
      setYearOptions(opts.academicYears)
      setTermOptions(opts.terms)
    })
  }, [])

  useEffect(() => {
    setWfPage(1)

    // Tab 1
    getRevenueTermMatrix(filter).then(r => { setTermMatrixRows(r.rows); setTermMatrixKeys(r.termKeys) })
    getRevenueYearMatrix(filter).then(r => { setYearMatrixRows(r.rows); setYearMatrixKeys(r.yearKeys) })

    // Tab 2
    getAvgTermMatrix(filter).then(r => { setAvgTermRows(r.rows); setAvgTermKeys(r.termKeys) })
    getAvgYearMatrix(filter).then(r => { setAvgYearRows(r.rows); setAvgYearKeys(r.yearKeys) })

    // Tab 3
    getTransactionsByMethod(filter).then(setMethodData)
    getTransactionsByYearGroupAndMethod(filter).then(r => {
      setTxnMatrixRows(r.rows)
      setTxnMethodKeys(r.methodKeys)
    })

    // Tab 4
    getTransactionStatus(filter).then(setStatusData)

    // Tab 5
    getBankFees(filter).then(setBankFeeData)
    getBankFeeTermMatrix(filter).then(r => { setFeeTermRows(r.rows); setFeeTermKeys(r.termKeys) })
    getBankFeeYearMatrix(filter).then(r => { setFeeYearRows(r.rows); setFeeYearKeys(r.yearKeys) })

    // Tab 6
    getRevenueWaterfall(filter).then(setWaterfallData)
  }, [filter])

  // ── Derived totals ────────────────────────────────────────────────────────
  const totalGross = useMemo(
    () => termMatrixRows.reduce((s, r) => s + Object.values(r.termCols).reduce((a, b) => a + b, 0), 0),
    [termMatrixRows]
  )
  const totalStudents = useMemo(() => avgTermRows.reduce((s, r) => s + r.studentCount, 0), [avgTermRows])
  const totalTxn = useMemo(() => methodData.reduce((s, m) => s + m.count, 0), [methodData])
  const successRate = useMemo(() => {
    const s = statusData.find(r => r.status === "successful")
    return s?.percentage ?? 0
  }, [statusData])
  const totalBankFees = useMemo(
    () => bankFeeData.reduce((s, r) => s + r.feeAmount, 0),
    [bankFeeData]
  )
  const totalNet = useMemo(
    () => waterfallData.reduce((s, r) => s + r.netRevenue, 0),
    [waterfallData]
  )

  const discountKeys = useMemo(() =>
    waterfallData.length > 0 ? Object.keys(waterfallData[0].discounts) : []
  , [waterfallData])

  const waterfallChart = useMemo(() =>
    waterfallData.map(w => ({
      name: w.yearGroup,
      Gross: w.grossRevenue,
      Net: w.netRevenue,
      Discounts: Math.abs(Object.values(w.discounts).reduce((s, v) => s + v, 0)),
      "Bank Fees": Math.abs(w.bankFees)
    }))
  , [waterfallData])

  // Revenue chart: aggregate over year groups for bar chart
  const revenueChartData = useMemo(() => {
    return termMatrixRows.map(r => ({
      yearGroup: r.yearGroup,
      revenue: Object.values(r.termCols).reduce((s, v) => s + v, 0)
    }))
  }, [termMatrixRows])

  // Tab 3 chart: method counts
  const txnChartData = useMemo(() => {
    const totals: Record<string, number> = {}
    txnMatrixRows.forEach(r => {
      txnMethodKeys.forEach(m => {
        totals[m] = (totals[m] ?? 0) + (r.methods[m] ?? 0)
      })
    })
    return txnMethodKeys.map(m => ({ method: m, count: totals[m] ?? 0 }))
  }, [txnMatrixRows, txnMethodKeys])

  const handleExport = async () => {
    try {
      setIsExporting(true)
      const payload: ExportPayload = {
        activeTab,
        filter,
        termMatrixRows, termMatrixKeys, yearMatrixRows, yearMatrixKeys,
        avgTermRows, avgTermKeys, avgYearRows, avgYearKeys,
        avgToggle: avgToggle === "group" ? "yearGroup" : "person",
        txnMatrixRows, txnMethodKeys, methodData,
        statusData,
        bankFeeData, feeTermRows, feeTermKeys, feeYearRows, feeYearKeys,
        waterfallData,
      }
      await exportToExcel(payload)
      toast.success("Analytics report exported successfully")
      logActivity({
        action: "Export Report",
        module: "Analytics",
        detail: `Exported analytics report for tab "${activeTab}" | ${filter.academicYear || "all"} / ${filter.term || "all"} / ${filter.category || "all"}`
      })
    } catch (err) {
      console.error("Export failed:", err)
      toast.error("Failed to export report")
    } finally {
      setIsExporting(false)
    }
  }

  // ── Helper: column totals ─────────────────────────────────────────────────
  function termColTotal(key: string) {
    return termMatrixRows.reduce((s, r) => s + (r.termCols[key] ?? 0), 0)
  }
  function yearColTotal(key: string) {
    return yearMatrixRows.reduce((s, r) => s + (r.yearCols[key] ?? 0), 0)
  }
  function avgTermColTotal(key: string) {
    const sum = avgTermRows.reduce((s, r) => s + (r.termCols[key] ?? 0), 0)
    return avgToggle === "person" ? Math.round(sum / (avgTermRows.length || 1)) : sum
  }
  function avgYearColTotal(key: string) {
    const sum = avgYearRows.reduce((s, r) => s + (r.yearCols[key] ?? 0), 0)
    return avgToggle === "person" ? Math.round(sum / (avgYearRows.length || 1)) : sum
  }
  function txnMethodTotal(method: string) {
    return txnMatrixRows.reduce((s, r) => s + (r.methods[method] ?? 0), 0)
  }
  function feeTermColTotal(key: string) {
    return feeTermRows.reduce((s, r) => s + (r.termCols[key] ?? 0), 0)
  }
  function feeYearColTotal(key: string) {
    return feeYearRows.reduce((s, r) => s + (r.yearCols[key] ?? 0), 0)
  }

  return (
    <div className="p-3 md:p-6 space-y-6 bg-muted/20 min-h-screen">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-3 md:p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight">Analytics Dashboard</h1>
            <p className="text-sm text-muted-foreground">Revenue insights and payment analytics</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-background rounded-xl border px-3 py-2 shadow-sm">
            <span className="text-sm text-muted-foreground font-medium mr-1">Filter:</span>
            <Select value={filterYear} onValueChange={v => { setFilterYear(v) }}>
              <SelectTrigger className="h-8 w-36 border-0 shadow-none focus:ring-0 bg-muted/40 rounded-lg text-sm">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Academic Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {yearOptions.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterTerm} onValueChange={v => { setFilterTerm(v) }}>
              <SelectTrigger className="h-8 w-28 border-0 shadow-none focus:ring-0 bg-muted/40 rounded-lg text-sm">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terms</SelectItem>
                {termOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={v => { setFilterCategory(v) }}>
              <SelectTrigger className="h-8 w-36 border-0 shadow-none focus:ring-0 bg-muted/40 rounded-lg text-sm">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Fee Type" />
              </SelectTrigger>
              <SelectContent>
                {FEE_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all font-semibold shadow-sm hover:shadow-md disabled:opacity-50 text-sm"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
        <SummaryCard label="Gross Revenue"  value={fmtB(totalGross)}     accent="#6366f1" icon={DollarSign} />
        <SummaryCard label="Net Revenue"    value={fmtB(totalNet)}        accent="#22c55e" icon={TrendingUp} />
        <SummaryCard label="Bank Fees"      value={fmtB(totalBankFees)}  accent="#ef4444" icon={Landmark} />
        <SummaryCard label="Students"       value={fmt(totalStudents)}    accent="#06b6d4" icon={Users} />
        <SummaryCard label="Transactions"   value={fmt(totalTxn)}         accent="#a855f7" icon={ArrowRightLeft} />
        <SummaryCard label="Success Rate"   value={`${successRate}%`}     accent={successRate >= 80 ? "#22c55e" : "#f59e0b"} icon={CheckCircle2} />
      </div>

      {/* ── Tabs ── */}
      <div className="bg-background rounded-2xl border shadow-sm overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b px-4 pt-4">
            <TabsList className="w-full h-auto flex flex-wrap bg-muted/50 rounded-xl p-1 gap-1">
              <TabsTrigger value="revenue"   className="flex-1 rounded-lg text-xs py-2 min-w-[120px]">Revenue Comparison</TabsTrigger>
              <TabsTrigger value="avg"       className="flex-1 rounded-lg text-xs py-2 min-w-[120px]">AVG Amount</TabsTrigger>
              <TabsTrigger value="methods"   className="flex-1 rounded-lg text-xs py-2 min-w-[120px]">No. of Transactions</TabsTrigger>
              <TabsTrigger value="status"    className="flex-1 rounded-lg text-xs py-2 min-w-[130px]">Declined vs Successful</TabsTrigger>
              <TabsTrigger value="fees"      className="flex-1 rounded-lg text-xs py-2 min-w-[100px]">Bank Fees</TabsTrigger>
              <TabsTrigger value="waterfall" className="flex-1 rounded-lg text-xs py-2 min-w-[130px]">Net vs Gross Revenue</TabsTrigger>
            </TabsList>
          </div>

          <div className="p-5 space-y-5">

            {/* ════════════════════════════════════════════════════════════════
                TAB 1 — Revenue Comparison YoY / ToT
            ════════════════════════════════════════════════════════════════ */}
            <TabsContent value="revenue" className="space-y-5 mt-0">
              <SectionHeader
                title="Revenue Comparison (YoY / ToT)"
                subtitle="Net revenue by Year Group — excluding cancelled invoices"
              />

              {/* Bar Chart */}
              <Card className="shadow-none border">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Revenue by Year Group</CardTitle></CardHeader>
                <CardContent>
                  {revenueChartData.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">No data</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={revenueChartData} margin={{ top: 4, right: 16, left: 16, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="yearGroup" angle={-40} textAnchor="end" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={v => fmtK(v)} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => fmtB(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="revenue" name="Net Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Dual Table */}
              <DualTableWrapper
                leftTitle="Compare by Term"
                rightTitle="Compare by Academic Year"
                left={
                  <MatrixTable
                    rows={termMatrixRows}
                    colKeys={termMatrixKeys}
                    getCell={(row, col) => (row as RevenueTermMatrixRow).termCols[col] ?? 0}
                    totalRow={termColTotal}
                  />
                }
                right={
                  <MatrixTable
                    rows={yearMatrixRows}
                    colKeys={yearMatrixKeys}
                    getCell={(row, col) => (row as RevenueYearMatrixRow).yearCols[col] ?? 0}
                    totalRow={yearColTotal}
                  />
                }
              />
            </TabsContent>

            {/* ════════════════════════════════════════════════════════════════
                TAB 2 — AVG Amount
            ════════════════════════════════════════════════════════════════ */}
            <TabsContent value="avg" className="space-y-5 mt-0">
              <div className="flex items-center justify-between">
                <SectionHeader
                  title="Average Revenue per Student"
                  subtitle="Average net revenue by Year Group and period"
                />
                <div className="flex items-center gap-2 border rounded-lg p-1">
                  <button
                    onClick={() => setAvgToggle("person")}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${avgToggle === "person" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                  >Per Person</button>
                  <button
                    onClick={() => setAvgToggle("group")}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${avgToggle === "group" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                  >Per Year Group</button>
                </div>
              </div>

              {/* Dual Table */}
              <DualTableWrapper
                leftTitle="Avg Revenue by Term"
                rightTitle="Avg Revenue by Academic Year"
                left={
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-muted/60">
                        <th className={`${thBase} text-left whitespace-nowrap`}>Year Group</th>
                        <th className={`${thBase} text-right whitespace-nowrap`}>Students</th>
                        {avgTermKeys.map(k => (
                          <th key={k} className={`${thBase} text-right whitespace-nowrap`}>{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {avgTermRows.map((row, i) => (
                        <tr key={i} className="hover:bg-muted/30 border-b border-border/40">
                          <td className={`${tdBase} font-medium whitespace-nowrap`}>{row.yearGroup}</td>
                          <td className={`${tdBase} text-right`}>{row.studentCount}</td>
                          {avgTermKeys.map(k => {
                            const v = avgToggle === "person" ? (row.termCols[k] ?? 0) : Math.round((row.termCols[k] ?? 0) * row.studentCount)
                            return (
                              <td key={k} className={`${tdBase} text-right`}>
                                {v === 0 ? <span className="text-muted-foreground/40">—</span> : fmtB(v)}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                      {avgTermRows.length > 0 && (
                        <tr className="bg-slate-100 font-bold border-t-2 border-border">
                          <td className={`${tdBase} font-bold`}>{avgToggle === "person" ? "ต่อคน" : "Total"}</td>
                          <td className={`${tdBase} text-right`}>{avgTermRows.reduce((s, r) => s + r.studentCount, 0)}</td>
                          {avgTermKeys.map(k => (
                            <td key={k} className={`${tdBase} text-right`}>{fmtB(avgTermColTotal(k))}</td>
                          ))}
                        </tr>
                      )}
                      {avgTermRows.length === 0 && (
                        <tr><td colSpan={2 + avgTermKeys.length} className="py-6 text-center text-muted-foreground text-sm">No data</td></tr>
                      )}
                    </tbody>
                  </table>
                }
                right={
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-muted/60">
                        <th className={`${thBase} text-left whitespace-nowrap`}>Year Group</th>
                        <th className={`${thBase} text-right whitespace-nowrap`}>Students</th>
                        {avgYearKeys.map(k => (
                          <th key={k} className={`${thBase} text-right whitespace-nowrap`}>{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {avgYearRows.map((row, i) => (
                        <tr key={i} className="hover:bg-muted/30 border-b border-border/40">
                          <td className={`${tdBase} font-medium whitespace-nowrap`}>{row.yearGroup}</td>
                          <td className={`${tdBase} text-right`}>{row.studentCount}</td>
                          {avgYearKeys.map(k => {
                            const v = avgToggle === "person" ? (row.yearCols[k] ?? 0) : Math.round((row.yearCols[k] ?? 0) * row.studentCount)
                            return (
                              <td key={k} className={`${tdBase} text-right`}>
                                {v === 0 ? <span className="text-muted-foreground/40">—</span> : fmtB(v)}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                      {avgYearRows.length > 0 && (
                        <tr className="bg-slate-100 font-bold border-t-2 border-border">
                          <td className={`${tdBase} font-bold`}>{avgToggle === "person" ? "ต่อคน" : "Total"}</td>
                          <td className={`${tdBase} text-right`}>{avgYearRows.reduce((s, r) => s + r.studentCount, 0)}</td>
                          {avgYearKeys.map(k => (
                            <td key={k} className={`${tdBase} text-right`}>{fmtB(avgYearColTotal(k))}</td>
                          ))}
                        </tr>
                      )}
                      {avgYearRows.length === 0 && (
                        <tr><td colSpan={2 + avgYearKeys.length} className="py-6 text-center text-muted-foreground text-sm">No data</td></tr>
                      )}
                    </tbody>
                  </table>
                }
              />
            </TabsContent>

            {/* ════════════════════════════════════════════════════════════════
                TAB 3 — No. of Transactions (Year Group × Method)
            ════════════════════════════════════════════════════════════════ */}
            <TabsContent value="methods" className="space-y-5 mt-0">
              <SectionHeader
                title="No. of Transactions by Year Group &amp; Payment Method"
                subtitle="Transaction count matrix"
              />

              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {methodData.map((m, i) => (
                  <Card key={i} className="rounded-xl gap-0">
                    <CardContent className="p-4 pb-4">
                      <p className="text-sm text-muted-foreground">{m.method}</p>
                      <p className="text-xl font-bold" style={{ color: METHOD_COLORS[i % METHOD_COLORS.length] }}>
                        {m.count.toLocaleString()}
                        <span className="text-xs font-medium text-muted-foreground ml-1">({m.percentage}%)</span>
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Bar Chart */}
              <Card className="shadow-none border">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Transactions by Method</CardTitle></CardHeader>
                <CardContent>
                  {txnChartData.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">No data</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={txnChartData} layout="vertical" barSize={28} margin={{ top: 4, right: 60, left: 150, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="method" tick={{ fontSize: 11 }} width={145} />
                        <Tooltip formatter={(v: number) => [`${v} transactions`, "Count"]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="count" radius={[0, 6, 6, 0]} label={{ position: "right", fontSize: 11 }}>
                          {txnChartData.map((_, i) => <Cell key={i} fill={METHOD_COLORS[i % METHOD_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Year Group × Method Matrix */}
              <Card className="shadow-none border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Year Group × Payment Method Matrix</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 overflow-x-auto">
                  {txnMatrixRows.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">No data</p>
                  ) : (
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-muted/60">
                          <th className={`${thBase} text-left whitespace-nowrap`}>Year Group</th>
                          {txnMethodKeys.map(m => (
                            <th key={m} className={`${thBase} text-right whitespace-nowrap`}>{m}</th>
                          ))}
                          <th className={`${thBase} text-right whitespace-nowrap`}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {txnMatrixRows.map((row, i) => (
                          <tr key={i} className="hover:bg-muted/30 border-b border-border/40">
                            <td className={`${tdBase} font-medium whitespace-nowrap`}>{row.yearGroup}</td>
                            {txnMethodKeys.map(m => (
                              <td key={m} className={`${tdBase} text-right`}>
                                {(row.methods[m] ?? 0) === 0
                                  ? <span className="text-muted-foreground/40">—</span>
                                  : (row.methods[m] ?? 0).toLocaleString()
                                }
                              </td>
                            ))}
                            <td className={`${tdBase} text-right font-semibold`}>{row.total.toLocaleString()}</td>
                          </tr>
                        ))}
                        <tr className="bg-slate-100 font-bold border-t-2 border-border">
                          <td className={`${tdBase} font-bold`}>Total</td>
                          {txnMethodKeys.map(m => (
                            <td key={m} className={`${tdBase} text-right`}>{txnMethodTotal(m).toLocaleString()}</td>
                          ))}
                          <td className={`${tdBase} text-right`}>{txnMatrixRows.reduce((s, r) => s + r.total, 0).toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ════════════════════════════════════════════════════════════════
                TAB 4 — Declined vs Successful
            ════════════════════════════════════════════════════════════════ */}
            <TabsContent value="status" className="space-y-5 mt-0">
              <SectionHeader title="Declined vs Successful Transactions" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {statusData.map((s, i) => (
                  <Card key={i} className="rounded-xl">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">{s.label}</p>
                      <p className="text-2xl font-bold" style={{ color: STATUS_COLORS[s.status] }}>
                        {s.count.toLocaleString()}
                        <span className="text-sm font-medium ml-1">({s.percentage}%)</span>
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Card className="shadow-none border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Successful vs Declined</CardTitle>
                    <p className="text-xs text-muted-foreground">Overall transaction outcome</p>
                  </CardHeader>
                  <CardContent>
                    {statusData.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8 text-sm">No data</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                          <Pie
                            data={statusData} dataKey="count" nameKey="label"
                            cx="50%" cy="50%" outerRadius={90} innerRadius={45}
                            label={({ label, percentage }) => `${label} ${percentage}%`}
                            labelLine={{ stroke: "#9ca3af", strokeWidth: 1 }}
                          >
                            {statusData.map((s, i) => <Cell key={i} fill={STATUS_COLORS[s.status] ?? "#6b7280"} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => `${v} transactions`} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-none border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Breakdown by Payment Method</CardTitle>
                    <p className="text-xs text-muted-foreground">Success and declined per channel</p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {statusData[0]?.byMethod && (
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-muted/60">
                            <th className={`${thBase} text-left`}>Method</th>
                            <th className={`${thBase} text-right text-green-600`}>Successful</th>
                            <th className={`${thBase} text-right text-red-500`}>Declined</th>
                            <th className={`${thBase} text-right`}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(statusData[0].byMethod!).map(([method, v], i) => {
                            const total = v.success + v.declined
                            const pct = total > 0 ? Math.round((v.success / total) * 100) : 0
                            return (
                              <tr key={i} className="hover:bg-muted/30 border-b border-border/40">
                                <td className={`${tdBase} font-medium`}>{method}</td>
                                <td className={`${tdBase} text-right text-green-600 font-medium`}>{v.success}</td>
                                <td className={`${tdBase} text-right text-red-500 font-medium`}>{v.declined}</td>
                                <td className={`${tdBase} text-right`}>
                                  <span className="text-muted-foreground">{total} </span>
                                  <span className="font-medium text-green-600">({pct}%✓)</span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ════════════════════════════════════════════════════════════════
                TAB 5 — Bank Fees
            ════════════════════════════════════════════════════════════════ */}
            <TabsContent value="fees" className="space-y-5 mt-0">
              <SectionHeader
                title="Bank Fees Breakdown"
                subtitle="Online and Offline-EDC fees by bank"
              />

              {/* Bank summary cards */}
              {(() => {
                let storedAccounts: { bankName: string; paymentSource: string; isActive?: boolean }[] = []
                try {
                  const raw = localStorage.getItem("kingscollege_backoffice_bankAccounts")
                  if (raw) storedAccounts = JSON.parse(raw)
                } catch {}
                const activeAccounts = storedAccounts.filter(a => a.isActive !== false && a.bankName)
                const bankMap = new Map<string, string[]>()
                activeAccounts.forEach(a => {
                  const sources = bankMap.get(a.bankName) || []
                  if (a.paymentSource && !sources.includes(a.paymentSource)) sources.push(a.paymentSource)
                  bankMap.set(a.bankName, sources)
                })
                const uniqueBanks = Array.from(bankMap.entries()).map(([bankName, sources]) => ({ bankName, sources }))
                if (uniqueBanks.length === 0) return null
                const PALETTE    = ["#00a651","#e60012","#0066b2","#7b2d8b","#f59e0b","#06b6d4","#6366f1","#ec4899"]
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {uniqueBanks.map(({ bankName, sources }, idx) => {
                      const rows = bankFeeData.filter(r => r.bankName === bankName)
                      const total = rows.reduce((s, r) => s + r.feeAmount, 0)
                      const txns  = rows.reduce((s, r) => s + r.transactionCount, 0)
                      const color = PALETTE[idx % PALETTE.length]
                      return (
                        <Card key={bankName} className="rounded-xl">
                          <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">{bankName}</p>
                            <p className="text-xl font-bold" style={{ color }}>฿{fmt(total)}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{txns.toLocaleString()} txns</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {sources.map(s => (
                                <span key={s} className="text-xs bg-muted rounded-full px-2 py-0.5 font-medium text-muted-foreground">{s}</span>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )
              })()}

              {/* Dual Table */}
              <DualTableWrapper
                leftTitle="Bank Fees — Compare by Term"
                rightTitle="Bank Fees — Compare by Academic Year"
                left={
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-muted/60">
                        <th className={`${thBase} text-left whitespace-nowrap`}>Bank</th>
                        <th className={`${thBase} text-left whitespace-nowrap`}>Type</th>
                        {feeTermKeys.map(k => (
                          <th key={k} className={`${thBase} text-right whitespace-nowrap`}>{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {feeTermRows.map((row, i) => (
                        <tr key={i} className="hover:bg-muted/30 border-b border-border/40">
                          <td className={`${tdBase} font-semibold whitespace-nowrap`}>{row.bankName}</td>
                          <td className={`${tdBase} text-muted-foreground whitespace-nowrap`}>{row.paymentSource}</td>
                          {feeTermKeys.map(k => {
                            const v = row.termCols[k] ?? 0
                            return (
                              <td key={k} className={`${tdBase} text-right text-red-600`}>
                                {v === 0 ? <span className="text-muted-foreground/40">—</span> : `−${fmtB(v)}`}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                      {feeTermRows.length > 0 && (
                        <tr className="bg-slate-100 font-bold border-t-2 border-border">
                          <td colSpan={2} className={`${tdBase} font-bold`}>Total</td>
                          {feeTermKeys.map(k => (
                            <td key={k} className={`${tdBase} text-right text-red-600`}>−{fmtB(feeTermColTotal(k))}</td>
                          ))}
                        </tr>
                      )}
                      {feeTermRows.length === 0 && (
                        <tr><td colSpan={2 + feeTermKeys.length} className="py-6 text-center text-muted-foreground text-sm">No bank fee data</td></tr>
                      )}
                    </tbody>
                  </table>
                }
                right={
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-muted/60">
                        <th className={`${thBase} text-left whitespace-nowrap`}>Bank</th>
                        <th className={`${thBase} text-left whitespace-nowrap`}>Type</th>
                        {feeYearKeys.map(k => (
                          <th key={k} className={`${thBase} text-right whitespace-nowrap`}>{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {feeYearRows.map((row, i) => (
                        <tr key={i} className="hover:bg-muted/30 border-b border-border/40">
                          <td className={`${tdBase} font-semibold whitespace-nowrap`}>{row.bankName}</td>
                          <td className={`${tdBase} text-muted-foreground whitespace-nowrap`}>{row.paymentSource}</td>
                          {feeYearKeys.map(k => {
                            const v = row.yearCols[k] ?? 0
                            return (
                              <td key={k} className={`${tdBase} text-right text-red-600`}>
                                {v === 0 ? <span className="text-muted-foreground/40">—</span> : `−${fmtB(v)}`}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                      {feeYearRows.length > 0 && (
                        <tr className="bg-slate-100 font-bold border-t-2 border-border">
                          <td colSpan={2} className={`${tdBase} font-bold`}>Total</td>
                          {feeYearKeys.map(k => (
                            <td key={k} className={`${tdBase} text-right text-red-600`}>−{fmtB(feeYearColTotal(k))}</td>
                          ))}
                        </tr>
                      )}
                      {feeYearRows.length === 0 && (
                        <tr><td colSpan={2 + feeYearKeys.length} className="py-6 text-center text-muted-foreground text-sm">No bank fee data</td></tr>
                      )}
                    </tbody>
                  </table>
                }
              />
            </TabsContent>

            {/* ════════════════════════════════════════════════════════════════
                TAB 6 — Net vs Gross Revenue (Waterfall)
            ════════════════════════════════════════════════════════════════ */}
            <TabsContent value="waterfall" className="space-y-5 mt-0">
              <SectionHeader
                title="Net vs Gross Revenue"
                subtitle="Gross → Discounts → Bank Fees → Net Revenue by Year Group"
              />

              <Card className="shadow-none border">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Revenue Waterfall</CardTitle></CardHeader>
                <CardContent>
                  {waterfallChart.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">No data</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={waterfallChart} margin={{ top: 4, right: 16, left: 16, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" angle={-40} textAnchor="end" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={v => fmtM(v)} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => fmtB(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                        <Legend verticalAlign="top" wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="Gross"     fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Discounts" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Bank Fees" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Net"       fill="#22c55e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-none border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Revenue Breakdown by Year Group</CardTitle>
                  <p className="text-xs text-muted-foreground">Discount columns from Discount Management · scroll horizontally</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex text-sm border border-border rounded-sm overflow-hidden">

                    {/* Fixed left: Year Group / Students / Gross */}
                    <div className="shrink-0">
                      <table className="border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700">
                            <th rowSpan={2} className="text-left px-3 py-2 font-semibold align-bottom border-b border-r border-border whitespace-nowrap text-sm">Year Group</th>
                            <th rowSpan={2} className="text-right px-3 py-2 font-semibold align-bottom border-b border-r border-border whitespace-nowrap text-sm">Students</th>
                            <th rowSpan={2} className="text-right px-3 py-2 font-semibold align-bottom border-b border-r border-border whitespace-nowrap text-sm">Gross Revenue</th>
                          </tr>
                          <tr className="bg-slate-50"><td className="hidden" /></tr>
                        </thead>
                        <tbody>
                          {waterfallData.slice((wfPage - 1) * PAGE_SIZE, wfPage * PAGE_SIZE).map((r, i) => (
                            <tr key={i} className={`${i % 2 === 1 ? "bg-muted/10" : ""}`}>
                              <td className="px-3 py-2 font-semibold border-b border-r border-border whitespace-nowrap text-sm">{r.yearGroup}</td>
                              <td className="px-3 py-2 text-right border-b border-r border-border text-sm">{r.studentCount.toLocaleString()}</td>
                              <td className="px-3 py-2 text-right font-medium text-indigo-700 border-b border-r border-border text-sm">{fmt(r.grossRevenue)}</td>
                            </tr>
                          ))}
                          {waterfallData.length === 0 && (
                            <tr><td colSpan={3} className="px-3 py-8 text-center text-muted-foreground text-sm">No data</td></tr>
                          )}
                          {waterfallData.length > 0 && (
                            <tr className="bg-slate-100 font-bold">
                              <td className="px-3 py-2 border-t-2 border-r border-border text-sm">Grand Total</td>
                              <td className="px-3 py-2 text-right border-t-2 border-r border-border text-sm">{waterfallData.reduce((s, r) => s + r.studentCount, 0).toLocaleString()}</td>
                              <td className="px-3 py-2 text-right border-t-2 border-r border-border text-sm">{fmt(waterfallData.reduce((s, r) => s + r.grossRevenue, 0))}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Scrollable middle: Discount Deductions */}
                    <div className="overflow-x-auto flex-1">
                      <table className="border-collapse h-full">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700">
                            <th colSpan={discountKeys.length} className="text-center px-3 py-2 font-semibold text-orange-600 border-b border-r border-border whitespace-nowrap text-sm">
                              Discount Deductions
                            </th>
                          </tr>
                          <tr className="bg-slate-50 text-slate-600">
                            {discountKeys.map(k => (
                              <th key={k} className="text-right px-3 py-1.5 font-medium border-b border-r border-border whitespace-nowrap text-xs">{k}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {waterfallData.slice((wfPage - 1) * PAGE_SIZE, wfPage * PAGE_SIZE).map((r, i) => (
                            <tr key={i} className={`${i % 2 === 1 ? "bg-muted/10" : ""}`}>
                              {discountKeys.map(k => {
                                const v = r.discounts[k] ?? 0
                                return (
                                  <td key={k} className="px-3 py-2 text-right border-b border-r border-border text-sm">
                                    {v === 0 ? <span className="text-muted-foreground/40">—</span> : <span className="text-orange-600 font-medium">{fmt(v)}</span>}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                          {waterfallData.length === 0 && <tr><td colSpan={discountKeys.length} /></tr>}
                          {waterfallData.length > 0 && (
                            <tr className="bg-slate-100 font-bold">
                              {discountKeys.map(k => {
                                const total = waterfallData.reduce((s, r) => s + (r.discounts[k] ?? 0), 0)
                                return (
                                  <td key={k} className="px-3 py-2 text-right text-orange-600 border-t-2 border-r border-border text-sm">
                                    {total === 0 ? "—" : fmt(total)}
                                  </td>
                                )
                              })}
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Fixed right: Bank Fees / Net Revenue */}
                    <div className="shrink-0">
                      <table className="border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700">
                            <th rowSpan={2} className="text-right px-3 py-2 font-semibold align-bottom border-b border-l border-border whitespace-nowrap text-red-600 text-sm">Bank Fees</th>
                            <th rowSpan={2} className="text-right px-3 py-2 font-semibold align-bottom border-b border-l border-border whitespace-nowrap text-green-700 text-sm">Net Revenue</th>
                          </tr>
                          <tr className="bg-slate-50"><td className="hidden" /></tr>
                        </thead>
                        <tbody>
                          {waterfallData.slice((wfPage - 1) * PAGE_SIZE, wfPage * PAGE_SIZE).map((r, i) => (
                            <tr key={i} className={`${i % 2 === 1 ? "bg-muted/10" : ""}`}>
                              <td className="px-3 py-2 text-right border-b border-l border-border text-sm">
                                {r.bankFees === 0 ? <span className="text-muted-foreground/40">—</span> : <span className="text-red-600 font-medium">{fmt(r.bankFees)}</span>}
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-green-600 border-b border-l border-border text-sm">{fmt(r.netRevenue)}</td>
                            </tr>
                          ))}
                          {waterfallData.length === 0 && <tr><td colSpan={2} /></tr>}
                          {waterfallData.length > 0 && (
                            <tr className="bg-slate-100 font-bold">
                              <td className="px-3 py-2 text-right text-red-600 border-t-2 border-l border-border text-sm">{fmt(waterfallData.reduce((s, r) => s + r.bankFees, 0))}</td>
                              <td className="px-3 py-2 text-right text-green-700 border-t-2 border-l border-border text-sm">{fmt(waterfallData.reduce((s, r) => s + r.netRevenue, 0))}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                  </div>
                  <TablePagination page={wfPage} total={waterfallData.length} onChange={setWfPage} />
                </CardContent>
              </Card>
            </TabsContent>

          </div>
        </Tabs>
      </div>
    </div>
  )
}
