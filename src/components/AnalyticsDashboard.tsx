import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts"
import { BarChart3 } from "lucide-react"
import {
  getRevenueByYearGroup, getAvgRevenueByYearGroup, getTransactionsByMethod,
  getTransactionStatus, getBankFees, getRevenueWaterfall, getFilterOptions,
  exportToExcel,
  type RevenueByYearGroup, type AvgRevenueByYearGroup, type TransactionByMethod,
  type TransactionStatus, type BankFeeRow, type RevenueWaterfall
} from "@/services/analyticsService"
import { FileDown, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { logActivity } from "@/lib/activityLog"

// ── COLORS ────────────────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  tuition: "#6366f1", eca: "#22c55e", trip: "#f59e0b",
  sport: "#ef4444", others: "#a855f7"
}
const CATEGORY_LABELS: Record<string, string> = {
  tuition: "Tuition Fee", eca: "ECA", trip: "Trip",
  sport: "School Bus", others: "Others"
}
const METHOD_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7", "#ec4899"]
const STATUS_COLORS: Record<string, string> = {
  successful: "#22c55e", declined: "#ef4444"
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 0 })
const fmtB = (n: number) => `฿${fmt(n)}`

// ── SUMMARY CARD ──────────────────────────────────────────────────────────────
function SummaryCard({
  label, value, accent = "#6366f1"
}: {
  label: string; value: string; accent?: string
}) {
  return (
    <Card className="rounded-xl gap-0">
      <CardContent className="p-4 pb-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold" style={{ color: accent }}>{value}</p>
      </CardContent>
    </Card>
  )
}

// ── SECTION HEADER ────────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  )
}

// ── TABLE HEADER STYLE ────────────────────────────────────────────────────────
const thBase = "py-3 px-4 text-base font-semibold text-muted-foreground"

// ── PAGINATION ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10

function TablePagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  const totalPages = Math.ceil(total / PAGE_SIZE)
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between px-3 pt-3 pb-1 border-t mt-1">
      <span className="text-base text-muted-foreground">
        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} rows
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)} disabled={page === 1}
          className="px-3 py-1 text-base rounded-md border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >← Prev</button>
        <span className="text-base px-3 py-1 rounded-md bg-primary text-primary-foreground font-medium">{page} / {totalPages}</span>
        <button
          onClick={() => onChange(page + 1)} disabled={page === totalPages}
          className="px-3 py-1 text-base rounded-md border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >Next →</button>
      </div>
    </div>
  )
}

