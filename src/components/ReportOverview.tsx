import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { RotateCcw, GraduationCap, BookOpen, Bus, FileText, Globe, ClipboardCheck, DollarSign, CheckCircle, AlertTriangle, Users, Filter } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAcademicYears } from "@/contexts/AcademicYearContext"
import { usePersistedState } from "@/hooks/usePersistedState"
import { formatAcademicYear } from "@/utils/xlsxUtils"
import { AnalyticsDashboard } from "./AnalyticsDashboard"

const CREATED_INVOICES_STORAGE_KEY = "createdInvoices"

const MODULE_COLORS: Record<string, string> = {
  tuition: "#8884d8",
  eca: "#82ca9d",
  trip: "#ffc658",
  exam: "#ff7300",
  bus: "#00C49F",
  external: "#8dd1e1",
}

const MODULE_ICONS: Record<string, any> = {
  tuition: GraduationCap,
  eca: BookOpen,
  trip: Globe,
  exam: ClipboardCheck,
  bus: Bus,
  external: FileText,
}

type InvoiceCategory = "tuition" | "eca" | "trip" | "exam" | "bus" | "external"

interface StoredInvoice {
  id: string
  studentId?: string
  subtotal?: number
  netAmount?: number
  totalDiscount?: number
  totalAmount?: number
  finalAmount?: number
  status?: string
  approvalStatus?: string
  category?: InvoiceCategory
  invoiceType?: string
  academicYear?: string   // "2025/2026" format (from formatAcademicYearForExcel)
  term?: string           // "2025-2026 - Term 1" or "2025-2026 - term1" format
  termName?: string       // "Term 1" or "term1"
  [key: string]: any
}

const ALL_MODULES: InvoiceCategory[] = ["tuition", "eca", "trip", "exam", "bus", "external"]

const formatCurrency = (amount: number): string => {
  if (amount >= 1_000_000) return `฿${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `฿${(amount / 1_000).toFixed(0)}K`
  return `฿${amount.toLocaleString()}`
}

const formatFullCurrency = (amount: number): string => {
  return `฿${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Normalize status the same way InvoiceManagement does
const normalizeStatus = (status?: string): string => {
  if (!status) return "draft"
  if (status === "pending") return "draft"
  return status
}

// Get the effective amount for an invoice (same priority as InvoiceManagement)
const getInvoiceAmount = (inv: StoredInvoice): number => {
  return inv.netAmount ?? inv.subtotal ?? inv.finalAmount ?? inv.totalAmount ?? 0
}

// Match academic year: yearId "2025/2026" should match stored academicYear "2025/2026" or term "2025-2026 - Term 1"
const matchAcademicYear = (inv: StoredInvoice, yearId: string): boolean => {
  if (!yearId || yearId === "all") return true
  const withSlash = yearId.replace('-', '/')
  if (inv.academicYear === withSlash || inv.academicYear === yearId) return true
  if (inv.term?.startsWith(yearId)) return true
  return false
}

// Match term: termName from AcademicYearContext e.g. "Term 1 (August - December)" should match stored term/termName
const matchTerm = (inv: StoredInvoice, filterTermName: string): boolean => {
  if (!filterTermName || filterTermName === "all") return true

  // Extract term number/short name from filter (e.g. "Term 1 (August - December)" -> "Term 1")
  const filterShort = filterTermName.split("(")[0].trim().toLowerCase()
  // Also extract just the number
  const numMatch = filterTermName.match(/(\d+)/)
  const termNumber = numMatch ? numMatch[1] : ""

  // Check termName field (e.g. "Term 1", "term1", "Term 1 Service")
  const tn = (inv.termName || "").toLowerCase().trim()
  if (tn === filterShort) return true
  if (tn === `term${termNumber}` || tn === `term ${termNumber}`) return true
  if (termNumber && tn.includes(`term ${termNumber}`)) return true
  if (termNumber && tn.includes(`term${termNumber}`)) return true

  // Check term field (e.g. "2025-2026 - Term 1", "2025-2026 - term1")
  const t = (inv.term || "").toLowerCase()
  if (filterShort && t.includes(filterShort)) return true
  if (termNumber && (t.includes(`term ${termNumber}`) || t.includes(`term${termNumber}`))) return true

  return false
}

export function ReportOverview() {
  const { t } = useLanguage()
  const { academicYears } = useAcademicYears()

  const [selectedYear, setSelectedYear] = usePersistedState<string>("report-overview:selectedYear", "all")
  const [selectedTerm, setSelectedTerm] = usePersistedState<string>("report-overview:selectedTerm", "all")
  const [invoices, setInvoices] = useState<StoredInvoice[]>([])

  // Get available terms based on selected academic year (same pattern as InvoiceManagement)
  const availableTerms = selectedYear !== "all"
    ? (academicYears.find(y => y.id === selectedYear)?.terms || [])
    : [...new Map(academicYears.flatMap(y => y.terms).map(t => [t.name, t])).values()]

  // Load invoices from localStorage — re-read on mount and when window regains focus
  const loadInvoices = useCallback(() => {
    try {
      const stored = localStorage.getItem(CREATED_INVOICES_STORAGE_KEY)
      if (stored) {
        setInvoices(JSON.parse(stored))
      } else {
        setInvoices([])
      }
    } catch {
      setInvoices([])
    }
  }, [])

  useEffect(() => {
    loadInvoices()
    const handleFocus = () => loadInvoices()
    const handleStorage = (e: StorageEvent) => {
      if (e.key === CREATED_INVOICES_STORAGE_KEY) loadInvoices()
    }
    window.addEventListener("focus", handleFocus)
    window.addEventListener("storage", handleStorage)
    return () => {
      window.removeEventListener("focus", handleFocus)
      window.removeEventListener("storage", handleStorage)
    }
  }, [loadInvoices])

  const resetFilters = () => {
    setSelectedYear("all")
    setSelectedTerm("all")
  }

  // Filter invoices by selected year/term
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      if (!matchAcademicYear(inv, selectedYear)) return false
      if (!matchTerm(inv, selectedTerm)) return false
      return true
    })
  }, [invoices, selectedYear, selectedTerm])

  // Compute module stats
  const moduleStats = useMemo(() => {
    const stats: Record<string, {
      totalAmount: number
      collected: number
      outstanding: number
      students: Set<string>
      invoiceCount: number
      statusCounts: Record<string, number>
    }> = {}

    ALL_MODULES.forEach(mod => {
      stats[mod] = { totalAmount: 0, collected: 0, outstanding: 0, students: new Set(), invoiceCount: 0, statusCounts: {} }
    })

    filteredInvoices.forEach(inv => {
      const cat = inv.category || "tuition"
      if (!stats[cat]) return

      const amount = getInvoiceAmount(inv)
      const status = normalizeStatus(inv.status)

      stats[cat].totalAmount += amount
      stats[cat].invoiceCount += 1
      stats[cat].statusCounts[status] = (stats[cat].statusCounts[status] || 0) + 1

      if (status === "paid") {
        stats[cat].collected += amount
      } else if (["sent", "overdue", "approved"].includes(status)) {
        stats[cat].outstanding += amount
      }

      if (inv.studentId) {
        stats[cat].students.add(inv.studentId)
      }
    })

    return stats
  }, [filteredInvoices])

  // Summary totals
  const totals = useMemo(() => {
    let totalRevenue = 0
    let totalCollected = 0
    let totalOutstanding = 0
    const allStudents = new Set<string>()
    let totalInvoices = 0

    ALL_MODULES.forEach(mod => {
      const s = moduleStats[mod]
      totalRevenue += s.totalAmount
      totalCollected += s.collected
      totalOutstanding += s.outstanding
      totalInvoices += s.invoiceCount
      s.students.forEach(id => allStudents.add(id))
    })

    return { totalRevenue, totalCollected, totalOutstanding, totalStudents: allStudents.size, totalInvoices }
  }, [moduleStats])

  // Chart data
  const barChartData = useMemo(() => {
    return ALL_MODULES.map(mod => ({
      name: t(`report.module.${mod}`),
      collected: moduleStats[mod].collected,
      outstanding: moduleStats[mod].outstanding,
    }))
  }, [moduleStats, t])

  const pieChartData = useMemo(() => {
    return ALL_MODULES
      .filter(mod => moduleStats[mod].collected > 0)
      .map(mod => ({
        name: t(`report.module.${mod}`),
        value: moduleStats[mod].collected,
        color: MODULE_COLORS[mod],
      }))
  }, [moduleStats, t])

  return (
    <div className="space-y-6">
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="w-full h-auto bg-muted/50 rounded-xl p-1 gap-1">
          <TabsTrigger value="dashboard" className="flex-1 rounded-lg text-base py-2.5 font-semibold">Dashboard</TabsTrigger>
          <TabsTrigger value="analytics" className="flex-1 rounded-lg text-base py-2.5 font-semibold">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6 space-y-6">
      {/* Filter Bar */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Academic Year - from useAcademicYears() context */}
            <div className="space-y-1 min-w-[180px]">
              <label className="text-sm font-medium">{t("common.academicYear")}</label>
              <Select value={selectedYear} onValueChange={(value) => {
                setSelectedYear(value)
                setSelectedTerm("all") // Reset term when year changes
              }}>
                <SelectTrigger className="h-10">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder={t("common.allAcademicYears")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.allAcademicYears")}</SelectItem>
                  {academicYears.map(year => (
                    <SelectItem key={year.id} value={year.id}>{formatAcademicYear(year.name)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Term - from selected academic year's terms */}
            <div className="space-y-1 min-w-[200px]">
              <label className="text-sm font-medium">{t("payment.term")}</label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="h-10">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder={t("common.all")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  {availableTerms.map(term => (
                    <SelectItem key={term.name} value={term.name}>{term.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end pb-0.5">
              <Button variant="outline" size="sm" onClick={resetFilters} className="mt-6">
                <RotateCcw className="w-4 h-4 mr-1" />
                {t("common.reset")}
              </Button>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("report.totalRevenue")}</p>
            </div>
            <p className="text-2xl font-bold">{formatFullCurrency(totals.totalRevenue)}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("report.totalCollected")}</p>
            </div>
            <p className="text-2xl font-bold">{formatFullCurrency(totals.totalCollected)}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("report.totalOutstanding")}</p>
            </div>
            <p className="text-2xl font-bold">{formatFullCurrency(totals.totalOutstanding)}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("report.totalStudents")}</p>
            </div>
            <p className="text-2xl font-bold">{totals.totalStudents.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Collection by Module Bar Chart */}
        <Card className="shadow-sm min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{t("report.collected")} vs {t("report.outstanding")}</CardTitle>
          </CardHeader>
          <CardContent>
            {barChartData.some(d => d.collected > 0 || d.outstanding > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => formatFullCurrency(value)} />
                  <Legend />
                  <Bar dataKey="collected" name={t("report.collected")} fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="outstanding" name={t("report.outstanding")} fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-12 text-sm">{t("report.noData")}</p>
            )}
          </CardContent>
        </Card>

        {/* Collection Distribution Pie Chart */}
        <Card className="shadow-sm min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{t("report.collected")} — {t("report.moduleBreakdown")}</CardTitle>
          </CardHeader>
          <CardContent>
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatFullCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-12 text-sm">{t("report.noData")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Module Breakdown */}
      <div>
        <h2 className="text-lg font-semibold mb-4">{t("report.moduleBreakdown")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ALL_MODULES.map(mod => {
            const s = moduleStats[mod]
            const Icon = MODULE_ICONS[mod]
            const color = MODULE_COLORS[mod]
            const rate = s.totalAmount > 0 ? ((s.collected / s.totalAmount) * 100).toFixed(1) : "0.0"

            return (
              <Card key={mod} className="relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: color }} />
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md" style={{ backgroundColor: `${color}20` }}>
                        <Icon className="w-4 h-4" style={{ color }} />
                      </div>
                      <CardTitle className="text-sm font-semibold">{t(`report.module.${mod}`)}</CardTitle>
                    </div>
                    <span className="text-xs text-muted-foreground">{s.invoiceCount} {t("report.invoices")}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">{t("report.totalAmount")}</p>
                      <p className="font-semibold">{formatCurrency(s.totalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">{t("report.collected")}</p>
                      <p className="font-semibold text-green-600">{formatCurrency(s.collected)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">{t("report.outstanding")}</p>
                      <p className="font-semibold text-orange-500">{formatCurrency(s.outstanding)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">{t("report.students")}</p>
                      <p className="font-semibold">{s.students.size.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Collection progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{t("report.collectionRate")}</span>
                      <span className="font-medium">{rate}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(parseFloat(rate), 100)}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <AnalyticsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  )
}