// ── METRIC BADGE ──────────────────────────────────────────────────────────────
function MethodCard({ method, count, percentage, color }: {
  method: string; count: number; percentage: number; amount: number; color: string
}) {
  return (
    <Card className="rounded-xl gap-0">
      <CardContent className="p-4 pb-4">
        <p className="text-sm text-muted-foreground">{method}</p>
        <p className="text-2xl font-bold" style={{ color }}>{count.toLocaleString()} <span className="text-sm font-medium text-muted-foreground">txns · {percentage}%</span></p>
      </CardContent>
    </Card>
  )
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState("revenue")
  const [filterYear, setFilterYear] = useState("all")
  const [filterTerm, setFilterTerm] = useState("all")
  const [revPage, setRevPage] = useState(1)
  const [avgPage, setAvgPage] = useState(1)
  const [wfPage, setWfPage] = useState(1)
  const [yearOptions, setYearOptions] = useState<string[]>([])
  const [termOptions, setTermOptions] = useState<string[]>([])
  const [isExporting, setIsExporting] = useState(false)

  const [revenueData, setRevenueData] = useState<RevenueByYearGroup[]>([])
  const [avgData, setAvgData] = useState<AvgRevenueByYearGroup[]>([])
  const [methodData, setMethodData] = useState<TransactionByMethod[]>([])
  const [statusData, setStatusData] = useState<TransactionStatus[]>([])
  const [bankFeeData, setBankFeeData] = useState<BankFeeRow[]>([])
  const [waterfallData, setWaterfallData] = useState<RevenueWaterfall[]>([])

  const filter = useMemo(() => ({ academicYear: filterYear, term: filterTerm }), [filterYear, filterTerm])

  useEffect(() => {
    getFilterOptions().then(opts => {
      setYearOptions(opts.academicYears)
      setTermOptions(opts.terms)
    })
  }, [])

  useEffect(() => {
    setRevPage(1); setAvgPage(1); setWfPage(1)
    getRevenueByYearGroup(filter).then(setRevenueData)
    getAvgRevenueByYearGroup(filter).then(setAvgData)
    getTransactionsByMethod(filter).then(setMethodData)
    getTransactionStatus(filter).then(setStatusData)
    getBankFees(filter).then(setBankFeeData)
    getRevenueWaterfall(filter).then(setWaterfallData)
  }, [filter])

  const totalGross = useMemo(() => revenueData.reduce((s, r) => s + r.grossRevenue, 0), [revenueData])
  const totalNet = useMemo(() => revenueData.reduce((s, r) => s + r.netRevenue, 0), [revenueData])
  const totalDiscount = useMemo(() => revenueData.reduce((s, r) => s + r.discountAmount, 0), [revenueData])
  const totalStudents = useMemo(() => avgData.reduce((s, r) => s + r.studentCount, 0), [avgData])
  const totalTxn = useMemo(() => methodData.reduce((s, m) => s + m.count, 0), [methodData])
  const successRate = useMemo(() => {
    const s = statusData.find(r => r.status === "successful")
    return s?.percentage ?? 0
  }, [statusData])

  const revenueChartData = useMemo(() => {
    const map = new Map<string, { gross: number; net: number; discount: number }>()
    revenueData.forEach(r => {
      const ex = map.get(r.yearGroup) ?? { gross: 0, net: 0, discount: 0 }
      ex.gross += r.grossRevenue
      ex.net += r.netRevenue
      ex.discount += r.discountAmount
      map.set(r.yearGroup, ex)
    })
    return Array.from(map.entries()).map(([yg, v]) => ({ yearGroup: yg, ...v }))
  }, [revenueData])

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

  const handleExport = async () => {
    try {
      setIsExporting(true)
      await exportToExcel(
        activeTab,
        revenueData,
        avgData,
        methodData,
        statusData,
        bankFeeData,
        waterfallData,
        filter
      )
      toast.success("Analytics report exported successfully")
      logActivity({ action: "Export Report", module: "Analytics", detail: `Exported analytics report for tab "${activeTab}" with filter: ${filter.academicYear || "all"} / ${filter.term || "all"}` })
    } catch (error) {
      console.error("Export failed:", error)
      toast.error("Failed to export report")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="p-6 space-y-6 bg-muted/20 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
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
            <span className="text-base text-muted-foreground font-medium mr-1">Filter:</span>
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="h-8 w-36 border-0 shadow-none focus:ring-0 bg-muted/40 rounded-lg text-base">
                <SelectValue placeholder="Academic Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {yearOptions.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterTerm} onValueChange={setFilterTerm}>
              <SelectTrigger className="h-8 w-28 border-0 shadow-none focus:ring-0 bg-muted/40 rounded-lg text-base">
                <SelectValue placeholder="Term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terms</SelectItem>
                {termOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all font-semibold shadow-sm hover:shadow-md disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard label="Gross Revenue"  value={fmtB(totalGross)}     accent="#6366f1" />
        <SummaryCard label="Net Revenue"    value={fmtB(totalNet)}        accent="#22c55e" />
        <SummaryCard label="Total Discount" value={fmtB(totalDiscount)} accent="#f59e0b" />
        <SummaryCard label="Students"       value={String(totalStudents)} accent="#06b6d4" />
        <SummaryCard label="Transactions"   value={String(totalTxn)}      accent="#a855f7" />
        <SummaryCard label="Success Rate"   value={`${successRate}%`}     accent={successRate >= 80 ? "#22c55e" : "#f59e0b"} />
      </div>

      {/* ── Tabs ── */}
      <div className="bg-background rounded-2xl border shadow-sm overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b px-4 pt-4">
            <TabsList className="w-full h-auto flex flex-wrap bg-muted/50 rounded-xl p-1 gap-1">
              <TabsTrigger value="revenue"   className="flex-1 rounded-lg text-base py-2">Revenue Comparison</TabsTrigger>
              <TabsTrigger value="avg"       className="flex-1 rounded-lg text-base py-2">Avg Revenue / Person</TabsTrigger>
              <TabsTrigger value="methods"   className="flex-1 rounded-lg text-base py-2">No. of Transactions</TabsTrigger>
              <TabsTrigger value="status"    className="flex-1 rounded-lg text-base py-2">Declined vs Successful</TabsTrigger>
              <TabsTrigger value="fees"      className="flex-1 rounded-lg text-base py-2">Bank Fees Breakdown</TabsTrigger>
              <TabsTrigger value="waterfall" className="flex-1 rounded-lg text-base py-2">Net vs Gross Revenue</TabsTrigger>
            </TabsList>
          </div>

          <div className="p-5 space-y-5">

            {/* ── TAB 1: Revenue YoY ── */}
            <TabsContent value="revenue" className="space-y-5 mt-0">
              <Card className="shadow-none border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Revenue Comparison by Year Group</CardTitle>
                  <p className="text-sm text-muted-foreground">Year-on-Year &amp; Term-on-Term overview</p>
                </CardHeader>
                <CardContent>
                  {revenueChartData.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">No invoice data available</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={revenueChartData} margin={{ top: 4, right: 16, left: 16, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="yearGroup" angle={-40} textAnchor="end" tick={{ fontSize: 13 }} />
                        <YAxis tickFormatter={v => `฿${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 13 }} />
                        <Tooltip formatter={(v: number) => fmtB(v)} contentStyle={{ borderRadius: 8, fontSize: 14 }} />
                        <Legend verticalAlign="top" wrapperStyle={{ fontSize: 14 }} />
                        <Bar dataKey="gross" name="Gross Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="net" name="Net Revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="discount" name="Discount" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-none border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Detail Table</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 overflow-x-auto">
                  <table className="w-full text-base border-collapse [&_td]:border [&_td]:border-border">
                    <thead>
                      <tr className="bg-muted/60 rounded-lg">
                        <th className={`${thBase} text-left rounded-tl-lg`}>Year Group</th>
                        <th className={`${thBase} text-left`}>Academic Year</th>
                        <th className={`${thBase} text-left`}>Term</th>
                        <th className={`${thBase} text-right`}>Invoices</th>
                        <th className={`${thBase} text-right`}>Gross Revenue</th>
                        <th className={`${thBase} text-right`}>Discount</th>
                        <th className={`${thBase} text-right rounded-tr-lg`}>Net Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenueData.slice((revPage - 1) * PAGE_SIZE, revPage * PAGE_SIZE).map((r, i) => (
                        <tr key={i} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium">{r.yearGroup}</td>
                          <td className="px-4 py-3 text-muted-foreground">{r.academicYear}</td>
                          <td className="px-4 py-3 text-muted-foreground">{r.term}</td>
                          <td className="px-4 py-3 text-right">{r.studentCount}</td>
                          <td className="px-4 py-3 text-right">{fmtB(r.grossRevenue)}</td>
                          <td className="px-4 py-3 text-right text-orange-600 font-medium">−{fmtB(r.discountAmount)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-green-600">{fmtB(r.netRevenue)}</td>
                        </tr>
                      ))}
                      {revenueData.length === 0 && (
                        <tr><td colSpan={7} className="py-8 text-center text-muted-foreground text-sm">No data</td></tr>
                      )}
                    </tbody>
                  </table>
                  <TablePagination page={revPage} total={revenueData.length} onChange={setRevPage} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── TAB 2: Avg Revenue per Student ── */}
            <TabsContent value="avg" className="space-y-5 mt-0">
              <Card className="shadow-none border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Average Revenue per Person</CardTitle>
                  <p className="text-sm text-muted-foreground">Breakdown by year group and category</p>
                </CardHeader>
                <CardContent>
                  {avgData.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">No data available</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={avgData} margin={{ top: 4, right: 16, left: 16, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="yearGroup" angle={-40} textAnchor="end" tick={{ fontSize: 13 }} />
                        <YAxis tickFormatter={v => `฿${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 13 }} />
                        <Tooltip formatter={(v: number) => fmtB(v)} contentStyle={{ borderRadius: 8, fontSize: 14 }} />
                        <Legend verticalAlign="top" wrapperStyle={{ fontSize: 14 }} />
                        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                          <Bar key={cat} dataKey={`breakdown.${cat}`} name={CATEGORY_LABELS[cat]} fill={color} stackId="a" />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-none border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Detail Table</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 overflow-x-auto">
                  <table className="w-full text-base border-collapse [&_td]:border [&_td]:border-border">
                    <thead>
                      <tr className="bg-muted/60">
                        <th className={`${thBase} text-left`}>Year Group</th>
                        <th className={`${thBase} text-right`}>Students</th>
                        <th className={`${thBase} text-right`}>Total Revenue</th>
                        <th className={`${thBase} text-right`}>Avg / Student</th>
                        <th className={`${thBase} text-right`}>Tuition Fee</th>
                        <th className={`${thBase} text-right`}>ECA</th>
                        <th className={`${thBase} text-right`}>Trip / Sport / Others</th>
                      </tr>
                    </thead>
                    <tbody>
                      {avgData.slice((avgPage - 1) * PAGE_SIZE, avgPage * PAGE_SIZE).map((r, i) => (
                        <tr key={i} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium">{r.yearGroup}</td>
                          <td className="px-4 py-3 text-right">{r.studentCount}</td>
                          <td className="px-4 py-3 text-right">{fmtB(r.totalRevenue)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-primary">{fmtB(r.avgPerStudent)}</td>
                          <td className="px-4 py-3 text-right">{fmtB(r.breakdown.tuition)}</td>
                          <td className="px-4 py-3 text-right">{fmtB(r.breakdown.eca)}</td>
                          <td className="px-4 py-3 text-right">{fmtB(r.breakdown.trip + r.breakdown.sport + r.breakdown.others)}</td>
                        </tr>
                      ))}
                      {avgData.length === 0 && (
                        <tr><td colSpan={7} className="py-8 text-center text-muted-foreground text-sm">No data</td></tr>
                      )}
                    </tbody>
                  </table>
                  <TablePagination page={avgPage} total={avgData.length} onChange={setAvgPage} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── TAB 3: Payment Methods ── */}
            <TabsContent value="methods" className="space-y-5 mt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {methodData.map((m, i) => (
                  <MethodCard
                    key={i}
                    method={m.method}
                    count={m.count}
                    percentage={m.percentage}
                    amount={m.totalAmount}
                    color={METHOD_COLORS[i % METHOD_COLORS.length]}
                  />
                ))}
              </div>

              <Card className="shadow-none border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Transactions by Payment Method</CardTitle>
                  <p className="text-sm text-muted-foreground">Number of times each method was used</p>
                </CardHeader>
                <CardContent>
                  {methodData.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">No payment records yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={methodData} layout="vertical" barSize={32} margin={{ top: 4, right: 80, left: 170, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                        <XAxis type="number" tick={{ fontSize: 13 }} />
                        <YAxis type="category" dataKey="method" tick={{ fontSize: 13 }} width={165} />
                        <Tooltip formatter={(v: number) => [`${v} transactions`, "Count"]} contentStyle={{ borderRadius: 8, fontSize: 14 }} />
                        <Bar dataKey="count" radius={[0, 6, 6, 0]} label={{ position: "right", fontSize: 12, formatter: (v: number) => `${v}` }}>
                          {methodData.map((_, i) => <Cell key={i} fill={METHOD_COLORS[i % METHOD_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-none border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Summary Table</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <table className="w-full text-base border-collapse [&_td]:border [&_td]:border-border">
                    <thead>
                      <tr className="bg-muted/60">
                        <th className={`${thBase} text-left`}>Payment Method</th>
                        <th className={`${thBase} text-right`}>Transactions</th>
                        <th className={`${thBase} text-right`}>Share</th>
                        <th className={`${thBase} text-right`}>Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {methodData.map((m, i) => (
                        <tr key={i} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 flex items-center gap-2">
                            <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: METHOD_COLORS[i % METHOD_COLORS.length] }} />
                            <span className="font-medium">{m.method}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-base">{m.count.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${m.percentage}%`, backgroundColor: METHOD_COLORS[i % METHOD_COLORS.length] }} />
                              </div>
                              <span className="text-muted-foreground text-base w-10">{m.percentage}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">{fmtB(m.totalAmount)}</td>
                        </tr>
                      ))}
                      {methodData.length > 0 && (
                        <tr className="bg-primary/5 font-bold border-t-2 border-primary/20">
                          <td className="px-4 py-3 text-primary">Grand Total</td>
                          <td className="px-4 py-3 text-right text-primary">{methodData.reduce((s, m) => s + m.count, 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">100%</td>
                          <td className="px-4 py-3 text-right text-primary">{fmtB(methodData.reduce((s, m) => s + m.totalAmount, 0))}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── TAB 4: Transaction Status ── */}
            <TabsContent value="status" className="space-y-5 mt-0">
              {/* Status summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {statusData.map((s, i) => (
                  <Card key={i} className="rounded-xl">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">{s.label}</p>
                      <p className="text-2xl font-bold" style={{ color: STATUS_COLORS[s.status] }}>{s.count.toLocaleString()} <span className="text-sm font-medium">({s.percentage}%)</span></p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Pie chart */}
                <Card className="shadow-none border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Successful vs Declined</CardTitle>
                    <p className="text-sm text-muted-foreground">Overall transaction outcome</p>
                  </CardHeader>
                  <CardContent>
                    {statusData.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8 text-sm">No data</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                          <Pie data={statusData} dataKey="count" nameKey="label" cx="50%" cy="50%"
                            outerRadius={90} innerRadius={45}
                            label={({ label, percentage }) => `${label} ${percentage}%`}
                            labelLine={{ stroke: "#9ca3af", strokeWidth: 1 }}
                          >
                            {statusData.map((s, i) => <Cell key={i} fill={STATUS_COLORS[s.status] ?? "#6b7280"} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => `${v} transactions`} contentStyle={{ borderRadius: 8, fontSize: 14 }} />
                          <Legend wrapperStyle={{ fontSize: 14 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Per-method breakdown */}
                <Card className="shadow-none border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Breakdown by Payment Method</CardTitle>
                    <p className="text-sm text-muted-foreground">Success and declined per channel</p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {statusData[0]?.byMethod && (
                      <table className="w-full text-base border-collapse [&_td]:border [&_td]:border-border">
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
                              <tr key={i} className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 font-medium">{method}</td>
                                <td className="px-4 py-3 text-right text-green-600 font-medium">{v.success}</td>
                                <td className="px-4 py-3 text-right text-red-500 font-medium">{v.declined}</td>
                                <td className="px-4 py-3 text-right">
                                  <span className="text-muted-foreground text-base">{total} </span>
                                  <span className="text-base font-medium text-green-600">({pct}%✓)</span>
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

            {/* ── TAB 5: Bank Fees ── */}
            <TabsContent value="fees" className="space-y-5 mt-0">
              {(() => {
                // Read directly from Bank Settings (bankAccounts in localStorage)
                let storedAccounts: { bankName: string; paymentSource: string; isActive?: boolean }[] = []
                try {
                  const raw = localStorage.getItem("kingscollege_backoffice_bankAccounts")
                  if (raw) storedAccounts = JSON.parse(raw)
                } catch {}
                const activeAccounts = storedAccounts.filter(a => a.isActive !== false && a.bankName)
                // Group by bankName, collect all payment sources
                const bankMap = new Map<string, string[]>()
                activeAccounts.forEach(a => {
                  const sources = bankMap.get(a.bankName) || []
                  if (a.paymentSource && !sources.includes(a.paymentSource)) sources.push(a.paymentSource)
                  bankMap.set(a.bankName, sources)
                })
                const uniqueBanks = Array.from(bankMap.entries()).map(([bankName, sources]) => ({ bankName, sources }))
                if (uniqueBanks.length === 0) return (
                  <p className="text-sm text-muted-foreground text-center py-4">No bank accounts configured. Add accounts in Bank Settings first.</p>
                )
                const PALETTE    = ["#00a651","#e60012","#0066b2","#7b2d8b","#f59e0b","#06b6d4","#6366f1","#ec4899"]
                const PALETTE_BG = ["#f0fdf4","#fef2f2","#eff6ff","#faf5ff","#fffbeb","#ecfeff","#eef2ff","#fdf2f8"]
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {uniqueBanks.map(({ bankName, sources }, idx) => {
                      const rows = bankFeeData.filter(r => r.bankName === bankName)
                      const total = rows.reduce((s, r) => s + r.feeAmount, 0)
                      const txns  = rows.reduce((s, r) => s + r.transactionCount, 0)
                      const color = PALETTE[idx % PALETTE.length]
                      const bg    = PALETTE_BG[idx % PALETTE_BG.length]
                      return (
                        <Card key={bankName} className="rounded-xl">
                          <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">{bankName}</p>
                            <p className="text-2xl font-bold" style={{ color }}>฿{fmt(total)}</p>
                            <p className="text-sm text-muted-foreground mt-0.5">{txns.toLocaleString()} transactions</p>
                            <div className="flex flex-wrap gap-1 mt-2">
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

              <Card className="shadow-none border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Bank Fees by Term &amp; Academic Year</CardTitle>
                  <p className="text-sm text-muted-foreground">Based on configured bank accounts in Bank Settings</p>
                </CardHeader>
                <CardContent className="pt-0 overflow-x-auto">
                  <table className="w-full text-base border-collapse [&_td]:border [&_td]:border-border">
                    <thead>
                      <tr className="bg-muted/60">
                        <th className={`${thBase} text-left`}>Bank</th>
                        <th className={`${thBase} text-left`}>Payment Source</th>
                        <th className={`${thBase} text-left`}>Academic Year</th>
                        <th className={`${thBase} text-left`}>Term</th>
                        <th className={`${thBase} text-right`}>Transactions</th>
                        <th className={`${thBase} text-right`}>Fee Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bankFeeData.map((r, i) => (
                        <tr key={i} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-semibold">{r.bankName}</td>
                          <td className="px-4 py-3 text-muted-foreground">{r.paymentSource}</td>
                          <td className="px-4 py-3 text-muted-foreground">{r.academicYear}</td>
                          <td className="px-4 py-3 text-muted-foreground">{r.term}</td>
                          <td className="px-4 py-3 text-right">{r.transactionCount.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-semibold text-red-600">−{fmtB(r.feeAmount)}</td>
                        </tr>
                      ))}
                      {bankFeeData.length > 0 && (
                        <tr className="bg-primary/5 font-bold border-t-2 border-primary/20">
                          <td className="px-4 py-3 text-primary" colSpan={4}>Grand Total</td>
                          <td className="px-4 py-3 text-right text-primary">{bankFeeData.reduce((s, r) => s + r.transactionCount, 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-red-600 font-bold">−{fmtB(bankFeeData.reduce((s, r) => s + r.feeAmount, 0))}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── TAB 6: Net vs Gross Revenue ── */}
            <TabsContent value="waterfall" className="space-y-5 mt-0">
              <Card className="shadow-none border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Net Revenue vs Gross Revenue by Year Group</CardTitle>
                  <p className="text-sm text-muted-foreground">Gross → Discounts → Bank Fees → Net</p>
                </CardHeader>
                <CardContent>
                  {waterfallChart.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">No data available</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={waterfallChart} margin={{ top: 4, right: 16, left: 16, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" angle={-40} textAnchor="end" tick={{ fontSize: 13 }} />
                        <YAxis tickFormatter={v => `฿${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 13 }} />
                        <Tooltip formatter={(v: number) => fmtB(v)} contentStyle={{ borderRadius: 8, fontSize: 14 }} />
                        <Legend verticalAlign="top" wrapperStyle={{ fontSize: 14 }} />
                        <Bar dataKey="Gross" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Discounts" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Bank Fees" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Net" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-none border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Revenue Breakdown by Year Group</CardTitle>
                  <p className="text-sm text-muted-foreground">Discount columns from Discount Management · scroll horizontally inside discount section</p>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Outer layout: fixed left cols + scrollable discount cols + fixed right cols */}
                  <div className="flex text-base border border-border rounded-sm overflow-hidden">

                    {/* Fixed left: Year Group / Students / Gross Revenue */}
                    <div className="shrink-0">
                      <table className="border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700">
                            <th rowSpan={2} className="text-left px-4 py-3 font-semibold align-bottom border-b border-r border-border whitespace-nowrap">Year Group</th>
                            <th rowSpan={2} className="text-right px-4 py-3 font-semibold align-bottom border-b border-r border-border whitespace-nowrap">Students</th>
                            <th rowSpan={2} className="text-right px-4 py-3 font-semibold align-bottom border-b border-r border-border whitespace-nowrap">Gross Revenue</th>
                          </tr>
                          <tr className="bg-slate-50"><td className="hidden" /></tr>
                        </thead>
                        <tbody>
                          {waterfallData.slice((wfPage - 1) * PAGE_SIZE, wfPage * PAGE_SIZE).map((r, i) => (
                            <tr key={i} className={`${i % 2 === 1 ? "bg-muted/10" : ""}`}>
                              <td className="px-4 py-3 font-semibold border-b border-r border-border whitespace-nowrap">{r.yearGroup}</td>
                              <td className="px-4 py-3 text-right border-b border-r border-border">{r.studentCount.toLocaleString()}</td>
                              <td className="px-4 py-3 text-right font-medium text-indigo-700 border-b border-r border-border">{fmt(r.grossRevenue)}</td>
                            </tr>
                          ))}
                          {waterfallData.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No data</td></tr>}
                          {waterfallData.length > 0 && (
                            <tr className="bg-slate-100 font-bold">
                              <td className="px-4 py-3 border-t-2 border-r border-border">Grand Total</td>
                              <td className="px-4 py-3 text-right border-t-2 border-r border-border">{waterfallData.reduce((s,r)=>s+r.studentCount,0).toLocaleString()}</td>
                              <td className="px-4 py-3 text-right border-t-2 border-r border-border">{fmt(waterfallData.reduce((s,r)=>s+r.grossRevenue,0))}</td>
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
                            <th colSpan={discountKeys.length} className="text-center px-4 py-3 font-semibold text-orange-600 border-b border-r border-border whitespace-nowrap">
                              Discount Deductions
                            </th>
                          </tr>
                          <tr className="bg-slate-50 text-slate-600">
                            {discountKeys.map(k => (
                              <th key={k} className="text-right px-4 py-2 font-medium border-b border-r border-border whitespace-nowrap">{k}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {waterfallData.slice((wfPage - 1) * PAGE_SIZE, wfPage * PAGE_SIZE).map((r, i) => (
                            <tr key={i} className={`${i % 2 === 1 ? "bg-muted/10" : ""}`}>
                              {discountKeys.map(k => {
                                const v = r.discounts[k] ?? 0
                                return (
                                  <td key={k} className="px-4 py-3 text-right border-b border-r border-border">
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
                                return <td key={k} className="px-4 py-3 text-right text-orange-600 border-t-2 border-r border-border">{total === 0 ? "—" : fmt(total)}</td>
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
                            <th rowSpan={2} className="text-right px-4 py-3 font-semibold align-bottom border-b border-l border-border whitespace-nowrap text-red-600">Bank Fees</th>
                            <th rowSpan={2} className="text-right px-4 py-3 font-semibold align-bottom border-b border-l border-border whitespace-nowrap text-green-700">Net Revenue</th>
                          </tr>
                          <tr className="bg-slate-50"><td className="hidden" /></tr>
                        </thead>
                        <tbody>
                          {waterfallData.slice((wfPage - 1) * PAGE_SIZE, wfPage * PAGE_SIZE).map((r, i) => (
                            <tr key={i} className={`${i % 2 === 1 ? "bg-muted/10" : ""}`}>
                              <td className="px-4 py-3 text-right border-b border-l border-border">
                                {r.bankFees === 0 ? <span className="text-muted-foreground/40">—</span> : <span className="text-red-600 font-medium">{fmt(r.bankFees)}</span>}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-green-600 border-b border-l border-border">{fmt(r.netRevenue)}</td>
                            </tr>
                          ))}
                          {waterfallData.length === 0 && <tr><td colSpan={2} /></tr>}
                          {waterfallData.length > 0 && (
                            <tr className="bg-slate-100 font-bold">
                              <td className="px-4 py-3 text-right text-red-600 border-t-2 border-l border-border">{fmt(waterfallData.reduce((s,r)=>s+r.bankFees,0))}</td>
                              <td className="px-4 py-3 text-right text-green-700 border-t-2 border-l border-border">{fmt(waterfallData.reduce((s,r)=>s+r.netRevenue,0))}</td>
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
